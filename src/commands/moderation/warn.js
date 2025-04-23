const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { v4: uuidv4 } = require('uuid'); // Para IDs únicos: npm install uuid
const { createEmbed, createErrorEmbed, createSuccessEmbed, createWarningEmbed, colors } = require('../../utils/embeds');

const warningsFilePath = path.join(__dirname, '..', '..', '..', 'data', 'warnings.json');

// --- Helper Functions for Warnings (Consider moving to a dataManager.js) ---
function loadWarnings() {
    try {
        if (fs.existsSync(warningsFilePath)) {
            const rawData = fs.readFileSync(warningsFilePath);
            // Asegurarse de que no esté vacío antes de parsear
             if (rawData.length === 0) return {};
            return JSON.parse(rawData);
        }
        return {}; // Retorna objeto vacío si no existe
    } catch (error) {
        console.error("Error cargando warnings.json:", error);
        return {}; // Retorna objeto vacío en caso de error
    }
}

function saveWarnings(warningsData) {
    try {
        fs.writeFileSync(warningsFilePath, JSON.stringify(warningsData, null, 4), 'utf8');
    } catch (error) {
        console.error("Error guardando warnings.json:", error);
    }
}
// --- End Helper Functions ---


module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Gestiona las advertencias de los usuarios.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers) // Permiso base
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Añade una advertencia a un usuario.')
                .addUserOption(option => option.setName('usuario').setDescription('El usuario a advertir.').setRequired(true))
                .addStringOption(option => option.setName('razon').setDescription('La razón de la advertencia.').setMaxLength(512).setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Muestra las advertencias de un usuario.')
                .addUserOption(option => option.setName('usuario').setDescription('El usuario cuyas advertencias quieres ver.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Elimina una advertencia específica por su ID.')
                .addUserOption(option => option.setName('usuario').setDescription('El usuario cuya advertencia quieres eliminar.').setRequired(true))
                .addStringOption(option => option.setName('warn_id').setDescription('El ID de la advertencia a eliminar.').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clearall')
                .setDescription('Elimina TODAS las advertencias de un usuario.')
                .addUserOption(option => option.setName('usuario').setDescription('El usuario cuyas advertencias quieres eliminar.').setRequired(true))),

    userPermissions: [PermissionsBitField.Flags.ModerateMembers],
    // No requiere permisos especiales del bot más allá de leer miembros

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('usuario');
        const guildId = interaction.guildId;

        const warnings = loadWarnings();
        if (!warnings[guildId]) {
            warnings[guildId] = {};
        }
        if (!warnings[guildId][targetUser.id]) {
             warnings[guildId][targetUser.id] = [];
        }

        const userWarnings = warnings[guildId][targetUser.id];


        // --- Subcomando ADD ---
        if (subcommand === 'add') {
            const reason = interaction.options.getString('razon');
            const moderator = interaction.user;

            // Verificar jerarquía antes de advertir
            try {
                const targetMember = await interaction.guild.members.fetch(targetUser.id);
                 const executerMember = interaction.member;
                 if (targetMember.roles.highest.position >= executerMember.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
                     return interaction.reply({ embeds: [createErrorEmbed('No puedes advertir a un usuario con un rol igual o superior al tuyo.')], ephemeral: true });
                 }
            } catch (fetchError) {
                 // Usuario no encontrado en el servidor, se puede advertir igual si se desea
                 console.log(`[Warn Add] Usuario ${targetUser.tag} no encontrado, advirtiendo por ID.`);
            }


            const warnId = uuidv4().substring(0, 8); // ID corto único
            const newWarning = {
                warnId: warnId,
                moderatorId: moderator.id,
                moderatorTag: moderator.tag, // Guardar tag por si el mod se va
                reason: reason,
                timestamp: Date.now()
            };

            userWarnings.push(newWarning);
            saveWarnings(warnings); // Guardar cambios

            // Enviar DM al usuario advertido
            try {
                 const dmEmbed = createEmbed(`Has recibido una advertencia en ${interaction.guild.name}`,
                     `**Razón:** ${reason}\n**Moderador:** ${moderator.tag}\n**ID Advertencia:** \`${warnId}\``,
                     colors.warning);
                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.warn(`[Warn Add] No se pudo enviar DM a ${targetUser.tag}: ${dmError.message}`);
            }

            await interaction.reply({ embeds: [createSuccessEmbed(`Se añadió una advertencia a ${targetUser.tag} (ID: \`${warnId}\`).\nRazón: ${reason}`)] });

             // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Usuario Advertido', ...)] });

        }
        // --- Subcomando LIST ---
        else if (subcommand === 'list') {
            if (userWarnings.length === 0) {
                return interaction.reply({ embeds: [createEmbed(`Advertencias de ${targetUser.tag}`, 'Este usuario no tiene advertencias registradas.', colors.success)], ephemeral: true });
            }

            const embed = createEmbed(`Advertencias de ${targetUser.tag} (${userWarnings.length})`, '', colors.warning);
            // Paginar si hay muchas advertencias (implementación simple aquí)
            userWarnings.slice(0, 10).forEach((warn, index) => { // Mostrar las últimas 10
                 embed.addFields({
                     name: `⚠️ Advertencia #${userWarnings.length - index} (ID: \`${warn.warnId}\`)`,
                     value: `**Razón:** ${warn.reason}\n**Moderador:** ${warn.moderatorTag || warn.moderatorId}\n**Fecha:** <t:${Math.floor(warn.timestamp / 1000)}:F>`,
                     inline: false
                 });
            });
            if (userWarnings.length > 10) {
                 embed.setFooter({ text: `Mostrando las 10 advertencias más recientes de ${userWarnings.length}.`});
            }

            await interaction.reply({ embeds: [embed], ephemeral: true }); // Ephemeral para privacidad
        }
        // --- Subcomando CLEAR ---
        else if (subcommand === 'clear') {
            const warnIdToClear = interaction.options.getString('warn_id');

            const initialLength = userWarnings.length;
            const filteredWarnings = userWarnings.filter(warn => warn.warnId !== warnIdToClear);

            if (filteredWarnings.length === initialLength) {
                 return interaction.reply({ embeds: [createErrorEmbed(`No se encontró una advertencia con el ID \`${warnIdToClear}\` para ${targetUser.tag}.`)], ephemeral: true });
            }

            warnings[guildId][targetUser.id] = filteredWarnings;
            saveWarnings(warnings);

            await interaction.reply({ embeds: [createSuccessEmbed(`Se eliminó la advertencia con ID \`${warnIdToClear}\` para ${targetUser.tag}.`)] });

             // Opcional: Log
            // logChannel.send({ embeds: [createEmbed('Advertencia Eliminada', ...)] });
        }
         // --- Subcomando CLEARALL ---
         else if (subcommand === 'clearall') {
             if (userWarnings.length === 0) {
                 return interaction.reply({ embeds: [createWarningEmbed(`${targetUser.tag} no tenía advertencias para eliminar.`)], ephemeral: true });
             }

             const clearedCount = userWarnings.length;
             warnings[guildId][targetUser.id] = []; // Vaciar array
             saveWarnings(warnings);

             await interaction.reply({ embeds: [createSuccessEmbed(`Se eliminaron ${clearedCount} advertencias para ${targetUser.tag}.`)] });

              // Opcional: Log
             // logChannel.send({ embeds: [createEmbed('Advertencias Eliminadas (Todas)', ...)] });
         }
    },
};
