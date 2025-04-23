const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Lanza uno o más dados.')
        .addIntegerOption(option =>
            option.setName('dados')
                .setDescription('Número de dados a lanzar (1-25, por defecto 1)')
                .setMinValue(1)
                .setMaxValue(25) // Limitar para evitar abuso
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('caras')
                .setDescription('Número de caras por dado (2-100, por defecto 6)')
                .setMinValue(2)
                .setMaxValue(100) // Limitar
                .setRequired(false)),
    async execute(interaction) {
        const numDice = interaction.options.getInteger('dados') ?? 1;
        const numSides = interaction.options.getInteger('caras') ?? 6;
        let rolls = [];
        let total = 0;

        if (numDice * numSides > 5000) { // Prevenir resultados potencialmente enormes
             return interaction.reply({embeds: [createEmbed('Límite Excedido', 'La combinación de dados y caras es demasiado grande.', colors.error )], ephemeral: true});
        }

        for (let i = 0; i < numDice; i++) {
            const roll = Math.floor(Math.random() * numSides) + 1;
            rolls.push(roll);
            total += roll;
        }

        const embed = createEmbed(`🎲 Lanzamiento de ${numDice}d${numSides}`, `Resultados: \`${rolls.join(', ')}\`\n**Total: ${total}**`, colors.success); // Usar color éxito
        await interaction.reply({ embeds: [embed] });
    }
};
