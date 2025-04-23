const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userroles')
        .setDescription('Muestra los roles de un usuario en este servidor.')
        .addUserOption(option => option.setName('usuario').setDescription('El usuario cuyos roles quieres ver (por defecto, tú).').setRequired(false)),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        await interaction.deferReply({ ephemeral: true }); // Efímero para privacidad

        try {
            const member = await interaction.guild.members.fetch(targetUser.id);
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild.id) // Excluir @everyone
                .sort((a, b) => b.position - a.position) // Ordenar por posición (más alto primero)
                .map(role => role.toString()); // Convertir a mención

            const embed = createEmbed(`Roles de ${member.displayName}`, roles.length > 0 ? roles.join('\n') : 'Este usuario no tiene roles asignados (aparte de @everyone).')
                .setColor(member.displayHexColor || colors.default);

             if (roles.length > 50) { // Discord limita campos de embed, mostrar un aviso si son demasiados
                 embed.setDescription(roles.slice(0, 50).join('\n') + `\n... y ${roles.length - 50} más.`);
             }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`Error obteniendo roles para ${targetUser.tag}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed('No se pudo encontrar al usuario o sus roles en este servidor.')] });
        }
    }
};
