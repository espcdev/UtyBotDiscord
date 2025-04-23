// src/commands/fun/hangman.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// --- Lista de Palabras (Puedes expandir o mejorar) ---
// Temática espacial/tecnológica/general
const wordList = [
    "ESTRELLA", "PLANETA", "GALAXIA", "NEBULOSA", "COMETA", "ASTEROIDE", "ORBITA", "COHETE",
    "SATELITE", "UNIVERSO", "COSMOS", "ASTRONAUTA", "TELESCOPIO", "SOLAR", "LUNAR", "ECLIPSE",
    "AGUJERO", "NEGRO", // Agujero Negro como dos palabras, o usar "AGUJERONEGRO"
    "CONSTELACION", "METEORO", "ANDROMEDA", "SUPERNOVA", "DISCORD", "BOT", "SERVIDOR",
    "CANAL", "MENSAJE", "CODIGO", "JAVASCRIPT", "PYTHON", "HTML", "CSS", "NODO", // Node
    "TERMINAL", "COMANDO", "FUNCION", "VARIABLE", "ALGORITMO", "PROGRAMA", "INTERNET"
];

// --- Estados del Ahorcado (ASCII Art Simple) ---
const hangmanStages = [
    '```\n +---+\n |   |\n     |\n     |\n     |\n     |\n=========', // 0 errores
    '```\n +---+\n |   |\n O   |\n     |\n     |\n     |\n=========', // 1 error
    '```\n +---+\n |   |\n O   |\n |   |\n     |\n     |\n=========', // 2 errores
    '```\n +---+\n |   |\n O   |\n/|   |\n     |\n     |\n=========', // 3 errores
    '```\n +---+\n |   |\n O   |\n/|\\  |\n     |\n     |\n=========', // 4 errores
    '```\n +---+\n |   |\n O   |\n/|\\  |\n/    |\n     |\n=========', // 5 errores
    '```\n +---+\n |   |\n O   |\n/|\\  |\n/ \\  |\n     |\n========='  // 6 errores (Fin)
];

