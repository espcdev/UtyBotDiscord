const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

// Almacenamiento simple en memoria para encuestas activas (se pierde al reiniciar)
// Para persistencia, usa una base de datos
const activePolls = new Map(); // messageId -> { question: string, options: Map<string, Set<string>>, creatorId: string, endTime: number | null }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Crea una encuesta con opciones y botones.')
        .addStringOption(option =>
            option.setName('pregunta')
                .setDescription('La pregunta de la encuesta.')
                .setRequired(true)
                .setMaxLength(256)) // Limite de título de Embed
        .addStringOption(option =>
            option.setName('opciones')
                .setDescription('Las opciones separadas por coma (ej: Opción A, Opción B, Opción C)')
                .setRequired(true)
                .setMaxLength(1000))
        .addIntegerOption(option =>
            option.setName('duracion_minutos')
                .setDescription('Duración de la encuesta en minutos (opcional, 0 o vacío para indefinida)')
                .setMinValue(0)
                .setRequired(false)),
    // botPermissions: [PermissionsBitField.Flags.AddReactions], // No necesario con botones

    async execute(interaction) {
        const question = interaction.options.getString('pregunta');
        const optionsString = interaction.options.getString('opciones');
        const durationMinutes = interaction.options.getInteger('duracion_minutos');

        const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

        if (options.length < 2) {
            return interaction.reply({ embeds: [createErrorEmbed('Debes proporcionar al menos 2 opciones separadas por coma.')], ephemeral: true });
        }
        if (options.length > 5) { // Limitar a 5 botones por fila por defecto
            return interaction.reply({ embeds: [createErrorEmbed('Actualmente, solo se permiten hasta 5 opciones.')], ephemeral: true });
        }

        const endTime = durationMinutes && durationMinutes > 0 ? Date.now() + durationMinutes * 60 * 1000 : null;

        const embed = new EmbedBuilder() // Usar EmbedBuilder directamente para más control
            .setTitle(`📊 Encuesta: ${question}`)
            .setColor(colors.default)
            .setDescription('Vota haciendo clic en una de las opciones a continuación.' + (endTime ? `\nTermina <t:${Math.floor(endTime / 1000)}:R>` : ''))
            .setFooter({ text: `Encuesta creada por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        const row = new ActionRowBuilder();
        const initialPollData = {
            question: question,
            options: new Map(options.map(opt => [opt, new Set()])), // Clave: Opción, Valor: Set de UserIDs que votaron
            creatorId: interaction.user.id,
            endTime: endTime,
            votes: new Map(), // userId -> option voted
        };

        options.forEach((option, index) => {
            // Añadir contador inicial al embed
            embed.addFields({ name: `${index + 1}. ${option}`, value: '`0 votos`', inline: true });
            // Crear botón
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_${interaction.id}_${index}`) // ID único: poll_interactionId_optionIndex
                    .setLabel(option.length > 80 ? option.substring(0, 77) + '...' : option) // Acortar etiqueta si es necesario
                    .setStyle(ButtonStyle.Secondary) // Empezar en secundario
                    // .setEmoji('❓') // Emoji opcional
            );
        });

        try {
            const pollMessage = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            // Guardar datos de la encuesta asociada al ID del mensaje
            activePolls.set(pollMessage.id, initialPollData);

             // Programar el fin de la encuesta si hay duración
             if (endTime) {
                 setTimeout(async () => {
                     const finalPollData = activePolls.get(pollMessage.id);
                     if (!finalPollData) return; // La encuesta ya no existe (quizás borrada)

                     const finalEmbed = new EmbedBuilder()
                         .setTitle(`📊 Encuesta Finalizada: ${finalPollData.question}`)
                         .setColor(colors.warning)
                         .setDescription('La votación ha terminado. Resultados:')
                          .setFooter({ text: `Encuesta creada por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                     let winnerText = 'No hubo votos.';
                     let maxVotes = 0;
                     const sortedOptions = [...finalPollData.options.entries()]
                         .sort(([, votersA], [, votersB]) => votersB.size - votersA.size);

                     if (sortedOptions.length > 0 && sortedOptions[0][1].size > 0) {
                         maxVotes = sortedOptions[0][1].size;
                         const winners = sortedOptions.filter(([, voters]) => voters.size === maxVotes);
                         winnerText = winners.map(([option]) => `**${option}**`).join(', ');
                     }

                     sortedOptions.forEach(([option, voters], index) => {
                         const voteCount = voters.size;
                         const percentage = (finalPollData.votes.size > 0 ? (voteCount / finalPollData.votes.size * 100) : 0).toFixed(1);
                         finalEmbed.addFields({
                             name: `${index + 1}. ${option}`,
                             value: `\`${voteCount} votos (${percentage}%)\``,
                             inline: true
                         });
                     });

                     finalEmbed.addFields({ name: '🏆 Ganador(es)', value: winnerText + ` con ${maxVotes} voto(s).` });


                     // Deshabilitar botones
                     const finalRow = ActionRowBuilder.from(pollMessage.components[0]); // Copiar la fila de botones existente
                     finalRow.components.forEach(button => button.setDisabled(true));

                     try {
                        await pollMessage.edit({ embeds: [finalEmbed], components: [finalRow] });
                     } catch (editError) {
                          console.error("Error al editar mensaje de encuesta finalizada:", editError);
                     }

                     activePolls.delete(pollMessage.id); // Limpiar encuesta de memoria
                 }, durationMinutes * 60 * 1000);
             }

        } catch (error) {
            console.error("Error creando encuesta:", error);
            await interaction.followUp({ embeds: [createErrorEmbed('No se pudo crear la encuesta.')], ephemeral: true });
        }
    },

     // --- Manejo de Interacción de Botones (Separado pero importante) ---
     // Esta lógica se moverá o se llamará desde `src/events/interactionCreate.js`
     async handlePollButton(interaction) {
         const [type, pollInteractionId, optionIndexStr] = interaction.customId.split('_');
         if (type !== 'poll') return; // Asegurarse de que es un botón de encuesta

         const pollMessageId = interaction.message.id;
         const pollData = activePolls.get(pollMessageId);
         const optionIndex = parseInt(optionIndexStr, 10);

         if (!pollData) {
             // La encuesta ya no está activa o hubo un error
              const embed = createErrorEmbed('Esta encuesta ya no está activa o ha ocurrido un error.');
             return interaction.update({ embeds: [embed], components: [] }); // Actualizar mensaje para quitar botones
         }

         if (pollData.endTime && Date.now() > pollData.endTime) {
             const embed = createErrorEmbed('Esta encuesta ya ha finalizado.');
             // Opcional: deshabilitar botones aquí también si el timeout falló
             return interaction.reply({ embeds: [embed], ephemeral: true });
         }

         const userId = interaction.user.id;
         const optionsArray = Array.from(pollData.options.keys());
         const selectedOption = optionsArray[optionIndex];

          if (!selectedOption) {
              console.warn(`Índice de opción inválido ${optionIndex} para encuesta ${pollMessageId}`);
              return interaction.reply({ embeds: [createErrorEmbed('Opción inválida.')], ephemeral: true });
          }

          // Verificar si el usuario ya votó
         const previousVote = pollData.votes.get(userId);
         if (previousVote) {
              // Si ya votó por esta opción, no hacer nada o quitar voto (decidir comportamiento)
              if (previousVote === selectedOption) {
                   return interaction.reply({ content: 'Ya has votado por esta opción.', ephemeral: true });
                  // Opcional: quitar voto
                  // pollData.options.get(selectedOption)?.delete(userId);
                  // pollData.votes.delete(userId);
              } else {
                   // Cambiar voto
                  pollData.options.get(previousVote)?.delete(userId); // Quitar del set anterior
                  pollData.options.get(selectedOption)?.add(userId); // Añadir al set nuevo
                  pollData.votes.set(userId, selectedOption); // Actualizar el voto del usuario
                   await interaction.reply({ content: `Has cambiado tu voto a **${selectedOption}**.`, ephemeral: true });
              }
         } else {
             // Primer voto
             pollData.options.get(selectedOption)?.add(userId);
             pollData.votes.set(userId, selectedOption);
             await interaction.reply({ content: `Has votado por **${selectedOption}**.`, ephemeral: true });
         }


         // Actualizar el Embed de la encuesta con los nuevos conteos
         const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]); // Copiar embed existente
         updatedEmbed.data.fields = []; // Limpiar campos antiguos

         let totalVotes = 0;
         pollData.options.forEach(voters => totalVotes += voters.size);


          optionsArray.forEach((option, index) => {
              const voteCount = pollData.options.get(option)?.size || 0;
              const percentage = (totalVotes > 0 ? (voteCount / totalVotes * 100) : 0).toFixed(1);
              updatedEmbed.addFields({
                  name: `${index + 1}. ${option}`,
                  value: `\`${voteCount} votos (${percentage}%)\``,
                  inline: true
              });
          });

          // Actualizar el mensaje de la encuesta (sin cambiar los botones)
          try {
             await interaction.message.edit({ embeds: [updatedEmbed] });
          } catch (editError) {
              console.error("Error actualizando embed de encuesta:", editError);
              // No enviar error al usuario aquí, ya recibió la confirmación de voto
          }

     }
};

// **Importante:** En `src/events/interactionCreate.js`, dentro del `else if (interaction.isButton())`,
// necesitas añadir la llamada a este handler:
/*
   else if (interaction.isButton()) {
       if (interaction.customId.startsWith('poll_')) {
           // Buscar el comando poll para llamar a su handler
           const pollCommand = client.commands.get('poll');
           if (pollCommand && typeof pollCommand.handlePollButton === 'function') {
               try {
                   await pollCommand.handlePollButton(interaction);
               } catch (pollError) {
                   console.error("Error manejando botón de encuesta:", pollError);
                   // Intentar responder al usuario sobre el error
                   await interaction.reply({ content: 'Hubo un error al procesar tu voto.', ephemeral: true }).catch(()=>{});
               }
           } else {
                console.error("No se encontró el comando 'poll' o su handler de botones.");
           }
       }
       // ... otros handlers de botones ...
   }
*/
