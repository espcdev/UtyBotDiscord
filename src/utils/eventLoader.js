// src/utils/eventLoader.js
const fs = require('node:fs');
const path = require('node:path');

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    console.log("------ Cargando Eventos ---------");

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            // Limpiar caché para recargas en caliente (si se implementa)
             delete require.cache[require.resolve(filePath)];
            const event = require(filePath);

            if (typeof event.name !== 'string' || typeof event.execute !== 'function') {
                 console.warn(`⚠️ El evento en ${filePath} no tiene 'name' o 'execute'. Saltando.`);
                 continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client)); // Pasar client si es necesario
            } else {
                client.on(event.name, (...args) => event.execute(...args, client)); // Pasar client si es necesario
            }
            console.log(`[EVENTO] Cargado: ${event.name} (desde ${file}) ${event.once ? '[Once]' : ''}`);

        } catch (error) {
             console.error(`❌ Error cargando evento en ${filePath}:`, error);
        }
    }
     console.log("-------------------------------------");
}

module.exports = { loadEvents };
