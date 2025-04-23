const { SlashCommandBuilder, ChannelType, EmbedBuilder, GuildVerificationLevel, GuildExplicitContentFilter, GuildNSFWLevel, GuildMFALevel, GuildDefaultMessageNotifications } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

// Helper para mapear niveles a texto legible
const verificationLevels = {
    [GuildVerificationLevel.None]: 'Ninguno',
    [GuildVerificationLevel.Low]: 'Bajo (Email verificado)',
    [GuildVerificationLevel.Medium]: 'Medio (Registrado > 5 min)',
    [GuildVerificationLevel.High]: 'Alto (Miembro > 10 min)',
    [GuildVerificationLevel.VeryHigh]: 'Muy Alto (Teléfono verificado)',
};
const explicitContentFilters = {
    [GuildExplicitContentFilter.Disabled]: 'Desactivado',
    [GuildExplicitContentFilter.MembersWithoutRoles]: 'Miembros sin roles',
    [GuildExplicitContentFilter.AllMembers]: 'Todos los miembros',
};
const nsfwLevels = {
     [GuildNSFWLevel.Default]: 'Por Defecto',
     [GuildNSFWLevel.Explicit]: 'Explícito',
     [GuildNSFWLevel.Safe]: 'Seguro',
     [GuildNSFWLevel.AgeRestricted]: 'Restringido por Edad',
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra información detallada sobre este servidor.'),
    async execute(interaction) {
        await interaction.deferReply(); // Puede tomar tiempo contar miembros/canales

        const guild = interaction.guild;

        // Forzar fetch para datos más precisos (puede ser costoso en servidores grandes)
        try {
            await guild.members.fetch();
            await guild.channels.fetch();
            await guild.roles.fetch();
            // await guild.emojis.fetch(); // Descomentar si necesitas contar emojis
        } catch (err) {
            console.warn(`[ServerInfo] No se pudieron fetch todos los datos para ${guild.name}: ${err.message}`);
        }


        const owner = await guild.fetchOwner();

        // Contadores
        const memberCount = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = memberCount - botCount;
        const onlineCount = guild.members.cache.filter(member => member.presence?.status === 'online').size;
        const idleCount = guild.members.cache.filter(member => member.presence?.status === 'idle').size;
        const dndCount = guild.members.cache.filter(member => member.presence?.status === 'dnd').size;
        // Nota: 'offline' es difícil de contar con precisión sin intents de presencia

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const stageChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildStageVoice).size;
        const forumChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const announcementChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildAnnouncement).size;
        const totalChannels = textChannels + voiceChannels + categoryChannels + stageChannels + forumChannels + announcementChannels;

        const roleCount = guild.roles.cache.size;
        const emojiCount = guild.emojis.cache.size; // Asegúrate de fetchear emojis si lo usas
        const stickerCount = guild.stickers.cache.size; // Los stickers suelen estar cacheados

        const embed = createEmbed(guild.name, `ID: ${guild.id}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .setColor(colors.default)
            .addFields(
                // --- Información General ---
                { name: '👑 Propietario', value: `${owner.user.tag} (${owner.id})`, inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true }, // Espacio

                // --- Contadores de Miembros ---
                { name: `👥 Miembros (${memberCount})`, value: `🧑 ${humanCount} | 🤖 ${botCount}`, inline: true },
                 { name: '🟢 En línea', value: `${onlineCount}`, inline: true }, // Requiere Presence Intent para ser preciso
                 { name: '🌙 Ausente', value: `${idleCount}`, inline: true }, // Requiere Presence Intent
                 { name: '⛔ No molestar', value: `${dndCount}`, inline: true }, // Requiere Presence Intent


                // --- Contadores de Canales ---
                { name: `💬 Canales (${totalChannels})`, value: `Texto: ${textChannels}\nVoz: ${voiceChannels}\nCategorías: ${categoryChannels}\nForos: ${forumChannels}\nAnuncios: ${announcementChannels}\nStages: ${stageChannels}`, inline: true },


                // --- Contadores de Contenido ---
                { name: `📜 Roles`, value: `${roleCount}`, inline: true },
                { name: `🙂 Emojis`, value: `${emojiCount}`, inline: true }, // Descomenta si fetcheas emojis
                 { name: `🎨 Stickers`, value: `${stickerCount}`, inline: true },


                // --- Boosts ---
                { name: '✨ Nivel de Boost', value: `Nivel ${guild.premiumTier || 0}`, inline: true },
                { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
                 { name: '\u200B', value: '\u200B', inline: true }, // Espacio


                 // --- Configuraciones de Seguridad ---
                 { name: '🔒 Nivel Verificación', value: verificationLevels[guild.verificationLevel] || 'Desconocido', inline: true },
                 { name: '🔞 Filtro Contenido Explícito', value: explicitContentFilters[guild.explicitContentFilter] || 'Desconocido', inline: true },
                 { name: '🔞 Nivel NSFW', value: nsfwLevels[guild.nsfwLevel] || 'Desconocido', inline: true },
                 //{ name: '🛡️ Autenticación (2FA)', value: guild.mfaLevel === GuildMFALevel.Required ? 'Requerida para moderadores' : 'No requerida', inline: true }, // MFA Level
                 //{ name: '🔔 Notificaciones', value: guild.defaultMessageNotifications === GuildDefaultMessageNotifications.AllMessages ? 'Todos los mensajes' : 'Solo @menciones', inline: true },


            );
            // Añadir banner si existe
            if (guild.banner) {
                embed.setImage(guild.bannerURL({ dynamic: true, size: 4096 }));
            }


        await interaction.editReply({ embeds: [embed] });
    },
};
