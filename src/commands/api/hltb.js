const { SlashCommandBuilder } = require('discord.js');
const { HowLongToBeatService, HowLongToBeatEntry } = require('howlongtobeat'); // Usar librería
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Crear instancia del servicio HLTB
const hltbService = new HowLongToBeatService();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hltb')
        .setDescription('Busca cuánto tiempo toma completar un juego (HowLongToBeat).')
        .addStringOption(option =>
            option.setName('juego')
                .setDescription('El nombre del juego a buscar.')
                .setRequired(true)),
    async execute(interaction) {
        const gameName = interaction.options.getString('juego');
        await interaction.deferReply();

        try {
            // Buscar el juego en HLTB
            const results = await hltbService.search(gameName);

            if (!results || results.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron juegos que coincidan con "${gameName}" en HowLongToBeat.`)] });
            }

            // Tomar el resultado más relevante (normalmente el primero)
            const game = results[0]; // HowLongToBeatEntry

            const embed = createEmbed(`🎮 HowLongToBeat: ${game.name}`, `Tiempos estimados para completar`)
                .setColor(colors.default)
                .setThumbnail(game.imageUrl) // URL de la carátula
                .setURL(game.profileUrl) // Link al perfil del juego en HLTB
                .addFields(
                    // Mostrar los tiempos disponibles (formateados)
                    { name: '📜 Historia Principal', value: game.gameplayMain > 0 ? `${game.gameplayMain} ${game.gameplayMainUnit || 'Horas'}` : 'N/A', inline: true },
                    { name: '➕ Extras', value: game.gameplayMainExtra > 0 ? `${game.gameplayMainExtra} ${game.gameplayMainExtraUnit || 'Horas'}` : 'N/A', inline: true },
                    { name: '🏆 Completista', value: game.gameplayCompletionist > 0 ? `${game.gameplayCompletionist} ${game.gameplayCompletionistUnit || 'Horas'}` : 'N/A', inline: true },
                     { name: '📊 Similaridad', value: `${(game.similarity * 100).toFixed(0)}%`, inline: true}, // Similaridad con la búsqueda
                     { name: '⚙️ Plataformas', value: game.playableOn.join(', ') || 'N/A', inline: false},
                )
                .setFooter({ text: `Datos de HowLongToBeat.com | ID: ${game.id}` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[HLTB] Error searching for ${gameName}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo buscar en HowLongToBeat: ${error.message}`)] });
        }
    },
};
