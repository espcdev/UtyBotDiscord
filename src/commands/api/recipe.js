const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
// Decidir si usar THEMEALDB_API_KEY o SPOONACULAR_API_KEY desde .env
// Usaremos TheMealDB como ejemplo por ser más simple (clave pública '1')
// const { THEMEALDB_API_KEY } = process.env; // '1' funciona generalmente

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recipe')
        .setDescription('Busca una receta de cocina.')
        .addStringOption(option =>
            option.setName('plato')
                .setDescription('El nombre del plato o ingrediente principal a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('plato');
        await interaction.deferReply();

        // Usar TheMealDB API (buscar por nombre)
        const apiUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;
        // Alternativa por ingrediente: `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}` (devuelve lista, necesitaría 2da llamada para detalles)

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !Array.isArray(data.meals) || data.meals.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron recetas que coincidan con "${query}".`)] });
            }

            const recipe = data.meals[0]; // Tomar la primera receta encontrada

            const embed = createEmbed(`🍳 Receta: ${recipe.strMeal}`, recipe.strInstructions?.substring(0, 1000) + (recipe.strInstructions?.length > 1000 ? '...' : '')) // Acortar instrucciones en descripción
                .setColor(colors.default)
                 .addFields(
                     { name: '🌍 Origen', value: recipe.strArea || 'N/A', inline: true },
                     { name: '🏷️ Categoría', value: recipe.strCategory || 'N/A', inline: true },
                     { name: '🔗 Fuente', value: recipe.strSource ? `[Ver receta original](${recipe.strSource})` : 'N/A', inline: true },
                 );

             // Extraer y formatear ingredientes y medidas (hasta 20 según la API)
            let ingredientsList = '';
            for (let i = 1; i <= 20; i++) {
                 const ingredient = recipe[`strIngredient${i}`];
                 const measure = recipe[`strMeasure${i}`];
                 if (ingredient && ingredient.trim() !== '') {
                     ingredientsList += `- ${measure ? measure.trim() : ''} ${ingredient.trim()}\n`;
                 } else {
                     break; // No más ingredientes
                 }
            }
            if (ingredientsList) {
                // Dividir si es muy larga (límite de valor de campo 1024)
                 const MAX_ING_LENGTH = 1020;
                 if (ingredientsList.length > MAX_ING_LENGTH) {
                     embed.addFields({ name: '🛒 Ingredientes', value: ingredientsList.substring(0, MAX_ING_LENGTH) + '...' });
                 } else {
                     embed.addFields({ name: '🛒 Ingredientes', value: ingredientsList });
                 }
            } else {
                  embed.addFields({ name: '🛒 Ingredientes', value: 'No especificados.' });
            }

            // Añadir link a video tutorial si existe
             if (recipe.strYoutube) {
                 embed.addFields({ name: '🎬 Video Tutorial', value: `[Ver en YouTube](${recipe.strYoutube})`, inline: false });
             }


            // Imagen de la receta
            if (recipe.strMealThumb) {
                embed.setThumbnail(recipe.strMealThumb);
            }

            embed.setFooter({ text: `Datos de TheMealDB | ID: ${recipe.idMeal}` });

            // Podrías añadir un botón para ver las instrucciones completas si son muy largas

             // Si las instrucciones son muy largas, enviar en follow-up
             if (recipe.strInstructions && recipe.strInstructions.length > 1000) {
                 await interaction.editReply({ embeds: [embed] }); // Enviar embed principal

                 const instructionsFull = recipe.strInstructions;
                 const instructionChunks = [];
                 const MAX_CHUNK_LENGTH = 1900; // Dejar espacio para cabecera
                 for (let i = 0; i < instructionsFull.length; i += MAX_CHUNK_LENGTH) {
                     instructionChunks.push(instructionsFull.substring(i, i + MAX_CHUNK_LENGTH));
                 }

                 for (let i = 0; i < instructionChunks.length; i++) {
                     await interaction.followUp({ content: `**📝 Instrucciones (${i + 1}/${instructionChunks.length}):**\n${instructionChunks[i]}`, ephemeral: false }); // No efímero para que todos vean las instrucciones
                 }

             } else {
                 await interaction.editReply({ embeds: [embed] }); // Enviar embed con instrucciones cortas
             }


        } catch (error) {
            console.error(`[Recipe] Error fetching data for ${query}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la receta: ${error.message}`)] });
        }
    },
};
