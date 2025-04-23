const { SlashCommandBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Bloquea un canal, impidiendo enviar mensajes al rol @everyone.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal a bloquear (opcional, por defecto el actual).')
                 .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice) // Canales comunes
                .setRequired(false))
         .addStringOption(option =>
             option.setName('razon')
             .setDescription('Razón del bloqueo (opcional).')
             .setMaxLength(512)
             .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.ManageChannels],
    botPermissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles], // ManageRoles es necesario para editar @everyone

    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const reason = interaction.options.getString('razon') || `Canal bloqueado por ${interaction.user.tag}`;
        const everyoneRole = interaction.guild.roles.everyone; // Obtener el rol @everyone

        // Verificar si el canal ya está bloqueado para @everyone
        const currentPermissions = targetChannel.permissionsFor(everyoneRole);
        if (!currentPermissions || !currentPermissions.has(PermissionFlagsBits.SendMessages)) {
             // Si no hay permisos explícitos o ya está denegado SendMessages
              if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
                  if (!currentPermissions || !currentPermissions.has(PermissionFlagsBits.Connect)) {
                     return interaction.reply({ embeds: [createWarningEmbed(`${targetChannel} ya parece estar bloqueado (usuarios no pueden conectarse).`)], ephemeral: true });
                  }
              } else {
                  if (!currentPermissions || !currentPermissions.has(PermissionFlagsBits.SendMessages)) {
                     return interaction.reply({ embeds: [createWarningEmbed(`${targetChannel} ya parece estar bloqueado (usuarios no pueden enviar mensajes).`)], ephemeral: true });
                  }
              }
        }


        try {
            // Determinar qué permiso denegar según el tipo de canal
             let permissionToDeny;
             let actionText;
             if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
                 permissionToDeny = PermissionFlagsBits.Connect; // Impedir conexión a canales de voz
                 actionText = "conectarse a";
             } else {
                 permissionToDeny = PermissionFlagsBits.SendMessages; // Impedir enviar mensajes en texto/anuncios
                 actionText = "enviar mensajes en";
             }

             // Editar permisos para @everyone
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                [permissionToDeny]: false // Denegar el permiso
            }, { reason: reason });

            const successEmbed = createSuccessEmbed(`🔒 Canal Bloqueado`, `Se ha bloqueado ${targetChannel}. El rol @everyone ya no puede ${actionText} este canal.`);
            await interaction.reply({ embeds: [successEmbed] });

            // Opcional: Enviar un mensaje al canal bloqueado (si es de texto)
            if (targetChannel.isTextBased() && !targetChannel.isVoiceBased()) {
                await targetChannel.send({ embeds: [createEmbed('🔒 Canal Bloqueado', `Este canal ha sido bloqueado por un moderador. ${reason ? `\nRazón: ${reason}` : ''}`, 'Orange')] });
            }

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Canal Bloqueado', ...)] });

        } catch (error) {
            console.error(`Error bloqueando ${targetChannel.name}:`, error);
             if (error.code === 50013) { // Missing Permissions
                await interaction.reply({ embeds: [createErrorEmbed(`No tengo permisos para gestionar permisos en ${targetChannel}. Asegúrate de que tengo los roles 'Manage Channels' y 'Manage Roles'.`)] });
            } else {
                await interaction.reply({ embeds: [createErrorEmbed(`Ocurrió un error: ${error.message}`)] });
            }
        }
    },
};
