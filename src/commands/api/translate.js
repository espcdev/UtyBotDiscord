const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Mapeo simple de nombres comunes a códigos ISO 639-1 (puedes expandir)
const langCodes = {
    'ingles': 'en', 'inglés': 'en', 'english': 'en',
    'español': 'es', 'espanol': 'es', 'spanish': 'es',
    'frances': 'fr', 'francés': 'fr', 'french': 'fr',
    'aleman': 'de', 'alemán': 'de', 'german': 'de',
    'italiano': 'it', 'italian': 'it',
    'portugues': 'pt', 'portugués': 'pt', 'portuguese': 'pt',
    'japones': 'ja', 'japonés': 'ja', 'japanese': 'ja',
    'chino': 'zh', 'chinese': 'zh', // Simplificado
    'ruso': 'ru', 'russian': 'ru',
    'coreano': 'ko', 'korean': 'ko',
    'auto': 'auto', // Para detección automática (si la API lo soporta)
};

function getLangCode(langInput) {
    const lowerInput = langInput.toLowerCase();
    return langCodes[lowerInput] || (lowerInput.length === 2 || lowerInput.length === 3 ? lowerInput : null); // Devolver input si parece código ISO
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Traduce texto usando MyMemory API.')
        .addStringOption(option =>
            option.setName('texto')
                .setDescription('El texto que quieres traducir.')
                .setRequired(true)
                .setMaxLength(1000)) // Limitar longitud de entrada
        .addStringOption(option =>
            option.setName('idioma_destino')
                .setDescription('Idioma al que traducir (ej: es, en, fr, español, ingles).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('idioma_origen')
                .setDescription('Idioma original (opcional, ej: en, es, auto para detectar).')
                .setRequired(false)),
    async execute(interaction) {
        const textToTranslate = interaction.options.getString('texto');
        const targetLangInput = interaction.options.getString('idioma_destino');
        const sourceLangInput = interaction.options.getString('idioma_origen') || 'auto'; // Detectar por defecto

        await interaction.deferReply();

        const targetLang = getLangCode(targetLangInput);
        const sourceLang = getLangCode(sourceLangInput);

        if (!targetLang) {
             return interaction.editReply({ embeds: [createErrorEmbed(`Idioma destino "${targetLangInput}" no reconocido. Usa códigos de 2 letras (es, en) o nombres comunes.`)] });
        }
        if (!sourceLang) {
             return interaction.editReply({ embeds: [createErrorEmbed(`Idioma origen "${sourceLangInput}" no reconocido. Usa códigos de 2 letras o 'auto'.`)] });
        }

        const langPair = `${sourceLang}|${targetLang}`;
        // Nota: MyMemory podría requerir registrar un email para uso más intensivo, pero funciona básico sin él.
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${langPair}`;


        try {
            const data = await makeApiRequest(apiUrl);

            // Validar respuesta de MyMemory
            if (!data || data.responseStatus !== 200 || !data.responseData?.translatedText) {
                console.error("[Translate] Respuesta inesperada de MyMemory:", data);
                let errorMsg = 'La API no devolvió una traducción válida.';
                if (data && data.responseDetails) {
                    errorMsg = data.responseDetails; // Usar mensaje de error de la API si existe
                } else if (data.responseStatus !== 200) {
                    errorMsg = `La API devolvió estado ${data.responseStatus}.`;
                }
                throw new Error(errorMsg);
            }

            const translatedText = data.responseData.translatedText;
            const detectedLang = data.responseData.detectedLanguage || sourceLang; // Idioma detectado si fue 'auto'
             const matchQuality = (parseFloat(data.responseData.match || 0) * 100).toFixed(1); // Calidad de coincidencia

             // Decodificar entidades HTML que MyMemory a veces devuelve (ej: &quot;)
             const he = require('he'); // Necesitas: npm install he
             const decodedText = he.decode(translatedText);


            const embed = createEmbed(`Traducción (${detectedLang.toUpperCase()} -> ${targetLang.toUpperCase()})`, decodedText, colors.default)
                 .addFields(
                     { name: 'Texto Original', value: textToTranslate.substring(0,1020) } // Mostrar original (acortado)
                 )
                 .setFooter({ text: `Traducción por MyMemory | Calidad: ${matchQuality}%` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Translate] Error translating text:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo traducir el texto: ${error.message}`)] });
        }
    },
};
