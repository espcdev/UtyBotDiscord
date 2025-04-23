// src/commands/fun/fox.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fox')
        .setDescription('Muestra una imagen aleatoria de un zorro.'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://randomfox.ca/floof/';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.image) {
                throw new Error('Respuesta inesperada de la API de zorros.');
            }

            const imageUrl = data.image;

            const embed = createEmbed('🦊 ¡Un Zorro!', '')
                .setColor(colors.default)
                .setImage(imageUrl)
                .setFooter({ text: 'Imagen de randomfox.ca' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Fox] Error fetching fox image:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener una imagen de zorro: ${error.message}`)] });
        }
    }
};
