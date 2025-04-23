const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { TLY_API_KEY } = process.env;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shorten')
        .setDescription('Acorta una URL larga usando T.ly.')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('La URL que quieres acortar.')
                .setRequired(true)),
    async execute(interaction) {
        if (!TLY_API_KEY) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando para acortar URLs no está configurado. Falta la API Key de T.ly en `.env`.')], ephemeral: true });
        }

        const longUrl = interaction.options.getString('url');
        await interaction.deferReply({ ephemeral: true }); // Hacer efímero ya que es una utilidad personal

        // Validar URL básica
        try {
            new URL(longUrl); // Intentar crear un objeto URL para validar formato básico
        } catch (_) {
            return interaction.editReply({ embeds: [createErrorEmbed('La URL proporcionada no parece ser válida.')] });
        }

        const apiUrl = `https://t.ly/api/v1/link/shorten`;
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // T.ly usa un Bearer Token
                'Authorization': `Bearer ${TLY_API_KEY}`
            },
            body: JSON.stringify({
                long_url: longUrl,
                // Opciones adicionales si las necesitas (domain, expire_at_datetime, description, etc.)
                // "domain": "https://t.ly/" // Opcional, usar dominio por defecto
            })
        };

        try {
            // Pasar 201 como estado esperado para T.ly en creación exitosa
            const data = await makeApiRequest(apiUrl, options, 201);

            if (!data || !data.short_url) {
                 console.error("[Shorten] Respuesta inesperada de T.ly:", data);
                 throw new Error('La API no devolvió la URL corta esperada.');
            }

            const shortUrl = data.short_url;
            const embed = createSuccessEmbed('🔗 URL Acortada')
                .setDescription(`Tu URL larga ha sido acortada:\n**${shortUrl}**`)
                .addFields({ name: 'URL Original', value: longUrl.length > 100 ? longUrl.substring(0, 97) + '...' : longUrl }); // Mostrar original (acortada si es larga)

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Shorten] Error shortening URL ${longUrl}:`, error);
             // Intentar parsear errores específicos de T.ly si es posible
             let errorMessage = `No se pudo acortar la URL: ${error.message}`;
              if (error.message.includes('401')) errorMessage = 'La API Key de T.ly no es válida o ha expirado.';
              else if (error.message.includes('400')) errorMessage = 'La URL proporcionada es inválida o ya es una URL corta de T.ly.';
              else if (error.message.includes('429')) errorMessage = 'Se ha alcanzado el límite de peticiones a la API de T.ly.';

            await interaction.editReply({ embeds: [createErrorEmbed(errorMessage)] });
        }
    },
};
