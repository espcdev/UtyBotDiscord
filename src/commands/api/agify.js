// src/commands/api/agify.js
const { SlashCommandBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('agify')
        .setDescription('Intenta predecir la edad promedio para un nombre.')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('El nombre (preferiblemente solo el primer nombre).')
                .setRequired(true)),
    async execute(interaction) {
        const name = interaction.options.getString('nombre');
        await interaction.deferReply();

        // Usar Agify.io API pública
        const apiUrl = `https://api.agify.io?name=${encodeURIComponent(name)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            // La API devuelve null en 'age' si no tiene datos
            if (!data || typeof data.age === 'undefined' || typeof data.count === 'undefined') {
                 throw new Error('Respuesta inesperada de la API Agify.');
            }

            if (data.age === null) {
                 return interaction.editReply({ embeds: [createEmbed(`🤔 Edad para "${data.name}"`, `No tengo suficientes datos para predecir una edad para el nombre "${data.name}".`)] });
            }

            const age = data.age;
            const count = data.count.toLocaleString('es-MX'); // Número de registros usados

            const embed = createEmbed(`🧐 Edad promedio para: ${data.name}`, `Basado en ${count} registros, la edad promedio estimada es:`)
                .setColor(colors.default)
                .addFields({ name: 'Edad Estimada', value: `**${age} años**` })
                .setFooter({ text: 'Datos de Agify.io (Solo para entretenimiento)' });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[Agify] Error fetching age for ${name}:`, error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo predecir la edad: ${error.message}`)] });
        }
    }
};
