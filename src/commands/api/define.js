const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('define')
        .setDescription('Busca la definición de una palabra en inglés.')
        .addStringOption(option =>
            option.setName('palabra')
                .setDescription('La palabra que quieres definir.')
                .setRequired(true)),
    async execute(interaction) {
        const word = interaction.options.getString('palabra');
        await interaction.deferReply();

        const apiUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            // La API devuelve un array, tomamos el primer resultado
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No se encontró definición para la palabra.');
            }

            const entry = data[0];
            const wordResult = entry.word;
            const phonetic = entry.phonetic || entry.phonetics?.map(p => p.text).find(p => p) || 'N/A'; // Buscar el primer texto fonético disponible
            const audio = entry.phonetics?.map(p => p.audio).find(a => a); // Buscar el primer audio disponible

            const embed = createEmbed(`Definición de: ${wordResult}`, `**Fonética:** ${phonetic}`, colors.default);

            if (audio) {
                // Nota: Discord no reproduce audio directamente en embeds, pero el link es útil.
                embed.addFields({ name: '🔊 Pronunciación', value: `[Escuchar](${audio})`, inline: true });
            }

            // Mostrar significados (limitar a los primeros 3 por brevedad)
            if (entry.meanings && entry.meanings.length > 0) {
                 entry.meanings.slice(0, 3).forEach((meaning, index) => {
                     const partOfSpeech = meaning.partOfSpeech || 'N/A';
                     let definitionsText = '';
                     if (meaning.definitions && meaning.definitions.length > 0) {
                         definitionsText = meaning.definitions.slice(0, 3).map((def, defIndex) => // Limitar defs por significado
                             `  ${defIndex + 1}. ${def.definition}${def.example ? `\n     *Ej: "${def.example}"*` : ''}`
                         ).join('\n');
                     } else {
                         definitionsText = 'No hay definiciones específicas.';
                     }
                     embed.addFields({ name: `📚 Significado ${index + 1} (${partOfSpeech})`, value: definitionsText || '\u200B', inline: false }); // \u200B si está vacío
                 });
                 if (entry.meanings.length > 3) {
                     embed.setFooter({ text: `Mostrando 3 de ${entry.meanings.length} significados. | Datos de DictionaryAPI.dev` });
                 } else {
                     embed.setFooter({ text: 'Datos de DictionaryAPI.dev' });
                 }
            } else {
                 embed.setDescription(embed.data.description + '\n\nNo se encontraron significados específicos.');
                  embed.setFooter({ text: 'Datos de DictionaryAPI.dev' });
            }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Define] Error fetching data for ${word}:`, error);
             // La API devuelve 404 si no encuentra la palabra
             if (error.message.includes('404') || error.message.includes('No definition found')) {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró una definición para "${word}". Revisa la ortografía.`)] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la definición: ${error.message}`)] });
            }
        }
    },
};
