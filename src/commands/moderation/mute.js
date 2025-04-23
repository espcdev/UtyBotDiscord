const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const ms = require('ms'); // Necesitarás instalar ms: npm install ms

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silencia temporalmente a un usuario (timeout).')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers) // Permiso para timeout
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a silenciar.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duracion')
                .setDescription('Duración del silencio (ej: 10m, 1h, 1d, max 28 días).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('La razón del silencio (opcional).')
                .setMaxLength(512)
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.ModerateMembers],
    botPermissions: [PermissionsBitField.Flags.ModerateMembers],

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const durationString = interaction.options.getString('duracion');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada.';

        await interaction.deferReply({ ephemeral: true });

        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            return interaction.editReply({ embeds: [createErrorEmbed('Usuario no encontrado en este servidor.')] });
        }

        // --- Validar Duración ---
        let durationMs;
        try {
            durationMs = ms(durationString);
            if (!durationMs || durationMs <= 0) {
                throw new Error('Formato inválido');
            }
             // Límite máximo de Discord para timeouts (28 días)
             const maxDuration = 28 * 24 * 60 * 60 * 1000;
             if (durationMs > maxDuration) {
                  durationMs = maxDuration; // Limitar a 28 días si excede
                 reason += ` (Duración ajustada a 28 días)`;
             }

        } catch (e) {
             return interaction.editReply({ embeds: [createErrorEmbed('Formato de duración inválido. Usa unidades como: `m` (minutos), `h` (horas), `d` (días). Ej: `30m`, `2h`, `7d`.')] });
        }

        // --- Comprobaciones de Jerarquía y Permisos ---
        if (targetMember.id === interaction.guild.ownerId) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes silenciar al propietario del servidor.')] });
        }
         if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
              return interaction.editReply({ embeds: [createErrorEmbed('No puedes silenciar a un administrador.')] });
         }

        const executerMember = interaction.member;
        const botMember = await interaction.guild.members.fetch(client.user.id);

        if (targetMember.roles.highest.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes silenciar a un usuario con un rol igual o superior al tuyo.')] });
        }
        if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedo silenciar a este usuario porque tiene un rol igual o superior al mío.')] });
        }

        // Verificar si ya está en timeout
        if (targetMember.isCommunicationDisabled()) {
            // Podrías ofrecer extender el timeout aquí, pero por simplicidad, solo informamos
            const currentTimeoutEnd = targetMember.communicationDisabledUntilTimestamp;
            return interaction.editReply({ embeds: [createWarningEmbed(`${targetUser.tag} ya está silenciado hasta <t:${Math.floor(currentTimeoutEnd / 1000)}:R>. Usa \`/unmute\` primero si quieres cambiarlo.`)] });
        }


        // Intentar enviar DM
        try {
             const dmEmbed = createEmbed('Has sido silenciado',
                 `Has sido silenciado en **${interaction.guild.name}**.\nDuración: ${ms(durationMs, { long: true })}\nRazón: ${reason}`,
                 'Orange');
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`[Mute] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
        }

        // Aplicar Timeout
        try {
            await targetMember.timeout(durationMs, reason);
            const successEmbed = createSuccessEmbed(`${targetUser.tag} ha sido silenciado por ${ms(durationMs, { long: true })}.\nRazón: ${reason}`);
            await interaction.editReply({ embeds: [successEmbed] });

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Usuario Silenciado (Timeout)', `Usuario: ${targetUser.tag} (${targetUser.id})\nModerador: ${interaction.user.tag}\nDuración: ${ms(durationMs, { long: true })}\nRazón: ${reason}`)] });

        } catch (timeoutError) {
            console.error(`Error al aplicar timeout a ${targetUser.tag}:`, timeoutError);
            if (timeoutError.code === 50013) { // Missing Permissions
                await interaction.editReply({ embeds: [createErrorEmbed('No tengo permisos suficientes para silenciar (timeout) usuarios.')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error al intentar silenciar: ${timeoutError.message}`)] });
            }
        }
    },
};
