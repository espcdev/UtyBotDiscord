const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('npm')
        .setDescription('Busca información sobre un paquete en npm.')
        .addStringOption(option =>
            option.setName('paquete')
                .setDescription('El nombre exacto del paquete npm.')
                .setRequired(true)),
    async execute(interaction) {
        const packageName = interaction.options.getString('paquete').toLowerCase(); // npm es sensible a mayúsculas/minúsculas en nombres
        await interaction.deferReply();

        // URL del registro de npm
        const apiUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

        try {
            const data = await makeApiRequest(apiUrl);

            // Verificar si el paquete existe (la API devuelve error 404 si no)
            // makeApiRequest ya maneja el error 404 lanzando una excepción que capturamos abajo.

            // Extraer datos relevantes
            const latestVersion = data['dist-tags']?.latest || 'N/A';
            const description = data.description || 'Sin descripción.';
            const homepage = data.homepage || 'No especificada';
            const license = data.license || 'No especificada';
            const author = data.author?.name || (typeof data.author === 'string' ? data.author : 'Desconocido');
            const maintainers = data.maintainers?.map(m => m.name).join(', ') || 'N/A';
            const lastPublishTime = data.time?.[latestVersion] ? `<t:${Math.floor(new Date(data.time[latestVersion]).getTime() / 1000)}:R>` : 'N/A';
            const keywords = data.keywords?.join(', ') || 'Ninguna';


            const embed = createEmbed(`📦 Paquete npm: ${data.name}`, description)
                .setColor(colors.default) // Puedes usar un color específico para npm, ej: #CB3837
                .setURL(`https://www.npmjs.com/package/${data.name}`)
                .addFields(
                    { name: '🏷️ Última Versión', value: `\`${latestVersion}\``, inline: true },
                    { name: '📜 Licencia', value: `\`${license}\``, inline: true },
                    { name: '👤 Autor', value: author, inline: true },

                    { name: '🔗 Página Principal', value: homepage.startsWith('http') ? `[Visitar](${homepage})` : homepage, inline: false },
                     { name: '👥 Mantenedores', value: maintainers.substring(0, 1020), inline: false }, // Acortar si hay muchos
                     { name: '📅 Última Publicación (versión latest)', value: lastPublishTime, inline: true },
                     { name: '🔑 Palabras Clave', value: keywords.substring(0, 1020) || 'Ninguna', inline: false }, // Acortar
                );

             // Añadir link a repositorio si existe
             if (data.repository?.url) {
                 // Limpiar URL de git+ o https://
                  const repoUrl = data.repository.url
                      .replace(/^git\+/, '')
                      .replace(/\.git$/, '');
                  if (repoUrl.startsWith('http')) {
                       embed.addFields({ name: '📂 Repositorio', value: `[Ver](${repoUrl})`, inline: true });
                  }
             }

             embed.setFooter({ text: `Datos del registro de npm` });


            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[NPM] Error fetching data for ${packageName}:`, error);
            if (error.message.includes('404')) {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró el paquete npm "${packageName}". Verifica el nombre.`)] });
            } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información del paquete: ${error.message}`)] });
            }
        }
    },
};
