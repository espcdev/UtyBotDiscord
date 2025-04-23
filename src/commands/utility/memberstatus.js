// src/commands/utility/memberstatus.js
const { SlashCommandBuilder, GatewayIntentBits } = require('discord.js'); // Necesitas GatewayIntentBits aquí o en index.js
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('memberstatus')
        .setDescription('Muestra el recuento de miembros por estado de conexión.'),
    async execute(interaction, client) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('Este comando solo funciona en servidores.')], ephemeral: true });
        }

         // Advertencia sobre Intents si no está habilitado Presence
         // Verifica si el intent GuildPresences está habilitado en el cliente
         const hasPresenceIntent = client.options.intents.has(GatewayIntentBits.GuildPresences);


        await interaction.deferReply();

        try {
             // Fetch members para obtener presencias actualizadas (¡Puede ser intensivo en servidores grandes!)
             // Si NO tienes el intent Presence, esto devolverá datos limitados o solo del caché.
            await interaction.guild.members.fetch(); // Considera quitar esto si no tienes el intent o en servers muy grandes

            let online = 0;
            let idle = 0;
            let dnd = 0;
            let offline = 0; // O 'invisible'

            interaction.guild.members.cache.forEach(member => {
                // Si no hay intent Presence, 'presence' será null para la mayoría
                if (!member.presence) {
                    offline++;
                    return;
                }
                switch (member.presence.status) {
                    case 'online': online++; break;
                    case 'idle': idle++; break;
                    case 'dnd': dnd++; break;
                    case 'offline': // Presencia puede ser 'offline' aunque el intent no esté, basado en caché
                    default: offline++; break; // Contar 'invisible' como offline también
                }
            });

            // Contar total desde guild.memberCount para precisión
            const totalMembers = interaction.guild.memberCount;
            // Ajustar offline basado en el total y los contados online/idle/dnd
            const countedOnline = online + idle + dnd;
             offline = totalMembers - countedOnline; // Más preciso si hay intent y fetch

            const embed = createEmbed(`Estado de Miembros en ${interaction.guild.name}`, `Total: ${totalMembers}`)
                .setColor(colors.default)
                .addFields(
                    { name: '🟢 En Línea', value: `${online}`, inline: true },
                    { name: '🌙 Ausente', value: `${idle}`, inline: true },
                    { name: '⛔ No Molestar', value: `${dnd}`, inline: true },
                    { name: '⚫ Desconectado/Invisible', value: `${offline}`, inline: true }
                );

             if (!hasPresenceIntent) {
                embed.setFooter({ text: 'Advertencia: El intent "GuildPresences" no está habilitado; los recuentos pueden ser imprecisos.' });
             }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Error en /memberstatus:", error);
            await interaction.editReply({ embeds: [createErrorEmbed('No se pudo obtener el estado de los miembros.')] });
        }
    },
};
