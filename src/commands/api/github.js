// src/commands/api/github.js (Actualizado v8)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { makeApiRequest } = require('../../utils/apiHelper');
const { createEmbed, createErrorEmbed, colors } = require('../../utils/embeds');
const { GITHUB_API_TOKEN } = process.env; // Cargar token opcional

module.exports = {
    data: new SlashCommandBuilder()
        .setName('github')
        .setDescription('Muestra información sobre un usuario o repositorio de GitHub.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Nombre de usuario o en formato "usuario/repositorio".')
                .setRequired(true)),
    async execute(interaction) {
        const query = interaction.options.getString('query').trim(); // Quitar espacios extra
        await interaction.deferReply();

        // Validar formato básico
        if (!query || query.includes(' ')) {
             return interaction.editReply({ embeds: [createErrorEmbed('Formato inválido. Usa "usuario" o "usuario/repositorio" sin espacios intermedios.')] });
        }

        const isRepo = query.includes('/');
        let apiUrl;
        if (isRepo) {
            if (query.split('/').length !== 2 || query.startsWith('/') || query.endsWith('/')) {
                 return interaction.editReply({ embeds: [createErrorEmbed('Formato de repositorio inválido. Debe ser "usuario/repositorio".')] });
            }
            apiUrl = `https://api.github.com/repos/${encodeURIComponent(query)}`;
        } else {
            apiUrl = `https://api.github.com/users/${encodeURIComponent(query)}`;
        }

        // Configurar opciones de fetch (incluir token si existe)
        const options = {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                // Añadir token de autorización si está disponible
                ...(GITHUB_API_TOKEN && { 'Authorization': `Bearer ${GITHUB_API_TOKEN}` })
            }
        };

        try {
            const data = await makeApiRequest(apiUrl, options); // Pasar options a makeApiRequest

            let embed;

            if (isRepo) {
                // --- Información del Repositorio ---
                 const repo = data;
                 // Verificar si la respuesta fue válida (puede devolver OK pero sin datos esperados si el repo no existe con ese case)
                 if (!repo || !repo.full_name) throw new Error('Repositorio no encontrado o respuesta inválida.');

                 embed = createEmbed(`Repositorio: ${repo.full_name}`, repo.description?.substring(0, 500) || 'Sin descripción.') // Acortar descripción
                     .setColor(colors.default)
                     .setURL(repo.html_url)
                     .setThumbnail(repo.owner?.avatar_url || null)
                     .addFields(
                         { name: '👤 Propietario', value: `[<span class="math-inline">\{repo\.owner?\.login\}\]\(</span>{repo.owner?.html_url})`, inline: true },
                         { name: '⭐ Estrellas', value: `${repo.stargazers_count?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '🍴 Forks', value: `${repo.forks_count?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '👀 Observadores', value: `${repo.watchers_count?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '🗣️ Lenguaje', value: repo.language || 'N/A', inline: true },
                         { name: '⚖️ Licencia', value: repo.license?.name || 'Ninguna', inline: true },
                         { name: '⚠️ Issues Abiertos', value: `${repo.open_issues_count?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '📅 Última Act.', value: repo.updated_at ? `<t:${Math.floor(new Date(repo.updated_at).getTime() / 1000)}:R>` : 'N/A', inline: true },
                         { name: '📅 Creación', value: repo.created_at ? `<t:${Math.floor(new Date(repo.created_at).getTime() / 1000)}:R>` : 'N/A', inline: true },
                     )
                     .setFooter({ text: `ID: ${repo.id} | Datos de GitHub API` });
                 if (repo.topics && repo.topics.length > 0) {
                     embed.addFields({ name: '🏷️ Topics', value: repo.topics.map(t => `\`${t}\``).join(', ').substring(0, 1020), inline: false });
                 }

            } else {
                 // --- Información del Usuario ---
                 const user = data;
                  if (!user || !user.login) throw new Error('Usuario no encontrado o respuesta inválida.');

                 embed = createEmbed(`Usuario: ${user.login}`, user.bio?.substring(0, 500) || 'Sin biografía.') // Acortar bio
                     .setColor(colors.default)
                     .setURL(user.html_url)
                     .setThumbnail(user.avatar_url || null)
                     .addFields(
                         { name: '👤 Nombre', value: user.name || 'No especificado', inline: true },
                         { name: '🏢 Compañía', value: user.company || 'N/A', inline: true },
                         { name: '📍 Ubicación', value: user.location || 'N/A', inline: true },
                         { name: '🔗 Web', value: user.blog ? `[Visitar](${user.blog})` : 'N/A', inline: true },
                         { name: '✉️ Email', value: user.email || 'No público', inline: true },
                         { name: '📚 Repos Públicos', value: `${user.public_repos?.toLocaleString() ?? '0'}`, inline: true },
                         //{ name: '📜 Gists Públicos', value: `${user.public_gists?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '👣 Seguidores', value: `${user.followers?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '👀 Siguiendo', value: `${user.following?.toLocaleString() ?? '0'}`, inline: true },
                         { name: '📅 Se unió', value: user.created_at ? `<t:${Math.floor(new Date(user.created_at).getTime() / 1000)}:R>` : 'N/A', inline: true },
                     )
                     .setFooter({ text: `ID: ${user.id} | ${user.type} | Datos de GitHub API` });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(`[GitHub] Error fetching data for ${query}:`, error);
            if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('no encontrado')) {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se encontró el usuario o repositorio "${query}".`)] });
            } else if (error.message.includes('403') || error.message.includes('rate limit')) {
                await interaction.editReply({ embeds: [createErrorEmbed('Se ha alcanzado el límite de peticiones a la API de GitHub. Intenta de nuevo más tarde o configura un Token en .env.')] });
            } else if (error.message.includes('401')) {
                await interaction.editReply({ embeds: [createErrorEmbed('Token de API de GitHub inválido.')] });
            } else {
                await interaction.editReply({ embeds: [createErrorEmbed(`No se pudo obtener la información de GitHub: ${error.message}`)] });
            }
        }
    },
};
