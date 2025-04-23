// src/commands/api/mcstatus.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Muestra el estado de un servidor de Minecraft Java.')
        .addStringOption(option =>
            option.setName('ip_servidor')
                .setDescription('La IP o dominio del servidor de Minecraft (ej: mc.hypixel.net).')
                .setRequired(true)),
    async execute(interaction) {
        const serverIp = interaction.options.getString('ip_servidor');
        await interaction.deferReply();

        // Usar mcsrvstat.us API v2
        const apiUrl = `https://api.mcsrvstat.us/2/${encodeURIComponent(serverIp)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            // Crear embed base
            const embed = createEmbed(`⛏️ Estado Servidor MC: ${serverIp}`, '')
                .setColor(colors.default); // Cambiar color si está online/offline

            if (data.online) {
                // --- Servidor Online ---
                embed.setColor(colors.success); // Verde
                embed.setTitle(`✅ Servidor Online: ${serverIp}`);

                // Información básica
                 const version = data.version || 'N/A';
                 const playersOnline = data.players?.online?.toLocaleString() || '0';
                 const playersMax = data.players?.max?.toLocaleString() || 'N/A';
                 const motd = data.motd?.clean?.join('\n')?.substring(0, 1000) || 'N/A'; // Limpiar y acortar MOTD

                 embed.addFields(
                    { name: '👥 Jugadores', value: `${playersOnline} / ${playersMax}`, inline: true },
                    { name: '⚙️ Versión', value: `\`${version}\``, inline: true },
                    // Ping no siempre disponible con esta API
                    // { name: '📶 Ping', value: data.ping ? `${data.ping}ms` : 'N/A', inline: true },
                 );
                  embed.setDescription(`**MOTD:**\n\`\`\`\n${motd}\n\`\`\``);

                 // Lista de jugadores (si existe y no es muy larga)
                if (data.players?.list && data.players.list.length > 0 && data.players.list.length <= 25) {
                     embed.addFields({ name: `Jugadores Conectados (${data.players.list.length})`, value: '`' + data.players.list.join('`, `') + '`'});
                } else if (data.players?.list && data.players.list.length > 25) {
                    embed.addFields({ name: `Jugadores Conectados (${data.players.list.length})`, value: '*Demasiados para mostrar aquí.*'});
                }


                // Icono del servidor si existe
                if (data.icon) {
                    // La API devuelve el icono como base64 data URI
                    // Discord no puede usarlo directamente en setThumbnail.
                    // Necesitarías subirlo a otro lugar o adjuntarlo.
                    // Por simplicidad, no lo añadimos aquí.
                    // embed.setThumbnail(data.icon); // <-- Esto NO funciona directamente
                }

            } else {
                // --- Servidor Offline ---
                embed.setColor(colors.error); // Rojo
                embed.setTitle(`❌ Servidor Offline: ${serverIp}`);
                embed.setDescription('El servidor no respondió o no existe.');
            }

             embed.setFooter({ text: 'Datos de mcsrvstat.us' });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[MCStatus] Error fetching status for ${serverIp}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener el estado del servidor: ${error.message}`)] });
        }
    }
};
