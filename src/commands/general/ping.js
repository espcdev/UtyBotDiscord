const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Muestra la latencia del bot.'),
    async execute(interaction, client) { // Recibe client
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = client.ws.ping; // Accede a client.ws.ping
        const embed = createEmbed('Pong! 🏓', `Latencia API: ${latency}ms\nLatencia WebSocket: ${wsLatency}ms`);
        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
