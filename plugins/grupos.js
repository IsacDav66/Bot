// plugins/grupos.js
// Lista todos los grupos del bot, genera archivos y los envía al admin.

const fs = require('fs'); // Usaremos fs.promises para escritura asíncrona
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

// --- Cargar Configuración Centralizada (lords.json) ---
const loadGroupPaths = () => {
  const filePath = path.resolve(__dirname, '..', 'lords.json');
  try {
    if (!fs.existsSync(filePath)) { throw new Error(`lords.json no encontrado: ${filePath}`); }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Listar Grupos] Error crítico al cargar lords.json:', error.message);
    return {};
  }
};
const groupConfig = loadGroupPaths();
// --------------------------------------

// --- Función Principal (execute) ---
const execute = async (client, message, args) => {
    const senderIdRaw = message.author || message.from; // ID detectado
    const chatId = message.from; // Chat donde se ejecutó

    // 1. Verificar Autorización (Solo usuarios en lords.json pueden ejecutar)
    //    Podríamos hacerla más específica (ej. solo si el usuario es admin global del bot)
    //    Por ahora, verificaremos si el usuario está en CUALQUIER grupo de lords.json
    console.log(`[Listar Grupos] Verificando autorización para ${senderIdRaw}...`);
    const senderNumberPart = senderIdRaw.split('@')[0];
    let isAuthorized = false;
    let authorizedUserRealNumber = null;
    let targetPrivateChatId = null; // ID privado del usuario autorizado

    for (const config of Object.values(groupConfig)) {
        if (config.allowedNumbers && Array.isArray(config.allowedNumbers)) {
            const foundUser = config.allowedNumbers.find(user => user.id === senderNumberPart);
            if (foundUser) {
                isAuthorized = true;
                authorizedUserRealNumber = foundUser.numerocelular;
                break; // Encontrado en al menos una lista
            }
        }
    }

    if (!isAuthorized || !authorizedUserRealNumber) {
        console.warn(`[Listar Grupos] Usuario ${senderNumberPart} (de ${senderIdRaw}) no encontrado en ninguna lista de allowedNumbers en lords.json o falta numerocelular.`);
        return message.reply('🚫 No tienes permiso global para usar este comando.');
    }
    console.log(`[Listar Grupos] Usuario ${senderNumberPart} autorizado. Número real: ${authorizedUserRealNumber}`);

    // Resolver ID privado para enviar resultados
    try {
        const numberDetails = await client.getNumberId(authorizedUserRealNumber);
        if (numberDetails) {
            targetPrivateChatId = numberDetails._serialized;
            console.log(`[Listar Grupos] ID privado resuelto: ${targetPrivateChatId}`);
        } else {
             throw new Error(`No se pudo resolver el ID para ${authorizedUserRealNumber}`);
        }
    } catch (resolveError) {
        console.error(`[Listar Grupos] Error resolviendo ID privado:`, resolveError);
        return message.reply(`❌ Error al obtener tu ID privado (${authorizedUserRealNumber}). No se puede continuar.`);
    }

    // --- Si la autorización pasa ---
    await message.reply("⏳ Obteniendo lista de grupos, por favor espera...");

    // 2. Obtener todos los chats y filtrar grupos
    let groups = [];
    try {
        const chats = await client.getChats();
        groups = chats.filter(chat => chat.isGroup);
        console.log(`[Listar Grupos] Encontrados ${groups.length} grupos.`);
    } catch (error) {
        console.error("[Listar Grupos] Error al obtener chats:", error);
        return message.reply('⚠️ Error al obtener la lista de chats.');
    }

    if (groups.length === 0) {
        return message.reply('⚠️ El bot no parece estar en ningún grupo.');
    }

    // 3. Procesar cada grupo
    const botIdSerialized = client.info.wid._serialized;
    let groupData = [];
    let iniContent = "[Grupos]\n\n";
    let messageText = "📋 *Lista de Grupos donde está el Bot* 📋\n\n";

    for (const group of groups) {
        const groupID = group.id._serialized;
        const groupName = group.name;
        let groupLink = "No disponible";
        let isAdmin = "No";
        let participants = group.participants || []; // Usar la lista existente si está

        // Intentar asegurar la lista de participantes más reciente
        // y verificar si el bot es admin
        try {
            // Forzar actualización (puede ser lento con muchos grupos)
            // await group.fetchParticipants();
            // participants = group.participants; // Usar la lista actualizada

            const botParticipant = participants.find(p => p.id._serialized === botIdSerialized);
            if (botParticipant && botParticipant.isAdmin) {
                isAdmin = "Sí";
                try {
                    const inviteCode = await group.getInviteCode();
                    groupLink = `https://chat.whatsapp.com/${inviteCode}`;
                } catch (err) {
                    groupLink = "Error enlace (¿Permisos?)";
                    console.warn(`[Listar Grupos] Error obteniendo enlace para ${groupName}: ${err.message}`);
                }
            } else if (botParticipant) {
                 isAdmin = "No";
            } else {
                 isAdmin = "??? (Bot no encontrado)";
                 console.warn(`[Listar Grupos] Bot no se encontró a sí mismo en grupo ${groupName}`);
            }
        } catch (err) {
            isAdmin = "Error";
            groupLink = "Error metadata";
            console.error(`[Listar Grupos] Error procesando participantes/admin para ${groupName}:`, err);
        }

        groupData.push({
            ID: groupID,
            Nombre: groupName,
            Link: groupLink,
            BotEsAdmin: isAdmin
        });

        iniContent += `[Grupo ${groupName}]\n`;
        iniContent += `ID = ${groupID}\n`;
        iniContent += `Enlace = ${groupLink}\n`;
        iniContent += `BotEsAdmin = ${isAdmin}\n\n`;

        messageText += `🔹 *${groupName}*\n`;
        messageText += `🆔 \`${groupID}\`\n`; // Backticks para ID
        messageText += `🔗 ${groupLink}\n`;
        messageText += `👮 Admin: ${isAdmin}\n\n`;
    }

    // 4. Definir rutas y guardar archivos en la raíz del proyecto
    const jsonFilePath = path.join(__dirname, '..', 'groupIDs.json');
    const iniFilePath = path.join(__dirname, '..', 'grupos.ini');

    try {
        await fs.promises.writeFile(jsonFilePath, JSON.stringify(groupData, null, 2));
        console.log(`[Listar Grupos] Archivo JSON guardado en ${jsonFilePath}`);
        await fs.promises.writeFile(iniFilePath, iniContent);
        console.log(`[Listar Grupos] Archivo INI guardado en ${iniFilePath}`);
    } catch (error) {
        console.error("[Listar Grupos] Error al guardar archivos:", error);
        await message.reply('⚠️ Error al guardar los archivos de reporte.');
        // Continuar para intentar enviar el mensaje de texto al menos
    }

    // 5. Enviar resultados al privado del usuario autorizado
    try {
        // Enviar primero el mensaje de texto
        console.log(`[Listar Grupos] Enviando lista de texto a ${targetPrivateChatId}`);
        // Dividir mensaje si es muy largo (WhatsApp tiene límites)
        const MAX_MSG_LENGTH = 4000; // Límite aproximado, ajustar si es necesario
        if (messageText.length > MAX_MSG_LENGTH) {
             console.warn(`[Listar Grupos] El mensaje de texto es muy largo (${messageText.length}), enviando en partes.`);
             let start = 0;
             while(start < messageText.length) {
                  await client.sendMessage(targetPrivateChatId, messageText.substring(start, start + MAX_MSG_LENGTH));
                  start += MAX_MSG_LENGTH;
                  await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa
             }
        } else {
             await client.sendMessage(targetPrivateChatId, messageText);
        }
        console.log(`[Listar Grupos] Lista de texto enviada.`);

        // Enviar archivo JSON
        if (fs.existsSync(jsonFilePath)) {
             console.log(`[Listar Grupos] Enviando archivo JSON a ${targetPrivateChatId}`);
             const mediaJson = MessageMedia.fromFilePath(jsonFilePath);
             await client.sendMessage(targetPrivateChatId, mediaJson, { sendMediaAsDocument: true });
             console.log(`[Listar Grupos] Archivo JSON enviado.`);
             await new Promise(resolve => setTimeout(resolve, 500)); // Pausa
        }

        // Enviar archivo INI
        if (fs.existsSync(iniFilePath)) {
             console.log(`[Listar Grupos] Enviando archivo INI a ${targetPrivateChatId}`);
             const mediaIni = MessageMedia.fromFilePath(iniFilePath);
             await client.sendMessage(targetPrivateChatId, mediaIni, { sendMediaAsDocument: true });
             console.log(`[Listar Grupos] Archivo INI enviado.`);
        }

        // Confirmar en el chat original
        await message.reply(`✅ @${senderNumberPart}, te envié la lista de grupos y los archivos JSON/INI por privado.`);

    } catch (error) {
        console.error(`[Listar Grupos] Error al enviar resultados a ${targetPrivateChatId}:`, error);
        await message.reply(`❌ Ocurrió un error al enviar los resultados a tu chat privado. Verifica si iniciaste chat conmigo. Error: ${error.message}`);
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'listar_grupos_bot',
    aliases: ['grupos', 'listagrupos', 'getgroups'], // Comandos para activar
    description: 'Genera y envía una lista de todos los grupos del bot (Solo autorizado).',
    category: 'Utilidad',
    // groupOnly: false, // Puede ejecutarse desde privado, pero la autorización es clave
    execute: execute
};