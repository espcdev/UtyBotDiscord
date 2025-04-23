// src/commands/utility/permissions.js (Corregido v8 Final)
const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
// Asegúrate que la ruta sea correcta desde esta ubicación
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Permisos clave a destacar (puedes ajustar esta lista)
const keyPermissions = [
    'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
    'KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages',
    'MentionEveryone', 'ViewChannel', 'SendMessages', 'Connect', 'Speak',
    'AttachFiles', 'EmbedLinks'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('Muestra los permisos de un usuario en un canal o categoría.')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario a verificar.').setRequired(true))
        .addChannelOption(option => option.setName('canal').setDescription('Canal o categoría específica (por defecto, el actual).')
            .addChannelTypes( // Tipos comunes, incluyendo categoría
                 ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildCategory,
                 ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice, ChannelType.GuildForum
            )
            .setRequired(false)),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('usuario');
        // Obtener el canal opción o el canal actual donde se usó el comando
        const channel = interaction.options.getChannel('canal') || interaction.channel;

        await interaction.deferReply({ ephemeral: true }); // Efímero para privacidad

        try {
            // Obtener el objeto GuildMember
            const member = await interaction.guild.members.fetch(targetUser.id);

            // Calcular permisos efectivos del miembro EN el canal/categoría especificado
            // permissionsFor funciona tanto para canales como para categorías
            const permissions = channel.permissionsFor(member);

            if (!permissions) {
                // Si por alguna razón no se pueden calcular (raro si member y channel existen)
                throw new Error('No se pudieron calcular los permisos (objeto miembro o canal inválido).');
            }

            // Construir el embed usando backticks para el título
            const embed = createEmbed(
                `Permisos de ${member.displayName} en #${channel.name}`, // Título con interpolación correcta
                '' // Descripción inicial vacía
            )
                .setColor(member.displayHexColor || colors.default); // Usar color del rol o default

            // Caso especial: Si el usuario tiene Administrador
            if (permissions.has(PermissionsBitField.Flags.Administrator)) {
                 // Usar channel.type para determinar si es categoría o canal en el texto
                 const channelTypeText = channel.type === ChannelType.GuildCategory
                      ? 'esta categoría y sus canales (a menos que haya overrides específicos)'
                      : 'este canal';
                 embed.setDescription(`**Este usuario tiene \`ADMINISTRADOR\` y, por lo tanto, todos los permisos en ${channelTypeText}.**`);
            } else {
                // Si no es Administrador, listar permisos clave que SÍ tiene
                const grantedKeyPerms = keyPermissions.filter(perm => {
                    const flag = PermissionsBitField.Flags[perm]; // Obtener el bitflag del permiso
                    // Verificar que el flag existe y que el usuario lo tiene
                    return flag !== undefined && permissions.has(flag);
                });

                 if (grantedKeyPerms.length > 0) {
                      // Mostrar los permisos clave otorgados
                      embed.addFields({ name: `✅ Permisos Clave Otorgados (en #${channel.name})`, value: '`' + grantedKeyPerms.join('`, `') + '`'});
                 } else {
                     embed.addFields({ name: `ℹ️ Permisos Clave Otorgados (en #${channel.name})`, value: 'Ninguno de los permisos clave comunes.'});
                 }

                 // Opcional: Mostrar todos los permisos (puede ser una lista muy larga)
                 /*
                 const allGrantedPerms = permissions.toArray(); // Obtiene un array de strings con los nombres de los permisos
                 if (allGrantedPerms.length > 0) {
                    embed.addFields({
                        name: `Todos los Permisos Otorgados (${allGrantedPerms.length})`,
                        // Acortar la lista si es necesario para que quepa en el campo
                        value: '```\n' + allGrantedPerms.join(', ').substring(0, 1000) + '\n```'
                    });
                 }
                 */
            }

            embed.setFooter({ text: `Permisos efectivos calculados para #${channel.name}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error obteniendo permisos para ${targetUser.tag} en ${channel.name}:`, error);
            // Distinguir error de miembro no encontrado de otros errores
            if (error.code === 10007 || error.message.toLowerCase().includes('unknown member')) { // Código de error 'Unknown Member'
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo encontrar al miembro con ID ${targetUser.id} en este servidor.`)] });
            } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo calcular los permisos: ${error.message}`)] });
            }
        }
    }
};
