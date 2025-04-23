const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverbanner')
        .setDescription('Muestra el banner de este servidor (si tiene).'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply();
        const guild = interaction.guild;
        // Asegurarse de tener los datos más recientes, puede requerir fetch si no está en caché
        // await guild.fetch(); // Descomentar si el banner no aparece y el bot tiene intents

        const bannerURL = guild.bannerURL({ dynamic: true, size: 1024 });

        if (!bannerURL) {
            return interaction.editReply({ embeds: [createEmbed('Banner del Servidor', 'Este servidor no tiene un banner configurado o no tengo los boosts necesarios para verlo.')] });
        }

        const embed = createEmbed(`Banner de ${guild.name}`)
            .setImage(bannerURL);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setLabel('Ver PNG').setStyle(ButtonStyle.Link).setURL(guild.bannerURL({ dynamic: false, format: 'png', size: 1024 })),
                new ButtonBuilder().setLabel('Ver JPG').setStyle(ButtonStyle.Link).setURL(guild.bannerURL({ dynamic: false, format: 'jpg', size: 1024 })),
                new ButtonBuilder().setLabel('Ver WEBP').setStyle(ButtonStyle.Link).setURL(guild.bannerURL({ dynamic: false, format: 'webp', size: 1024 })),
                 ...(guild.banner && guild.banner.startsWith('a_') ? [ // Mostrar GIF solo si es animado
                    new ButtonBuilder().setLabel('Ver GIF').setStyle(ButtonStyle.Link).setURL(guild.bannerURL({ dynamic: true, size: 1024 }))
                ] : [])
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};
