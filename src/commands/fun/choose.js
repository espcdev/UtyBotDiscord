// src/commands/fun/choose.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Elijo aleatoriamente entre varias opciones que me des.')
        .addStringOption(option =>
            option.setName('opciones')
                .setDescription('Escribe las opciones separadas por coma (ej: Rojo, Azul, Verde).')
                .setRequired(true)),
    async execute(interaction) {
        const optionsString = interaction.options.getString('opciones');
        const options = optionsString.split(',')
                                   .map(opt => opt.trim()) // Quitar espacios extra
                                   .filter(opt => opt.length > 0); // Quitar opciones vacías

        if (options.length < 2) {
            return interaction.reply({ embeds: [createErrorEmbed('Necesito al menos dos opciones separadas por coma para poder elegir.')], ephemeral: true });
        }

        const randomIndex = Math.floor(Math.random() * options.length);
        const chosenOption = options[randomIndex];

        const embed = createEmbed('🤔 Mi Elección Es...', `De las opciones:\n*<span class="math-inline">\{options\.join\(', '\)\}\*\\n\\nHe elegido\: \*\*</span>{chosenOption}** ✨`, colors.success);

        await interaction.reply({ embeds: [embed] });
    }
};
