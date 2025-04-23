const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('uptime')
        .setDescription('Muestra cuánto tiempo lleva el bot conectado.'),
    async execute(interaction, client) {
        const uptimeMs = Date.now() - client.readyTimestamp; // Tiempo desde que el evento 'ready' se disparó
        const uptimeString = ms(uptimeMs, { long: true }); // Formato legible

        // Obtener fecha/hora en que se inició (basado en readyTimestamp)
        const readyAt = new Date(client.readyTimestamp);
        // Usar hora local del bot (o especificar UTC si se prefiere)
        // const readyString = readyAt.toLocaleString('es-MX', { timeZone: 'America/Monterrey' }); // Ejemplo con zona horaria
        const readyString = `<t:${Math.floor(client.readyTimestamp / 1000)}:F>`; // Usar formato Discord

        const embed = createEmbed('⏱️ Tiempo de Actividad', `Llevo conectado **${uptimeString}**.`)
            .setColor(colors.success)
            .addFields({ name: '🚀 Iniciado el', value: readyString });
             // .setFooter({text: `Hora actual del bot: ${new Date().toLocaleTimeString()}`}); // Opcional

        await interaction.reply({ embeds: [embed] });
    },
};
