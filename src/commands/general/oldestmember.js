// src/commands/general/oldestmember.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oldestmember')
        .setDescription('Muestra el miembro que lleva más tiempo en el servidor.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply();

        try {
            // Fetch members para asegurar que tenemos todos los datos de unión
            // ¡Advertencia: Muy costoso en servidores grandes! Considerar alternativas si da timeout.
            await interaction.guild.members.fetch();

            // Filtrar bots si se desea (opcional)
            // const members = interaction.guild.members.cache.filter(member => !member.user.bot);
            const members = interaction.guild.members.cache;

            if (members.size === 0) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No se encontraron miembros (o la caché está vacía).')] });
            }

            // Ordenar por fecha de unión (ascendente) y tomar el primero
            const oldestMember = members.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).first();

            if (!oldestMember || !oldestMember.joinedTimestamp) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No se pudo determinar el miembro más antiguo.')] });
            }

            const joinedAt = oldestMember.joinedAt;
            const timestamp = Math.floor(joinedAt.getTime() / 1000);

            const embed = createEmbed(`🕰️ Miembro más Antiguo`, `El miembro que lleva más tiempo en **${interaction.guild.name}** es ${oldestMember}.`)
                .setColor(colors.default)
                .setThumbnail(oldestMember.user.displayAvatarURL())
                .addFields({ name: 'Se unió el', value: `<t:<span class="math-inline">\{timestamp\}\:F\> \(<t\:</span>{timestamp}:R>)` })
                .setTimestamp(joinedAt);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error buscando al miembro más antiguo:", error);
             // Podría dar timeout en servidores muy grandes con fetch()
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo encontrar al miembro más antiguo: ${error.message}`)] });
        }
    }
};
