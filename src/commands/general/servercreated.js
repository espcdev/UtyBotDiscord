// src/commands/general/servercreated.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servercreated')
        .setDescription('Muestra la fecha de creación de este servidor.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }

        const guild = interaction.guild;
        const createdAt = guild.createdAt; // Objeto Date
        const timestamp = Math.floor(createdAt.getTime() / 1000); // Timestamp Unix

        const embed = createEmbed(`📅 Creación de ${guild.name}`, `Este servidor fue creado el <t:<span class="math-inline">\{timestamp\}\:F\> \(<t\:</span>{timestamp}:R>).`)
            .setColor(colors.default)
            .setTimestamp(createdAt); // Establecer timestamp del embed a la fecha de creación

        await interaction.reply({ embeds: [embed] });
    }
};
