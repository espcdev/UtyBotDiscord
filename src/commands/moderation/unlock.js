const { SlashCommandBuilder, PermissionsBitField, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Desbloquea un canal, restaurando permisos para @everyone.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal a desbloquear (opcional, por defecto el actual).')
                 .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                .setRequired(false))
         .addStringOption(option =>
             option.setName('razon')
             .setDescription('Razón del desbloqueo (opcional).')
             .setMaxLength(512)
             .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.ManageChannels],
    botPermissions: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ManageRoles],

    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const reason = interaction.options.getString('razon') || `Canal desbloqueado por ${interaction.user.tag}`;
        const everyoneRole = interaction.guild.roles.everyone;

        // Determinar qué permiso verificar/restaurar
         let permissionToCheck;
         let actionText;
         if (targetChannel.type === ChannelType.GuildVoice || targetChannel.type === ChannelType.GuildStageVoice) {
             permissionToCheck = PermissionFlagsBits.Connect;
             actionText = "conectarse a";
         } else {
             permissionToCheck = PermissionFlagsBits.SendMessages;
             actionText = "enviar mensajes en";
         }


        // Verificar si el canal realmente necesita desbloqueo para @everyone
        const currentPermissions = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
        // Si no hay overwrite o el permiso relevante no está explícitamente denegado, ya está "desbloqueado" (o neutro)
        if (!currentPermissions || currentPermissions.allow.has(permissionToCheck) || !currentPermissions.deny.has(permissionToCheck)) {
             return interaction.reply({ embeds: [createWarningEmbed(`${targetChannel} no parece estar bloqueado para @everyone (el permiso para ${actionText} no está denegado).`)], ephemeral: true });
        }

        try {
             // Editar permisos para @everyone, poniendo el permiso a null (heredar/neutro)
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
                [permissionToCheck]: null // null restaura al estado por defecto
            }, { reason: reason });

            const successEmbed = createSuccessEmbed(`🔓 Canal Desbloqueado`, `Se ha desbloqueado ${targetChannel}. El rol @everyone ahora puede ${actionText} este canal (según permisos de categoría/servidor).`);
            await interaction.reply({ embeds: [successEmbed] });

             // Opcional: Enviar un mensaje al canal desbloqueado (si es de texto)
             if (targetChannel.isTextBased() && !targetChannel.isVoiceBased()) {
                await targetChannel.send({ embeds: [createEmbed('🔓 Canal Desbloqueado', `Este canal ha sido desbloqueado por un moderador. ${reason ? `\nRazón: ${reason}` : ''}`, 'Green')] });
             }

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Canal Desbloqueado', ...)] });

        } catch (error) {
            console.error(`Error desbloqueando ${targetChannel.name}:`, error);
             if (error.code === 50013) { // Missing Permissions
                await interaction.reply({ embeds: [createErrorEmbed(`No tengo permisos para gestionar permisos en ${targetChannel}.`)] });
            } else {
                await interaction.reply({ embeds: [createErrorEmbed(`Ocurrió un error: ${error.message}`)] });
            }
        }
    },
};
