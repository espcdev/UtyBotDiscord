const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { OMDB_API_KEY } = process.env;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('movie')
        .setDescription('Busca información sobre una película.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('El título de la película a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        if (!OMDB_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando de películas no está configurado. Falta la API Key de OMDB en `.env`.')], ephemeral: true });
        }

        const title = interaction.options.getString('titulo');
        await interaction.deferReply();

        // Usar 't' para buscar por título exacto. 's' busca y devuelve una lista.
        const apiUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}&plot=short`; // plot=short o full

        try {
            const data = await makeApiRequest(apiUrl);

            // OMDB devuelve Response: "False" si no encuentra la película
            if (data.Response === 'False') {
                 return interaction.editReply({ embeds: [createErrorEmbed(data.Error || `No se encontró la película "${title}".`)] });
            }

             // Verificar que tenemos datos esenciales
             if (!data.Title || !data.Year) {
                  console.error("[Movie] Respuesta inesperada de OMDB:", data);
                  throw new Error('La API devolvió datos incompletos.');
             }

            const embed = createEmbed(`${data.Title} (${data.Year})`, data.Plot || 'Sin sinopsis.')
                .setColor(colors.default)
                 .addFields(
                     { name: '🎬 Director', value: data.Director || 'N/A', inline: true },
                     { name: '🎭 Actores', value: data.Actors || 'N/A', inline: true },
                     { name: '⭐ Género', value: data.Genre || 'N/A', inline: true },

                     { name: '⏳ Duración', value: data.Runtime || 'N/A', inline: true },
                     { name: '🔞 Clasificación', value: data.Rated || 'N/A', inline: true },
                     { name: '📅 Estreno', value: data.Released || 'N/A', inline: true },

                     //{ name: '🏆 Premios', value: data.Awards || 'N/A', inline: false },
                     //{ name: ' Idioma', value: data.Language || 'N/A', inline: true},
                     //{ name: ' País', value: data.Country || 'N/A', inline: true},
                 );

             // Añadir ratings si existen
            if (data.Ratings && data.Ratings.length > 0) {
                let ratingsString = data.Ratings.map(r => `${r.Source}: ${r.Value}`).join('\n');
                embed.addFields({ name: '📊 Calificaciones', value: ratingsString.substring(0, 1020), inline: false }); // Acortar si es muy largo
            } else {
                 embed.addFields({ name: '📊 Calificaciones', value: data.imdbRating ? `IMDb: ${data.imdbRating}/10` : 'N/A', inline: true }); // Mostrar solo IMDb si existe
            }

            // Añadir poster si existe
            if (data.Poster && data.Poster !== 'N/A') {
                embed.setThumbnail(data.Poster);
            }

             embed.setFooter({ text: `Datos de OMDB API | IMDb ID: ${data.imdbID || 'N/A'}` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Movie] Error fetching data for ${title}:`, error);
             if (error.message.includes('Invalid API key')) {
                await interaction.editReply({ embeds: [createErrorEmbed('La API Key de OMDB no es válida.')] });
             } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información de la película: ${error.message}`)] });
             }
        }
    },
};