// --- Almacenamiento en memoria de juegos activos ---
// Clave: channelId, Valor: objeto del juego
// En una implementación real/persistente, usarías una base de datos.
const activeGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Inicia o juega al ahorcado en este canal.')
        .addStringOption(option =>
            option.setName('guess')
                .setDescription('Adivina una letra o la palabra completa.')
                .setRequired(false)), // Es opcional para iniciar el juego

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ embeds: [createErrorEmbed('El ahorcado solo se puede jugar en servidores.')], ephemeral: true });
        }

        const channelId = interaction.channelId;
        const guess = interaction.options.getString('guess')?.toUpperCase(); // Convertir a mayúsculas
        const userId = interaction.user.id;
        const userTag = interaction.user.tag;

        // --- Intentar Adivinar (Si hay juego activo y se proporcionó guess) ---
        if (activeGames.has(channelId) && guess) {
            const game = activeGames.get(channelId);

            // Validar input
            if (!/^[A-Z]$/.test(guess) && guess.length > 1 && guess.length !== game.word.length) {
                 return interaction.reply({ embeds: [createErrorEmbed('Tu intento debe ser una sola letra o la palabra completa.')], ephemeral: true });
            }
            if (guess.length === 1 && !/^[A-Z]$/.test(guess)) { // Solo letras A-Z
                 return interaction.reply({ embeds: [createErrorEmbed('Por favor, adivina solo letras (A-Z).')], ephemeral: true });
            }


            let messageContent = '';
            let correctGuess = false;
            let gameOver = false;
            let win = false;

            // --- Adivinar Palabra Completa ---
            if (guess.length > 1) {
                if (guess === game.word) {
                    correctGuess = true;
                    win = true;
                    gameOver = true;
                    game.display = game.word.split(''); // Revelar palabra
                    messageContent = `¡Correcto! ${userTag} adivinó la palabra: **${game.word}**. ¡Has ganado! 🎉`;
                } else {
                    game.guessesLeft--;
                    messageContent = `"${guess}" no es la palabra correcta. Pierdes un intento.`;
                    if (game.guessesLeft <= 0) {
                        gameOver = true;
                        win = false;
                        messageContent += `\n¡Te has quedado sin intentos! La palabra era **${game.word}**. 💀`;
                    }
                }
            }
            // --- Adivinar Letra ---
            else {
                if (game.guessedLetters.has(guess)) {
                    return interaction.reply({ embeds: [createErrorEmbed(`Ya has intentado la letra "${guess}". Letras intentadas: ${Array.from(game.guessedLetters).join(', ')}`)], ephemeral: true });
                }

                game.guessedLetters.add(guess);

                if (game.word.includes(guess)) {
                    correctGuess = true;
                    messageContent = `¡Bien! La letra "${guess}" está en la palabra.`;
                    // Actualizar display
                    for (let i = 0; i < game.word.length; i++) {
                        if (game.word[i] === guess) {
                            game.display[i] = guess;
                        }
                    }
                    // Verificar si ganó
                    if (!game.display.includes('_')) {
                        win = true;
                        gameOver = true;
                        messageContent += `\n¡Has adivinado la palabra: **${game.word}**! ¡Ganaste! 🥳`;
                    }
                } else {
                    correctGuess = false;
                    game.guessesLeft--;
                    messageContent = `La letra "${guess}" no está en la palabra. Pierdes un intento.`;
                    if (game.guessesLeft <= 0) {
                        gameOver = true;
                        win = false;
                        messageContent += `\n¡Te has quedado sin intentos! La palabra era **${game.word}**. 💀`;
                    }
                }
            }

            // --- Actualizar o Finalizar Juego ---
            if (gameOver) {
                activeGames.delete(channelId); // Terminar juego
                const finalEmbed = createEmbed(win ? '🏆 ¡Juego Terminado - Ganaste!' : '💀 Juego Terminado - Perdiste', messageContent)
                    .setColor(win ? colors.success : colors.error)
                    .addFields(
                        { name: 'Palabra', value: `\`\`\`\n${game.display.join(' ')}\n\`\`\`` },
                        { name: 'Estado Final', value: hangmanStages[hangmanStages.length - 1 - game.guessesLeft] } // Mostrar estado final del ahorcado
                    );
                 // Editar mensaje original si tenemos el ID
                 if(game.messageId) {
                    try {
                        const originalMessage = await interaction.channel.messages.fetch(game.messageId);
                        await originalMessage.edit({ embeds: [finalEmbed], components: [] }); // Quitar componentes si los hubiera
                         // Responder a la interacción que finalizó el juego
                         return interaction.reply({ content: `Juego terminado. ${win ? '¡Felicidades!' : 'Mejor suerte la próxima.'}`, ephemeral: true });
                    } catch (editError) {
                         console.error("Hangman: Error editando mensaje final", editError);
                         // Si falla la edición, responder directamente
                          return interaction.reply({ embeds: [finalEmbed] });
                    }
                 } else {
                      // Si no se pudo guardar el ID del mensaje, responder directamente
                      return interaction.reply({ embeds: [finalEmbed] });
                 }

            } else {
                // --- Continuar Juego: Actualizar Embed ---
                const currentStage = hangmanStages.length - 1 - game.guessesLeft;
                const gameEmbed = createEmbed('🤔 Juego del Ahorcado', messageContent)
                    .setColor(colors.default)
                    .addFields(
                        { name: 'Palabra', value: `\`\`\`\n${game.display.join(' ')}\n\`\`\`` }, // Mostrar guiones y letras adivinadas
                        { name: 'Intentos Restantes', value: `${game.guessesLeft}`, inline: true },
                        { name: 'Letras Intentadas', value: game.guessedLetters.size > 0 ? `\`${Array.from(game.guessedLetters).sort().join(', ')}\`` : '*Ninguna*', inline: true },
                        { name: 'Progreso', value: hangmanStages[currentStage] || hangmanStages[0] } // Mostrar dibujo del ahorcado
                    )
                    .setFooter({text: `Usa /hangman guess: <letra_o_palabra> para continuar.`});

                // Editar mensaje original si tenemos el ID
                 if(game.messageId) {
                    try {
                        const originalMessage = await interaction.channel.messages.fetch(game.messageId);
                        await originalMessage.edit({ embeds: [gameEmbed] });
                         // Responder efímeramente a la interacción del intento
                         return interaction.reply({ content: messageContent, ephemeral: true });
                    } catch (editError) {
                         console.error("Hangman: Error editando mensaje de progreso", editError);
                         // Si falla la edición, responder directamente (puede crear mensajes duplicados)
                          return interaction.reply({ embeds: [gameEmbed] });
                    }
                 } else {
                      // Si no se pudo guardar el ID del mensaje, responder directamente
                      return interaction.reply({ embeds: [gameEmbed] });
                 }
            }

        }
        // --- Iniciar Nuevo Juego (Si no hay juego activo o no se proporcionó guess) ---
        else if (!activeGames.has(channelId) && !guess) {
            const wordToGuess = wordList[Math.floor(Math.random() * wordList.length)];
            const initialDisplay = Array(wordToGuess.length).fill('_');
            const initialGuesses = 6; // Número de intentos

            const newGame = {
                word: wordToGuess,
                guessedLetters: new Set(),
                guessesLeft: initialGuesses,
                display: initialDisplay,
                messageId: null, // Guardaremos el ID del mensaje del juego aquí
                starterId: userId,
                starterTag: userTag
            };

            activeGames.set(channelId, newGame);

            const startEmbed = createEmbed('🤔 ¡Nuevo Juego del Ahorcado!', `¡Adivina la palabra! Tienes ${initialGuesses} intentos.`)
                .setColor(colors.default)
                .addFields(
                    { name: 'Palabra', value: `\`\`\`\n${initialDisplay.join(' ')}\n\`\`\`` },
                    { name: 'Intentos Restantes', value: `${initialGuesses}`, inline: true },
                    { name: 'Letras Intentadas', value: '*Ninguna*', inline: true },
                    { name: 'Progreso', value: hangmanStages[0] } // Estado inicial del ahorcado
                )
                .setFooter({text: `Iniciado por ${userTag}. Usa /hangman guess: <letra_o_palabra>`});

            try {
                const gameMessage = await interaction.reply({ embeds: [startEmbed], fetchReply: true });
                // Guardar el ID del mensaje para poder editarlo después
                newGame.messageId = gameMessage.id;
                activeGames.set(channelId, newGame); // Actualizar el juego con el messageId
            } catch (replyError) {
                 console.error("Hangman: Error enviando mensaje inicial", replyError);
                 activeGames.delete(channelId); // Limpiar si no se pudo enviar
                 await interaction.followUp({ embeds: [createErrorEmbed("No se pudo iniciar el juego del ahorcado.")], ephemeral: true }).catch(()=>{});
            }

        } else if (activeGames.has(channelId) && !guess) {
            // Hay un juego activo pero no se hizo un intento, recordar cómo jugar
             return interaction.reply({ embeds: [createEmbed('ℹ️ Juego en Curso', 'Ya hay un juego del ahorcado activo en este canal. Usa `/hangman guess: <letra_o_palabra>` para adivinar.')], ephemeral: true });
        } else {
             // No hay juego activo y se intentó adivinar
             return interaction.reply({ embeds: [createErrorEmbed('No hay ningún juego del ahorcado activo en este canal. Inicia uno con `/hangman` (sin guess).')], ephemeral: true });
        }
    }
};
