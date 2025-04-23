// src/commands/fun/chucknorris.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chucknorris')
        .setDescription('Cuenta un dato aleatorio sobre Chuck Norris.'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://api.chucknorris.io/jokes/random';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.value || !data.icon_url) {
                throw new Error('Respuesta inesperada de la API de Chuck Norris.');
            }

            const joke = data.value;

            const embed = createEmbed('💪 Dato de Chuck Norris', joke)
                .setColor(colors.default)
                .setThumbnail(data.icon_url) // Icono de Chuck Norris
                .setURL(data.url || 'https://api.chucknorris.io')
                .setFooter({ text: 'via api.chucknorris.io' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[ChuckNorris] Error fetching joke:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el dato: ${error.message}`)] });
        }
    }
};
