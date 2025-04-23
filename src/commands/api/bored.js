// src/commands/api/bored.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bored')
        .setDescription('¿Aburrido? Te sugiero una actividad aleatoria.'),
    async execute(interaction) {
        await interaction.deferReply();
        // boredapi.com API
        const apiUrl = 'https://www.boredapi.com/api/activity/';

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.activity || !data.type) {
                throw new Error('Respuesta inesperada de la API Bored.');
            }

            const activity = data.activity;
            const type = data.type.charAt(0).toUpperCase() + data.type.slice(1); // Capitalizar tipo
            const participants = data.participants;
            const price = data.price; // 0 a 1
            const accessibility = data.accessibility; // 0 a 1
            const link = data.link || null;

            // Convertir precio y accesibilidad a texto descriptivo
            const priceText = price === 0 ? 'Gratis' : price < 0.4 ? 'Barato' : price < 0.7 ? 'Moderado' : 'Caro';
            const accessText = accessibility < 0.3 ? 'Fácil' : accessibility < 0.6 ? 'Medio' : 'Difícil';

            const embed = createEmbed(`🥱 Sugerencia de Actividad`, `**${activity}**`)
                .setColor(colors.default)
                .addFields(
                    { name: '👥 Participantes', value: `${participants}`, inline: true },
                    { name: '💰 Costo Estimado', value: priceText, inline: true },
                    { name: '♿ Accesibilidad', value: accessText, inline: true },
                    { name: '🏷️ Tipo', value: type, inline: true }
                )
                .setFooter({ text: 'Datos de boredapi.com' });

             if (link) {
                 embed.addFields({ name: '🔗 Enlace Útil', value: `[Click aquí](${link})`, inline: false });
             }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Bored] Error fetching activity:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener una sugerencia: ${error.message}`)] });
        }
    }
};
