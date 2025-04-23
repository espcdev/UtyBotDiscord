// index.js - Punto de entrada principal del Bot

const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands } = require('./src/utils/commandLoader');
const { loadEvents } = require('./src/utils/eventLoader');
require('dotenv').config();

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// Validar Token
if (!BOT_TOKEN) {
    console.error("FATAL: DISCORD_BOT_TOKEN no encontrado en .env. ¡El bot no puede iniciar!");
    process.exit(1);
}

// Crear instancia del Cliente con Intents necesarios
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers, // Necesario para eventos de miembros y roles (CAPTCHA)
        GatewayIntentBits.GuildModeration, // Para logs de ban/unban si los implementas
        GatewayIntentBits.GuildVoiceStates, // Si añades comandos de música/voz
    ],
});

client.captchaConfig = new Map(); // guildId -> { channelId: string, roleId: string }
client.captchaAttempts = new Map(); // userId -> { guildId: string, code: string, timestamp: number }
const captchaConfigPath = path.join(__dirname, 'data', 'captchaConfig.json');

// Función para cargar la configuración CAPTCHA al inicio
client.loadCaptchaConfig = function() {
    try {
        if (fs.existsSync(captchaConfigPath)) {
            const rawData = fs.readFileSync(captchaConfigPath);
            const loadedConfig = JSON.parse(rawData);
            // Validar que es un objeto antes de intentar convertirlo en Map
            if (typeof loadedConfig === 'object' && loadedConfig !== null) {
                 client.captchaConfig = new Map(Object.entries(loadedConfig));
                 console.log(`[CAPTCHA] Configuración cargada para ${client.captchaConfig.size} servidores.`);
            } else {
                 console.warn("[CAPTCHA] El archivo captchaConfig.json no contiene un objeto JSON válido. Iniciando con configuración vacía.");
                 client.captchaConfig = new Map();
                  // Opcional: crear el archivo si no existe o está corrupto
                 if (!fs.existsSync(captchaConfigPath) || typeof loadedConfig !== 'object') {
                     fs.writeFileSync(captchaConfigPath, JSON.stringify({}), 'utf8');
                 }
            }
        } else {
            console.log("[CAPTCHA] No se encontró captchaConfig.json. Creando archivo vacío.");
            fs.writeFileSync(captchaConfigPath, JSON.stringify({}), 'utf8'); // Crear archivo si no existe
            client.captchaConfig = new Map();
        }
    } catch (error) {
        console.error("❌ Error cargando captchaConfig.json:", error);
        client.captchaConfig = new Map(); // Asegurarse de que sea un Map vacío en caso de error
    }
};

// Función para guardar la configuración CAPTCHA
client.saveCaptchaConfig = function() {
    try {
        const configObject = Object.fromEntries(client.captchaConfig);
        fs.writeFileSync(captchaConfigPath, JSON.stringify(configObject, null, 4), 'utf8'); // Guarda con formato legible
        console.log("[CAPTCHA] Configuración guardada.");
    } catch (error) {
        console.error("❌ Error guardando captchaConfig.json:", error);
    }
};

// Limpieza periódica de intentos de CAPTCHA expirados (ej. cada 5 minutos)
setInterval(() => {
    const now = Date.now();
    const expirationTime = 5 * 60 * 1000; // 5 minutos en ms
    let clearedCount = 0;
    for (const [userId, attempt] of client.captchaAttempts.entries()) {
        if (now - attempt.timestamp > expirationTime) {
            client.captchaAttempts.delete(userId);
            clearedCount++;
        }
    }
    if (clearedCount > 0) {
        console.log(`[CAPTCHA] Limpiados ${clearedCount} intentos expirados.`);
    }
}, 5 * 60 * 1000);

// Colección para almacenar comandos
client.commands = new Collection();

// Cargar comandos y eventos
loadCommands(client);
loadEvents(client);

// Iniciar sesión del Bot
client.login(BOT_TOKEN)
    .then(() => {
        //console.log("Login exitoso"); // 'Ready' event se encargará del log principal
    })
    .catch(error => {
        console.error("❌ Error Crítico al iniciar sesión con el Token:", error);
        if (error.code === 'TokenInvalid') {
            console.error("El token proporcionado es inválido. Revisa tu archivo .env");
        } else if (error.code === 'DisallowedIntents') {
            console.error("Intents no permitidos. Asegúrate de haber habilitado los intents necesarios (Guilds, GuildMembers, MessageContent, etc.) en el Portal de Desarrolladores de Discord.");
        }
        process.exit(1); // Salir si no se puede iniciar sesión
    });

// --- Manejo de Errores Globales ---
process.on('unhandledRejection', error => {
    console.error('🚨 Unhandled promise rejection:', error);
    // Considera enviar este error a un canal de logs en Discord o a un servicio externo
});

process.on('uncaughtException', error => {
    console.error('💥 Uncaught exception:', error);
    // Considera un reinicio controlado o loggear antes de salir
    process.exit(1); // Salir en caso de excepción no capturada es generalmente más seguro
});
