// src/commands/api/covid.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('covid')
        .setDescription('Muestra estadísticas de COVID-19 globales o de un país.')
        .addStringOption(option =>
            option.setName('pais')
                .setDescription('Nombre del país (en inglés, ej: Mexico, Spain, USA) o dejar vacío para global.')
                .setRequired(false)),
    async execute(interaction) {
        const country = interaction.options.getString('pais');
        await interaction.deferReply();

        // API disease.sh v3
        const apiUrl = country
            ? `https://disease.sh/v3/covid-19/countries/${encodeURIComponent(country)}`
            : 'https://disease.sh/v3/covid-19/all';

        try {
            const data = await makeApiRequest(apiUrl);

            // La API devuelve "Country not found or doesn't have any cases" si falla
            if (!data || typeof data.cases === 'undefined') {
                if (data.message) { // Usar mensaje de error de la API si existe
                     throw new Error(data.message);
                }
                throw new Error('No se encontraron datos o respuesta inválida de la API.');
            }

            const location = country ? data.country : 'Global';
            const flag = country ? data.countryInfo?.flag : null; // URL de la bandera si es país

            const formatNum = (num) => num?.toLocaleString('es-MX') ?? 'N/A';

            const embed = createEmbed(`📊 Estadísticas COVID-19: ${location}`, `Datos actualizados <t:${Math.floor((data.updated || Date.now()) / 1000)}:R>`)
                .setColor(colors.warning) // Color advertencia/info
                .addFields(
                    // Totales
                    { name: ' Casos Totales', value: formatNum(data.cases), inline: true },
                    { name: ' Muertes Totales', value: formatNum(data.deaths), inline: true },
                    { name: ' Recuperados Totales', value: formatNum(data.recovered), inline: true },
                    // Hoy
                    { name: ' Casos Hoy', value: `+${formatNum(data.todayCases)}`, inline: true },
                    { name: ' Muertes Hoy', value: `+${formatNum(data.todayDeaths)}`, inline: true },
                    { name: ' Recuperados Hoy', value: `+${formatNum(data.todayRecovered)}`, inline: true },
                    // Activos/Críticos/Pruebas
                    { name: ' Casos Activos', value: formatNum(data.active), inline: true },
                    { name: ' Casos Críticos', value: formatNum(data.critical), inline: true },
                    { name: ' Pruebas Realizadas', value: formatNum(data.tests), inline: true },
                    // Por millón
                    { name: ' Casos / Millón', value: formatNum(data.casesPerOneMillion), inline: true },
                    { name: ' Muertes / Millón', value: formatNum(data.deathsPerOneMillion), inline: true },
                    { name: ' Pruebas / Millón', value: formatNum(data.testsPerOneMillion), inline: true },
                );

             if (flag) {
                 embed.setThumbnail(flag);
             }
             embed.setFooter({ text: 'Datos de disease.sh' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Covid] Error fetching data for ${country || 'all'}:`, error);
             if (error.message.toLowerCase().includes('country not found')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró el país "${country}".`)] });
             } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudieron obtener datos de COVID-19: ${error.message}`)] });
            }
        }
    }
};
