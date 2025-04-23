const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Quita el silencio (timeout) a un usuario.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quitar el silencio.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('La razón para quitar el silencio (opcional).')
                .setMaxLength(512)
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.ModerateMembers],
    botPermissions: [PermissionsBitField.Flags.ModerateMembers],

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada (Timeout removido manualmente).';

        await interaction.deferReply({ ephemeral: true });

        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.editReply({ embeds: [createErrorEmbed('Usuario no encontrado en este servidor.')] });
        }

        // Verificar si el usuario está realmente en timeout
        if (!targetMember.isCommunicationDisabled()) {
            return interaction.editReply({ embeds: [createWarningEmbed(`${targetUser.tag} no está actualmente silenciado (en timeout).`)] });
        }

         // --- Comprobaciones de Jerarquía --- (Necesarias para evitar errores aunque el permiso exista)
        const executerMember = interaction.member;
        const botMember = await interaction.guild.members.fetch(client.user.id);

        // No puedes quitar timeout a alguien con rol >= al tuyo (a menos que seas owner)
        if (targetMember.roles.highest.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
             return interaction.editReply({ embeds: [createErrorEmbed('No puedes quitar el silencio a un usuario con un rol igual o superior al tuyo.')] });
        }
         // El bot no puede quitar timeout a alguien con rol >= al suyo
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
             return interaction.editReply({ embeds: [createErrorEmbed('No puedo quitar el silencio a este usuario porque tiene un rol igual o superior al mío.')] });
        }


        // Intentar enviar DM
        try {
             const dmEmbed = createEmbed('Se te ha quitado el silencio',
                 `Se te ha quitado el silencio en **${interaction.guild.name}**.\nRazón: ${reason}`,
                 'Green'); // Color verde para DMs positivos
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`[Unmute] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
        }

        // Quitar Timeout (pasando null como duración)
        try {
            await targetMember.timeout(null, reason); // null quita el timeout
            const successEmbed = createSuccessEmbed(`${targetUser.tag} ya no está silenciado.\nRazón: ${reason}`);
            await interaction.editReply({ embeds: [successEmbed] });

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Usuario Des-silenciado (Timeout Removido)', `Usuario: ${targetUser.tag} (${targetUser.id})\nModerador: ${interaction.user.tag}\nRazón: ${reason}`)] });

        } catch (timeoutError) {
            console.error(`Error al quitar timeout a ${targetUser.tag}:`, timeoutError);
            if (timeoutError.code === 50013) { // Missing Permissions
                await interaction.editReply({ embeds: [createErrorEmbed('No tengo permisos suficientes para quitar silencios (timeouts).')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error al intentar quitar el silencio: ${timeoutError.message}`)] });
            }
        }
    },
};
