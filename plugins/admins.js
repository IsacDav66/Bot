// --- plugins/admins.js ---
const { MessageMedia } = require('whatsapp-web.js'); // Necesitamos MessageMedia

module.exports = {
    name: 'Listar Admins',
    aliases: ['admins', 'adminlist', '@admins'],
    description: 'Menciona a todos los administradores del grupo actual, mostrando nombre e imagen del grupo.',
    category: 'Utilidad',
    groupOnly: true,

    async execute(client, message, args) {
        let chat;
        try {
            chat = await message.getChat();
            if (!chat.isGroup) {
                return message.reply('Este comando solo funciona en grupos.');
            }
        } catch (e) {
            console.error("[ADMINS] Error obteniendo el chat:", e);
            return message.reply("Hubo un error al obtener la información de este chat.");
        }

        const groupName = chat.name; // Obtenemos el nombre del grupo
        console.log(`[ADMINS] Comando !admins detectado en: ${groupName}`);

        try {
            // --- Obtener participantes y filtrar admins (igual que antes) ---
            let participants = chat.participants;
            const botId = client.info.wid._serialized;

            if (!participants || !Array.isArray(participants)) {
                 console.warn(`[ADMINS] Participantes no disponibles en ${groupName}. Fetching...`);
                 try {
                     await chat.fetchParticipants();
                     participants = chat.participants;
                     if (!participants || !Array.isArray(participants)) {
                          console.error(`[ADMINS] Fallo fetch participantes ${groupName}.`);
                          return message.reply('No pude obtener la lista de participantes.');
                     }
                 } catch (fetchError) {
                     console.error(`[ADMINS] Error fetching ${groupName}:`, fetchError);
                     return message.reply('Error al actualizar participantes.');
                 }
            }

            const admins = participants.filter(p => (p.isAdmin || p.isSuperAdmin) && p.id._serialized !== botId );

            if (admins.length === 0) {
                return message.reply('No se encontraron otros administradores en este grupo.');
            }

            // --- Construir lista de texto y recolectar IDs (igual que antes) ---
            let adminListText = ''; // Solo la lista, el encabezado va separado
            const adminMentionIds = [];
            admins.forEach(admin => {
                adminListText += `\n- @${admin.id.user}`;
                adminMentionIds.push(admin.id._serialized);
            });

            // --- Obtener Imagen del Grupo ---
            let media = null; // Variable para guardar MessageMedia si se obtiene
            try {
                // Obtener el "Contacto" asociado al grupo usando su ID
                const groupContact = await client.getContactById(chat.id._serialized);
                const profilePicUrl = await groupContact.getProfilePicUrl(); // Obtener URL de la foto

                if (profilePicUrl) {
                    console.log(`[ADMINS] Obteniendo imagen desde URL: ${profilePicUrl}`);
                    // Crear MessageMedia desde la URL. unsafeMime a veces es necesario.
                    media = await MessageMedia.fromUrl(profilePicUrl, { unsafeMime: true });
                    console.log("[ADMINS] Imagen del grupo obtenida.");
                } else {
                    console.log(`[ADMINS] El grupo "${groupName}" no tiene imagen de perfil.`);
                }
            } catch (picError) {
                console.error(`[ADMINS] Error al obtener/procesar la imagen del grupo "${groupName}":`, picError);
                // Continuar sin imagen si falla
            }

            // --- Construir Mensaje Final ---
            // Encabezado con el nombre del grupo
            const header = `👑 *Admins de "${groupName}"* 👑\n`;
            // El texto completo que irá como caption o mensaje
            const finalMessageText = header + adminListText;

            // --- Enviar Mensaje (con o sin imagen) ---
            console.log(`[ADMINS] Enviando lista para ${groupName}. ¿Con imagen?: ${!!media}`);
            if (media) {
                // Enviar imagen con la lista como pie de foto (caption)
                // Usamos client.sendMessage para enviar media
                await client.sendMessage(chat.id._serialized, media, {
                    caption: finalMessageText,
                    mentions: adminMentionIds
                });
            } else {
                // Enviar solo texto si no se pudo obtener la imagen
                // Usamos chat.sendMessage para texto
                await chat.sendMessage(finalMessageText, { mentions: adminMentionIds });
            }
            console.log(`[ADMINS] Mensaje enviado para ${groupName}.`);

        } catch (error) {
            console.error(`[ADMINS] Error general en !admins para ${groupName}:`, error);
            await message.reply('Ocurrió un error al listar los administradores.');
        }
    }
};