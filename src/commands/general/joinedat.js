// src/commands/general/joinedat.js (Corregido v8 Final)
const { SlashCommandBuilder } = require('discord.js');
// Asegúrate que la ruta sea correcta desde /general/
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('joinedat')
        .setDescription('Muestra cuándo un miembro se unió a este servidor.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El miembro cuya fecha de unión quieres ver (opcional, por defecto tú).')
                .setRequired(false)),
    async execute(interaction) {
        // Verificar si el comando se usó en un servidor
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }

        // Obtener el usuario objetivo (el mencionado o quien ejecutó el comando)
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        // Deferir la respuesta (efímera por defecto, puede ser pública si se prefiere)
        await interaction.deferReply({ ephemeral: true });

        try {
            // Obtener el objeto GuildMember para acceder a la fecha de unión
            const member = await interaction.guild.members.fetch(targetUser.id);

            // Verificar si se encontró al miembro
            if (!member) {
                 throw new Error('Miembro no encontrado en el servidor.'); // Lanzar error si fetch falla silenciosamente
            }

            const joinedAt = member.joinedAt; // Obtener la fecha de unión (objeto Date)

             // Verificar si la fecha de unión es válida
             if (!joinedAt || isNaN(joinedAt.getTime())) {
                 console.error(`Fecha de unión inválida para ${targetUser.tag}:`, joinedAt);
                 throw new Error('No se pudo obtener una fecha de unión válida.');
             }

            const timestamp = Math.floor(joinedAt.getTime() / 1000); // Convertir a timestamp Unix

            // --- CORRECCIÓN AQUÍ: Usar Backticks ` ` para la descripción ---
            const embed = createEmbed(
                `📥 Fecha de Unión: ${member.displayName}`, // Título
                // Descripción usando template literal con backticks ` `
                `${member} se unió a **${interaction.guild.name}** el <t:${timestamp}:F> (<t:${timestamp}:R>).`
            )
            // ----------------------------------------------------------
                .setColor(colors.default) // Usar color por defecto
                .setThumbnail(member.displayAvatarURL()) // Usar avatar del miembro (puede ser null)
                .setTimestamp(joinedAt); // Poner el timestamp del embed en la fecha de unión

            // Enviar la respuesta
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            // Manejar errores
            console.error(`Error obteniendo fecha de unión para ${targetUser.tag}:`, error);
            // Distinguir error de miembro no encontrado de otros errores
            if (error.code === 10007 || error.message.toLowerCase().includes('unknown member') || error.message.includes('Miembro no encontrado')) {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo encontrar al miembro con ID ${targetUser.id} en este servidor.`)] });
            } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la fecha de unión: ${error.message}`)] });
            }
        }
    } // Fin execute
}; // Fin module.exports
