// src/commands/general/serveremojis.js (Corregido v8 Final)
const { SlashCommandBuilder } = require('discord.js');
// Asegúrate que la ruta sea correcta desde /general/
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serveremojis')
        .setDescription('Muestra la lista de emojis personalizados de este servidor.'),
    async execute(interaction) {
        // Verificar que se usa en un servidor
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply();

        const guild = interaction.guild;
        // Usar caché es generalmente suficiente, fetch puede ser muy costoso
        const emojis = guild.emojis.cache;

        if (emojis.size === 0) {
            return interaction.editReply({ embeds: [createEmbed(`Emojis de ${guild.name}`, 'Este servidor no tiene emojis personalizados.')] });
        }

        // Separar estáticos y animados
        const staticEmojis = emojis.filter(e => !e.animated);
        const animatedEmojis = emojis.filter(e => e.animated);

        // Función para formatear la lista y limitar la longitud
        const formatList = (emojiCollection, limit = 50) => { // Aumentar límite un poco
             if (emojiCollection.size === 0) return '*Ninguno*';
             // Mapear a string (mostrando el emoji)
             const emojiStrings = emojiCollection.map(e => `${e}`);
             let list = emojiStrings.join(' ');

             // Acortar si excede un límite razonable de caracteres para un campo de embed
             const maxLength = 1000;
             if (list.length > maxLength) {
                // Intentar cortar por emoji, no por caracter
                let shortList = '';
                let currentLength = 0;
                let count = 0;
                for (const emojiStr of emojiStrings) {
                    if (currentLength + emojiStr.length + 1 <= maxLength - 20 && count < limit) { // Dejar espacio para "..."
                        shortList += emojiStr + ' ';
                        currentLength += emojiStr.length + 1;
                        count++;
                    } else {
                        break;
                    }
                }
                 list = shortList.trim() + ` ... (${emojiCollection.size - count} más)`;
             }
             return list;
        };

        // Formatear las listas
        const staticList = formatList(staticEmojis);
        const animatedList = formatList(animatedEmojis);

        // --- CORRECCIÓN AQUÍ: Usar Backticks ` ` para el título del Embed ---
        const embed = createEmbed(`Emojis de ${guild.name} (${emojis.size} en total)`, '')
        // -----------------------------------------------------------------
            .setColor(colors.default)
            .addFields(
                { name: `Estáticos (${staticEmojis.size})`, value: staticList || '*Ninguno*', inline: false }, // Añadir fallback por si acaso
                { name: `Animados (${animatedEmojis.size})`, value: animatedList || '*Ninguno*', inline: false }
            )
            .setFooter({text: `Mostrando hasta ~50 de cada tipo si la lista es muy larga.`}); // Ajustar texto footer


        await interaction.editReply({ embeds: [embed] });
    }
};
