const { SlashCommandBuilder } = require('discord.js');
const { makeTextApiRequest } = require('../../utils/apiHelper'); // Usar text request
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Busca la letra de una canción.')
        .addStringOption(option =>
            option.setName('artista')
                .setDescription('El nombre del artista.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('El título de la canción.')
                .setRequired(true)),
    async execute(interaction) {
        const artist = interaction.options.getString('artista');
        const title = interaction.options.getString('titulo');
        await interaction.deferReply();

        // Usar la API pública lyrics.ovh (simple, sin clave, pero puede fallar o no tener todas las letras)
        const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

        try {
            // Esperar texto plano, no JSON
            const lyrics = await makeTextApiRequest(apiUrl);

            // La API devuelve un JSON con "error" si no encuentra la letra, aunque pedimos texto.
            // Necesitamos intentar parsear como JSON para detectar ese error.
            let jsonData = null;
            try {
                 jsonData = JSON.parse(lyrics);
            } catch (e) {
                 // No es JSON, probablemente sea la letra (o un error HTML inesperado)
            }

            if (jsonData && jsonData.error) {
                 return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron letras para "${title}" de ${artist}.`)] });
            }

            // Limpiar un poco la letra (ej. quitar RCRD LBL si aparece)
            const cleanedLyrics = lyrics.replace("Paroles de la chanson", "") // Quitar cabecera común de la API
                                        .replace(/RCRD LBL (?:Lyrics)?/gi, '')
                                        .trim();

             if (!cleanedLyrics || cleanedLyrics.length < 10) { // Comprobación extra
                 return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron letras válidas para "${title}" de ${artist}.`)] });
             }

            // Dividir la letra si es muy larga (límite de descripción de embed ~4096)
            const MAX_LENGTH = 4000;
            const chunks = [];
            for (let i = 0; i < cleanedLyrics.length; i += MAX_LENGTH) {
                chunks.push(cleanedLyrics.substring(i, i + MAX_LENGTH));
            }

            const embed = createEmbed(`🎤 Letra: ${title} - ${artist}`, chunks[0], colors.default);

            await interaction.editReply({ embeds: [embed] });

            // Enviar chunks adicionales si es necesario
             for (let i = 1; i < chunks.length; i++) {
                 // Crear un nuevo embed simple para cada continuación
                 const continuationEmbed = createEmbed(`🎤 Letra: ${title} - ${artist} (cont.)`, chunks[i], colors.default);
                 await interaction.followUp({ embeds: [continuationEmbed] }); // Usar followUp para mensajes adicionales
             }


        } catch (error) {
            console.error(`[Lyrics] Error fetching data for ${artist} - ${title}:`, error);
            // lyrics.ovh devuelve 404 si no encuentra la canción
             if (error.message.includes('404')) {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron letras para "${title}" de ${artist}.`)] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la letra: ${error.message}`)] });
            }
        }
    },
};
