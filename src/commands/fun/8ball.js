// src/commands/fun/8ball.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

const responses = [
    // Positivas
    "En mi opinión, sí.",
    "Es cierto.",
    "Es decididamente así.",
    "Probablemente.",
    "Buen pronóstico.",
    "Todo apunta a que sí.",
    "Sin duda.",
    "Sí.",
    "Sí - definitivamente.",
    "Debes confiar en ello.",
    // Neutrales
    "Respuesta vaga, vuelve a intentarlo.",
    "Pregunta en otro momento.",
    "Será mejor que no te lo diga ahora.",
    "No puedo predecirlo ahora.",
    "Concéntrate y vuelve a preguntar.",
    // Negativas
    "No cuentes con ello.",
    "Mi respuesta es no.",
    "Mis fuentes me dicen que no.",
    "Las perspectivas no son buenas.",
    "Muy dudoso."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Pregúntale a la bola 8 mágica.')
        .addStringOption(option =>
            option.setName('pregunta')
                .setDescription('La pregunta que quieres hacerle a la bola 8.')
                .setRequired(true)),
    async execute(interaction) {
        const question = interaction.options.getString('pregunta');
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        const embed = createEmbed('🎱 Bola 8 Mágica', `❓ **Tu Pregunta:** ${question}\n\n💬 **Mi Respuesta:** ${randomResponse}`)
            .setColor(colors.default); // Podrías colorear según el tipo de respuesta

        await interaction.reply({ embeds: [embed] });
    }
};
