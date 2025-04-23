// src/commands/utility/charinfo.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('charinfo')
        .setDescription('Muestra información Unicode sobre un carácter.')
        .addStringOption(option =>
            option.setName('caracter')
                .setDescription('El carácter que quieres inspeccionar.')
                .setRequired(true)
                .setMaxLength(1)), // Asegurar que sea solo un caracter
    async execute(interaction) {
        const char = interaction.options.getString('caracter');

        // Validar que sea un solo caracter (aunque la opción tiene maxLength, doble check)
        if (!char || char.length !== 1) {
            // Nota: Algunos emojis compuestos pueden tener length > 1.
            // Esta implementación simple se centra en caracteres únicos.
            return interaction.reply({ embeds: [createErrorEmbed('Por favor, proporciona un único carácter.')], ephemeral: true });
        }

        try {
            const charCode = char.charCodeAt(0); // Código numérico decimal UTF-16
            const codePointHex = charCode.toString(16).toUpperCase().padStart(4, '0'); // Hexadecimal (U+xxxx)
            // Obtener el nombre oficial Unicode es complejo sin librerías/bases de datos grandes.
            // Nos limitaremos al punto de código.

            const embed = createEmbed(`ℹ️ Información del Carácter: ${char}`, '')
                .setColor(colors.default)
                .addFields(
                    { name: 'Carácter', value: `\`${char}\``, inline: true },
                    { name: 'Punto de Código (Dec)', value: `\`${charCode}\``, inline: true },
                    { name: 'Punto de Código (Hex)', value: `\`U+${codePointHex}\``, inline: true },
                    { name: 'URL Encode', value: `\`${encodeURIComponent(char)}\``, inline: true },
                    { name: 'HTML Entity (Dec)', value: `\`&#${charCode};\``, inline: true },
                    { name: 'HTML Entity (Hex)', value: `\`&#x${codePointHex};\``, inline: true },
                );

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("[CharInfo] Error:", error);
            await interaction.reply({ embeds: [createErrorEmbed(`No se pudo obtener información para el carácter "${char}".`)] , ephemeral: true});
        }
    }
};
