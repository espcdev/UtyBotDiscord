// src/events/ready.js
const { Events, REST, Routes } = require('discord.js');
const { CLIENT_ID, DISCORD_BOT_TOKEN } = process.env; // Asegúrate de que CLIENT_ID esté en .env

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🟢 ${client.user.tag} está en línea y listo!`);
        console.log(`🔗 Invita a tu bot: https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`); // Permiso 8 = Admin

        // Registrar comandos Slash
        const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
        try {
            console.log('🔄 Refrescando comandos Slash (/) globalmente...');

            const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());

            // Usar `applicationCommands` para registro global
            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commandsData },
            );

            console.log(`✅ ${data.length} comandos Slash registrados exitosamente.`);
        } catch (error) {
            console.error('❌ Error al registrar comandos Slash:', error);
        }

        // Cargar configuración CAPTCHA si existe
        client.loadCaptchaConfig(); // Añadiremos esta función al cliente más tarde
    },
};
