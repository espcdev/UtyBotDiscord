const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds'); // Asumiendo que tienes un helper de embeds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario o el icono del servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario cuyo avatar quieres ver (opcional)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('servidor')
                .setDescription('Mostrar el icono del servidor en lugar del avatar de usuario (opcional)')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const showServerIcon = interaction.options.getBoolean('servidor');
        const targetUser = user || interaction.user; // Usuario objetivo o el que ejecuta el comando

        if (showServerIcon) {
            // --- Mostrar Icono del Servidor ---
            if (!interaction.inGuild()) {
                return interaction.reply({ embeds: [createEmbed('Error', 'Este comando solo puede mostrar el icono del servidor dentro de un servidor.', colors.error)], ephemeral: true });
            }
            const guild = interaction.guild;
            const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

            if (!iconURL) {
                return interaction.reply({ embeds: [createEmbed('Icono del Servidor', 'Este servidor no tiene un icono configurado.', colors.warning)], ephemeral: true });
            }

            const embed = createEmbed(`Icono de ${guild.name}`)
                .setImage(iconURL)
                .setColor(colors.default); // O un color específico para servidor

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ver Icono (PNG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.iconURL({ dynamic: false, format: 'png', size: 1024 })),
                    new ButtonBuilder()
                        .setLabel('Ver Icono (JPG)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.iconURL({ dynamic: false, format: 'jpg', size: 1024 })),
                     new ButtonBuilder()
                        .setLabel('Ver Icono (WEBP)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.iconURL({ dynamic: false, format: 'webp', size: 1024 })),
                    ...(guild.iconURL({ dynamic: true }).includes('.gif') ? [new ButtonBuilder() // Mostrar GIF solo si es animado
                        .setLabel('Ver Icono (GIF)')
                        .setStyle(ButtonStyle.Link)
                        .setURL(guild.iconURL({ dynamic: true, format: 'gif', size: 1024 }))] : [])
                );

            await interaction.reply({ embeds: [embed], components: [row] });

        } else {
            // --- Mostrar Avatar del Usuario ---
            const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null); // Intentar obtener el miembro para avatar del servidor

            const userAvatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
            const serverAvatarURL = member?.displayAvatarURL({ dynamic: true, size: 1024 }); // Avatar específico del servidor

            const embed = createEmbed(`Avatar de ${targetUser.username}`)
                .setColor(member ? member.displayHexColor === '#000000' ? colors.default : member.displayHexColor : colors.default)
                .setImage(userAvatarURL); // Mostrar avatar global por defecto

            const buttons = [
                new ButtonBuilder().setLabel('Avatar Global (PNG)').setStyle(ButtonStyle.Link).setURL(targetUser.displayAvatarURL({ dynamic: false, format: 'png', size: 1024 })),
                new ButtonBuilder().setLabel('Avatar Global (JPG)').setStyle(ButtonStyle.Link).setURL(targetUser.displayAvatarURL({ dynamic: false, format: 'jpg', size: 1024 })),
                new ButtonBuilder().setLabel('Avatar Global (WEBP)').setStyle(ButtonStyle.Link).setURL(targetUser.displayAvatarURL({ dynamic: false, format: 'webp', size: 1024 })),
                 ...(userAvatarURL.includes('.gif') ? [new ButtonBuilder().setLabel('Avatar Global (GIF)').setStyle(ButtonStyle.Link).setURL(userAvatarURL)] : [])
            ];

             // Añadir botones para avatar del servidor si es diferente y el usuario es miembro
             if (member && serverAvatarURL && userAvatarURL !== serverAvatarURL) {
                 embed.setThumbnail(serverAvatarURL); // Poner el avatar del servidor como thumbnail
                 embed.setDescription(`Mostrando avatar global. El avatar de este servidor está en la miniatura.\n\n**Avatar del Servidor:**`); // Añadir texto indicativo
                 buttons.push(
                     new ButtonBuilder().setLabel('Avatar Servidor (PNG)').setStyle(ButtonStyle.Link).setURL(member.displayAvatarURL({ dynamic: false, format: 'png', size: 1024 })),
                      ...(serverAvatarURL.includes('.gif') ? [new ButtonBuilder().setLabel('Avatar Servidor (GIF)').setStyle(ButtonStyle.Link).setURL(serverAvatarURL)] : [])
                 );
             }

             // Dividir botones en filas si son muchos
            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                 rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
            }


            await interaction.reply({ embeds: [embed], components: rows });
        }
    },
};
