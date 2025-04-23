// src/commands/api/reddit.js (Corregido v8)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reddit')
        .setDescription('Muestra los posts populares de un subreddit.')
        .addStringOption(option =>
            option.setName('subreddit')
                .setDescription('El nombre del subreddit (sin r/).')
                .setRequired(true)),
    async execute(interaction) {
        const subreddit = interaction.options.getString('subreddit').replace(/^r\//i, ''); // Quitar r/ si lo ponen
        await interaction.deferReply();

        const apiUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=5`; // 5 posts populares

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.data || !Array.isArray(data.data.children) || data.data.children.length === 0) {
                return interaction.editReply({ embeds: [createErrorEmbed(`No se encontraron posts o el subreddit "r/${subreddit}" no es accesible/válido.`)] });
            }

            const posts = data.data.children;

            const embed = createEmbed(`🔥 Posts Populares en r/${subreddit}`, '')
                .setColor('#FF5700') // Color Reddit
                .setURL(`https://www.reddit.com/r/${subreddit}/`);

            posts.forEach((post, index) => {
                const p = post.data;
                const title = p.title?.substring(0, 250) || 'Sin título';
                const url = `https://www.reddit.com${p.permalink}`;
                // Usar toLocaleString para formatear números y manejar null/undefined
                const score = p.score != null ? p.score.toLocaleString('es-MX') : '0';
                const comments = p.num_comments != null ? p.num_comments.toLocaleString('es-MX') : '0';
                const author = p.author || '[eliminado]';

                // --- ASEGURAR BACKTICKS AQUÍ ---
                const description = `⬆️ ${score} | 💬 ${comments} | por u/${author}\n[Ver Post](${url})`;
                // --------------------------------

                embed.addFields({
                    name: `${index + 1}. ${title}`,
                    // Asegurarse que el valor no exceda el límite de Discord
                    value: description.substring(0, 1024),
                    inline: false
                });
            });

            embed.setFooter({ text: `Mostrando ${posts.length} posts populares.`});

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Reddit] Error fetching data for r/${subreddit}:`, error);
            if (error.message.includes('404')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`El subreddit "r/${subreddit}" no fue encontrado.`)] });
            } else if (error.message.includes('403')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`Acceso prohibido a "r/${subreddit}" (puede ser privado).`)] });
            } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener posts de Reddit: ${error.message}`)] });
            }
        }
    },
};
