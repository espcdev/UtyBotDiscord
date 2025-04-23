const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createErrorEmbed, createEmbed } = require('../../utils/embeds'); // Solo necesitamos error embed aquí
const { TENOR_API_KEY } = process.env;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gif')
        .setDescription('Busca y envía un GIF animado usando Tenor.')
        .addStringOption(option =>
            option.setName('busqueda')
                .setDescription('El término de búsqueda para el GIF.')
                .setRequired(true)),
    async execute(interaction) {
        if (!TENOR_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando de GIF no está configurado. Falta la API Key de Tenor en `.env`.')], ephemeral: true });
        }

        const query = interaction.options.getString('busqueda');
        await interaction.deferReply();

        // Tenor API v2 (recomendada)
        const clientKey = interaction.client.user.id; // Usar ID del bot como client key (requerido por Tenor v2)
        const limit = 20; // Buscar varios para elegir uno aleatorio
        const mediaFilter = 'minimal'; // Obtener solo la URL del GIF principal
        const locale = 'es_MX'; // Preferir resultados en español/México
        const contentFilter = 'medium'; // Nivel de filtro de contenido (off, low, medium, high)

        const apiUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&client_key=${clientKey}&limit=${limit}&media_filter=${mediaFilter}&locale=${locale}&contentfilter=${contentFilter}`;


        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !Array.isArray(data.results) || data.results.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron GIFs para "${query}" con el filtro actual.`)] });
            }

            // Elegir un GIF aleatorio de los resultados
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const randomGif = data.results[randomIndex];

            // Obtener la URL del formato GIF
            const gifUrl = randomGif.media_formats?.gif?.url;

            if (!gifUrl) {
                 console.warn("[GIF] Resultado de Tenor no tenía URL de GIF:", randomGif);
                 return interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la URL del GIF seleccionado.`)] });
            }

            // Enviar solo la URL del GIF
            await interaction.editReply({ content: gifUrl });

        } catch (error) {
            console.error(`[GIF] Error fetching data for ${query}:`, error);
             if (error.message.includes('401') || error.message.includes('invalid key')) {
                 await interaction.editReply({ embeds: [createErrorEmbed('La API Key de Tenor no es válida o falta.')] });
             } else {
                  await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el GIF: ${error.message}`)] });
             }
        }
    },
};
