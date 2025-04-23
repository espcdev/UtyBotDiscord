const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Formateador de moneda simple
const formatSimpleCurrency = (value, currencyCode) => {
     // Intl.NumberFormat puede ser complejo con códigos no estándar
     return `${value.toFixed(2)} ${currencyCode.toUpperCase()}`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('currency')
        .setDescription('Convierte una cantidad entre dos divisas.')
        .addNumberOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a convertir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('desde')
                .setDescription('Código de la divisa origen (ej: USD, EUR, MXN).')
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(3)) // Códigos ISO 4217
        .addStringOption(option =>
            option.setName('hacia')
                .setDescription('Código de la divisa destino (ej: USD, EUR, MXN).')
                .setRequired(true)
                .setMinLength(3)
                .setMaxLength(3)),
    async execute(interaction) {
        const amount = interaction.options.getNumber('cantidad');
        const fromCurrency = interaction.options.getString('desde').toUpperCase();
        const toCurrency = interaction.options.getString('hacia').toUpperCase();

        await interaction.deferReply();

        if (fromCurrency === toCurrency) {
             return interaction.editReply({ embeds: [createErrorEmbed('Las divisas de origen y destino no pueden ser las mismas.')] });
        }

        // Usar Frankfurter.app (API pública y gratuita, datos del BCE)
        // Obtiene la tasa más reciente
        const apiUrl = `https://api.frankfurter.app/latest?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.rates || !data.rates[toCurrency]) {
                 console.error("[Currency] Respuesta inesperada de Frankfurter:", data);
                 // Intentar obtener mensaje de error si la API lo proporciona
                 if (data && data.message) {
                     throw new Error(data.message); // Relanzar error de la API (ej. invalid currency)
                 }
                 throw new Error('La API no devolvió la tasa de conversión esperada.');
            }

            const convertedAmount = data.rates[toCurrency];
            const rateDate = data.date || 'más reciente'; // Fecha de la tasa

            const embed = createEmbed(`🪙 Conversión de Divisa`,
                `**${formatSimpleCurrency(amount, fromCurrency)}** equivale aproximadamente a **${formatSimpleCurrency(convertedAmount, toCurrency)}**`)
                .setColor(colors.success)
                .setFooter({ text: `Tasa de cambio del ${rateDate} | Datos de Frankfurter.app (BCE)` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Currency] Error converting ${amount} ${fromCurrency} to ${toCurrency}:`, error);
             // Frankfurter devuelve errores claros en 'message' para divisas inválidas (ej: "Invalid 'from' parameter")
             if (error.message.toLowerCase().includes('invalid') && (error.message.toLowerCase().includes('from') || error.message.toLowerCase().includes('to'))) {
                  await interaction.editReply({ embeds: [createErrorEmbed(`Una de las divisas ("${fromCurrency}" o "${toCurrency}") no es válida o soportada.`)] });
             }
             else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo realizar la conversión: ${error.message}`)] });
             }
        }
    },
};
