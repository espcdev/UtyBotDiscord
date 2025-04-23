const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolecolor')
        .setDescription('Cambia el color de un rol específico.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
        .addRoleOption(option => option.setName('rol').setDescription('El rol cuyo color quieres cambiar.').setRequired(true))
        .addStringOption(option => option.setName('color').setDescription('El nuevo color en formato hexadecimal (ej: #FF0000, #AABBCC).').setRequired(true)),
    userPermissions: [PermissionsBitField.Flags.ManageRoles],
    botPermissions: [PermissionsBitField.Flags.ManageRoles],
    async execute(interaction, client) {
        const role = interaction.options.getRole('rol');
        const colorInput = interaction.options.getString('color');
        const reason = `Color cambiado por ${interaction.user.tag}`;

        await interaction.deferReply({ ephemeral: true });

        // Validar formato de color hexadecimal
        const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
        if (!hexColorRegex.test(colorInput)) {
            return interaction.editReply({ embeds: [createErrorEmbed('Formato de color inválido. Usa un código hexadecimal como `#FF0000` o `#ABC`.')] });
        }

        // Validaciones de rol
        if (role.managed) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes cambiar el color de un rol gestionado por una integración.')] });
        }
        if (role.id === interaction.guild.roles.everyone.id) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes cambiar el color del rol @everyone.')] });
        }

        // Validar jerarquía
        const executerMember = interaction.member;
        const botMember = await interaction.guild.members.fetch(client.user.id);
        if (role.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedes modificar un rol con una posición igual o superior a la tuya.')] });
        }
        if (role.position >= botMember.roles.highest.position) {
            return interaction.editReply({ embeds: [createErrorEmbed('No puedo modificar ese rol porque su posición es igual o superior a la mía.')] });
        }

        try {
            await role.setColor(colorInput, reason);
            await interaction.editReply({ embeds: [createSuccessEmbed(`Se cambió el color del rol ${role} a \`${colorInput.toUpperCase()}\`.`)] });
        } catch (error) {
            console.error(`Error cambiando color del rol ${role.name}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo cambiar el color del rol: ${error.message}`)] });
        }
    }
};
