const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');
const ms = require('ms');

// Helper para convertir tipo de canal a texto
function getChannelTypeText(type) {
    switch (type) {
        case ChannelType.GuildText: return 'Texto';
        case ChannelType.GuildVoice: return 'Voz';
        case ChannelType.GuildCategory: return 'Categoría';
        case ChannelType.GuildAnnouncement: return 'Anuncios';
        case ChannelType.GuildStageVoice: return 'Escenario (Stage)';
        case ChannelType.GuildForum: return 'Foro';
        case ChannelType.GuildMedia: return 'Media';
        // Añadir otros si son relevantes (hilos, etc.)
        default: return `Desconocido (${type})`;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelinfo')
        .setDescription('Muestra información detallada sobre un canal.')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal del que quieres obtener información (opcional, por defecto el actual).')
                // Permitir la mayoría de tipos visibles
                .addChannelTypes(
                     ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory,
                     ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum,
                     ChannelType.GuildMedia
                )
                .setRequired(false)),
    // No requiere permisos especiales más allá de ver el canal

    async execute(interaction) {
        const channel = interaction.options.getChannel('canal') || interaction.channel;

        await interaction.deferReply();

        // Forzar fetch para datos actualizados (topic, etc.)
        try {
             await channel.fetch(true);
        } catch (err) {
             console.error(`[ChannelInfo] Error al forzar fetch del canal ${channel.id}: ${err.message}`);
             return interaction.editReply({ embeds: [createErrorEmbed('No se pudo obtener información actualizada del canal.')] });
        }

        const embed = createEmbed(`Información del Canal: #${channel.name}`, `ID: ${channel.id}`)
            .setColor(colors.default)
            .addFields(
                { name: '🏷️ Nombre', value: channel.name, inline: true },
                { name: '🆔 ID', value: channel.id, inline: true },
                { name: '🔗 Mención', value: `${channel}`, inline: true }, // Mención clicable
                { name: '📅 Creado', value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📌 Posición', value: `${channel.position}`, inline: true },
                { name: '📁 Tipo', value: getChannelTypeText(channel.type), inline: true },
            );

        // Campos específicos por tipo de canal
        if (channel.parent) { // Si está en una categoría
            embed.addFields({ name: '📂 Categoría', value: channel.parent.name, inline: true });
        }

        if (channel.isTextBased() && !channel.isVoiceBased()) { // Canales de Texto, Anuncios, Foros, etc.
            embed.addFields(
                { name: '📝 Tópico', value: channel.topic?.substring(0, 1020) || 'Ninguno', inline: false }, // Acortar tópico
                { name: '🔞 ¿NSFW?', value: channel.nsfw ? 'Sí' : 'No', inline: true },
                { name: '⏳ Modo Lento', value: channel.rateLimitPerUser ? ms(channel.rateLimitPerUser * 1000, { long: true }) : 'Desactivado', inline: true }
            );
             // Para Foros, podrías añadir info sobre tags disponibles, slowmode de posts, etc.
             if(channel.type === ChannelType.GuildForum && channel.availableTags) {
                 const tags = channel.availableTags.map(t => t.name).join(', ');
                 embed.addFields({name: '🏷️ Tags Disponibles', value: tags || 'Ninguno', inline: false});
             }

        } else if (channel.isVoiceBased()) { // Canales de Voz, Stage
            embed.addFields(
                { name: '🔊 Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true },
                { name: '👥 Límite Usuarios', value: channel.userLimit > 0 ? `${channel.userLimit}` : 'Sin límite', inline: true },
                //{ name: '🌍 Región', value: channel.rtcRegion || 'Automático', inline: true } // Región RTC si está configurada
            );
             if (channel.type === ChannelType.GuildStageVoice) {
                 // Información específica de Stage si es necesario (ej. topic)
                  embed.addFields({ name: '📝 Tópico (Stage)', value: channel.topic?.substring(0, 1020) || 'Ninguno', inline: false });
             }
        }
        // Para Categorías, podrías listar los canales que contiene
         else if (channel.type === ChannelType.GuildCategory) {
             const channelsInCategory = interaction.guild.channels.cache
                 .filter(c => c.parentId === channel.id)
                 .map(c => c.name)
                 .join(', ');
             embed.addFields({ name: '📊 Canales en Categoría', value: channelsInCategory.substring(0, 1020) || 'Ninguno', inline: false });
         }

        // Mostrar permisos del bot en el canal (útil para depuración)
         try {
             const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
             const botPermissions = channel.permissionsFor(botMember);
             if (botPermissions) {
                 const keyPerms = ['ViewChannel', 'SendMessages', 'Connect', 'Speak', 'EmbedLinks', 'AttachFiles', 'ManageMessages']
                     .filter(p => botPermissions.has(PermissionsBitField.Flags[p]))
                     .map(p => `\`${p}\``); // Mapear a formato de código

                 embed.addFields({ name: '🤖 Permisos del Bot (Clave)', value: keyPerms.length > 0 ? keyPerms.join(', ') : 'Ninguno relevante', inline: false });
             }
         } catch (permError) {
             console.warn(`[ChannelInfo] Error obteniendo permisos del bot para ${channel.id}: ${permError.message}`);
         }


        await interaction.editReply({ embeds: [embed] });
    },
};
