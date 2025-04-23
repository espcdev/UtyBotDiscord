// src/utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const defaultColor = '#5865F2'; // Discord Blurple
const errorColor = '#ED4245'; // Discord Red
const successColor = '#57F287'; // Discord Green
const warningColor = '#FEE75C'; // Discord Yellow

/**
 * Crea un EmbedBuilder básico.
 * @param {string} title El título del embed.
 * @param {string} [description=''] La descripción del embed.
 * @param {string} [color=defaultColor] El color hexadecimal del embed.
 * @returns {EmbedBuilder}
 */
function createEmbed(title, description = '', color = defaultColor) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || '\u200B') // Espacio invisible si no hay descripción
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'UtyBot v1 - Experiencia Planetaria' });
}

/**
 * Crea un EmbedBuilder pre-configurado para errores.
 * @param {string} description La descripción del error.
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(description) {
    return createEmbed('❌ Error', description, errorColor);
}

/**
 * Crea un EmbedBuilder pre-configurado para mensajes de éxito.
 * @param {string} description La descripción del mensaje de éxito.
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(description) {
    return createEmbed('✅ Éxito', description, successColor);
}

/**
 * Crea un EmbedBuilder pre-configurado para advertencias.
 * @param {string} description La descripción de la advertencia.
 * @returns {EmbedBuilder}
 */
function createWarningEmbed(description) {
    return createEmbed('⚠️ Advertencia', description, warningColor);
}

// Exportar todas las funciones y colores
module.exports = {
    createEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    colors: {
        default: defaultColor,
        error: errorColor,
        success: successColor,
        warning: warningColor,
    }
};
