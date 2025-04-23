const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('membercount')
        .setDescription('Muestra el número de miembros en el servidor.'),
    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;

        try {
            // Forzar fetch para el conteo más preciso
            await guild.members.fetch();
        } catch (err) {
            console.warn(`[MemberCount] No se pudo hacer fetch completo de miembros para ${guild.name}: ${err.message}`);
            // Continuar con la caché si fetch falla
        }

        const totalMembers = guild.memberCount; // Usar el conteo optimizado de Discord
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount; // Calcular humanos basado en total y caché de bots

         // Opcional: Contar estados (requiere Presence Intent y puede no ser 100% preciso)
         /*
         let onlineCount = 0;
         let idleCount = 0;
         let dndCount = 0;
         guild.members.cache.forEach(member => {
             if (member.presence?.status === 'online') onlineCount++;
             else if (member.presence?.status === 'idle') idleCount++;
             else if (member.presence?.status === 'dnd') dndCount++;
         });
         */


        const embed = createEmbed(`📊 Miembros en ${guild.name}`, `**Total: ${totalMembers}**`)
            .setColor(colors.default)
            .addFields(
                { name: '🧑 Humanos', value: `${humanCount}`, inline: true },
                { name: '🤖 Bots', value: `${botCount}`, inline: true },
                // { name: '\u200B', value: '\u200B', inline: true }, // Espacio
                // { name: '🟢 En Línea', value: `${onlineCount}`, inline: true },
                // { name: '🌙 Ausente', value: `${idleCount}`, inline: true },
                // { name: '⛔ No Molestar', value: `${dndCount}`, inline: true },
            )
            .setThumbnail(guild.iconURL({ dynamic: true })); // Añadir icono del server

        await interaction.editReply({ embeds: [embed] });
    },
};
