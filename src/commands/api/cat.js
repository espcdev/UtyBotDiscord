// src/commands/api/cat.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { CAT_API_KEY } = process.env; // Clave opcional

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Muestra una imagen aleatoria de un gato.'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://api.thecatapi.com/v1/images/search';
        const options = {};
        // Añadir clave API si está configurada para obtener más funcionalidades/límites
        if (CAT_API_KEY) {
            options.headers = { 'x-api-key': CAT_API_KEY };
        }

        try {
            const data = await makeApiRequest(apiUrl, options);

            // La API devuelve un array con un objeto de imagen
            if (!Array.isArray(data) || data.length === 0 || !data[0].url) {
                throw new Error('Respuesta inesperada de TheCatAPI.');
            }

            const imageUrl = data[0].url;
            const imageId = data[0].id;

            const embed = createEmbed('🐱 ¡Miau!', '')
                .setColor(colors.default)
                .setImage(imageUrl)
                .setFooter({ text: `ID: ${imageId} | via thecatapi.com` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Cat] Error fetching cat image:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener una imagen de gato: ${error.message}`)] });
        }
    }
};
