// src/commands/fun/bigtext.js
const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');

// Mapeo de caracteres a emojis regionales/números/símbolos
const regionalMap = {
    'a': '🇦', 'b': '🇧', 'c': '🇨', 'd': '🇩', 'e': '🇪', 'f': '🇫', 'g': '🇬',
    'h': '🇭', 'i': '🇮', 'j': '🇯', 'k': '🇰', 'l': '🇱', 'm': '🇲', 'n': '🇳',
    'o': '🇴', 'p': '🇵', 'q': '🇶', 'r': '🇷', 's': '🇸', 't': '🇹',
    'u': '🇺', 'v': '🇻', 'w': '🇼', 'x': '🇽', 'y': '🇾', 'z': '🇿',
    '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣',
    '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣',
    '!': '❗', '?': '❓', '#': '#️⃣', '*': '*️⃣', '$': '💲', '+': '➕', '-': '➖',
    ' ': '  ' // Espacio doble para separar palabras
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bigtext')
        .setDescription('Convierte tu texto en letras grandes usando emojis.')
        .addStringOption(option =>
            option.setName('texto')
                .setDescription('El texto a convertir (solo letras A-Z, números y !?#*+-).')
                .setRequired(true)
                .setMaxLength(50)), // Limitar para evitar spam
    async execute(interaction) {
        const text = interaction.options.getString('texto').toLowerCase();
        let bigText = '';

        for (const char of text) {
            if (regionalMap[char]) {
                bigText += regionalMap[char] + ' '; // Añadir espacio entre letras emoji
            } else {
                // Si el caracter no está en el mapa, no lo añadimos o ponemos un placeholder
                // bigText += ' '; // O simplemente ignorar
            }
        }

        if (!bigText.trim()) {
            return interaction.reply({ embeds: [createErrorEmbed('El texto no contiene caracteres convertibles (A-Z, 0-9, !?#*+-).')], ephemeral: true });
        }

        // Enviar como mensaje normal (no embed)
        await interaction.reply({ content: bigText.trim() });
    }
};
