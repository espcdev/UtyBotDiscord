const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fact')
        .setDescription('Muestra un dato curioso aleatorio.'),
    async execute(interaction) {
        await interaction.deferReply();

        // API pública de datos inútiles (en inglés)
        const apiUrl = 'https://uselessfacts.jsph.pl/api/v2/facts/random?language=en';
        // Alternativa en español (menos fiable, puede requerir parseo HTML a veces):
        // const apiUrlES = 'https://www.todo-mail.com/ajax/get-random-fact.ashx'; // Requiere parseo

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.text) {
                throw new Error('La API no devolvió un dato válido.');
            }

            const fact = data.text;
            const sourceUrl = data.source_url;

            const embed = createEmbed('💡 Dato Curioso Aleatorio', fact)
                .setColor(colors.default)
                .setFooter({ text: `Fuente: ${data.source || 'Useless Facts'}` });

             if (sourceUrl) {
                embed.setURL(sourceUrl); // Link a la fuente si está disponible
             }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Fact] Error fetching random fact:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener un dato curioso: ${error.message}`)] });
        }
    },
};
