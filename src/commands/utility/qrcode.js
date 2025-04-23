// src/commands/utility/qrcode.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qrcode')
        .setDescription('Genera un código QR para un texto o URL.')
        .addStringOption(option =>
            option.setName('contenido')
                .setDescription('El texto o URL a convertir en código QR.')
                .setRequired(true)
                .setMaxLength(500)), // Limitar longitud por URL API
    async execute(interaction) {
        const content = interaction.options.getString('contenido');
        await interaction.deferReply({ ephemeral: true }); // Efímero, usualmente es para uso personal

        // Usar qrserver.com API (simple y sin clave)
        const qrSize = '250x250'; // Tamaño del QR
        const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=<span class="math-inline">\{qrSize\}&data\=</span>{encodeURIComponent(content)}`;

        try {
            // No necesitamos parsear JSON, solo usar la URL como imagen
            const embed = createEmbed('Código QR Generado', `QR para: \`${content.substring(0,100)}\``) // Mostrar inicio del contenido
                .setColor(colors.default)
                .setImage(apiUrl) // Usar URL de la API directamente como imagen
                .setFooter({ text: 'QR generado por goqr.me (qrserver.com)' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[QRCode] Error generating QR for "${content}":`, error);
            // Este error sería más bien si la interacción falla, la API en sí no suele fallar así
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo generar el código QR: ${error.message}`)] });
        }
    }
};
