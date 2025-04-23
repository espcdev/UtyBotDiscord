const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servericon')
        .setDescription('Muestra el icono de este servidor.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply();
        const guild = interaction.guild;
        const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

        if (!iconURL) {
            return interaction.editReply({ embeds: [createEmbed('Icono del Servidor', 'Este servidor no tiene un icono configurado.')] });
        }

        const embed = createEmbed(`Icono de ${guild.name}`)
            .setImage(iconURL);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setLabel('Ver PNG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ dynamic: false, format: 'png', size: 1024 })),
                new ButtonBuilder().setLabel('Ver JPG').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ dynamic: false, format: 'jpg', size: 1024 })),
                new ButtonBuilder().setLabel('Ver WEBP').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ dynamic: false, format: 'webp', size: 1024 })),
                ...(guild.icon && guild.icon.startsWith('a_') ? [ // Mostrar GIF solo si es animado
                    new ButtonBuilder().setLabel('Ver GIF').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ dynamic: true, size: 1024 }))
                ] : [])
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    },
};
