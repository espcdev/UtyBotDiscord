// src/commands/utility/calculate.js
const { SlashCommandBuilder } = require('discord.js');
const { create, all } = require('mathjs'); // Importar mathjs
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Configurar instancia de mathjs (limitada por seguridad)
const math = create(all, {
    // Deshabilitar funciones potencialmente peligrosas si se quisiera más seguridad
    // matrix: 'Array', // Usar arrays simples en lugar de matrices complejas
    // subset: 'Array',
    // evaluate: undefined, // Deshabilitar evaluate dentro de evaluate
});
const limitedEvaluate = math.evaluate;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculate')
        .setDescription('Calcula una expresión matemática.')
        .addStringOption(option =>
            option.setName('expresion')
                .setDescription('La expresión a calcular (ej: 2 * (3 + 4) / sin(pi/2) )')
                .setRequired(true)),
    async execute(interaction) {
        const expression = interaction.options.getString('expresion');
        // No deferir, usualmente es rápido

        try {
            // Evaluar la expresión de forma segura con mathjs
            const result = limitedEvaluate(expression);

            // Validar resultado (evitar funciones, objetos complejos)
            if (typeof result === 'function' || typeof result === 'object' && result !== null && !Array.isArray(result)) {
                 throw new Error('Expresión inválida o resultó en un tipo no soportado.');
            }

            // Formatear resultado
            let resultString = math.format(result, { precision: 10 }); // Limitar precisión

            const embed = createEmbed('🧮 Calculadora', `\`\`\`\n${expression}\n= ${resultString}\n\`\`\``)
                .setColor(colors.success);

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Calculate] Error evaluating "${expression}":`, error);
            await interaction.reply({ embeds: [createErrorEmbed(`Error al calcular: ${error.message}`)], ephemeral: true });
        }
    }
};
