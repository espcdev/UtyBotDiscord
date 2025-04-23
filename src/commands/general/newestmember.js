// src/commands/general/newestmember.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('newestmember')
        .setDescription('Muestra el miembro que se unió más recientemente al servidor.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply();

        try {
            // Fetch members para asegurar datos recientes
            // ¡Advertencia: Muy costoso en servidores grandes!
            await interaction.guild.members.fetch();

            const members = interaction.guild.members.cache;

            if (members.size === 0) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No se encontraron miembros (o la caché está vacía).')] });
            }

            // Ordenar por fecha de unión (descendente) y tomar el primero
            const newestMember = members.sort((a, b) => b.joinedTimestamp - a.joinedTimestamp).first();

            if (!newestMember || !newestMember.joinedTimestamp) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No se pudo determinar el miembro más reciente.')] });
            }

            const joinedAt = newestMember.joinedAt;
            const timestamp = Math.floor(joinedAt.getTime() / 1000);

            const embed = createEmbed(`✨ Miembro más Reciente`, `El miembro más reciente en unirse a **${interaction.guild.name}** es ${newestMember}.`)
                .setColor(colors.default)
                .setThumbnail(newestMember.user.displayAvatarURL())
                .addFields({ name: 'Se unió el', value: `<t:<span class="math-inline">\{timestamp\}\:F\> \(<t\:</span>{timestamp}:R>)` })
                .setTimestamp(joinedAt);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error buscando al miembro más reciente:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo encontrar al miembro más reciente: ${error.message}`)] });
        }
    }
};
