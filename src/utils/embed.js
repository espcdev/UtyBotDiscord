// src/utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const defaultColor = '#5865F2'; // Discord Blurple
const errorColor = '#ED4245'; // Discord Red
const successColor = '#57F287'; // Discord Green
const warningColor = '#FEE75C'; // Discord Yellow

function createEmbed(title, description = '', color = defaultColor) {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description || '\u200B') // Espacio invisible si no hay descripción
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'UtyBot v1 - Experiencia Planetaria' });
}

function createErrorEmbed(description) {
    return createEmbed('❌ Error', description, errorColor);
}

function createSuccessEmbed(description) {
    return createEmbed('✅ Éxito', description, successColor);
}

function createWarningEmbed(description) {
    return createEmbed('⚠️ Advertencia', description, warningColor);
}

module.exports = {
    createEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    // Exportar colores si se necesitan directamente
    colors: {
        default: defaultColor,
        error: errorColor,
        success: successColor,
        warning: warningColor,
    }
};
