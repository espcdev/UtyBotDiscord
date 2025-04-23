const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
     data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Lanza una moneda al aire.'),
    async execute(interaction) {
        const result = Math.random() < 0.5 ? 'Cara' : 'Cruz';
        const icon = result === 'Cara' ? '🪙' : '👑'; // Ejemplo de iconos diferentes
        const embed = createEmbed(`${icon} Lanzamiento de Moneda`, `Ha salido: **${result}**`, colors.default);
        await interaction.reply({ embeds: [embed] });
    }
};
