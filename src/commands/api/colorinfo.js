// src/commands/api/colorinfo.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('colorinfo')
        .setDescription('Muestra información detallada sobre un color.')
        .addStringOption(option =>
            option.setName('color')
                .setDescription('El color a buscar (ej: #FF0000, rgb(255,0,0), red).')
                .setRequired(true)),
    async execute(interaction) {
        let colorInput = interaction.options.getString('color').trim();
        await interaction.deferReply();

        // Preparar input para la API (quitar '#', espacios en rgb, etc.)
        let apiQuery = '';
        let queryType = '';

        if (colorInput.startsWith('#')) {
            apiQuery = `hex=${colorInput.substring(1)}`;
            queryType = 'Hex';
        } else if (colorInput.toLowerCase().startsWith('rgb')) {
            // Extraer números de rgb(r, g, b)
            const rgbMatch = colorInput.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
            if (rgbMatch) {
                 apiQuery = `rgb=<span class="math-inline">\{rgbMatch\[1\]\},</span>{rgbMatch[2]},${rgbMatch[3]}`;
                 queryType = 'RGB';
                 colorInput = `rgb(<span class="math-inline">\{rgbMatch\[1\]\},</span>{rgbMatch[2]},${rgbMatch[3]})`; // Normalizar input
            } else {
                return interaction.editReply({ embeds: [createErrorEmbed('Formato RGB inválido. Usa `rgb(R, G, B)`.')] });
            }
        } else {
            // Asumir que es un nombre de color CSS
            apiQuery = `named=true&name=${encodeURIComponent(colorInput)}`; // TheColorApi usa 'name' para nombres CSS, pero no es muy fiable
            queryType = 'Nombre (aproximado)';
             // Alternativa: buscar por hex si es un hex sin #
             if (/^[0-9A-F]{3,6}$/i.test(colorInput)) {
                  apiQuery = `hex=${colorInput}`;
                  queryType = 'Hex';
                  colorInput = `#${colorInput}`; // Añadir # para mostrar
             }
        }

        const apiUrl = `https://www.thecolorapi.com/id?${apiQuery}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.hex || !data.name) {
                 // La API puede devolver 400 si el formato es malo o el color no se reconoce
                throw new Error(data.message || 'No se encontró información para ese color o formato.');
            }

            const hex = data.hex.value;
            const rgb = data.rgb.value;
            const hsl = data.hsl.value;
            const hsv = data.hsv.value;
            const cmyk = data.cmyk.value;
            const xyz = data.XYZ.value;
            const name = data.name.value;
            const contrast = data.contrast?.value; // Color de contraste (blanco/negro)
            const imageUrl = data.image?.bare; // Imagen del color solo

            const embed = new EmbedBuilder() // Usar EmbedBuilder directamente
                .setTitle(`🎨 Información del Color: ${name}`)
                .setDescription(`Valor buscado (${queryType}): \`${colorInput}\``)
                .setColor(hex) // Establecer el color del embed al color buscado
                .addFields(
                    { name: 'HEX', value: `\`${hex}\``, inline: true },
                    { name: 'RGB', value: `\`${rgb}\``, inline: true },
                    { name: 'Nombre más Cercano', value: name, inline: true },
                    { name: 'HSL', value: `\`${hsl}\``, inline: true },
                    { name: 'HSV', value: `\`${hsv}\``, inline: true },
                    { name: 'CMYK', value: `\`${cmyk}\``, inline: true },
                    //{ name: 'XYZ', value: `\`${xyz}\``, inline: true },
                    { name: 'Contraste (Texto)', value: contrast ? `\`${contrast}\`` : 'N/A', inline: true }
                )
                .setFooter({ text: 'Datos de TheColorAPI.com' });

            if (imageUrl) {
                embed.setThumbnail(imageUrl); // Mostrar muestra del color
            }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[ColorInfo] Error fetching data for ${colorInput}:`, error);
             await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener información del color: ${error.message}`)] });
        }
    }
};
