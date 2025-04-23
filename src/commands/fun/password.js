// src/commands/fun/password.js
const { SlashCommandBuilder } = require('discord.js');
const { randomBytes, randomInt } = require('node:crypto'); // Usar crypto de Node
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('password')
        .setDescription('Genera una contraseña aleatoria segura.')
        .addIntegerOption(option =>
            option.setName('longitud')
                .setDescription('Longitud de la contraseña (8-64, por defecto 16).')
                .setMinValue(8)
                .setMaxValue(64) // Limitar longitud máxima
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('numeros')
                .setDescription('Incluir números (por defecto Sí).')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('simbolos')
                .setDescription('Incluir símbolos (ej: !@#$%^&*) (por defecto Sí).')
                .setRequired(false)),
    async execute(interaction) {
        const length = interaction.options.getInteger('longitud') ?? 16;
        const includeNumbers = interaction.options.getBoolean('numeros') ?? true;
        const includeSymbols = interaction.options.getBoolean('simbolos') ?? true;

        await interaction.deferReply({ ephemeral: true }); // Enviar solo al usuario

        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        let charset = lower + upper;
        if (includeNumbers) charset += numbers;
        if (includeSymbols) charset += symbols;

        if (charset.length === 0) {
            return interaction.editReply({ embeds: [createErrorEmbed('Debes incluir al menos un tipo de caracter (letras).')] });
        }

        let password = '';
        try {
            // Generar bytes aleatorios y mapear al charset
            const randomValues = randomBytes(length); // Genera buffer de bytes aleatorios
            for (let i = 0; i < length; i++) {
                 // Usar el byte aleatorio para obtener un índice dentro del charset
                 const randomIndex = randomValues[i] % charset.length;
                password += charset[randomIndex];
            }

            // Otra forma más simple pero potencialmente menos uniforme con randomInt:
            /*
            for (let i = 0; i < length; i++) {
                password += charset[randomInt(charset.length)];
            }
            */

            const embed = createEmbed('🔑 Contraseña Generada', 'Aquí tienes tu contraseña segura:')
                .addFields({ name: 'Contraseña', value: `\`\`\`${password}\`\`\`` })
                .setFooter({ text: `Longitud: ${length} | Números: ${includeNumbers ? 'Sí' : 'No'} | Símbolos: ${includeSymbols ? 'Sí' : 'No'}`})
                .setColor(colors.success);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Password] Error generating password:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo generar la contraseña: ${error.message}`)] });
        }
    }
};
