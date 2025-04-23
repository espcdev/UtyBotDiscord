const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información detallada sobre un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario del que quieres información (opcional, por defecto tú mismo)')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply(); // Puede tomar tiempo buscar miembro y roles

        const user = interaction.options.getUser('usuario') || interaction.user;
        let member;
        try {
            member = await interaction.guild.members.fetch({ user: user.id, force: true }); // Forzar fetch para datos actualizados
        } catch (error) {
            // El usuario no está en el servidor
            member = null;
        }

        const embed = createEmbed(`Información de ${user.username}`, `Detalles sobre ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setColor(member ? member.displayHexColor === '#000000' ? colors.default : member.displayHexColor : colors.default) // Color del rol o por defecto
            .addFields(
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '🏷️ Tag Completo', value: `\`${user.tag}\``, inline: true },
                { name: '🤖 ¿Es un Bot?', value: user.bot ? 'Sí' : 'No', inline: true },
                { name: '📅 Cuenta Creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F> (<t:${Math.floor(user.createdTimestamp / 1000)}:R>)` },
            );

        if (member) {
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id) // Excluir @everyone
                .map(role => role.toString())
                .join(', ');

            const joinPos = interaction.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).map(m => m.id).indexOf(member.id) + 1;

            embed.addFields(
                { name: '👋 Se unió al servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: false },
                { name: `🎭 Roles (${member.roles.cache.size - 1})`, value: roles.length > 1024 ? roles.substring(0, 1020) + '...' : (roles || 'Ninguno'), inline: false }, // Limitar longitud
                { name: '👑 Rol Más Alto', value: member.roles.highest.toString(), inline: true },
                { name: '🎨 Color', value: member.displayHexColor, inline: true },
                { name: '📊 Posición de Unión', value: `#${joinPos}`, inline: true },
                 { name: '⏳ ¿En Timeout?', value: member.communicationDisabledUntilTimestamp ? `Sí, hasta <t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>` : 'No', inline: true },
                 { name: ' Boosting?', value: member.premiumSinceTimestamp ? `Sí, desde <t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>` : 'No', inline: true },
                 { name: '🗣️ ¿En Voz?', value: member.voice.channel ? `Sí, en ${member.voice.channel.name}`: 'No', inline: true },

            );
            // Añadir permisos clave si quieres (puede ser muy largo)
            // const permissions = member.permissions.toArray().join(', ');
            // embed.addFields({ name: 'Permisos Clave', value: permissions.substring(0, 1020) + '...' });

        } else {
            embed.addFields({ name: 'ℹ️ Estado en el Servidor', value: 'Este usuario no es miembro de este servidor.', inline: false });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
