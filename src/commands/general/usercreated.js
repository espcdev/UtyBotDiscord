// src/commands/general/usercreated.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('usercreated')
        .setDescription('Muestra la fecha de creación de una cuenta de Discord.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario cuya fecha de creación quieres ver (opcional, por defecto tú).')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const createdAt = targetUser.createdAt; // Objeto Date
        const timestamp = Math.floor(createdAt.getTime() / 1000); // Timestamp Unix

        const embed = createEmbed(`📅 Creación de Cuenta: ${targetUser.tag}`, `La cuenta de <span class="math-inline">\{targetUser\} fue creada el <t\:</span>{timestamp}:F> (<t:${timestamp}:R>).`)
            .setColor(colors.default)
            .setThumbnail(targetUser.displayAvatarURL())
            .setTimestamp(createdAt);

        await interaction.reply({ embeds: [embed] });
    }
};
