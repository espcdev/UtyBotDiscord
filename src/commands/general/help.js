// src/commands/general/help.js (Corregido v8 con Logs)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
// Asegúrate de que la ruta a embeds.js sea correcta desde esta ubicación
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra información sobre los comandos disponibles.')
        .addStringOption(option =>
            option.setName('comando')
                .setDescription('Obtener ayuda detallada sobre un comando específico.')
                .setRequired(false)
                .setAutocomplete(true)), // Mantenemos autocompletado

    async autocomplete(interaction, client) {
        // Lógica de autocompletado (sin cambios)
        const focusedValue = interaction.options.getFocused();
        // Filtrar comandos cacheados en el cliente
        const choices = Array.from(client.commands.keys())
                             .filter(cmdName => cmdName.startsWith(focusedValue))
                             .slice(0, 25); // Limitar a 25 opciones Discord
         try {
             await interaction.respond(
                choices.map(choice => ({ name: choice, value: choice })),
             );
         } catch (error) {
            console.error("[Help Autocomplete] Error respondiendo:", error);
         }
    },

    async execute(interaction, client) {
        const commandName = interaction.options.getString('comando');

        if (commandName) {
            // --- Lógica para ayuda específica (Revisada para usar imports correctos) ---
            const command = client.commands.get(commandName);
            if (!command || !command.data) { // Verificar que command.data exista
                return interaction.reply({ embeds: [createErrorEmbed(`No encontré un comando llamado \`/${commandName}\` o está mal formado.`)], ephemeral: true });
            }

            const embed = createEmbed(`Ayuda: /${command.data.name}`, command.data.description || 'Sin descripción proporcionada.')
                .setColor(colors.default);

            // Opciones del comando
            if (command.data.options && command.data.options.length > 0) {
                // Mapear opciones a string (asegurándose de que 'description' exista)
                let optionsString = command.data.options.map(opt => {
                    let name = `\`${opt.name}\``;
                    let desc = opt.description || 'Sin descripción.';
                    // Verificar si la opción tiene 'required' (algunos builders podrían no tenerlo por defecto)
                    let required = opt.required ? '(Requerido)' : '(Opcional)';
                    return `${name} ${required}: ${desc}`;
                }).join('\n');
                embed.addFields({ name: 'Opciones', value: optionsString.substring(0, 1024) }); // Limitar longitud
            }

            // Permisos (si están definidos en el export del comando)
             if (command.userPermissions && command.userPermissions.length > 0) {
                 embed.addFields({ name: 'Permisos Requeridos (Usuario)', value: '`' + command.userPermissions.map(p => p.constructor.name === 'BigInt' ? Object.keys(PermissionsBitField.Flags).find(key => PermissionsBitField.Flags[key] === p) : p).join(', ') + '`' });
             }
             if (command.botPermissions && command.botPermissions.length > 0) {
                 embed.addFields({ name: 'Permisos Requeridos (Bot)', value: '`' + command.botPermissions.map(p => p.constructor.name === 'BigInt' ? Object.keys(PermissionsBitField.Flags).find(key => PermissionsBitField.Flags[key] === p) : p).join(', ') + '`' });
             }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            // --- Fin lógica ayuda específica ---

        } else {
            // --- Lógica para lista general (CON LOGS Y MANEJO DE ERRORES) ---
            await interaction.deferReply({ ephemeral: true });
            const embed = createEmbed('Ayuda de UTYBot v8', 'Aquí tienes mis categorías de comandos. Usa `/help <comando>` para más detalles.')
                .setColor(colors.default);

            const commandsPath = path.join(__dirname, '..', '..', 'commands'); // Ir dos niveles arriba a src/commands/
            let hasErrors = false; // Flag para saber si hubo problemas

            try {
                const commandFolders = fs.readdirSync(commandsPath);

                for (const folder of commandFolders) {
                    const folderPath = path.join(commandsPath, folder);
                    // Comprobar si es directorio de forma segura
                    try {
                         if (!fs.statSync(folderPath).isDirectory()) continue;
                    } catch (statError){
                         console.warn(`[Help Command] No se pudo acceder a: ${folderPath}`, statError);
                         continue; // Saltar si no se puede leer el estado
                    }


                    console.log(`[Help Command] Procesando carpeta: ${folder}`); // LOG CARPETA

                    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
                    if (commandFiles.length === 0) continue;

                    // Mapear comandos CON MANEJO DE ERRORES INDIVIDUAL
                    const commandList = commandFiles.map(file => {
                         const filePath = path.join(folderPath, file);
                         console.log(`[Help Command] Intentando cargar: ${filePath}`); // LOG ARCHIVO
                         try {
                             // Limpiar caché por si acaso
                             delete require.cache[require.resolve(filePath)];
                             const command = require(filePath);

                             // Validar estructura básica del comando exportado
                             if (command && command.data && command.data.name) {
                                 return `\`/${command.data.name}\``;
                             } else {
                                 console.warn(`[Help Command] Archivo inválido (sin data.name o estructura incorrecta): ${filePath}`);
                                 hasErrors = true;
                                 return '`⚠️INVALIDO`'; // Indicar estructura inválida
                             }
                         } catch (requireError) {
                             console.error(`[Help Command] ¡FALLO AL CARGAR!: ${filePath}`, requireError);
                             // Log específico para el error que nos interesa
                             if (requireError instanceof SyntaxError && requireError.message.includes('Unexpected end of input')) {
                                console.error(`***** ¡ERROR 'Unexpected end of input' DETECTADO EN ${filePath}! Puede estar vacío o corrupto. *****`);
                             }
                             hasErrors = true;
                             return '`⚠️ERROR`'; // Indicar error general de carga
                         }
                     }).join(', '); // Fin de .map()

                     const categoryName = folder.charAt(0).toUpperCase() + folder.slice(1);
                      // Solo añadir campo si hay comandos (o errores) en la categoría
                      if (commandList) {
                          embed.addFields({ name: `📁 ${categoryName}`, value: commandList });
                      }

                } // Fin de for (carpetas)

                if (hasErrors) {
                     embed.setFooter({ text: '⚠️ Algunos comandos no se pudieron cargar. Revisa los logs del bot para más detalles.' });
                }

                await interaction.editReply({ embeds: [embed] });

            } catch (error) {
                 console.error("Error crítico leyendo carpetas/archivos de comandos en /help:", error);
                 await interaction.editReply({ embeds: [createErrorEmbed('Error al generar la lista de comandos. Revisa los logs.')] });
            }
             // --- Fin lógica lista general ---
        }
    },
}; // Fin de module.exports
