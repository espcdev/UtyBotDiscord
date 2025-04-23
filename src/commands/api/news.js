const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { NEWS_API_KEY } = process.env;

// Lista básica de códigos de país soportados por NewsAPI (puedes expandirla)
// Ver: https://newsapi.org/docs/endpoints/top-headlines
const supportedCountries = ['ae', 'ar', 'at', 'au', 'be', 'bg', 'br', 'ca', 'ch', 'cn', 'co', 'cu', 'cz', 'de', 'eg', 'fr', 'gb', 'gr', 'hk', 'hu', 'id', 'ie', 'il', 'in', 'it', 'jp', 'kr', 'lt', 'lv', 'ma', 'mx', 'my', 'ng', 'nl', 'no', 'nz', 'ph', 'pl', 'pt', 'ro', 'rs', 'ru', 'sa', 'se', 'sg', 'si', 'sk', 'th', 'tr', 'tw', 'ua', 'us', 've', 'za'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('Muestra los titulares de noticias más recientes.')
        .addStringOption(option =>
            option.setName('pais')
                .setDescription(`Código de país (2 letras, ej: mx, us, gb, ar). Por defecto: mx`)
                .setRequired(false)
                .setMaxLength(2))
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('Filtrar por categoría (opcional).')
                .setRequired(false)
                .addChoices( // Categorías comunes de NewsAPI
                    { name: 'Negocios', value: 'business' },
                    { name: 'Entretenimiento', value: 'entertainment' },
                    { name: 'General', value: 'general' },
                    { name: 'Salud', value: 'health' },
                    { name: 'Ciencia', value: 'science' },
                    { name: 'Deportes', value: 'sports' },
                    { name: 'Tecnología', value: 'technology' }
                ))
        .addStringOption(option =>
            option.setName('busqueda')
                .setDescription('Buscar noticias sobre un tema específico (ignora país/categoría).')
                .setRequired(false)),
    async execute(interaction) {
        if (!NEWS_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando de noticias no está configurado. Falta la API Key de NewsAPI en `.env`.')], ephemeral: true });
        }

        const query = interaction.options.getString('busqueda');
        const country = interaction.options.getString('pais')?.toLowerCase() || 'mx'; // Default Mexico
        const category = interaction.options.getString('categoria');

        await interaction.deferReply();

        let apiUrl;
        let embedTitle = '📰 Noticias Principales';

        if (query) {
            // Usar endpoint 'everything' para búsquedas
            apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&apiKey=${NEWS_API_KEY}&pageSize=5&sortBy=relevancy&language=es`; // Max 5 artículos, ordenar por relevancia, preferir español
             embedTitle = `📰 Noticias sobre: ${query}`;
        } else {
            // Usar endpoint 'top-headlines' para país/categoría
             if (!supportedCountries.includes(country)) {
                 return interaction.editReply({ embeds: [createErrorEmbed(`El código de país "${country}" no es válido o no está soportado. Países soportados: ${supportedCountries.slice(0,10).join(', ')}...`)] });
             }
             apiUrl = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${NEWS_API_KEY}&pageSize=5`; // Max 5 artículos
             embedTitle = `📰 Noticias Principales de ${country.toUpperCase()}`;
             if (category) {
                 apiUrl += `&category=${category}`;
                 embedTitle += ` (Categoría: ${category})`;
             }
        }


        try {
            const data = await makeApiRequest(apiUrl);

            if (data.status !== 'ok' || !data.articles || data.articles.length === 0) {
                 let errorMessage = `No se encontraron noticias`;
                 if (query) errorMessage += ` para "${query}"`;
                 else errorMessage += ` para ${country.toUpperCase()}${category ? ' en la categoría ' + category : ''}`;
                 if(data.code === 'rateLimited') errorMessage = 'Se alcanzó el límite de la API de NewsAPI.';
                 else if (data.message) errorMessage += `: ${data.message}`;

                 return interaction.editReply({ embeds: [createErrorEmbed(errorMessage)] });
            }

            const articles = data.articles; // Ya limitado a 5 por pageSize

            const embed = new EmbedBuilder()
                .setTitle(embedTitle)
                .setColor(colors.default)
                .setTimestamp();
                // .setFooter({ text: 'Noticias proporcionadas por NewsAPI.org' }); // Footer se añade abajo

            articles.forEach((article, index) => {
                 // Limitar longitud de título y descripción
                 const title = article.title?.substring(0, 250) || 'Título no disponible';
                 const description = article.description?.substring(0, 300) || 'Descripción no disponible.';
                 const source = article.source?.name || 'Fuente desconocida';
                 const url = article.url;
                 //const publishedAt = article.publishedAt ? `<t:${Math.floor(new Date(article.publishedAt).getTime() / 1000)}:R>` : '';

                 embed.addFields({
                     name: `${index + 1}. ${title} (${source})`,
                     value: `${description} [Leer más](${url})`, // Link en la descripción
                     inline: false
                 });
            });

             embed.setFooter({ text: `Total resultados: ${data.totalResults} | Noticias de NewsAPI.org` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[News] Error fetching news:`, error);
            // Manejar errores específicos de NewsAPI si son necesarios (ej. invalid key)
             if (error.message.includes('apiKeyInvalid')) {
                await interaction.editReply({ embeds: [createErrorEmbed('La API Key de NewsAPI no es válida.')] });
             } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener las noticias: ${error.message}`)] });
             }
        }
    },
};
