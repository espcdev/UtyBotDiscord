// src/commands/api/country.js (Corregido v8)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('country')
        .setDescription('Muestra información sobre un país.')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('Nombre del país (en inglés o español).')
                .setRequired(true)),
    async execute(interaction) {
        const countryName = interaction.options.getString('nombre');
        await interaction.deferReply();

        // Usar REST Countries API v3.1 (buscar por nombre completo)
        const apiUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=false`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!Array.isArray(data) || data.length === 0) {
                // Intenta buscar por código si la búsqueda por nombre falla (ej. "MX")
                if (countryName.length <= 3) {
                    const apiUrlCode = `https://restcountries.com/v3.1/alpha/${encodeURIComponent(countryName)}`;
                    const dataCode = await makeApiRequest(apiUrlCode);
                    if (!Array.isArray(dataCode) || dataCode.length === 0) {
                         return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró información para el país o código "${countryName}".`)] });
                    }
                    data[0] = dataCode[0]; // Usar el resultado de la búsqueda por código
                } else {
                     return interaction.editReply({ embeds: [createErrorEmbed(`No se encontró información para el país "${countryName}".`)] });
                }
            }

            const country = data[0]; // Tomar el primer resultado encontrado
            // console.log("Country Data Received:", JSON.stringify(country, null, 2)); // Log de depuración (opcional)

            // --- Formatear Monedas ---
            let currenciesString = 'N/A';
            if (country.currencies) {
                try {
                    currenciesString = Object.values(country.currencies)
                        // *** CORRECCIÓN AQUÍ: Asegurar Backticks ` ` ***
                        .map(c => `${c.name} (${c.symbol || '?'})`)
                        .join(', ');
                } catch (currencyError) {
                    console.error("Error formatting currencies:", currencyError, country.currencies);
                    currenciesString = 'Error al formatear';
                }
            }

            // --- Formatear GINI ---
            let giniString = 'N/A';
            if (country.gini && typeof country.gini === 'object' && Object.keys(country.gini).length > 0) {
                try {
                    const giniYear = Object.keys(country.gini)[0]; // Toma el primer año disponible
                    const giniValue = country.gini[giniYear];
                     // *** CORRECCIÓN AQUÍ: Asegurar Backticks ` ` ***
                    giniString = `${giniValue} (${giniYear})`;
                } catch (giniError) {
                    console.error("Error formatting GINI:", giniError, country.gini);
                    giniString = 'Error al formatear';
                }
            }

            // --- Otros Campos ---
            const name = country.name?.official || country.name?.common || 'N/A';
            const capital = country.capital?.join(', ') || 'N/A';
            const region = country.region || 'N/A';
            const subregion = country.subregion || 'N/A';
            const population = country.population?.toLocaleString('es-MX') || 'N/A';
            const languages = country.languages ? Object.values(country.languages).join(', ') : 'N/A';
            const borders = country.borders?.join(', ') || 'Ninguno';
            const area = country.area?.toLocaleString('es-MX') || 'N/A'; // km²
            const flagEmoji = country.flag || '';
            const flagPngUrl = country.flags?.png;
            const coatOfArmsPngUrl = country.coatOfArms?.png;
            const mapsUrl = country.maps?.googleMaps || country.maps?.openStreetMaps;
            const drivingSide = country.car?.side || 'N/A';

            // --- Construir Embed ---
            const embed = createEmbed(`${flagEmoji} Información de: ${name}`, `Capital: ${capital}`)
                .setColor(colors.default)
                .addFields(
                    { name: '📍 Continente', value: region, inline: true },
                    { name: '🗺️ Subregión', value: subregion, inline: true },
                    { name: '👥 Población', value: population, inline: true },
                    { name: '🗣️ Idioma(s)', value: languages.substring(0, 1000), inline: false },
                    { name: '💰 Moneda(s)', value: currenciesString.substring(0, 1000), inline: false }, // Usar string formateado
                    { name: '📏 Área', value: `${area} km²`, inline: true },
                    { name: '📊 GINI', value: giniString, inline: true }, // Usar string formateado
                    { name: '🚗 Lado Conducción', value: drivingSide, inline: true },
                    { name: '🧭 Fronteras', value: borders.substring(0, 1000) || 'Ninguno', inline: false }
                );

            if (mapsUrl) {
                embed.addFields({ name: '🌍 Ver en Mapa', value: `[Click aquí](${mapsUrl})`, inline: true });
            }
            if (coatOfArmsPngUrl) {
                embed.setThumbnail(coatOfArmsPngUrl);
            } else if (flagPngUrl) {
                embed.setThumbnail(flagPngUrl);
            }

            embed.setFooter({ text: `Datos de REST Countries API | Código: ${country.cca2 || 'N/A'}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Country] Error fetching data for ${countryName}:`, error);
             if (error.message.includes('404')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`El país o código "${countryName}" no fue encontrado.`)] });
             } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener información del país: ${error.message}`)] });
            }
        }
    },
};
