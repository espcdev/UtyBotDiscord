const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a banear (puede ser ID si no está en el servidor).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('La razón del baneo (opcional, logs de auditoría).')
                .setMaxLength(512)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('dias_mensajes')
                .setDescription('Borrar mensajes de este usuario de los últimos X días (0-7, por defecto 0).')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.BanMembers],
    botPermissions: [PermissionsBitField.Flags.BanMembers],

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada.';
        const deleteMessageDays = interaction.options.getInteger('dias_mensajes') ?? 0;
        const deleteMessageSeconds = deleteMessageDays * 24 * 60 * 60; // Convertir a segundos para API

        await interaction.deferReply({ ephemeral: true });

        // Verificar si el usuario ya está baneado
         try {
            const ban = await interaction.guild.bans.fetch(targetUser.id);
            if (ban) {
                 return interaction.editReply({ embeds: [createErrorEmbed(`${targetUser.tag} ya está baneado de este servidor.`)] });
            }
         } catch (error) {
             // Error code 10026: Unknown Ban (significa que no está baneado, continuar)
             if (error.code !== 10026) {
                 console.error("[Ban Check] Error inesperado:", error);
                 // Podría ser otro error, como falta de permisos para ver bans
                 // return interaction.editReply({ embeds: [createErrorEmbed(`Error al verificar estado de ban: ${error.message}`)] });
             }
         }


        let memberToBan = null;
        try {
            memberToBan = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            // El usuario no está en el servidor, pero aún se puede banear por ID
            console.log(`[Ban] Usuario ${targetUser.tag} (${targetUser.id}) no encontrado en el servidor, intentando ban por ID.`);
        }

        // --- Comprobaciones de Jerarquía (Solo si el usuario está en el servidor) ---
        if (memberToBan) {
            // Propietario
             if (memberToBan.id === interaction.guild.ownerId) {
                return interaction.editReply({ embeds: [createErrorEmbed('No puedes banear al propietario del servidor.')] });
            }
            // Jerarquía vs Ejecutor
             const executerMember = interaction.member;
             if (memberToBan.roles.highest.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.editReply({ embeds: [createErrorEmbed('No puedes banear a un usuario con un rol igual o superior al tuyo.')] });
            }
             // Jerarquía vs Bot
            const botMember = await interaction.guild.members.fetch(client.user.id);
             if (memberToBan.roles.highest.position >= botMember.roles.highest.position) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No puedo banear a este usuario porque tiene un rol igual o superior al mío.')] });
            }
             // Propiedad 'bannable' (aunque las comprobaciones de rol deberían cubrirlo)
             if (!memberToBan.bannable) {
                  console.warn(`[Ban] El miembro ${targetUser.tag} fue marcado como no baneable a pesar de pasar las comprobaciones de rol.`);
                 return interaction.editReply({ embeds: [createErrorEmbed('No se pudo banear a este usuario por una razón desconocida (permisos insuficientes o jerarquía).')] });
            }
        }

        // Intentar enviar DM (siempre intentar, incluso si no está en el servidor)
        try {
             const dmEmbed = createEmbed('Has sido baneado', `Has sido baneado permanentemente del servidor **${interaction.guild.name}**.\nRazón: ${reason}`, 'Red');
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmError) {
            console.warn(`[Ban] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
            // Continuar con el ban
        }

        // Banear (por ID)
        try {
            await interaction.guild.bans.create(targetUser.id, {
                reason: reason,
                deleteMessageSeconds: deleteMessageSeconds
            });

            const successEmbed = createSuccessEmbed(`${targetUser.tag} ha sido baneado exitosamente.\nMensajes eliminados: Últimos ${deleteMessageDays} días.\nRazón: ${reason}`);
            await interaction.editReply({ embeds: [successEmbed] });

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Usuario Baneado', `Usuario: ${targetUser.tag} (${targetUser.id})\nModerador: ${interaction.user.tag}\nRazón: ${reason}\nDías Mensajes Borrados: ${deleteMessageDays}`)] });

        } catch (banError) {
            console.error(`Error al banear a ${targetUser.tag} (${targetUser.id}):`, banError);
            // Errores comunes: 50013 (Missing Permissions), 10026 (Unknown Ban - ya está baneado, manejado arriba)
            if (banError.code === 50013) {
                await interaction.editReply({ embeds: [createErrorEmbed('No tengo permisos suficientes para banear usuarios.')] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error al intentar banear: ${banError.message}`)] });
            }
        }
    },
};
