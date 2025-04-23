const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { ALPHA_VANTAGE_API_KEY } = process.env;

// Formateador simple para precios de acciones
const formatStockPrice = (value) => parseFloat(value).toFixed(2);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Muestra información sobre una acción (mercado USA por defecto).')
        .addStringOption(option =>
            option.setName('simbolo')
                .setDescription('El símbolo ticker de la acción (ej: AAPL, GOOGL, MSFT).')
                .setRequired(true)),
    async execute(interaction) {
        if (!ALPHA_VANTAGE_API_KEY || ALPHA_VANTAGE_API_KEY === 'YOUR_ALPHA_VANTAGE_KEY_HERE') {
            return interaction.reply({ embeds: [createErrorEmbed('El comando de acciones no está configurado. Falta la API Key de Alpha Vantage en `.env`.')], ephemeral: true });
        }

        const symbol = interaction.options.getString('simbolo').toUpperCase();
        await interaction.deferReply();

        // Alpha Vantage API para obtener la cotización global
        const apiUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;

        try {
            const data = await makeApiRequest(apiUrl);

            // Verificar si la respuesta principal y la cotización existen
            if (!data || !data['Global Quote']) {
                 console.error(`[Stock] Respuesta inesperada de Alpha Vantage para ${symbol}:`, data);
                 // Verificar si es un mensaje de límite de API
                 if (data && (data['Note'] || data['Information']) && (data['Note']?.includes('API call frequency') || data['Information']?.includes('API call frequency'))) {
                     throw new Error('Se ha alcanzado el límite de la API gratuita de Alpha Vantage (5 llamadas por minuto). Intenta de nuevo más tarde.');
                 }
                 throw new Error('La API no devolvió datos válidos.');
            }

            const quote = data['Global Quote'];

             // Verificar si la cotización está vacía (símbolo no encontrado)
             if (Object.keys(quote).length === 0) {
                 return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró información para el símbolo "${symbol}". Verifica que sea correcto.`)] });
             }


            // Extraer datos de la cotización
            const fetchedSymbol = quote['01. symbol'];
            const open = formatStockPrice(quote['02. open']);
            const high = formatStockPrice(quote['03. high']);
            const low = formatStockPrice(quote['04. low']);
            const price = formatStockPrice(quote['05. price']);
            const volume = parseInt(quote['06. volume']).toLocaleString('en-US'); // Formatear volumen
            const latestTradingDay = quote['07. latest trading day'];
            const previousClose = formatStockPrice(quote['08. previous close']);
            const change = formatStockPrice(quote['09. change']);
            const changePercent = parseFloat(quote['10. change percent'].replace('%', '')).toFixed(2); // Quitar '%' y formatear

            const embed = createEmbed(`📈 Acción: ${fetchedSymbol}`, `Cotización del ${latestTradingDay || 'día más reciente'}`)
                .setColor(parseFloat(change) >= 0 ? colors.success : colors.error)
                .setURL(`https://finance.yahoo.com/quote/${fetchedSymbol}`) // Link a Yahoo Finance
                .addFields(
                    { name: 'Precio Actual', value: `$${price}`, inline: true },
                    { name: 'Cambio Hoy', value: `$${change} (${changePercent}%)`, inline: true },
                    { name: 'Volumen', value: `${volume}`, inline: true },

                    { name: 'Apertura', value: `$${open}`, inline: true },
                    { name: 'Máximo Hoy', value: `$${high}`, inline: true },
                    { name: 'Mínimo Hoy', value: `$${low}`, inline: true },

                    { name: 'Cierre Anterior', value: `$${previousClose}`, inline: true },
                    { name: '\u200B', value: '\u200B', inline: true }, // Espacio
                    { name: '\u200B', value: '\u200B', inline: true }, // Espacio
                )
                 .setFooter({ text: 'Datos de Alpha Vantage. Pueden tener retraso.' });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Stock] Error fetching data for ${symbol}:`, error);
            // Manejar mensaje específico de límite de API
            if (error.message.includes('API call frequency')) {
                await interaction.editReply({ embeds: [createErrorEmbed(error.message)] });
            }
            else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información de la acción: ${error.message}`)] });
            }
        }
    },
};
