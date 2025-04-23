// src/commands/fun/dicerollstats.js (Corregido v8 Final)
const { SlashCommandBuilder } = require('discord.js');
// Asegúrate que la ruta sea correcta desde /fun/
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dicerollstats')
        .setDescription('Lanza múltiples dados y muestra estadísticas.')
        .addIntegerOption(option =>
            option.setName('caras')
                .setDescription('Número de caras del dado (2-100, por defecto 6).')
                .setMinValue(2).setMaxValue(100).setRequired(false))
        .addIntegerOption(option =>
            option.setName('lanzamientos')
                .setDescription('Número de veces a lanzar el dado (1-100, por defecto 10).')
                .setMinValue(1).setMaxValue(100).setRequired(false)), // Limitar para evitar sobrecarga

    async execute(interaction) {
        const sides = interaction.options.getInteger('caras') ?? 6;
        const rollsCount = interaction.options.getInteger('lanzamientos') ?? 10;

        await interaction.deferReply();

        let rolls = [];
        let sum = 0;
        let minRoll = sides + 1;
        let maxRoll = 0;

        // Realizar lanzamientos
        for (let i = 0; i < rollsCount; i++) {
            const roll = Math.floor(Math.random() * sides) + 1;
            rolls.push(roll);
            sum += roll;
            if (roll < minRoll) minRoll = roll;
            if (roll > maxRoll) maxRoll = roll;
        }

        // Calcular promedio
        const average = (sum / rollsCount).toFixed(2);

        // Formatear lista de resultados (acortar si es necesario)
        const displayLimit = 25; // Límite de resultados a mostrar directamente
        const displayRolls = rolls.length > displayLimit
            ? rolls.slice(0, displayLimit).join(', ') + `... (${rollsCount - displayLimit} más)`
            : rolls.join(', ');

        // --- CORRECCIÓN AQUÍ: Usar Backticks ` ` para el título del Embed ---
        const embed = createEmbed(
            `📊 Estadísticas de ${rollsCount}d${sides}`, // Título con interpolación correcta
            `Resultados: \`${displayRolls}\``               // Descripción (ya usaba backticks para el code block)
        )
        // -----------------------------------------------------------------
            .setColor(colors.default) // Usar color por defecto
            .addFields(
                { name: 'Total Suma', value: `${sum.toLocaleString('es-MX')}`, inline: true }, // Formatear número
                { name: 'Promedio', value: `${average}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Espacio en blanco
                { name: 'Mínimo', value: `${minRoll}`, inline: true },
                { name: 'Máximo', value: `${maxRoll}`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }  // Espacio en blanco
            );

        // Enviar la respuesta
        await interaction.editReply({ embeds: [embed] });
    } // Fin execute
}; // Fin module.exports
