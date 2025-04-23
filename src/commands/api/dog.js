// src/commands/api/dog.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dog')
        .setDescription('Muestra una imagen aleatoria de un perro.'),
    async execute(interaction) {
        await interaction.deferReply();
        // API pública dog.ceo
        const apiUrl = 'https://dog.ceo/api/breeds/image/random';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || data.status !== 'success' || !data.message) {
                throw new Error('Respuesta inesperada de la API de perros.');
            }

            const imageUrl = data.message; // La URL está directamente en 'message'

            const embed = createEmbed('🐶 ¡Guau!', '')
                .setColor(colors.default)
                .setImage(imageUrl)
                .setFooter({ text: 'Imagen de dog.ceo' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Dog] Error fetching dog image:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener una imagen de perro: ${error.message}`)] });
        }
    }
};
