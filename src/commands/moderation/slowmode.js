const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const ms = require('ms'); // Reutilizar ms

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Establece o elimina el modo lento en un canal.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addStringOption(option =>
            option.setName('duracion')
                .setDescription('Intervalo entre mensajes (ej: 5s, 1m, 1h, 0 para desactivar). Max 6h.')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal al que aplicar el modo lento (opcional, por defecto el actual).')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum) // Canales donde aplica
                .setRequired(false)),
    userPermissions: [PermissionsBitField.Flags.ManageChannels],
    botPermissions: [PermissionsBitField.Flags.ManageChannels],

    async execute(interaction) {
        const durationString = interaction.options.getString('duracion');
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const reason = `Modo lento ajustado por ${interaction.user.tag}`;

        // Validar que sea un canal compatible
         if (![ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildStageVoice, ChannelType.GuildVoice, ChannelType.GuildMedia].includes(targetChannel.type)) {
            // Nota: Añadí voz/stage/media aunque el slowmode es menos común ahí, pero posible
             return interaction.reply({ embeds: [createErrorEmbed(`No se puede aplicar modo lento en canales de tipo \`${ChannelType[targetChannel.type]}\`.`)], ephemeral: true });
         }


        let durationSeconds;
        try {
            // Permitir 'off' o '0' para desactivar
            if (durationString.toLowerCase() === 'off' || durationString === '0') {
                durationSeconds = 0;
            } else {
                 // Convertir a segundos. ms() devuelve milisegundos.
                const durationMs = ms(durationString);
                 if (durationMs === undefined || durationMs < 0) throw new Error('Invalid format'); // ms() devuelve undefined si no parsea
                 durationSeconds = Math.round(durationMs / 1000);

                 // Límite de Discord es 6 horas (21600 segundos)
                 if (durationSeconds > 21600) {
                     durationSeconds = 21600; // Limitar a 6h
                 }
            }

        } catch (e) {
             return interaction.reply({ embeds: [createErrorEmbed('Formato de duración inválido. Usa unidades como: `s` (segundos), `m` (minutos), `h` (horas). Ej: `10s`, `5m`, `1h`. Usa `0` u `off` para desactivar.')], ephemeral: true });
        }

        // Aplicar el modo lento
        try {
            await targetChannel.setRateLimitPerUser(durationSeconds, reason);

            let successMessage;
            if (durationSeconds === 0) {
                successMessage = `Se ha desactivado el modo lento en ${targetChannel}.`;
            } else {
                 // Volver a convertir segundos a formato legible por ms()
                 const readableDuration = ms(durationSeconds * 1000, { long: true });
                successMessage = `Se ha establecido el modo lento a ${readableDuration} en ${targetChannel}.`;
            }

            await interaction.reply({ embeds: [createSuccessEmbed(successMessage)] });

            // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Modo Lento Ajustado', ...)] });

        } catch (error) {
            console.error(`Error aplicando slowmode a ${targetChannel.name}:`, error);
             if (error.code === 50013) { // Missing Permissions
                await interaction.reply({ embeds: [createErrorEmbed(`No tengo permisos para gestionar el modo lento en ${targetChannel}.`)] });
            } else {
                await interaction.reply({ embeds: [createErrorEmbed(`Ocurrió un error: ${error.message}`)] });
            }
        }
    },
};
