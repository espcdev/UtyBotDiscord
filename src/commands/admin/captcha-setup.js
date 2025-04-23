const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('captcha-setup')
        .setDescription('[Admin] Configura el canal y rol para la verificación CAPTCHA.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator) // Solo Admins
        .addChannelOption(option =>
            option.setName('canal_verificacion')
                .setDescription('El canal donde los usuarios escribirán /verify.')
                .addChannelTypes(ChannelType.GuildText) // Solo canales de texto
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('rol_verificado')
                .setDescription('El rol que se otorgará al pasar el CAPTCHA.')
                .setRequired(true))
        .addBooleanOption(option =>
             option.setName('desactivar')
             .setDescription('Establecer a True para desactivar el sistema CAPTCHA en este servidor.')
             .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.Administrator],
    botPermissions: [PermissionsBitField.Flags.ManageRoles], // Necesario para asignar el rol

    async execute(interaction, client) {
        const guildId = interaction.guildId;
        const shouldDisable = interaction.options.getBoolean('desactivar') ?? false;

        if (shouldDisable) {
            // Desactivar el sistema
             if (client.captchaConfig.has(guildId)) {
                 client.captchaConfig.delete(guildId);
                 client.saveCaptchaConfig(); // Guardar cambios
                 return interaction.reply({ embeds: [createSuccessEmbed('Sistema CAPTCHA desactivado para este servidor.')], ephemeral: true });
             } else {
                 return interaction.reply({ embeds: [createWarningEmbed('El sistema CAPTCHA ya estaba desactivado.')], ephemeral: true });
             }
        }

        // --- Configuración/Activación ---
        const verificationChannel = interaction.options.getChannel('canal_verificacion');
        const verifiedRole = interaction.options.getRole('rol_verificado');

        // Validaciones importantes
        if (!verificationChannel || !verifiedRole) {
             // Esto no debería pasar con opciones requeridas, pero por si acaso
            return interaction.reply({ embeds: [createErrorEmbed('Faltan el canal o el rol.')], ephemeral: true });
        }

         // No permitir configurar con @everyone o roles gestionados por bots/integraciones
         if (verifiedRole.id === interaction.guild.roles.everyone.id) {
              return interaction.reply({ embeds: [createErrorEmbed('No puedes usar el rol @everyone como rol de verificación.')], ephemeral: true });
         }
         if (verifiedRole.managed) {
              return interaction.reply({ embeds: [createErrorEmbed('No puedes usar un rol gestionado por una integración o bot.')], ephemeral: true });
         }

        // Validar permisos del BOT en el canal especificado
        const botMember = await interaction.guild.members.fetch(client.user.id);
        const botPermissionsInChannel = verificationChannel.permissionsFor(botMember);
        if (!botPermissionsInChannel || !botPermissionsInChannel.has(PermissionsBitField.Flags.ViewChannel) || !botPermissionsInChannel.has(PermissionsBitField.Flags.SendMessages)) {
            return interaction.reply({ embeds: [createErrorEmbed(`No tengo permisos suficientes en ${verificationChannel} (necesito ver canal y enviar mensajes).`)], ephemeral: true });
        }

        // Validar jerarquía del rol a asignar
        if (verifiedRole.position >= botMember.roles.highest.position) {
            return interaction.reply({ embeds: [createErrorEmbed(`No puedo asignar el rol "${verifiedRole.name}" porque es igual o más alto que mi rol más alto. Por favor, sube mi rol en la lista de roles del servidor.`)] , ephemeral: true});
        }

        // Guardar configuración
        client.captchaConfig.set(guildId, {
            channelId: verificationChannel.id,
            roleId: verifiedRole.id
        });
        client.saveCaptchaConfig(); // Guardar en archivo JSON

        const embed = createSuccessEmbed('✅ Configuración CAPTCHA Guardada')
            .setDescription(`El sistema de verificación está **activado**.\n- Los usuarios deberán usar \`/verify\` en ${verificationChannel}.\n- Al completar el CAPTCHA, recibirán el rol ${verifiedRole}.`);
        await interaction.reply({ embeds: [embed], ephemeral: true }); // Ephemeral para no molestar
    },
};
