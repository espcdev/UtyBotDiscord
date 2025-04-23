const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { createEmbed, colors } = require('../../utils/embeds');
const os = require('node:os');
const ms = require('ms');
const packageJson = require('../../../package.json'); // Acceder a package.json desde la raíz

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Muestra información y estadísticas sobre mí.'),
    async execute(interaction, client) {
        await interaction.deferReply();

        // --- Cálculos ---
        const uptimeMs = Date.now() - client.readyTimestamp;
        const uptimeString = ms(uptimeMs, { long: true });
        const ping = client.ws.ping;
        const memoryUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2); // MB
        const cpuUsage = os.loadavg()[0].toFixed(2); // Carga promedio 1 min (aproximado)

        // Contar servidores y usuarios (puede ser aproximado si no hay intents)
        // Usar Sharding Manager si el bot es muy grande, si no, client.guilds.cache
        let serverCount = client.guilds.cache.size;
        let userCount = client.users.cache.size; // Usuarios cacheados globalmente
         // Intento más preciso si es posible (puede requerir fetch o sharding)
         /* try {
             if (client.shard) {
                 const guilds = await client.shard.fetchClientValues('guilds.cache.size');
                 serverCount = guilds.reduce((acc, count) => acc + count, 0);
                 // Contar usuarios es más complejo con sharding, client.users.cache es una aproximación
             }
         } catch (e) { console.warn("Error fetching shard data for botinfo:", e); }
         */


        // --- Crear Embed ---
        const embed = createEmbed(`${client.user.username} - Información`, `¡Hola! Soy UTYBot, tu asistente cósmico.`)
            .setColor(colors.default)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                // Estadísticas Generales
                { name: '📊 Servidores', value: `${serverCount}`, inline: true },
                { name: '👥 Usuarios (Cacheados)', value: `${userCount}`, inline: true },
                { name: '🏓 Ping API', value: `${ping}ms`, inline: true },
                // Rendimiento
                { name: '⏱️ Tiempo Activo', value: uptimeString, inline: true },
                { name: '🧠 Memoria (RSS)', value: `${memoryUsage} MB`, inline: true },
                { name: '⚙️ CPU Load (1m avg)', value: `${cpuUsage}%`, inline: true },
                // Versiones
                { name: '🔧 Versión Node.js', value: process.version, inline: true },
                { name: '📚 Versión Discord.js', value: `v${djsVersion}`, inline: true },
                { name: '🤖 Versión del Bot', value: `v${packageJson.version || 'N/A'}`, inline: true }, // Lee desde package.json
                // Enlaces Útiles
                 { name: '🔗 Invítame', value: `[Click Aquí](${`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`})`, inline: true },
                 //{ name: '❓ Servidor Soporte', value: '[Link]', inline: true }, // Añade link si tienes server de soporte
                 //{ name: '🌐 Página Web', value: '[utybot.pages.dev](https://utybot.pages.dev)', inline: true },
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
