const { SlashCommandBuilder } = require('discord.js');
const { OpenAI } = require('openai'); // Asegúrate de tener 'openai' instalado
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { OPENROUTER_API_KEY, YOUR_SITE_URL, YOUR_SITE_NAME } = process.env; // Cargar credenciales y URL/Nombre opcional

// Validar si la API Key está presente
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'TU_CLAVE_DE_OPENROUTER_AQUI') {
    console.warn("⚠️ Advertencia: OPENROUTER_API_KEY no está configurada en .env. El comando /ai no funcionará.");
}

// Configurar cliente de OpenAI para apuntar a OpenRouter
let openAIClient;
if (OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'TU_CLAVE_DE_OPENROUTER_AQUI') {
     openAIClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OPENROUTER_API_KEY,
        // dangerouslyAllowBrowser: true, // ¡NO USAR EN PRODUCCIÓN REAL SI ESTÁS EN NAVEGADOR! En Node.js no es necesario.
    });
     console.log("[AI Command] Cliente de OpenRouter inicializado.");
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Habla con una Inteligencia Artificial (via OpenRouter).')
        .addStringOption(option =>
            option.setName('prompt')
                .setDescription('El mensaje o pregunta para la IA.')
                .setRequired(true)
                .setMaxLength(2000)), // Limitar longitud del prompt
    async execute(interaction) {
        // Verificar de nuevo la API Key antes de ejecutar
        if (!openAIClient) {
            return interaction.reply({ embeds: [createErrorEmbed('El comando /ai no está disponible. Falta configuración de API Key.')], ephemeral: true });
        }

        const prompt = interaction.options.getString('prompt');
        await interaction.deferReply(); // La respuesta de la IA puede tardar

        try {
            const completion = await openAIClient.chat.completions.create({
                model: "meta-llama/llama-4-scout:free", // Modelo recomendado y potente (puedes cambiarlo)
                // model: "openrouter/anthropic/claude-3-haiku", // Ejemplo de otro modelo
                // model: "mistralai/mistral-7b-instruct", // Ejemplo de modelo más rápido/pequeño
                messages: [
                    // Opcional: Mensaje de sistema para darle personalidad/instrucciones
                    // { role: "system", content: "Eres UtyBot, un asistente servicial y creativo que responde en español." },
                    { role: "user", content: prompt }
                ],
                // Cabeceras opcionales para rankings de OpenRouter
                extraHeaders: {
                    "HTTP-Referer": YOUR_SITE_URL || 'http://localhost', // Usar valor de .env o default
                    "X-Title": YOUR_SITE_NAME || 'UtyBotV1', // Usar valor de .env o default
                },
                 max_tokens: 1024, // Limitar longitud de respuesta (opcional)
                 // temperature: 0.7, // Controlar creatividad (0.0 - 2.0)
            });

            const response = completion.choices[0]?.message?.content?.trim();

            if (!response) {
                throw new Error('La IA no devolvió una respuesta válida.');
            }

            // Dividir respuesta si es muy larga (límite de embed description ~4096)
            const MAX_LENGTH = 4000;
            const responseChunks = [];
             for (let i = 0; i < response.length; i += MAX_LENGTH) {
                responseChunks.push(response.substring(i, i + MAX_LENGTH));
            }

             const firstEmbed = createEmbed(`Respuesta de la IA`, responseChunks[0])
                .setColor(colors.default) // O un color específico para IA
                .setAuthor({ name: `Prompt de ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
                // .setFooter({ text: `Modelo: ${completion.model || 'openai/gpt-4o'}` }); // Mostrar modelo usado

             await interaction.editReply({ embeds: [firstEmbed] });

             // Enviar chunks adicionales si es necesario
             for (let i = 1; i < responseChunks.length; i++) {
                 // Crear un embed simple para la continuación
                 const continuationEmbed = createEmbed(`Respuesta de la IA (cont.)`, responseChunks[i]).setColor(colors.default);
                 await interaction.followUp({ embeds: [continuationEmbed] });
             }

        } catch (error) {
            console.error("[AI Command] Error:", error);
            let errorMessage = 'Hubo un error al procesar tu solicitud con la IA.';
            // Intentar obtener más detalles del error de la API de OpenAI/OpenRouter
             if (error.response && error.response.data) { // Si el error viene de la librería OpenAI con Axios
                 console.error("[AI Command] API Error Data:", error.response.data);
                 errorMessage += ` (API: ${error.response.data.error?.message || 'Error desconocido'})`;
             } else if (error.status && error.error) { // Si es un error directo de la API fetch
                  console.error("[AI Command] API Error Details:", error.error);
                  errorMessage += ` (API Status ${error.status}: ${error.error.message || 'Error desconocido'})`;
                  if (error.status === 401) errorMessage = 'Error de autenticación con OpenRouter. Revisa tu API Key.';
                  if (error.status === 402) errorMessage = 'Fondos insuficientes en OpenRouter o límite alcanzado.';
                  if (error.status === 429) errorMessage = 'Límite de peticiones a OpenRouter alcanzado. Intenta más tarde.';
             } else if (error.message) {
                errorMessage += ` (${error.message})`;
            }
            await interaction.editReply({ embeds: [createErrorEmbed(errorMessage)] }).catch(()=>{});
        }
    },
};
