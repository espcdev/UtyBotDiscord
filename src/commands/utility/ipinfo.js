// src/commands/utility/ipinfo.js (Corregido v8 Final)
const { SlashCommandBuilder } = require('discord.js');
// Asegúrate que la ruta sea correcta desde /utility/
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, createWarningEmbed, colors } = require('../../utils/embeds');
const net = require('node:net'); // Para validar IP

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ipinfo')
        .setDescription('Muestra información sobre una dirección IP pública.')
        .addStringOption(option =>
            option.setName('ip_address')
                .setDescription('La dirección IP a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const ipAddress = interaction.options.getString('ip_address');
        // Deferir como efímero por defecto
        await interaction.deferReply({ ephemeral: true });

        // Validar formato básico de IP (v4 o v6)
        if (!net.isIP(ipAddress)) {
             return interaction.editReply({ embeds: [createErrorEmbed('La dirección IP proporcionada no parece tener un formato válido.')] });
        }

        // API pública ip-api.com - Seleccionar campos necesarios
        const apiUrl = `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;

        try {
            // Realizar petición a la API
            const data = await makeApiRequest(apiUrl);

            // Verificar si la API reportó un fallo
            if (!data || data.status === 'fail') {
                throw new Error(data.message || 'No se encontró información para esa IP.');
            }

            // Construir el Embed
            // --- ASEGURAR BACKTICKS ` ` EN EL VALOR DEL CAMPO 'País' ---
            const embed = createEmbed(`ℹ️ Información IP: ${data.query}`, 'Geolocalización e ISP (aproximados)')
                .setColor(colors.default)
                .addFields(
                    // Usar backticks ` ` para interpolar correctamente
                    { name: '🌍 País', value: `**${data.country || 'N/A'}** (${data.countryCode || 'N/A'})`, inline: true },
                    { name: '🗺️ Región', value: data.regionName || 'N/A', inline: true },
                    { name: '🏙️ Ciudad', value: data.city || 'N/A', inline: true },
                    { name: '✉️ Cód. Postal', value: data.zip || 'N/A', inline: true },
                    { name: '📍 Latitud', value: `\`${data.lat || 'N/A'}\``, inline: true },
                    { name: '📍 Longitud', value: `\`${data.lon || 'N/A'}\``, inline: true },
                    { name: '🏢 ISP', value: data.isp || 'N/A', inline: false },
                    { name: '🏛️ Organización', value: data.org || 'N/A', inline: false },
                    { name: '📡 AS', value: data.as || 'N/A', inline: false },
                    { name: '🕒 Zona Horaria', value: data.timezone || 'N/A', inline: true }
                )
                 .setFooter({ text: 'Datos de ip-api.com | La geolocalización por IP puede ser imprecisa.' });
             // ----------------------------------------------------------

                 // Advertencia sobre privacidad
                const warningEmbed = createWarningEmbed('**Nota Importante:** Usa esta información de forma responsable. No uses este comando para obtener información de IPs privadas o para fines maliciosos.');

             // Enviar ambos embeds (info + advertencia)
             await interaction.editReply({ embeds: [embed, warningEmbed] });

        } catch (error) {
            // Manejar errores
            console.error(`[IPInfo] Error fetching data for ${ipAddress}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener información de la IP: ${error.message}`)] });
        }
    } // Fin execute
}; // Fin module.exports
