// src/utils/commandLoader.js
const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function loadCommands(client) {
    client.commands = new Collection();
    const commandsPath = path.join(__dirname, '..', 'commands'); // Ruta a la carpeta 'commands'
    const commandFolders = fs.readdirSync(commandsPath);

    console.log("--- Cargando Comandos Slash (/) ---");

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        // Asegurarse de que es una carpeta
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                // Limpiar caché para recargas en caliente (si se implementa)
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                // Validar que el comando tenga 'data' y 'execute'
                if (command.data && typeof command.data === 'object' && typeof command.execute === 'function') {
                    // Corregir obtención del nombre del comando desde SlashCommandBuilder
                    const commandName = command.data.name;
                    if (!commandName) {
                         console.warn(`⚠️ El comando en ${filePath} no tiene una propiedad 'name' en 'data'. Saltando.`);
                         continue;
                    }
                    client.commands.set(commandName, command);
                    console.log(`[COMANDO] Cargado: /${commandName} (desde ${folder}/${file})`);
                } else {
                    console.warn(`⚠️ El comando en ${filePath} le falta la propiedad "data" o "execute". Saltando.`);
                }
            } catch (error) {
                console.error(`❌ Error cargando comando en ${filePath}:`, error);
            }
        }
    }
    console.log("-------------------------------------");
}

module.exports = { loadCommands };
