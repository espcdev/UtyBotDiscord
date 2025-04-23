const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createWarningEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Inicia el proceso de verificación CAPTCHA para obtener acceso.'),
    // No necesita permisos especiales de usuario, pero sí que el bot tenga los suyos
    // botPermissions: [PermissionsBitField.Flags.ManageRoles], // Ya verificado en setup

    async execute(interaction, client) {
        const guildId = interaction.guildId;
        const config = client.captchaConfig.get(guildId);
        const userId = interaction.user.id;
        const member = interaction.member;

        // 1. Verificar si el sistema está configurado en este servidor
        if (!config || !config.channelId || !config.roleId) {
            return interaction.reply({ embeds: [createErrorEmbed('El sistema de verificación CAPTCHA no está configurado en este servidor.')], ephemeral: true });
        }

        // 2. Verificar si es el canal correcto (opcional pero recomendado)
        if (interaction.channelId !== config.channelId) {
             const verificationChannel = await interaction.guild.channels.fetch(config.channelId).catch(()=>null);
             return interaction.reply({ embeds: [createErrorEmbed(`Por favor, usa este comando únicamente en el canal ${verificationChannel || '#canal-configurado'}.`)], ephemeral: true });
        }

        // 3. Verificar si el usuario ya tiene el rol verificado
        if (member.roles.cache.has(config.roleId)) {
            return interaction.reply({ embeds: [createWarningEmbed('Ya estás verificado en este servidor.')], ephemeral: true });
        }

        // 4. Verificar si ya hay un intento de CAPTCHA en curso para este usuario
        if (client.captchaAttempts.has(userId)) {
             const existingAttempt = client.captchaAttempts.get(userId);
             // Verificar si el intento existente es de este servidor (por si el bot está en varios con captcha)
             if (existingAttempt.guildId === guildId) {
                const timeSinceAttempt = Date.now() - existingAttempt.timestamp;
                 if (timeSinceAttempt < 60000) { // No permitir reintentar muy rápido (ej. 1 minuto)
                     return interaction.reply({ embeds: [createWarningEmbed('Ya tienes un CAPTCHA pendiente. Por favor, espera un momento antes de intentarlo de nuevo.')], ephemeral: true });
                 }
                 // Si pasó tiempo, permitir reintentar (el timeout limpiará el viejo si no se usó)
             }
        }

        // 5. Generar CAPTCHA (simple texto alfanumérico)
        const captchaCode = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 caracteres

        // 6. Almacenar intento (sobrescribe el anterior si existía y pasó el cooldown)
        client.captchaAttempts.set(userId, { guildId: guildId, code: captchaCode, timestamp: Date.now() });

        // 7. Crear el Modal
        const modal = new ModalBuilder()
            .setCustomId(`captchaModal_${userId}`) // ID único incluyendo userID
            .setTitle('🔒 Verificación CAPTCHA');

        const captchaInput = new TextInputBuilder()
            .setCustomId('captchaInput')
            .setLabel(`Escribe el código: ${captchaCode}`) // Mostrar código en la etiqueta
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6)
            .setPlaceholder('Ingresa los 6 caracteres aquí');

        const actionRow = new ActionRowBuilder().addComponents(captchaInput);
        modal.addComponents(actionRow);

        // 8. Mostrar el Modal
        try {
            await interaction.showModal(modal);
             // La lógica de manejo del submit del modal está en `src/events/interactionCreate.js`
             // El timeout de limpieza del intento está en `index.js`
        } catch (error) {
            console.error(`[Verify] Error mostrando modal CAPTCHA para ${interaction.user.tag}:`, error);
            client.captchaAttempts.delete(userId); // Limpiar intento si falla al mostrar modal
            // Intentar responder al usuario si falla
            await interaction.followUp({ embeds: [createErrorEmbed('Hubo un error al iniciar la verificación. Inténtalo de nuevo.')], ephemeral: true }).catch(()=>{});
        }
    },
};
