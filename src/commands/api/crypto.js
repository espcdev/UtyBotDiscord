const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Formateador de números para precios y capitalización
const formatCurrency = (value, currency = 'usd') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 8 : 2 }).format(value);
};
const formatLargeNumber = (value) => {
     return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypto')
        .setDescription('Muestra información sobre una criptomoneda.')
        .addStringOption(option =>
            option.setName('moneda')
                .setDescription('Nombre o símbolo de la criptomoneda (ej: bitcoin, ethereum, btc, eth).')
                .setRequired(true)
                .setAutocomplete(true)) // Usar autocompletado para buscar IDs
        .addStringOption(option =>
            option.setName('convertir_a')
                .setDescription('Moneda fiat para mostrar precios (ej: usd, eur, mxn, por defecto usd).')
                .setRequired(false)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue || focusedValue.length < 2) return interaction.respond([]); // No buscar con menos de 2 caracteres

        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(focusedValue)}`;

        try {
             // No usar makeApiRequest aquí ya que no necesitamos el manejo de errores estándar completo
             const response = await fetch(searchUrl);
             if (!response.ok) throw new Error(`API Search failed: ${response.status}`);
             const data = await response.json();

             if (!data.coins || data.coins.length === 0) return interaction.respond([]);

             // Mapear resultados para el autocompletado
             const choices = data.coins.slice(0, 10).map(coin => ({ // Limitar a 10 sugerencias
                 name: `${coin.name} (${coin.symbol.toUpperCase()})`, // Mostrar nombre y símbolo
                 value: coin.id // El valor debe ser el ID de CoinGecko
             }));

             await interaction.respond(choices);

        } catch (error) {
            console.error("[Crypto Autocomplete] Error fetching search:", error);
            await interaction.respond([]); // Devolver array vacío en caso de error
        }
    },

    async execute(interaction) {
        const cryptoId = interaction.options.getString('moneda'); // Esto será el ID de CoinGecko gracias al autocompletado
        const vsCurrency = interaction.options.getString('convertir_a')?.toLowerCase() || 'usd'; // Moneda fiat
        await interaction.deferReply();

        // Validar moneda fiat (CoinGecko soporta muchas, pero es bueno tener una lista básica o validar contra su API)
        // const supportedCurrencies = ['usd', 'eur', 'gbp', 'jpy', 'mxn', ...];
        // if (!supportedCurrencies.includes(vsCurrency)) { ... }

        const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&ids=${encodeURIComponent(cryptoId)}&order=market_cap_desc&per_page=1&page=1&sparkline=false&locale=en`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!Array.isArray(data) || data.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró información para la criptomoneda con ID "${cryptoId}" en ${vsCurrency.toUpperCase()}.`)] });
            }

            const coin = data[0];

            const price = coin.current_price;
            const marketCap = coin.market_cap;
            const volume = coin.total_volume;
            const high24h = coin.high_24h;
            const low24h = coin.low_24h;
            const priceChange24h = coin.price_change_percentage_24h; // Porcentaje

            const embed = createEmbed(`${coin.name} (${coin.symbol.toUpperCase()})`, `Precio actual y estadísticas en ${vsCurrency.toUpperCase()}`)
                .setColor(priceChange24h >= 0 ? colors.success : colors.error) // Verde si sube, rojo si baja
                .setThumbnail(coin.image) // URL de la imagen del icono
                .addFields(
                    { name: `Precio Actual`, value: formatCurrency(price, vsCurrency), inline: true },
                    { name: `Cambio (24h)`, value: `${priceChange24h?.toFixed(2) ?? 'N/A'}%`, inline: true },
                    { name: `Capitalización Mercado`, value: marketCap ? formatCurrency(marketCap, vsCurrency) : 'N/A', inline: true },

                    { name: `Volumen (24h)`, value: volume ? formatCurrency(volume, vsCurrency) : 'N/A', inline: true },
                    { name: `Máximo (24h)`, value: high24h ? formatCurrency(high24h, vsCurrency) : 'N/A', inline: true },
                    { name: `Mínimo (24h)`, value: low24h ? formatCurrency(low24h, vsCurrency) : 'N/A', inline: true },
                )
                 .setFooter({ text: `Datos de CoinGecko | ID: ${coin.id}` })
                 .setTimestamp(new Date(coin.last_updated)); // Usar timestamp de última actualización


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Crypto] Error fetching data for ${cryptoId}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información de la criptomoneda: ${error.message}`)] });
        }
    },
};
