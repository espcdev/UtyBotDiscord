// src/commands/api/pokemon.js (Corregido v8 Final)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
// Asegúrate que la ruta sea correcta desde /api/
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Helper para poner en mayúscula la primera letra
const capitalize = (s) => {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
};

module.exports = {
    // Definición del comando Slash
    data: new SlashCommandBuilder()
        .setName('pokemon')
        .setDescription('Busca información sobre un Pokémon por nombre o número.')
        .addStringOption(option =>
            option.setName('nombre_o_id')
                .setDescription('El nombre o número de Pokédex del Pokémon.')
                .setRequired(true)),

    // Lógica de ejecución del comando
    async execute(interaction) {
        // Convertir a minúsculas y quitar espacios para la API
        const query = interaction.options.getString('nombre_o_id').toLowerCase().trim();
        await interaction.deferReply();

        // Usar PokeAPI v2
        const apiUrl = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`;

        try {
            // Realizar petición a la API
            const data = await makeApiRequest(apiUrl);

            // Verificar respuesta básica
            if (!data || !data.name || !data.id) {
                throw new Error('Pokémon no encontrado o respuesta inválida de la API.');
            }

            // Extraer y formatear datos principales
            const name = capitalize(data.name);
            const id = data.id.toString().padStart(3, '0'); // ID con ceros ej: 001
            const types = data.types?.map(t => capitalize(t.type.name)).join(', ') || 'N/A';
            const height = data.height ? `${(data.height / 10).toFixed(1)} m` : 'N/A'; // Convertir y formatear
            const weight = data.weight ? `${(data.weight / 10).toFixed(1)} kg` : 'N/A'; // Convertir y formatear
            const abilities = data.abilities?.map(a => capitalize(a.ability.name)).join(', ') || 'N/A';
            // Intentar obtener el mejor sprite disponible
            const spriteUrl = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default;

            // Construir el Embed inicial
            const embed = createEmbed(`#${id} - ${name}`, `Tipo(s): ${types}`)
                .setColor(colors.default) // Podrías mapear colores por tipo principal si quieres
                .addFields(
                    { name: '📏 Altura', value: height, inline: true },
                    { name: '⚖️ Peso', value: weight, inline: true },
                    { name: '✨ Habilidades', value: abilities.substring(0, 1000), inline: false }, // Acortar si es necesario
                );

            // Añadir estadísticas base si existen
            if (data.stats && data.stats.length > 0) {
                 // --- ASEGURAR BACKTICKS ` ` AQUÍ ---
                 const statsString = data.stats.map(s =>
                     // Formatear nombre (ej. special-attack -> Special Attack) y valor
                     // ¡Usar comillas invertidas ` ` aquí!
                     `**${capitalize(s.stat.name.replace('-', ' '))}**: ${s.base_stat}`
                 ).join('\n');
                 // ---------------------------------

                 // Añadir campo al embed, asegurando que no exceda el límite
                 embed.addFields({ name: '📊 Estadísticas Base', value: statsString.substring(0, 1024), inline: false });
            }

            // Añadir imagen del Pokémon
            if (spriteUrl) {
                embed.setThumbnail(spriteUrl);
            }
            embed.setFooter({ text: 'Datos de PokeAPI.co' });


            // Enviar la respuesta final
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // Manejar errores
            console.error(`[Pokemon] Error fetching data for ${query}:`, error);
             if (error.message.includes('404') || error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('pokémon no encontrado')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró el Pokémon "${query}". Verifica el nombre o ID.`)] });
             } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener información del Pokémon: ${error.message}`)] });
            }
        }
    } // Fin execute
}; // Fin module.exports
