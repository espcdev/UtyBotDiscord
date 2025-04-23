const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a expulsar.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('La razón de la expulsión (opcional, se mostrará en logs de auditoría)')
                .setMaxLength(512) // Límite de razón en Discord
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.KickMembers],
    botPermissions: [PermissionsBitField.Flags.KickMembers],

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada.';

        await interaction.deferReply({ ephemeral: true });

        let memberToKick;
        try {
            memberToKick = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.editReply({ embeds: [createErrorEmbed('Usuario no encontrado en este servidor.')] });
        }

        // Verificar si el usuario es el propietario (no kickeable)
        if (memberToKick.id === interaction.guild.ownerId) {
             return interaction.editReply({ embeds: [createErrorEmbed('No puedes expulsar al propietario del servidor.')] });
        }

        // Verificar jerarquía de roles
        const executerMember = interaction.member; // Miembro que ejecuta el comando
        const botMember = await interaction.guild.members.fetch(client.user.id);

        if (memberToKick.roles.highest.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes expulsar a un usuario con un rol igual o superior al tuyo.')] });
        }
        if (memberToKick.roles.highest.position >= botMember.roles.highest.position) {
             return interaction.editReply({ embeds: [createErrorEmbed('No puedo expulsar a este usuario porque tiene un rol igual o superior al mío.')] });
        }

        // Verificar si el bot PUEDE kickear (permisos ya verificados por el handler, pero check de kickable)
        if (!memberToKick.kickable) {
             // Esto podría ser redundante si las comprobaciones de jerarquía son correctas, pero es un seguro extra
             console.warn(`[Kick] El miembro ${targetUser.tag} fue marcado como no kickeable a pesar de pasar las comprobaciones de rol.`);
             return interaction.editReply({ embeds: [createErrorEmbed('No se pudo expulsar a este usuario por una razón desconocida (puede que ya no esté o falten permisos).')] });
        }

        // Intentar enviar DM al usuario ANTES de kickear
        try {
             const dmEmbed = createEmbed('Has sido expulsado', `Has sido expulsado del servidor **${interaction.guild.name}**.\nRazón: ${reason}`, 'Orange'); // Color naranja para DMs de moderación
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`[Kick] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
            // No detener el kick si el DM falla
        }

        // Expulsar al usuario
        try {
            await memberToKick.kick(reason);
            const successEmbed = createSuccessEmbed(`${targetUser.tag} ha sido expulsado exitosamente.\nRazón: ${reason}`);
            await interaction.editReply({ embeds: [successEmbed] });

            // Opcional: Enviar log a canal de moderación
            // logChannel.send({ embeds: [createEmbed('Usuario Expulsado', `Usuario: ${targetUser.tag} (${targetUser.id})\nModerador: ${interaction.user.tag}\nRazón: ${reason}`)] });

        } catch (kickError) {
            console.error(`Error al expulsar a ${targetUser.tag}:`, kickError);
            await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error al intentar expulsar: ${kickError.message}`)] });
        }
    },
};
