// src/commands/utility/binary.js
const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('binary')
        .setDescription('Codifica texto a binario o decodifica binario a texto.')
        .addStringOption(option =>
            option.setName('accion')
                .setDescription('¿Qué quieres hacer?')
                .setRequired(true)
                .addChoices(
                    { name: 'Codificar (Texto -> Binario)', value: 'encode' },
                    { name: 'Decodificar (Binario -> Texto)', value: 'decode' }
                ))
        .addStringOption(option =>
            option.setName('input')
                .setDescription('El texto o el código binario a procesar.')
                .setRequired(true)
                .setMaxLength(1000)), // Limitar input
    async execute(interaction) {
        const action = interaction.options.getString('accion');
        const input = interaction.options.getString('input');

        await interaction.deferReply({ ephemeral: true }); // Suele ser para uso personal

        try {
            let result = '';
            let title = '';

            if (action === 'encode') {
                title = 'Texto a Binario';
                if (input.length > 100) { // Prevenir output excesivo
                     return interaction.editReply({ embeds: [createErrorEmbed('El texto a codificar es demasiado largo (máx 100 caracteres).')] });
                }
                result = input.split('')
                            .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
                            .join(' ');
            } else if (action === 'decode') {
                title = 'Binario a Texto';
                // Validar que sea binario (simplificado: solo 0, 1 y espacios)
                if (!/^[01\s]+$/.test(input)) {
                    throw new Error('El input no parece ser código binario válido (solo 0, 1 y espacios).');
                }
                 if (input.length > 800) { // Prevenir input excesivo
                     return interaction.editReply({ embeds: [createErrorEmbed('El código binario a decodificar es demasiado largo.')] });
                }

                result = input.split(' ')
                            .map(bin => String.fromCharCode(parseInt(bin, 2)))
                            .join('');
            }

            // Comprobar si el resultado es válido/imprimible
            if (!result || result.includes('\uFFFD')) { // FFFD = Replacement Character
                throw new Error('La decodificación resultó en caracteres inválidos.');
            }

            const embed = createEmbed(`💻 ${title}`, '```\n' + result.substring(0, 1980) + '\n```') // Mostrar en bloque de código, acortar
                .setColor(colors.default)
                .addFields({ name: 'Input Original', value: '```\n' + input.substring(0, 1000) + '\n```' }); // Acortar

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[Binary] Error:", error);
            await interaction.editReply({ embeds: [createErrorEmbed(`Error al ${action === 'encode' ? 'codificar' : 'decodificar'}: ${error.message}`)] });
        }
    }
};
