// src/commands/utility/memberavatar.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memberavatar')
        .setDescription('Muestra el avatar específico de un miembro en este servidor.')
        .addUserOption(option => option.setName('usuario').setDescription('El miembro cuyo avatar de servidor quieres ver.').setRequired(true)),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        const targetUser = interaction.options.getUser('usuario');
        await interaction.deferReply();

        try {
            const member = await interaction.guild.members.fetch(targetUser.id); // Obtener el miembro
            const serverAvatarURL = member.displayAvatarURL({ dynamic: true, size: 1024 }); // Obtiene avatar del servidor si existe, si no, el global
            const userAvatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 }); // Avatar global siempre

            const embed = createEmbed(`Avatar de ${member.displayName} en ${interaction.guild.name}`, `Avatar específico de este servidor.`)
                .setColor(member.displayHexColor || colors.default)
                .setImage(serverAvatarURL);

            const row = new ActionRowBuilder();
            row.addComponents(
                new ButtonBuilder().setLabel('Avatar Servidor (PNG)').setStyle(ButtonStyle.Link).setURL(member.displayAvatarURL({ dynamic: false, format: 'png', size: 1024 })),
            );
             if (serverAvatarURL.includes('.gif')) {
                row.addComponents( new ButtonBuilder().setLabel('Avatar Servidor (GIF)').setStyle(ButtonStyle.Link).setURL(serverAvatarURL) );
             }
            // Añadir botón para el avatar global si es diferente
             if (serverAvatarURL !== userAvatarURL) {
                 row.addComponents( new ButtonBuilder().setLabel('Avatar Global').setStyle(ButtonStyle.Link).setURL(userAvatarURL) );
                 embed.setDescription(`Avatar específico de este servidor. [Ver Avatar Global](${userAvatarURL})`);
             }


            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(`Error obteniendo avatar de miembro para ${targetUser.tag}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed('No se pudo encontrar al miembro en este servidor.')] });
        }
    }
};
