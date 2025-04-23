const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Función para limpiar el formato de Urban Dictionary ([word] -> word)
function cleanUrbanDefinition(text) {
    return text.replace(/\[([\w\s'-]+)\]/g, '$1'); // Quita los corchetes pero deja la palabra
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('urban')
        .setDescription('Busca una definición en Urban Dictionary.')
        .addStringOption(option =>
            option.setName('termino')
                .setDescription('El término o frase a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const term = interaction.options.getString('termino');
        await interaction.deferReply();

        const apiUrl = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !Array.isArray(data.list) || data.list.length === 0) {
                 return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron definiciones en Urban Dictionary para "${term}".`)] });
            }

            // Tomar la definición más votada (generalmente la primera)
            const definition = data.list[0];

            // Construir el embed
            // Advertencia: Urban Dictionary puede contener contenido NSFW. Decide si quieres filtrarlo o advertir.
            // Este código no filtra activamente.
            const embed = createEmbed(`📖 Urban Dictionary: ${definition.word}`, cleanUrbanDefinition(definition.definition), colors.default)
                 .setURL(definition.permalink) // Link a la definición en UD
                 .addFields(
                    { name: '💬 Ejemplo', value: definition.example ? cleanUrbanDefinition(definition.example).substring(0, 1020) : 'Ninguno', inline: false }, // Acortar ejemplo
                    { name: '👍 Votos Positivos', value: `${definition.thumbs_up || 0}`, inline: true },
                    { name: '👎 Votos Negativos', value: `${definition.thumbs_down || 0}`, inline: true },
                    { name: '👤 Autor', value: definition.author || 'Anónimo', inline: true }
                 )
                 .setFooter({ text: `Definición añadida ${new Date(definition.written_on).toLocaleDateString()}` }) // Fecha de creación
                 .setTimestamp(new Date(definition.written_on)); // Timestamp de creación


             // Advertencia Opcional NSFW
             // embed.setDescription(`**⚠️ Advertencia: Contenido potencialmente explícito.**\n\n${cleanUrbanDefinition(definition.definition)}`);


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Urban] Error fetching data for ${term}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo buscar en Urban Dictionary: ${error.message}`)] });
        }
    },
};
