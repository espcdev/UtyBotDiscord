const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { createErrorEmbed } = require('../../utils/embeds');

module.exports = {
     data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Hace que el bot envíe un mensaje.')
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('El mensaje que quieres que envíe el bot.')
                .setRequired(true)
                .setMaxLength(2000)) // Límite de Discord para mensajes
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal donde enviar el mensaje (opcional, por defecto el actual)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement) // Solo texto o anuncios
                .setRequired(false))
        .addBooleanOption(option =>
             option.setName('anonimo')
                .setDescription('Enviar el mensaje sin decir quién usó el comando (requiere ManageMessages)')
                .setRequired(false)),
    // Permisos requeridos para el usuario
    userPermissions: [PermissionsBitField.Flags.ManageMessages], // Requerido para opción anónima y/o enviar a otro canal quizás

    async execute(interaction) {
        const messageContent = interaction.options.getString('mensaje');
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const isAnonymous = interaction.options.getBoolean('anonimo') ?? false;

         // Verificar permisos del usuario si es anónimo
         if (isAnonymous && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
             return interaction.reply({ embeds: [createErrorEmbed('No tienes permiso para enviar mensajes anónimos (`ManageMessages`).')], ephemeral: true });
         }

         // Verificar permisos del BOT en el canal objetivo
         const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        if (!botMember.permissionsIn(targetChannel).has(PermissionsBitField.Flags.SendMessages)) {
             return interaction.reply({ embeds: [createErrorEmbed(`No tengo permiso para enviar mensajes en ${targetChannel}.`)], ephemeral: true });
        }

        try {
            await targetChannel.send(messageContent);

            // Responder al usuario de forma efímera
            if (isAnonymous) {
                 await interaction.reply({ content: `Mensaje anónimo enviado a ${targetChannel}.`, ephemeral: true });
            } else {
                await interaction.reply({ content: `Mensaje enviado a ${targetChannel} de tu parte.`, ephemeral: true });
                // Opcional: Añadir una pequeña nota no anónima al mensaje enviado
                // await targetChannel.send({ content: messageContent + `\n\n*– Enviado por ${interaction.user.tag}*`, allowedMentions: { parse: [] } }); // Evitar pings accidentales
            }

        } catch (error) {
            console.error("Error en /say:", error);
            await interaction.reply({ embeds: [createErrorEmbed(`No se pudo enviar el mensaje a ${targetChannel}.`)], ephemeral: true });
        }
    }
};
