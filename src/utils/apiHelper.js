// src/utils/apiHelper.js
const fetch = require('node-fetch'); // Usar node-fetch v2

async function makeApiRequest(url, options = {}, expectedStatus = 200) {
    try {
        // console.log(`[API Request] Fetching: ${url}`, options); // Log para depuración
        const response = await fetch(url, options);
        // console.log(`[API Response] Status: ${response.status} for ${url}`); // Log para depuración

        if (response.status !== expectedStatus) {
            let errorBody = 'No additional error details available.';
            try {
                // Intentar parsear como texto o json para más detalles
                const textBody = await response.text();
                try {
                     errorBody = JSON.stringify(JSON.parse(textBody), null, 2);
                } catch {
                     errorBody = textBody;
                }
            } catch (parseError){
                console.error("Failed to parse error response body:", parseError);
            }

            console.error(`API request to ${url} failed with status ${response.status}. Body:\n${errorBody}`);
            throw new Error(`La API devolvió un estado inesperado: ${response.status}`);
        }

        // Intentar parsear como JSON por defecto
        const data = await response.json();
        return data;

    } catch (error) {
        console.error(`Error durante la petición a ${url}:`, error);
        if (error instanceof fetch.FetchError) {
             throw new Error(`Error de red al contactar la API: ${error.message}`);
        } else if (error.message.startsWith('La API devolvió un estado inesperado')) {
             throw error; // Re-lanzar error de estado HTTP
        } else if (error instanceof SyntaxError) {
             // Esto puede pasar si la API no devuelve JSON válido cuando se esperaba
             console.error("Failed to parse API response as JSON.");
             throw new Error('La API devolvió una respuesta con formato inesperado.');
        }
        // Error genérico
        throw new Error(`No se pudo completar la solicitud a la API: ${error.message}`);
    }
}

// Función específica para APIs que pueden devolver texto plano (como lyrics.ovh)
async function makeTextApiRequest(url, options = {}, expectedStatus = 200) {
     try {
        const response = await fetch(url, options);

        if (response.status !== expectedStatus) {
            // Manejo de errores similar al anterior pero sin asumir JSON
            const errorBody = await response.text().catch(() => 'Could not read error body.');
            console.error(`API request to ${url} failed with status ${response.status}. Body:\n${errorBody}`);
            throw new Error(`La API devolvió un estado inesperado: ${response.status}`);
        }

        const textData = await response.text();
        return textData;

    } catch (error) {
         console.error(`Error durante la petición de texto a ${url}:`, error);
          if (error instanceof fetch.FetchError) {
             throw new Error(`Error de red al contactar la API: ${error.message}`);
         } else if (error.message.startsWith('La API devolvió un estado inesperado')) {
              throw error; // Re-lanzar error de estado HTTP
         }
         throw new Error(`No se pudo completar la solicitud de texto a la API: ${error.message}`);
    }
}


module.exports = { makeApiRequest, makeTextApiRequest };
