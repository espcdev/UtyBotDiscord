const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manga')
        .setDescription('Busca información sobre un manga.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('El título del manga a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('titulo');
        await interaction.deferReply();

        // Usar Jikan API v4 para buscar manga
        const apiUrl = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1&sfw`; // Limitar a 1 resultado SFW

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !Array.isArray(data.data) || data.data.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró ningún manga que coincida con "${query}".`)] });
            }

            const manga = data.data[0]; // Tomar el primer resultado

            // Limpiar sinopsis y manejar casos nulos
            const synopsis = manga.synopsis ? manga.synopsis.substring(0, 1000) + (manga.synopsis.length > 1000 ? '...' : '') : 'Sin sinopsis.';
            const score = manga.score ? `${manga.score}/10` : 'N/A';
            const chapters = manga.chapters || 'N/A';
            const volumes = manga.volumes || 'N/A';
            const status = manga.status || 'N/A';
            const published = manga.published?.string || 'N/A';
             const authors = manga.authors?.map(a => a.name).join(', ') || 'N/A';
             const genres = manga.genres?.map(g => g.name).join(', ') || 'N/A';
             const demographics = manga.demographics?.map(d => d.name).join(', ') || 'N/A';


            const embed = createEmbed(`${manga.title_japanese || ''} ${manga.title}`, synopsis.substring(0, 1024))
                .setColor(colors.default)
                .setURL(manga.url || null) // Link a MyAnimeList si está disponible
                .addFields(
                    { name: '⭐ Puntuación', value: score, inline: true },
                    { name: '📖 Capítulos', value: `${chapters}`, inline: true },
                    { name: '📚 Volúmenes', value: `${volumes}`, inline: true },

                    { name: '📊 Estado', value: status, inline: true },
                    { name: '📅 Publicación', value: published, inline: true },
                     { name: '✍️ Autor(es)', value: authors, inline: true },

                     { name: '🎭 Género(s)', value: genres.substring(0, 1020) || 'N/A', inline: false }, // Acortar géneros
                     { name: '🎯 Demografía', value: demographics || 'N/A', inline: false },
                );

            // Añadir imagen si está disponible
            if (manga.images?.jpg?.large_image_url) {
                 embed.setThumbnail(manga.images.jpg.large_image_url);
            } else if (manga.images?.jpg?.image_url) {
                 embed.setThumbnail(manga.images.jpg.image_url);
            }

            embed.setFooter({ text: `Datos de Jikan API (MyAnimeList) | ID: ${manga.mal_id || 'N/A'}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Manga] Error fetching data for ${query}:`, error);
            if (error.message.includes('429')) {
                 await interaction.editReply({ embeds: [createErrorEmbed('Se ha alcanzado el límite de peticiones a la API de Jikan. Intenta de nuevo más tarde.')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información del manga: ${error.message}`)] });
            }
        }
    },
};
