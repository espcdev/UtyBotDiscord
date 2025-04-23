// src/events/interactionCreate.js
const { Events, InteractionType } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');

const captchaConfigPath = path.join(__dirname, '..', '..', 'data', 'captchaConfig.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) { // Asegúrate de pasar 'client' desde eventLoader
        // --- Manejador de Comandos Slash ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Comando no encontrado: ${interaction.commandName}`);
                try {
                    await interaction.reply({ embeds: [createErrorEmbed(`El comando \`/${interaction.commandName}\` no fue encontrado.`)], ephemeral: true });
                } catch (e) { console.error("Error respondiendo a comando no encontrado:", e); }
                return;
            }

            // Verificar permisos del bot si el comando lo requiere
            if (command.botPermissions && command.botPermissions.length > 0) {
                const botMember = await interaction.guild.members.fetch(client.user.id);
                const missingPerms = [];
                command.botPermissions.forEach(perm => {
                    if (!botMember.permissions.has(perm)) {
                        missingPerms.push(perm);
                    }
                });
                if (missingPerms.length > 0) {
                     try {
                        await interaction.reply({ embeds: [createErrorEmbed(`Necesito los siguientes permisos para ejecutar este comando: \`${missingPerms.join(', ')}\``)], ephemeral: true });
                    } catch (e) { console.error("Error respondiendo a falta de permisos del bot:", e); }
                    return;
                }
            }


            // Ejecutar comando
            try {
                // Pasar client al comando si lo necesita (ej. para acceder a config global)
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`Error ejecutando el comando ${interaction.commandName}:`, error);
                const errorEmbed = createErrorEmbed(`Ocurrió un error al ejecutar \`/${interaction.commandName}\`.\n\`\`\`${error.message || 'Error desconocido'}\`\`\``);
                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                    }
                } catch (e) {
                    console.error("Error enviando mensaje de error de comando al usuario:", e);
                }
            }
        }
        // --- Manejador de Autocompletado ---
        else if (interaction.isAutocomplete()) {
             const command = client.commands.get(interaction.commandName);
             if (!command || !command.autocomplete) return;

             try {
                 await command.autocomplete(interaction, client);
             } catch (error) {
                 console.error(`Error en autocompletado para ${interaction.commandName}:`, error);
             }
        }
        // --- Manejador de Modales ---
        else if (interaction.type === InteractionType.ModalSubmit) {
            // --- Lógica CAPTCHA ---
            if (interaction.customId.startsWith('captchaModal_')) {
                const userId = interaction.customId.split('_')[1];

                // Verificar que el usuario que envió el modal es el correcto
                if (interaction.user.id !== userId) {
                    return interaction.reply({ embeds: [createErrorEmbed('No puedes interactuar con el CAPTCHA de otro usuario.')], ephemeral: true });
                }

                const config = client.captchaConfig.get(interaction.guildId);
                const attempt = client.captchaAttempts.get(userId);
                const member = interaction.member;

                if (!config || !attempt || attempt.guildId !== interaction.guildId) {
                    await interaction.reply({ embeds: [createErrorEmbed('Tu sesión de verificación ha expirado o no es válida. Usa `/verify` de nuevo.')], ephemeral: true });
                    if (attempt) client.captchaAttempts.delete(userId);
                    return;
                }

                const submittedCode = interaction.fields.getTextInputValue('captchaInput').toUpperCase();
                const correctCode = attempt.code;

                client.captchaAttempts.delete(userId); // Eliminar intento

                if (submittedCode === correctCode) {
                    try {
                        const role = await interaction.guild.roles.fetch(config.roleId);
                        if (!role) throw new Error(`Rol con ID ${config.roleId} no encontrado.`);

                         // Verificar jerarquía ANTES de intentar añadir
                        const botMember = await interaction.guild.members.fetch(client.user.id);
                         if (role.position >= botMember.roles.highest.position) {
                             throw new Error(`No puedo asignar el rol "${role.name}" porque está por encima o igual a mi rol más alto.`);
                         }

                        await member.roles.add(role);
                        await interaction.reply({ embeds: [createSuccessEmbed('¡Verificación completada! Has obtenido acceso.')], ephemeral: true });
                    } catch (error) {
                        console.error(`Error asignando rol CAPTCHA (${config.roleId}) a ${interaction.user.tag} en guild ${interaction.guildId}:`, error);
                        await interaction.reply({ embeds: [createErrorEmbed(`¡CAPTCHA correcto! Pero hubo un error al asignarte el rol. Por favor, contacta a un administrador.\nError: ${error.message}`)], ephemeral: true });
                    }
                } else {
                    await interaction.reply({ embeds: [createErrorEmbed('Código CAPTCHA incorrecto. Usa `/verify` para intentarlo de nuevo.')], ephemeral: true });
                }
            }
            // --- Otros Modales ---
            // else if (interaction.customId === 'otroModal') { ... }
        }
        // --- Manejador de Botones ---
        else if (interaction.isButton()) {
            // Ejemplo: botones de un comando /poll
             if (interaction.customId.startsWith('poll_')) {
                 // Lógica para manejar votos de encuestas aquí...
                 // Necesitarías almacenar datos de la encuesta asociada al ID del botón/mensaje
                  await interaction.reply({ content: `Registrado voto para la opción ${interaction.customId.split('_')[2]} (Lógica pendiente)`, ephemeral: true });
             }
            // --- Otros Botones ---
             // else if (interaction.customId === 'otroBoton') { ... }
        }
        // --- Manejador de Menús Desplegables ---
         else if (interaction.isStringSelectMenu()) {
             // Ejemplo: si un comando usa menús
              if (interaction.customId === 'menu_seleccion') {
                  const selectedValue = interaction.values[0];
                  await interaction.reply({ content: `Seleccionaste: ${selectedValue} (Lógica pendiente)`, ephemeral: true });
              }
             // --- Otros Menús ---
             // else if (interaction.customId === 'otroMenu') { ... }
         }
    },
};
