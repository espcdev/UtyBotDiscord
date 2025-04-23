// src/commands/api/numberfact.js
const { SlashCommandBuilder } = require('discord.js');
const { makeTextApiRequest } = require('../../utils/apiHelper'); // Usar text request
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('numberfact')
        .setDescription('Muestra un dato curioso sobre un número (o uno aleatorio).')
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('El número sobre el que quieres un dato (opcional).')
                .setRequired(false)),
    async execute(interaction) {
        const number = interaction.options.getInteger('numero');
        await interaction.deferReply();

        // API NumbersAPI.com
        const type = 'trivia'; // Puede ser 'trivia', 'math', 'date', 'year'
        const apiUrl = number !== null // Verificar si se proporcionó número
            ? `http://numbersapi.com/<span class="math-inline">\{number\}/</span>{type}`
            : `http://numbersapi.com/random/${type}`; // Número aleatorio si no se especifica

        try {
            // Esta API devuelve texto plano
            const fact = await makeTextApiRequest(apiUrl);

            if (!fact) {
                throw new Error('La API no devolvió un dato válido.');
            }

            const embed = createEmbed(`🔢 Dato Numérico ${number !== null ? `sobre ${number}` : '(Aleatorio)'}`, fact)
                .setColor(colors.default)
                .setFooter({ text: 'Datos de numbersapi.com' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[NumberFact] Error fetching fact for ${number ?? 'random'}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el dato numérico: ${error.message}`)] });
        }
    }
};
