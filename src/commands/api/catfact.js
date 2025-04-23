// src/commands/api/catfact.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('catfact')
        .setDescription('Muestra un dato curioso aleatorio sobre gatos.'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://catfact.ninja/fact';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.fact) {
                throw new Error('Respuesta inesperada de la API de datos de gatos.');
            }

            const fact = data.fact;

            const embed = createEmbed('🐈 Dato Gatuno', fact)
                .setColor(colors.default)
                .setFooter({ text: `Datos de catfact.ninja` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[CatFact] Error fetching cat fact:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener un dato gatuno: ${error.message}`)] });
        }
    }
};
