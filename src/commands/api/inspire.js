// src/commands/api/inspire.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inspire')
        .setDescription('Muestra una cita inspiradora aleatoria.'),
    async execute(interaction) {
        await interaction.deferReply();
        // Usar ZenQuotes API (gratuita, sin clave para random)
        const apiUrl = 'https://zenquotes.io/api/random';

        try {
            const data = await makeApiRequest(apiUrl);

            // La API devuelve un array con una cita
            if (!Array.isArray(data) || data.length === 0 || !data[0].q || !data[0].a) {
                throw new Error('Respuesta inesperada de la API de citas.');
            }

            const quote = data[0].q; // Cita
            const author = data[0].a; // Autor

            const embed = createEmbed('✨ Cita Inspiradora', `"${quote}"`)
                .setColor(colors.default)
                .setFooter({ text: `— ${author} | via ZenQuotes.io` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Inspire] Error fetching quote:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener una cita: ${error.message}`)] });
        }
    }
};
