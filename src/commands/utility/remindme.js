const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed, colors } = require('../../utils/embeds');
const ms = require('ms');

// IMPORTANTE: Este almacenamiento es temporal y se pierde si el bot se reinicia.
// Para recordatorios persistentes, necesitas una base de datos y un sistema de tareas (ej. node-schedule).
const activeReminders = new Map(); // reminderId -> timeoutObject

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remindme')
        .setDescription('Establece un recordatorio personal.')
        .addStringOption(option =>
            option.setName('duracion')
                .setDescription('Tiempo hasta el recordatorio (ej: 5m, 1h, 2d, 1w).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('El mensaje que quieres recordar (opcional).')
                .setMaxLength(1000)
                .setRequired(false)),

    async execute(interaction, client) {
        const durationString = interaction.options.getString('duracion');
        const message = interaction.options.getString('mensaje') || '¡Tu recordatorio está listo!';
        const user = interaction.user;

        let durationMs;
        try {
            durationMs = ms(durationString);
            if (!durationMs || durationMs <= 0 || durationMs > ms('30d')) { // Limitar a 30 días como máximo razonable para setTimeout
                throw new Error('Duración inválida o demasiado larga (máx 30 días).');
            }
        } catch (e) {
            return interaction.reply({ embeds: [createErrorEmbed('Formato de duración inválido o fuera de rango (1s - 30d). Usa: `s`, `m`, `h`, `d`, `w`. Ej: `10m`, `2.5h`, `1d`.')], ephemeral: true });
        }

        const reminderTimestamp = Date.now() + durationMs;
        const reminderId = `${user.id}-${reminderTimestamp}`; // ID simple

        // --- Advertencia sobre Persistencia ---
        const warningPersistence = "\n\n**Importante:** Este recordatorio se perderá si el bot se reinicia antes de que se complete.";

        const confirmationEmbed = createSuccessEmbed('Recordatorio Establecido')
             .setDescription(`Te recordaré sobre "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}" <t:${Math.floor(reminderTimestamp / 1000)}:R>.${warningPersistence}`);

        await interaction.reply({ embeds: [confirmationEmbed], ephemeral: true });

        // Establecer el timeout
        const timeout = setTimeout(async () => {
            try {
                const reminderEmbed = createEmbed('⏰ ¡Recordatorio!', message, colors.warning) // Usar color warning para recordatorios
                    .addFields({ name: 'Establecido', value: `<t:${Math.floor((reminderTimestamp - durationMs) / 1000)}:R>`, inline: true });

                // Intentar enviar DM primero
                await user.send({ content: `${user}, aquí tienes tu recordatorio:`, embeds: [reminderEmbed] }).catch(async dmError => {
                    // Si falla el DM, intentar ping en el canal original (si aún existe y tenemos permisos)
                    console.warn(`[RemindMe] Falló DM a ${user.tag}, intentando ping en canal.`);
                    try {
                         // Obtener el canal original de forma segura
                         const originalChannel = await client.channels.fetch(interaction.channelId).catch(() => null);
                         if (originalChannel && originalChannel.isTextBased()) {
                            // Verificar permisos para enviar y mencionar
                            const botMember = await interaction.guild.members.fetch(client.user.id);
                            if (botMember.permissionsIn(originalChannel).has(['SendMessages', 'ViewChannel'])) {
                                await originalChannel.send({ content: `${user}, aquí tienes tu recordatorio (no pude enviarte DM):`, embeds: [reminderEmbed] });
                            } else {
                                 console.error(`[RemindMe] Sin permisos para enviar/ver en canal ${interaction.channelId}`);
                            }
                         } else {
                              console.error(`[RemindMe] Canal original ${interaction.channelId} no encontrado o no es de texto.`);
                         }
                    } catch (channelError) {
                        console.error(`[RemindMe] Error enviando recordatorio al canal ${interaction.channelId}:`, channelError);
                    }
                });

            } catch (error) {
                console.error(`[RemindMe] Error procesando recordatorio ${reminderId}:`, error);
            } finally {
                activeReminders.delete(reminderId); // Limpiar de la lista activa
            }
        }, durationMs);

        activeReminders.set(reminderId, timeout); // Guardar referencia al timeout (para posible cancelación futura)
    },
    // Opcional: Añadir subcomando para cancelar recordatorios (requeriría listar IDs y usar clearTimeout(activeReminders.get(id)))
};
