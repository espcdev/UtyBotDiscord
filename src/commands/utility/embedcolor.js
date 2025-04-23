// src/commands/utility/embedcolor.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds'); // Solo necesitamos error

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedcolor')
        .setDescription('Muestra una previsualización de un color hexadecimal.')
        .addStringOption(option =>
            option.setName('hexcolor')
                .setDescription('El código de color hexadecimal (ej: #A020F0, #FFF).')
                .setRequired(true)),
    async execute(interaction) {
        const colorInput = interaction.options.getString('hexcolor');

        // Validar formato Hex básico
        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
        if (!hexColorRegex.test(colorInput)) {
            return interaction.reply({ embeds: [createErrorEmbed('Formato de color inválido. Usa un código hexadecimal como `#FF0000` o `#ABC`.')], ephemeral: true });
        }

        try {
            // Crear embed directamente con el color
            const embed = new EmbedBuilder()
                .setTitle(`Muestra de Color: ${colorInput.toUpperCase()}`)
                .setDescription(`Este embed usa el color \`${colorInput.toUpperCase()}\`.`)
                .setColor(colorInput); // Establecer color directamente

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
             // Capturar error si discord.js rechaza el color (raro con regex previa)
             console.error("[EmbedColor] Error:", error);
             await interaction.reply({ embeds: [createErrorEmbed('No se pudo mostrar ese color.')], ephemeral: true });
        }
    }
};
