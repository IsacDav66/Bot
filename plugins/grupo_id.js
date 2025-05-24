// plugins/grupo_id.js
// Obtiene y envía ID, nombre y enlace del grupo actual.
// Autorización vía lords.json (compara ID detectado con 'id' en allowedNumbers).

const fs = require('fs');
const path = require('path');

// --- Cargar Configuración Centralizada (lords.json) ---
const loadGroupPaths = () => {
  const filePath = path.resolve(__dirname, '..', 'lords.json');
  try {
    if (!fs.existsSync(filePath)) { throw new Error(`lords.json no encontrado: ${filePath}`); }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[GrupoID] Error crítico al cargar lords.json:', error.message);
    return {};
  }
};
const groupConfig = loadGroupPaths();
// --------------------------------------

const execute = async (client, message, args) => {
    const senderIdRaw = message.author || message.from; // ID detectado (@c.us o @lid)
    const chatId = message.from; // ID del chat donde se envió (siempre @g.us aquí)

    // 1. Verificar si es un grupo (Aunque bot.js ya lo hace, doble check)
    let chat;
    try {
        chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('⚠️ Este comando solo funciona en grupos.');
        }
    } catch (e) {
        console.error("[GrupoID] Error al obtener chat:", e);
        return message.reply('❌ Error al obtener la información del chat.');
    }

    // 2. Verificar Autorización usando lords.json
    console.log(`[GrupoID] Verificando autorización para ID detectado: ${senderIdRaw} en chat ${chatId}`);
    const senderNumberPart = senderIdRaw.split('@')[0]; // Extraer la parte numérica del ID detectado

    const chatSettings = groupConfig[chatId];
    let isAuthorized = false;
    let authorizedUserRealNumber = null; // Para posible envío privado futuro

    if (chatSettings && chatSettings.allowedNumbers && Array.isArray(chatSettings.allowedNumbers)) {
        const foundUser = chatSettings.allowedNumbers.find(user => user.id === senderNumberPart);
        if (foundUser) {
            isAuthorized = true;
            authorizedUserRealNumber = foundUser.numerocelular; // Guardar número real por si acaso
            console.log(`[GrupoID] Usuario ${senderNumberPart} autorizado. Número real asociado: ${authorizedUserRealNumber}`);
        }
    }

    if (!isAuthorized) {
        console.warn(`[GrupoID] ID detectado ${senderNumberPart} (de ${senderIdRaw}) NO encontrado en 'id' de allowedNumbers para ${chatId}.`);
        return message.reply('🚫 No tienes permiso para usar este comando en este grupo.');
    }
    // --- Fin Autorización ---

    // 3. Obtener información del grupo
    const groupID = chatId; // El ID del grupo es el ID del chat
    const groupName = chat.name;

        // 4. Intentar obtener el enlace de invitación (Fallback sin verificación admin)
    let groupLink = "No disponible";
    try {
        console.log(`[GrupoID] Intentando obtener enlace directamente para ${chat.name}...`);
        const inviteCode = await chat.getInviteCode(); // Intentar siempre
        groupLink = `https://chat.whatsapp.com/${inviteCode}`;
        console.log(`[GrupoID] Enlace obtenido (o fallará si no es admin): ${groupLink}`);
    } catch (err) {
        groupLink = "Error al obtener enlace (o bot no es admin)"; // Mensaje más probable
        console.warn(`[GrupoID] Falló getInviteCode para ${chat.name}:`, err.message || err);
    }

    // 5. Formatear el mensaje de respuesta
    const responseMessage = `📌 *Información del Grupo* 📌\n\n` +
                            `🆔 *ID:* \`${groupID}\`\n` +
                            `📛 *Nombre:* ${groupName}\n` +
                            `🔗 *Enlace:* ${groupLink}`;

    // 6. Enviar mensaje EN PRIVADO al usuario autorizado
    // Necesitamos resolver el ID @c.us del usuario usando su NÚMERO REAL
    let targetPrivateChatId = null;
    if (authorizedUserRealNumber) {
        try {
            const numberDetails = await client.getNumberId(authorizedUserRealNumber);
            if (numberDetails) {
                targetPrivateChatId = numberDetails._serialized;
                console.log(`[GrupoID] ID privado resuelto para ${authorizedUserRealNumber}: ${targetPrivateChatId}`);
            } else {
                console.warn(`[GrupoID] No se pudo resolver el ID privado para el número real ${authorizedUserRealNumber}.`);
            }
        } catch (resolveError) {
            console.error(`[GrupoID] Error resolviendo ID privado para ${authorizedUserRealNumber}:`, resolveError);
        }
    } else {
         console.error("[GrupoID] Error crítico: Usuario autorizado pero no se encontró número real asociado en lords.json.");
         await message.reply("❌ Error de configuración: No se pudo encontrar tu número real para enviarte el mensaje privado.");
         return; // Salir si no podemos obtener el número real
    }


    if (targetPrivateChatId) {
        try {
            console.log(`[GrupoID] Enviando info del grupo ${groupName} a ${targetPrivateChatId}`);
            await client.sendMessage(targetPrivateChatId, responseMessage);
            // Confirmación opcional en el grupo
            await message.reply("✅ Información del grupo enviada a tu chat privado.");
        } catch (error) {
            console.error(`[GrupoID] Error al enviar mensaje privado a ${targetPrivateChatId}:`, error);
            await message.reply(`❌ Error al enviar la información a tu chat privado (${authorizedUserRealNumber}). ¿Iniciaste un chat conmigo? Error: ${error.message}`);
        }
    } else {
         // Si no se pudo resolver el ID privado, enviar al grupo como fallback
         console.warn(`[GrupoID] No se envió a privado. Enviando info al grupo ${chatId} como fallback.`);
         await message.reply(responseMessage); // Enviar al grupo si falla el privado
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'obtener_grupo_id',
    aliases: ['vergrupoid', 'groupid', 'chatid'],
    description: 'Muestra ID, nombre y enlace del grupo actual (Autorización vía lords.json).',
    category: 'Utilidad',
    groupOnly: true, // Marcar como comando de grupo
    execute: execute
};