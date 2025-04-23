// src/commands/api/xkcd.js (Completo y Corregido v8)
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
// Asegúrate que la ruta a los utils sea correcta desde /api/
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    // Definición del comando Slash
    data: new SlashCommandBuilder()
        .setName('xkcd')
        .setDescription('Muestra un cómic de XKCD (el último o uno específico).')
        .addIntegerOption(option =>
            option.setName('numero')
                .setDescription('El número del cómic XKCD a mostrar (opcional).')
                .setMinValue(1) // El primer cómic es el #1
                .setRequired(false)),

    // Lógica de ejecución del comando
    async execute(interaction) {
        const comicNumber = interaction.options.getInteger('numero');
        await interaction.deferReply();

        // Determinar la URL de la API a usar
        const apiUrl = comicNumber
            ? `https://xkcd.com/${comicNumber}/info.0.json` // URL para un número específico
            : 'https://xkcd.com/info.0.json'; // URL para el último cómic

        try {
            // Realizar la petición a la API
            const data = await makeApiRequest(apiUrl);

            // console.log('Datos XKCD recibidos:', data); // Log opcional para depuración

            // Verificar que la respuesta de la API contenga los datos necesarios
            if (!data || typeof data.num === 'undefined' || typeof data.title === 'undefined' || typeof data.img === 'undefined' || typeof data.day === 'undefined' || typeof data.month === 'undefined' || typeof data.year === 'undefined') {
                 console.error('Respuesta inválida o incompleta de la API de XKCD:', data);
                 // Responder con un error si faltan datos clave
                 return await interaction.editReply({ embeds: [createErrorEmbed('La API de XKCD devolvió datos inesperados o incompletos.')] });
            }

            // Crear el mensaje Embed con los datos obtenidos
            const embed = createEmbed(
                `XKCD #${data.num}: ${data.title}`,    // Título del Embed
                data.alt || 'Sin texto alternativo.' // Descripción (usando el texto 'alt' del cómic)
            )
                .setColor(colors.default) // Establecer color por defecto
                .setImage(data.img) // Añadir la imagen del cómic
                .setURL(`https://xkcd.com/${data.num}/`) // Enlace al cómic en la web oficial
                // Establecer el pie de página con la fecha (usando backticks ` `)
                .setFooter({ text: `Publicado: ${data.day}/${data.month}/${data.year}` });

            // Enviar la respuesta con el Embed
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // Manejar errores durante la petición o procesamiento
            console.error(`[XKCD] Error fetching comic ${comicNumber || 'latest'}:`, error);
            // Responder con un mensaje de error apropiado
            if (error.message.includes('404')) { // Error si el número de cómic no existe
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró el cómic XKCD número ${comicNumber}.`)] });
            } else { // Otros errores (problemas de red, API caída, etc.)
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el cómic XKCD: ${error.message}`)] });
            }
        }
    } // Fin de la función execute
}; // Fin de module.exports
