const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Desbanea a un usuario del servidor.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers) // Requiere permiso de ban para desbanear
        .addStringOption(option => // Usar String para permitir IDs
            option.setName('usuario_id')
                .setDescription('El ID del usuario a desbanear.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('La razón del desbaneo (opcional).')
                .setMaxLength(512)
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.BanMembers],
    botPermissions: [PermissionsBitField.Flags.BanMembers],

    async execute(interaction, client) {
        const targetUserId = interaction.options.getString('usuario_id');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada.';

        await interaction.deferReply({ ephemeral: true });

        // Validar que sea un ID numérico
        if (!/^\d{17,19}$/.test(targetUserId)) {
            return interaction.editReply({ embeds: [createErrorEmbed('El ID de usuario proporcionado no es válido.')]});
        }

        // Verificar si el usuario está realmente baneado
        let banEntry;
        try {
            banEntry = await interaction.guild.bans.fetch(targetUserId);
            if (!banEntry) { // Doble check por si fetch devuelve null/undefined en lugar de error
                 throw new Error('No encontrado');
            }
        } catch (error) {
            // Error code 10026: Unknown Ban (significa que no está baneado)
            if (error.code === 10026 || error.message === 'No encontrado') {
                 return interaction.editReply({ embeds: [createErrorEmbed(`El usuario con ID \`${targetUserId}\` no está baneado en este servidor.`)] });
            } else {
                 console.error(`[Unban Check] Error inesperado al buscar ban ${targetUserId}:`, error);
                return interaction.editReply({ embeds: [createErrorEmbed(`Error al verificar el estado del ban: ${error.message}`)] });
            }
        }

         // Obtener tag del usuario si es posible (del objeto banEntry)
        const userTag = banEntry.user.tag || `Usuario con ID ${targetUserId}`;


        // Desbanear
        try {
            await interaction.guild.bans.remove(targetUserId, reason);

            const successEmbed = createSuccessEmbed(`${userTag} ha sido desbaneado exitosamente.\nRazón: ${reason}`);
            await interaction.editReply({ embeds: [successEmbed] });

             // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Usuario Desbaneado', `Usuario: ${userTag} (${targetUserId})\nModerador: ${interaction.user.tag}\nRazón: ${reason}`)] });

        } catch (unbanError) {
            console.error(`Error al desbanear ${targetUserId}:`, unbanError);
             if (unbanError.code === 50013) { // Missing Permissions
                await interaction.editReply({ embeds: [createErrorEmbed('No tengo permisos suficientes para desbanear usuarios.')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error al intentar desbanear: ${unbanError.message}`)] });
            }
        }
    },
};
