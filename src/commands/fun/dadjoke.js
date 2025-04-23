// src/commands/fun/dadjoke.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dadjoke')
        .setDescription('Cuenta un chiste de papá (en inglés).'),
    async execute(interaction) {
        await interaction.deferReply();
        const apiUrl = 'https://icanhazdadjoke.com/';
        // Esta API requiere una cabecera 'Accept' específica para obtener JSON
        const options = {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'UTYBot Discord Bot (https://utybot.pages.dev)' // Buena práctica: identificarse
            }
        };

        try {
            const data = await makeApiRequest(apiUrl, options);

            if (!data || data.status !== 200 || !data.joke) {
                console.error("[DadJoke] Invalid response:", data);
                throw new Error('La API no devolvió un chiste válido.');
            }

            const embed = createEmbed('🧔 Chiste de Papá', data.joke)
                .setColor(colors.default)
                .setFooter({ text: 'via icanhazdadjoke.com' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[DadJoke] Error fetching joke:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el chiste: ${error.message}`)] });
        }
    }
};
