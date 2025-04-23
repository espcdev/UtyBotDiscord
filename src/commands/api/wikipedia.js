const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wikipedia')
        .setDescription('Busca un resumen de un artículo en Wikipedia (ES).')
        .addStringOption(option =>
            option.setName('busqueda')
                .setDescription('El término o título a buscar en Wikipedia.')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('busqueda');
        await interaction.deferReply();

        // Usar API de Wikipedia en Español (MediaWiki action=query)
        // opensearch devuelve sugerencias, query+extracts devuelve contenido
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageimages&exintro=true&explaintext=true&redirects=1&piprop=thumbnail&pithumbsize=300&titles=${encodeURIComponent(query)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.query || !data.query.pages) {
                throw new Error('Respuesta inesperada de la API de Wikipedia.');
            }

            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0]; // Obtener el ID de la primera página devuelta

            // Verificar si la página existe o es inválida/missing
            if (pageId === '-1' || pages[pageId].missing) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró un artículo en Wikipedia para "${query}".`)] });
            }

            const page = pages[pageId];
            const title = page.title;
            const extract = page.extract ? page.extract.substring(0, 1500) + (page.extract.length > 1500 ? '...' : '') : 'No hay resumen disponible.'; // Acortar extracto
            const pageUrl = `https://es.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`; // Crear URL
            const thumbnailUrl = page.thumbnail?.source;


            const embed = createEmbed(`Wikipedia: ${title}`, extract)
                .setColor(colors.default)
                .setURL(pageUrl);

            if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
            }
            embed.setFooter({ text: 'Datos de Wikipedia (ES)' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Wikipedia] Error fetching data for ${query}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo buscar en Wikipedia: ${error.message}`)] });
        }
    },
};
