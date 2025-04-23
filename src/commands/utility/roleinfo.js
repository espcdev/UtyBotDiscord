const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Muestra información detallada sobre un rol.')
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('El rol del que quieres obtener información.')
                .setRequired(true)),
    // No requiere permisos especiales más allá de ver roles

    async execute(interaction) {
        const role = interaction.options.getRole('rol');

        await interaction.deferReply();

        // Forzar fetch del rol para asegurar datos actualizados (permisos, etc.)
        try {
            await interaction.guild.roles.fetch(role.id, { force: true });
        } catch (err) {
             console.error(`[RoleInfo] Error al forzar fetch del rol ${role.id}: ${err.message}`);
            return interaction.editReply({ embeds: [createErrorEmbed('No se pudo obtener información actualizada del rol.')] });
        }


        // Contar miembros con el rol (puede ser costoso en servers grandes)
        let memberCount = 0;
        try {
            // Re-fetchear miembros puede ser necesario si la caché no está completa
            // await interaction.guild.members.fetch(); // ¡Muy costoso! Evitar si es posible
            memberCount = interaction.guild.members.cache.filter(member => member.roles.cache.has(role.id)).size;
            // Si memberCount es 0 y sospechas que la caché está incompleta, podrías hacer fetch, pero con advertencia.
        } catch (countError) {
            console.warn(`[RoleInfo] Error contando miembros para rol ${role.id}: ${countError.message}. Mostrando 0.`);
            memberCount = 'Error al contar';
        }


        const permissions = role.permissions.toArray();
        // Mostrar solo algunos permisos clave o un resumen
        const keyPermissions = [
            'Administrator', 'KickMembers', 'BanMembers', 'ManageChannels',
            'ManageGuild', 'ManageMessages', 'ManageRoles', 'MentionEveryone'
        ].filter(perm => permissions.includes(perm));

        const embed = createEmbed(`Información del Rol: ${role.name}`, `ID: ${role.id}`)
            .setColor(role.color || colors.default) // Usar color del rol o default si es 0
            .addFields(
                { name: '📅 Creado', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🎨 Color (Hex)', value: `\`${role.hexColor}\``, inline: true },
                { name: '👥 Miembros', value: `${memberCount}`, inline: true }, // Usar contador
                { name: '📌 Posición', value: `${role.position}`, inline: true }, // Posición en la jerarquía
                { name: '🗣️ ¿Mencionable?', value: role.mentionable ? 'Sí' : 'No', inline: true },
                { name: '👁️ ¿Separado?', value: role.hoist ? 'Sí' : 'No', inline: true }, // Hoisted (mostrado separado)
                 //{ name: '👑 ¿Gestionado?', value: role.managed ? 'Sí (Integración/Bot)' : 'No', inline: true },
                 //{ name: '🔗 Icono', value: role.iconURL() ? `[Ver](${role.iconURL()})` : 'Ninguno', inline: true }, // Si tiene icono
            );

            // Añadir permisos
            if (permissions.length > 0) {
                if (permissions.includes('Administrator')) {
                     embed.addFields({ name: '🔑 Permisos Clave', value: '`Administrator` (Todos los permisos)', inline: false });
                } else if (keyPermissions.length > 0) {
                    embed.addFields({ name: '🔑 Permisos Clave', value: `\`${keyPermissions.join('`, `')}\`\n*(${permissions.length} permisos en total)*`, inline: false });
                } else {
                    embed.addFields({ name: '🔑 Permisos', value: `*${permissions.length} permisos otorgados (ninguno clave)*`, inline: false });
                }
                // Para ver TODOS (puede ser muy largo):
                // embed.addFields({ name: `🔑 Permisos (${permissions.length})`, value: `\`\`\`\n${permissions.join(', ')}\n\`\`\``, inline: false });
            } else {
                embed.addFields({ name: '🔑 Permisos', value: 'Ninguno', inline: false });
            }


        await interaction.editReply({ embeds: [embed] });
    },
};
