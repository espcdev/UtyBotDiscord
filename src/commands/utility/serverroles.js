// src/commands/utility/serverroles.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverroles')
        .setDescription('Muestra una lista de los roles de este servidor.'),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true }); // Puede ser una lista larga

        try {
            // Fetch roles para asegurar datos actualizados (especialmente el número de miembros)
            await interaction.guild.roles.fetch();

            // Obtener roles, excluir @everyone, ordenar por posición (más alto primero)
            const roles = interaction.guild.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position);

            if (roles.size === 0) {
                return interaction.editReply({ embeds: [createEmbed(`Roles de ${interaction.guild.name}`, 'Este servidor no tiene roles personalizados.')] });
            }

            // Crear la descripción del embed listando los roles
            // Limitar la cantidad mostrada para no exceder límites de Discord
            const MAX_ROLES_DISPLAY = 50; // Mostrar hasta 50 roles
            let description = roles
                .first(MAX_ROLES_DISPLAY) // Tomar los primeros N roles
                .map(role => `<span class="math-inline">\{role\} \(</span>{role.members.size} miembros)`) // Mostrar rol y número de miembros
                .join('\n');

            if (roles.size > MAX_ROLES_DISPLAY) {
                description += `\n... y ${roles.size - MAX_ROLES_DISPLAY} roles más.`;
            }

            const embed = createEmbed(`🎭 Roles de <span class="math-inline">\{interaction\.guild\.name\} \(</span>{roles.size})`, description)
                .setColor(colors.default)
                .setFooter({ text: `Roles ordenados por jerarquía (más alto primero).`});

            // Revisar si la descripción excede el límite de Discord y acortar si es necesario
            if (embed.data.description && embed.data.description.length > 4096) {
                embed.setDescription(embed.data.description.substring(0, 4090) + '...');
            }


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error listando roles:", error);
            await interaction.editReply({ embeds: [createErrorEmbed('No se pudieron listar los roles del servidor.')] });
        }
    }
};
