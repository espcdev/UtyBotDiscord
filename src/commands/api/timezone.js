const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timezone')
        .setDescription('Muestra la hora actual en una zona horaria específica.')
        .addStringOption(option =>
            option.setName('zona_horaria')
                .setDescription('La zona horaria (ej: America/Mexico_City, Europe/London, UTC, EST).')
                .setRequired(true)
                .setAutocomplete(true)), // Autocompletado para zonas horarias

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
         // La API WorldTimeAPI tiene un endpoint para listar zonas, pero es grande.
         // Podríamos tener una lista predefinida o buscar en la API si el input es largo.
         // Ejemplo con lista predefinida (simple):
         const commonTimezones = [
             'America/Mexico_City', 'America/New_York', 'America/Los_Angeles',
             'Europe/London', 'Europe/Paris', 'Europe/Berlin',
             'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
             'UTC', 'GMT', 'EST', 'PST', 'CET'
         ];

         const filtered = commonTimezones
             .filter(tz => tz.toLowerCase().includes(focusedValue.toLowerCase()))
             .slice(0, 25); // Limitar

         try {
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
         } catch (error) {
             console.error("[Timezone Autocomplete] Error:", error);
         }
    },


    async execute(interaction) {
        const timezoneInput = interaction.options.getString('zona_horaria');
        await interaction.deferReply();

        // World Time API
        const apiUrl = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(timezoneInput)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            if (!data || !data.datetime || !data.timezone) {
                 console.error("[Timezone] Respuesta inesperada de WorldTimeAPI:", data);
                  throw new Error('La API no devolvió los datos esperados.');
            }

            const dateTime = new Date(data.datetime); // Fecha/Hora completa con offset
            const timezone = data.timezone;
            const abbreviation = data.abbreviation || 'N/A';
            const utcOffset = data.utc_offset || 'N/A';
            // const dayOfYear = data.day_of_year;
            // const weekNumber = data.week_number;
            // const isDst = data.dst; // Horario de verano

             // Formatear fecha y hora usando Discord Timestamps
             const timestampDiscord = Math.floor(dateTime.getTime() / 1000);


            const embed = createEmbed(`Hora en: ${timezone}`, `Actualmente son las <t:${timestampDiscord}:T>`)
                .setColor(colors.default)
                .addFields(
                    { name: 'Fecha Completa', value: `<t:${timestampDiscord}:F>`, inline: false },
                    { name: 'Abreviatura', value: `\`${abbreviation}\``, inline: true },
                    { name: 'Offset UTC', value: `\`${utcOffset}\``, inline: true },
                     //{ name: '¿Horario Verano?', value: isDst ? 'Sí' : 'No', inline: true },
                     //{ name: 'Día del Año', value: `${dayOfYear}`, inline: true },
                     //{ name: 'Semana del Año', value: `${weekNumber}`, inline: true },
                )
                 .setFooter({ text: `Datos de WorldTimeAPI.org` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Timezone] Error fetching data for ${timezoneInput}:`, error);
            // La API devuelve 404 si la zona no es válida
             if (error.message.includes('404')) {
                await interaction.editReply({ embeds: [createErrorEmbed(`La zona horaria "${timezoneInput}" no fue encontrada. Asegúrate de usar el formato correcto (ej: Area/Ciudad).`)] });
            } else {
                 await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la hora: ${error.message}`)] });
            }
        }
    },
};
