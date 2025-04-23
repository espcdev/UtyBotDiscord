const { SlashCommandBuilder, PermissionsBitField, Collection } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Elimina mensajes de forma masiva.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages) // Permiso requerido para el usuario
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Número de mensajes a intentar eliminar (1-100).')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Eliminar solo mensajes de este usuario (opcional).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('filtro')
                .setDescription('Filtrar mensajes que contienen este texto (opcional).')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('bots')
                .setDescription('Eliminar solo mensajes de bots (opcional).')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('humanos')
                .setDescription('Eliminar solo mensajes de humanos (opcional).')
                .setRequired(false))
         .addBooleanOption(option =>
            option.setName('imagenes')
                .setDescription('Eliminar solo mensajes con imágenes/adjuntos (opcional).')
                .setRequired(false)),
    // Permisos requeridos para el bot
    botPermissions: [PermissionsBitField.Flags.ManageMessages],

    async execute(interaction) {
        // Doble check de permisos del usuario (aunque Slash Commands debería manejarlo)
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ embeds: [createErrorEmbed('No tienes permiso para eliminar mensajes.')], ephemeral: true });
        }

        const amount = interaction.options.getInteger('cantidad');
        const targetUser = interaction.options.getUser('usuario');
        const filterText = interaction.options.getString('filtro')?.toLowerCase();
        const filterBots = interaction.options.getBoolean('bots');
        const filterHumans = interaction.options.getBoolean('humanos');
        const filterImages = interaction.options.getBoolean('imagenes');

        // Validar filtros conflictivos
        if (filterBots && filterHumans) {
            return interaction.reply({ embeds: [createErrorEmbed('No puedes filtrar por bots y humanos al mismo tiempo.')], ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Fetch inicial de mensajes (hasta el límite solicitado)
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount, cache: false }); // No usar caché para obtener los más recientes

            let messagesToDelete = new Collection();
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

            // Aplicar filtros
            fetchedMessages.forEach(msg => {
                // Excluir mensajes muy antiguos (no borrables en bulk)
                if (msg.createdTimestamp < twoWeeksAgo) return;
                // Excluir el mensaje de interacción si es efímero (aunque deferReply ya lo hace)
                if (msg.id === interaction.id) return;

                let shouldDelete = true;

                // Filtro de usuario
                if (targetUser && msg.author.id !== targetUser.id) {
                    shouldDelete = false;
                }
                // Filtro de texto
                if (shouldDelete && filterText && !msg.content?.toLowerCase().includes(filterText)) {
                    shouldDelete = false;
                }
                 // Filtro de bots
                 if (shouldDelete && filterBots && !msg.author.bot) {
                     shouldDelete = false;
                 }
                 // Filtro de humanos
                  if (shouldDelete && filterHumans && msg.author.bot) {
                     shouldDelete = false;
                 }
                 // Filtro de imágenes/adjuntos
                 if (shouldDelete && filterImages && msg.attachments.size === 0 && msg.embeds.length === 0) { // Considerar embeds como 'imágenes' a veces
                     shouldDelete = false;
                 }


                if (shouldDelete) {
                    messagesToDelete.set(msg.id, msg);
                }
            });

            if (messagesToDelete.size === 0) {
                 return interaction.editReply({ embeds: [createErrorEmbed('No se encontraron mensajes que coincidan con los filtros o son demasiado antiguos.')] });
            }

            // Asegurarse de no exceder el límite de 100 para bulkDelete
             if (messagesToDelete.size > 100) {
                messagesToDelete = new Collection([...messagesToDelete.entries()].slice(0, 100));
             }


            const deletedMessages = await interaction.channel.bulkDelete(messagesToDelete, true); // true = no lanzar error si algún mensaje falla individualmente

            const successEmbed = createSuccessEmbed(`Se eliminaron ${deletedMessages.size} mensajes.`);
            await interaction.editReply({ embeds: [successEmbed] });

            // Opcional: Enviar un log a un canal de moderación
            // logChannel.send({ embeds: [createEmbed('Mensajes Purgados', `Usuario: ${interaction.user.tag}\nCanal: ${interaction.channel}\nCantidad: ${deletedMessages.size}\nFiltros: ...`)] });

        } catch (error) {
            console.error('Error en /purge:', error);
            // Manejar errores específicos de API si es necesario
            if (error.code === 50034) { // Mensajes demasiado antiguos
                 await interaction.editReply({ embeds: [createErrorEmbed('No puedes eliminar mensajes de más de 14 días de antigüedad con este comando.')] });
            } else if (error.code === 50013) { // Missing Permissions
                  await interaction.editReply({ embeds: [createErrorEmbed('No tengo permisos suficientes para eliminar mensajes en este canal.')] });
            }
             else {
                await interaction.editReply({ embeds: [createErrorEmbed(`Ocurrió un error inesperado: ${error.message}`)] });
            }
        }
    },
};
