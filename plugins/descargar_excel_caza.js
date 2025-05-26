// plugins/descargar_excel_caza.js - v16: Usa JSON con objetos {id, numerocelular}

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

// --- Cargar Configuración ---
const loadChatConfigs = () => {
    const filePath = path.resolve(__dirname, '..', 'lords.json');
    try { if (!fs.existsSync(filePath)) { throw new Error(`lords.json no encontrado: ${filePath}`); }
        const data = fs.readFileSync(filePath, 'utf8'); return JSON.parse(data); }
    catch (error) { console.error('[DC ERROR] Cargando lords.json:', error.message); return {}; }
};
const chatConfigs = loadChatConfigs();
// -----------------------------

module.exports = {
    name: 'descargar_excel_caza',
    aliases: ['descargarexcel', 'gethuntfile', 'descargarcaza'],
    description: 'Envía Excel de caza (usa objeto {id, num} para auth/envío).',

    async execute(client, message, args) {
        try {
            const chatId = message.from; // ID del chat (grupo)
            const senderIdRaw = message.author || message.from; // ID raw (@c.us o @lid)
            console.log(`[DC] Comando por ID raw: ${senderIdRaw}`);
            if (!senderIdRaw || !senderIdRaw.includes('@')) { await message.reply("❌ ID inválido."); return; }

            const senderNumberProvided = senderIdRaw.split('@')[0]; // Número según librería

            // --- 1. Verificar Configuración y Autorizar/Obtener Número Real ---
            let isAuthorized = false;
            let targetNumber = null; // Número REAL asociado al ID detectado

            const chatSettings = chatConfigs[chatId];
            if (!chatSettings || !chatSettings.allowedNumbers || !Array.isArray(chatSettings.allowedNumbers)) { if (chatSettings) await message.reply("⚠️ No hay usuarios autorizados configurados."); return; }

            const allowedUsersList = chatSettings.allowedNumbers; // Lista de objetos
            console.log(`[DC] Verificando autorización para NÚMERO DETECTADO: ${senderNumberProvided}`);
            console.log(`[DC] Lista auth:`, JSON.stringify(allowedUsersList));

            // Buscar si el NÚMERO DETECTADO coincide con la propiedad 'id' de algún objeto
            for (const allowedUser of allowedUsersList) {
                if (allowedUser.id === senderNumberProvided) {
                    isAuthorized = true;
                    targetNumber = allowedUser.numerocelular; // Obtener el NÚMERO REAL asociado
                    console.log(`[DC] Autorizado: ID ${senderNumberProvided} coincide. NumReal asociado: ${targetNumber}`);
                    break;
                }
            }

            if (!isAuthorized) { console.warn(`[DC] ID detectado ${senderNumberProvided} NO encontrado en 'id' de allowedNumbers para ${chatId}.`); await message.reply(`🚫 Tu ID detectado (${senderNumberProvided}) no está autorizado aquí.`); return; }
            if (!targetNumber) { console.error(`[DC Error] Autorizado (ID ${senderNumberProvided}), pero 'numerocelular' no encontrado en JSON.`); await message.reply(`❌ Error Config: No se encontró tu número real asociado.`); return; }
            console.log(`[DC] Número REAL para envío: ${targetNumber}`);
            // --- Fin Autorización y Obtención Número Real ---

            // --- 2. Resolver ID @c.us del NÚMERO REAL ---
            let targetChatId = null;
            try { console.log(`[DC] Resolviendo ID para número final: ${targetNumber}...`); const numberDetails = await client.getNumberId(targetNumber); if (!numberDetails) { throw new Error('getNumberId devolvió null'); } targetChatId = numberDetails._serialized; console.log(`[DC] ID de WhatsApp resuelto a: ${targetChatId}`); }
            catch (resolveError) { console.error(`[DC Error] Resolviendo ID para ${targetNumber}:`, resolveError); await message.reply(`❌ Error verificando tu número autorizado en WA (${targetNumber}).`); return; }
            // --- Fin Resolución ID ---

            // --- 3. Búsqueda de Archivos (GIFT_STATS) ---
            const pathsToSearch = chatSettings.path; if (!pathsToSearch || pathsToSearch.length === 0) { await message.reply("❌ No hay rutas configuradas."); return; }
            console.log(`[DC] Buscando GIFT_STATS en:`, pathsToSearch); const foundReports = [];
            for (const folderPath of pathsToSearch) { if (!fs.existsSync(folderPath)) continue; let files = []; try { files = fs.readdirSync(folderPath); } catch (e) { continue; } const excelFiles = files.filter(f => f.includes('GIFT_STATS') && (f.endsWith('.xlsx') || f.endsWith('.xls'))); if (excelFiles.length > 0) { const mostRecent = excelFiles.map(file => { const fullPath = path.join(folderPath, file); try { return { file, fullPath, time: fs.statSync(fullPath).mtime.getTime() }; } catch(e) { return { file, fullPath, time: 0 }; } }).sort((a, b) => b.time - a.time)[0]; if (mostRecent?.time > 0) { foundReports.push(mostRecent); console.log(`[DC] Archivo reciente: ${mostRecent.file}`); } } }
            if (foundReports.length === 0) { await message.reply('📂 No se encontraron archivos `GIFT_STATS` recientes.'); return; }
            // --- Fin Búsqueda ---

            // --- 4. Envío de Archivos al Privado (ID @c.us REAL) ---
            // ... (Lógica de envío sin cambios, ya usa targetChatId) ...
             if (!targetChatId) { await message.reply("❌ Problema ID privado final."); return; }
             await message.reply(`✅ ${foundReports.length} archivo(s) encontrados! Enviando a tu privado (${targetNumber})...`); let filesSentCount = 0; let privateChat; try { privateChat = await client.getChatById(targetChatId); console.log(`[DC] Objeto Chat privado OK.`); } catch (getChatError) { console.warn(`[DC WARN] No se pudo obtener objeto chat.`); privateChat = null; }
             if (foundReports.length > 0) { for (const report of foundReports) { try { console.log(`[DC] Preparando: ${report.file}`); const media = MessageMedia.fromFilePath(report.fullPath); try { const textToSend = `📄 Archivo Caza: ${report.file}`; if (privateChat) { await privateChat.sendMessage(textToSend); } else { await client.sendMessage(targetChatId, textToSend); } await new Promise(resolve => setTimeout(resolve, 500)); } catch(textErr) {} console.log(`[DC] Enviando ${report.file} a ${targetChatId}...`); let sentMessageResult; if (privateChat) { sentMessageResult = await privateChat.sendMessage(media, { sendMediaAsDocument: true }); } else { sentMessageResult = await client.sendMessage(targetChatId, media, { sendMediaAsDocument: true }); } console.log('[DC DEBUG] Resultado envío (ID msg):', sentMessageResult?.id?._serialized || 'N/A'); filesSentCount++; console.log(`[DC] Envío ${report.file} OK.`); await new Promise(resolve => setTimeout(resolve, 1500)); } catch (sendError) { console.error(`[DC Error] Enviar ${report.file} a ${targetChatId}:`, sendError); await client.sendMessage(chatId, `⚠️ Falló envío de \`${report.file}\`.`); } } }
             if (filesSentCount === foundReports.length && filesSentCount > 0) { await message.reply(`✅ Se intentó enviar ${filesSentCount} archivo(s) a tu privado (${targetNumber}). ¡Verifica!`); } else if (filesSentCount > 0) { await message.reply(`⚠️ Se intentó enviar ${filesSentCount} de ${foundReports.length}.`); } else if (foundReports.length > 0) { await message.reply(`❌ No se pudo enviar ningún archivo.`); }
            // --- Fin Envío ---

        } catch (error) { console.error('[DC Error] General:', error); await message.reply('❌ Error inesperado.'); }
    } // Fin execute
}; // Fin module.exports