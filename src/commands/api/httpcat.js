const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Lista de códigos HTTP comunes (puedes expandir o validar contra lista completa)
const commonStatusCodes = [
    100, 101, 102, 200, 201, 202, 204, 206, 207,
    300, 301, 302, 303, 304, 305, 307, 308,
    400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 420, 421, 422, 423, 424, 425, 426, 429, 431, 444, 450, 451, 497, 498, 499,
    500, 501, 502, 503, 504, 506, 507, 508, 509, 510, 511, 521, 522, 523, 525, 599
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('httpcat')
        .setDescription('Muestra un gato representando un código de estado HTTP.')
        .addIntegerOption(option =>
            option.setName('codigo')
                .setDescription('El código de estado HTTP (ej: 200, 404, 500).')
                .setRequired(true)
                .setAutocomplete(true)), // Autocompletado para códigos comunes

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
         const filtered = commonStatusCodes
             .filter(code => code.toString().startsWith(focusedValue.toString()))
             .slice(0, 25);
         try {
             await interaction.respond(
                filtered.map(choice => ({ name: choice.toString(), value: choice })),
            );
         } catch (error) { console.error("[Httpcat Autocomplete] Error:", error); }
    },

    async execute(interaction) {
        const statusCode = interaction.options.getInteger('codigo');

        // Validar si el código es (al menos potencialmente) válido
        if (statusCode < 100 || statusCode > 599) {
             return interaction.reply({ embeds: [createErrorEmbed(`"${statusCode}" no es un código de estado HTTP válido (rango 100-599).`)], ephemeral: true });
        }

        // La URL de http.cat
        const imageUrl = `https://http.cat/${statusCode}.jpg`;

        // Crear embed directamente con la imagen
        const embed = createEmbed(`HTTP Cat: ${statusCode}`, `Imagen para el código de estado HTTP ${statusCode}`)
            .setColor(colors.default) // Podrías colorear según 2xx, 4xx, 5xx
            .setImage(imageUrl)
            .setURL(imageUrl); // Hacer el título un link a la imagen

        try {
            // No necesitamos defer/edit, podemos responder directamente
             await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`[Httpcat] Error enviando imagen para ${statusCode}:`, error);
            // Podría fallar si la URL de la imagen es inválida por alguna razón, aunque es raro para http.cat
             await interaction.reply({ embeds: [createErrorEmbed('No se pudo mostrar la imagen del gato HTTP.')], ephemeral: true }).catch(()=>{});
        }
    },
};
