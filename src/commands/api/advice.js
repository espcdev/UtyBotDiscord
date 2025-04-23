// src/commands/api/advice.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('advice')
        .setDescription('Te da un consejo aleatorio.'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://api.adviceslip.com/advice';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.slip || !data.slip.advice) {
                throw new Error('Respuesta inesperada de la API de consejos.');
            }

            const advice = data.slip.advice;
            const adviceId = data.slip.id;

            const embed = createEmbed('💡 Consejo del Día', `"${advice}"`)
                .setColor(colors.default)
                .setFooter({ text: `Advice Slip #${adviceId}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Advice] Error fetching advice:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener un consejo: ${error.message}`)] });
        }
    }
};
