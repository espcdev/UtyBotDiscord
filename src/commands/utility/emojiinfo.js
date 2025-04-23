// src/commands/utility/emojiinfo.js
const { SlashCommandBuilder, EmbedBuilder, parseEmoji } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emojiinfo')
        .setDescription('Muestra información sobre un emoji personalizado de este servidor.')
        .addStringOption(option => option.setName('emoji').setDescription('El emoji personalizado que quieres inspeccionar.').setRequired(true)),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona dentro de un servidor.')], ephemeral: true });
        }

        const emojiInput = interaction.options.getString('emoji').trim();

        // Intentar parsear el emoji
        const parsedEmoji = parseEmoji(emojiInput);

        // Verificar si es un emoji personalizado y si tenemos ID
        if (!parsedEmoji || !parsedEmoji.id) {
             return interaction.reply({ embeds: [createErrorEmbed('Emoji inválido o no es un emoji personalizado.')], ephemeral: true });
        }

        // Buscar el emoji en el servidor actual usando el ID parseado
        const emoji = interaction.guild.emojis.cache.get(parsedEmoji.id);

        if (!emoji) {
             return interaction.reply({ embeds: [createErrorEmbed('No encontré ese emoji en *este* servidor.')], ephemeral: true });
        }

        // Obtener quién lo creó (puede requerir fetch y permisos)
         let creator = 'Desconocido';
         try {
            const fetchedEmoji = await emoji.fetchAuthor(); // Necesita ManageEmojisAndStickers o fetch desde auditoría
             creator = fetchedEmoji.tag || 'Desconocido';
         } catch (e) {
            console.warn(`[EmojiInfo] No se pudo obtener el creador del emoji ${emoji.name}: ${e.message}`);
         }


        const embed = createEmbed(`Información del Emoji: ${emoji.name}`, `${emoji}`) // Mostrar el emoji en la descripción
            .setColor(colors.default)
            .setThumbnail(emoji.url)
            .addFields(
                { name: '📛 Nombre', value: `\`${emoji.name}\``, inline: true },
                { name: '🆔 ID', value: `\`${emoji.id}\``, inline: true },
                { name: '🔗 URL', value: `[Link](${emoji.url})`, inline: true },
                { name: 'ანი Animado?', value: emoji.animated ? 'Sí' : 'No', inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👤 Creador', value: creator, inline: true }, // Puede ser 'Desconocido'
                { name: '🌐 Disponible?', value: emoji.available ? 'Sí' : 'No', inline: true },
                { name: '🔒 ¿Requiere Colones?', value: emoji.requiresColons ? 'Sí' : 'No', inline: true },
                 { name: '👥 ¿Gestionado?', value: emoji.managed ? 'Sí' : 'No', inline: true },
            );


        await interaction.reply({ embeds: [embed] });
    }
};
