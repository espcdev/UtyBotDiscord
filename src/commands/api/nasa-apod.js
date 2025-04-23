const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { NASA_API_KEY } = process.env;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nasa-apod')
        .setDescription('Muestra la Imagen Astronómica del Día de la NASA.')
        .addStringOption(option =>
            option.setName('fecha')
            .setDescription('Fecha opcional (YYYY-MM-DD) para ver una imagen pasada.')
            .setRequired(false)),
    async execute(interaction) {
        if (!NASA_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('Comando APOD no configurado. Falta API Key de NASA en `.env`. (Puedes usar DEMO_KEY para pruebas limitadas).')], ephemeral: true });
        }

        const date = interaction.options.getString('fecha');
        await interaction.deferReply();

        let apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;
        if (date) {
            // Validar formato YYYY-MM-DD básico
             if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                 return interaction.editReply({ embeds: [createErrorEmbed('El formato de fecha debe ser YYYY-MM-DD.')] });
             }
            apiUrl += `&date=${date}`;
        }

        try {
            const data = await makeApiRequest(apiUrl);

             if (!data || !data.title) {
                  console.error("[APOD] Respuesta inesperada de NASA API:", data);
                  // Verificar si es un error por fecha fuera de rango
                  if (data.msg && data.msg.toLowerCase().includes('date must be')) {
                      throw new Error(data.msg); // Relanzar mensaje de error de la API
                  }
                  throw new Error('La API no devolvió los datos esperados.');
             }


            const embed = createEmbed(`🔭 APOD: ${data.title}`, data.explanation?.substring(0, 2000) + (data.explanation?.length > 2000 ? '...' : '')) // Acortar explicación
                .setColor(colors.default)
                .setFooter({ text: `Fecha: ${data.date || 'Hoy'} | ${data.copyright ? '© ' + data.copyright : 'NASA APOD'}` });

            // Añadir imagen o video
            if (data.media_type === 'image') {
                 if (data.hdurl) { // Preferir HD si está disponible
                     embed.setImage(data.hdurl);
                     // Opcional: Añadir botón para ver URL normal si HD es muy pesada
                     // embed.addFields({ name: '🖼️ Imagen (Definición Estándar)', value: `[Ver](${data.url})`});
                 } else if (data.url) {
                     embed.setImage(data.url);
                 }
            } else if (data.media_type === 'video') {
                 embed.addFields({ name: '🎬 Video del Día', value: `[Ver Video](${data.url})` });
                 // Opcional: usar thumbnail si existe (data.thumbnail_url)
                 if (data.thumbnail_url) {
                    embed.setThumbnail(data.thumbnail_url);
                 }
            }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[APOD] Error fetching data for date ${date || 'today'}:`, error);
             if (error.message.includes('400') && error.message.includes('date must be')) { // Error específico de fecha
                 await interaction.editReply({ embeds: [createErrorEmbed(`Error de la API de NASA: ${error.message}. Asegúrate de que la fecha sea válida y posterior a 1995-06-16.`)] });
             } else if (error.message.includes('403') || error.message.includes('API_KEY_INVALID')) {
                 await interaction.editReply({ embeds: [createErrorEmbed('La API Key de NASA no es válida o ha expirado.')] });
             } else if (error.message.includes('rate limit')) {
                  await interaction.editReply({ embeds: [createErrorEmbed('Se ha alcanzado el límite de peticiones a la API de NASA (DEMO_KEY es muy limitada).')] });
             }
             else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la imagen APOD: ${error.message}`)] });
            }
        }
    },
};
