const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crea y envía un mensaje embed personalizado.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages), // Requiere permiso para enviar embeds "en nombre del bot"
    userPermissions: [PermissionsBitField.Flags.ManageMessages],
    // Bot necesita permiso SendMessages, implícito si puede responder a slash commands

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId(`createEmbedModal_${interaction.id}`) // ID único por interacción
            .setTitle('Crear Embed Personalizado');

        const titleInput = new TextInputBuilder()
            .setCustomId('embedTitle')
            .setLabel('Título del Embed')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('El título principal (opcional)')
            .setRequired(false)
            .setMaxLength(256);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('embedDescription')
            .setLabel('Descripción del Embed')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('El contenido principal (soporta Markdown)')
            .setRequired(true) // Hacer descripción requerida
            .setMaxLength(4000); // Límite cercano a Discord (4096)

        const colorInput = new TextInputBuilder()
            .setCustomId('embedColor')
            .setLabel('Color (Código Hexadecimal)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#5865F2 (ej: #FF0000, opcional)')
            .setRequired(false)
            .setMaxLength(7); // # + 6 caracteres

        const footerInput = new TextInputBuilder()
            .setCustomId('embedFooter')
            .setLabel('Texto del Pie de Página')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Texto pequeño al final (opcional)')
            .setRequired(false)
            .setMaxLength(2048); // Límite de Discord

        // Crear filas para los inputs
        const firstRow = new ActionRowBuilder().addComponents(titleInput);
        const secondRow = new ActionRowBuilder().addComponents(descriptionInput);
        const thirdRow = new ActionRowBuilder().addComponents(colorInput);
        const fourthRow = new ActionRowBuilder().addComponents(footerInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);

        // --- Manejo de la respuesta del Modal (Necesita estar en interactionCreate) ---
        // Filtrar para este modal específico
        const filter = (i) => i.customId === `createEmbedModal_${interaction.id}` && i.user.id === interaction.user.id;

        try {
            const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 300_000 }); // Esperar 5 minutos

            const title = modalInteraction.fields.getTextInputValue('embedTitle');
            const description = modalInteraction.fields.getTextInputValue('embedDescription');
            const colorString = modalInteraction.fields.getTextInputValue('embedColor');
            const footer = modalInteraction.fields.getTextInputValue('embedFooter');

            // Validar color
            let color = '#5865F2'; // Default Blurple
            const hexColorRegex = /^#[0-9A-F]{6}$/i;
            if (colorString && hexColorRegex.test(colorString)) {
                color = colorString;
            } else if (colorString) {
                 // Informar al usuario si el color era inválido, pero usar default
                 await modalInteraction.followUp({ embeds: [createWarningEmbed('El color hexadecimal proporcionado no era válido. Se usó el color por defecto.')], ephemeral: true });
            }

            const customEmbed = new EmbedBuilder()
                .setColor(color)
                .setDescription(description); // Descripción es requerida

            if (title) customEmbed.setTitle(title);
            if (footer) customEmbed.setFooter({ text: footer });
            // customEmbed.setTimestamp(); // Opcional: añadir timestamp

            // Enviar el embed al canal donde se usó el comando
            await interaction.channel.send({ embeds: [customEmbed] });

            // Confirmar al usuario que se envió
            await modalInteraction.reply({ embeds: [createSuccessEmbed('Embed enviado exitosamente al canal.')], ephemeral: true });

        } catch (error) {
            // Manejar error de timeout o cualquier otro error
            if (error.message.includes('time')) {
                // No hacer nada o enviar un mensaje de timeout si se desea
                console.log(`[Embed Modal] Timeout para interacción ${interaction.id}`);
            } else {
                console.error("Error procesando modal de embed:", error);
                 try {
                     // Intentar responder al usuario original del comando /embed
                    await interaction.followUp({ embeds: [createErrorEmbed('Hubo un error al procesar la creación del embed.')], ephemeral: true });
                 } catch (followUpError) {
                     console.error("Error enviando mensaje de error de modal:", followUpError);
                 }
            }
        }
    },
    // NOTA: La lógica de awaitModalSubmit debería idealmente estar en el evento interactionCreate
    // para no bloquear el handler del comando. Sin embargo, para un ejemplo autocontenido, se incluye aquí.
    // En una implementación más robusta, /embed solo mostraría el modal, y interactionCreate manejaría el submit.
};
