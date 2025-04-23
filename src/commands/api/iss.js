// src/commands/api/iss.js (Corregido v8)
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('iss')
        .setDescription('Muestra la posición actual de la Estación Espacial Internacional (ISS).'),
    async execute(interaction) {
        await interaction.deferReply();
        // API pública para la posición de la ISS
        const apiUrl = 'https://api.wheretheiss.at/v1/satellites/25544'; // ID 25544 corresponde a la ISS

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || typeof data.latitude === 'undefined' || typeof data.longitude === 'undefined') {
                throw new Error('Respuesta inesperada de la API de la ISS.');
            }

            const latitude = data.latitude.toFixed(4);
            const longitude = data.longitude.toFixed(4);
            const altitude = data.altitude.toFixed(2); // km
            const velocity = data.velocity.toFixed(2); // km/h
            const visibility = data.visibility; // 'daylight', 'eclipsed'
            const timestamp = data.timestamp; // Unix timestamp

            // --- CORRECCIÓN AQUÍ: URL y Backticks ---
            // Usar formato estándar de query de Google Maps y backticks ` `
            const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            // ----------------------------------------

            const embed = createEmbed(`🛰️ Posición Actual de la ISS`, `Información en tiempo real.`)
                .setColor(colors.default)
                .addFields(
                    { name: '🌍 Latitud', value: `\`${latitude}°\``, inline: true },
                    { name: '🌍 Longitud', value: `\`${longitude}°\``, inline: true },
                    // --- Usar mapUrl corregido ---
                    { name: '🗺️ G-Maps', value: `[Ver Mapa](${mapUrl})`, inline: true },
                    // -----------------------------
                    { name: '🚀 Altitud', value: `${altitude} km`, inline: true },
                    { name: '💨 Velocidad', value: `${velocity} km/h`, inline: true },
                    { name: '☀️ Visibilidad', value: visibility === 'daylight' ? 'Luz diurna' : 'Eclipsada', inline: true }
                )
                .setFooter({ text: `Datos de wheretheiss.at` })
                .setTimestamp(timestamp * 1000); // Convertir timestamp Unix a ms

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[ISS] Error fetching ISS data:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la posición de la ISS: ${error.message}`)] });
        }
    }
};
