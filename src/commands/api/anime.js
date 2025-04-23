const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Busca información sobre un anime.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('El título del anime a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('titulo');
        await interaction.deferReply();

        // Usar Jikan API v4 para buscar anime
        const apiUrl = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1&sfw`; // Limitar a 1 resultado SFW

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !Array.isArray(data.data) || data.data.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró ningún anime que coincida con "${query}".`)] });
            }

            const anime = data.data[0]; // Tomar el primer resultado

            // Limpiar sinopsis y manejar casos nulos
            const synopsis = anime.synopsis ? anime.synopsis.substring(0, 1000) + (anime.synopsis.length > 1000 ? '...' : '') : 'Sin sinopsis.';
            const score = anime.score ? `${anime.score}/10` : 'N/A';
            const episodes = anime.episodes || 'N/A';
            const status = anime.status || 'N/A';
            const aired = anime.aired?.string || 'N/A';
            const rating = anime.rating || 'N/A';
             const studios = anime.studios?.map(s => s.name).join(', ') || 'N/A';
             const genres = anime.genres?.map(g => g.name).join(', ') || 'N/A';


            const embed = createEmbed(`${anime.title_japanese || ''} ${anime.title}`, synopsis.substring(0, 1024))
                .setColor(colors.default)
                .setURL(anime.url || null) // Link a MyAnimeList si está disponible
                .addFields(
                    { name: '⭐ Puntuación', value: score, inline: true },
                    { name: '📺 Episodios', value: `${episodes}`, inline: true },
                    { name: '📊 Estado', value: status, inline: true },

                    { name: '📅 Emisión', value: aired, inline: true },
                    { name: '🔞 Clasificación', value: rating, inline: true },
                     { name: '🏢 Estudio(s)', value: studios, inline: true },

                     { name: '🎭 Género(s)', value: genres.substring(0, 1020) || 'N/A', inline: false }, // Acortar géneros
                );

            // Añadir imagen si está disponible
            if (anime.images?.jpg?.large_image_url) {
                 embed.setThumbnail(anime.images.jpg.large_image_url);
            } else if (anime.images?.jpg?.image_url) {
                 embed.setThumbnail(anime.images.jpg.image_url);
            }

            embed.setFooter({ text: `Datos de Jikan API (MyAnimeList) | ID: ${anime.mal_id || 'N/A'}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Anime] Error fetching data for ${query}:`, error);
            // Jikan puede dar 429 (Too Many Requests) o 500
            if (error.message.includes('429')) {
                 await interaction.editReply({ embeds: [createErrorEmbed('Se ha alcanzado el límite de peticiones a la API de Jikan. Intenta de nuevo más tarde.')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información del anime: ${error.message}`)] });
            }
        }
    },
};
