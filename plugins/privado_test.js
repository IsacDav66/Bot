// plugins/privado_test.js - Versión IGNORANDO @lid y usando número real

// Importar fs y path si no están ya
const fs = require('fs');
const path = require('path');

// Cargar config (necesario si no se asume global)
const loadGroupPaths = () => {
    const filePath = path.resolve(__dirname, '..', 'lords.json');
    try { if (!fs.existsSync(filePath)) { throw new Error(`lords.json no encontrado: ${filePath}`); }
        const data = fs.readFileSync(filePath, 'utf8'); return JSON.parse(data); }
    catch (error) { console.error('[Privado Test] Error cargando lords.json:', error.message); return {}; }
};
const groupConfig = loadGroupPaths();


module.exports = {
    name: 'privado_test',
    aliases: ['privado', 'testdm', 'holapriv'],
    category: 'Utilidad',
    description: 'Envía "HOLA" al privado (ignora @lid si es necesario).',

    async execute(client, message, args) {
        const chatId = message.from; // ID del chat (grupo)
        let senderIdRaw = message.author || message.from; // ID que nos da la librería (@lid?)
        let senderNumberProvided = senderIdRaw.split('@')[0]; // Número según librería
        const isGroupMessage = chatId.endsWith('@g.us');

        console.log(`[Privado Test] Comando ejecutado por ID raw: ${senderIdRaw}`);

        // --- Determinar el NÚMERO REAL del usuario ---
        let targetNumber = null; // El número de teléfono real al que enviaremos

        // Verificar si el chat está configurado y tiene números permitidos
        if (!groupConfig || !groupConfig[chatId] || !groupConfig[chatId].allowedNumbers || !Array.isArray(groupConfig[chatId].allowedNumbers)) {
            console.warn(`[Privado Test] Chat ${chatId} no configurado o sin allowedNumbers.`);
            // Podríamos querer responder si el chat sí está en el JSON pero falta allowedNumbers
             if (groupConfig[chatId]) await message.reply("⚠️ No hay lista de usuarios autorizados para este chat.");
            return; // Salir si no hay configuración de permisos
        }

        const allowedNumbersList = groupConfig[chatId].allowedNumbers;

        // Lógica especial: SI el mensaje viene de un grupo Y el ID detectado es @lid,
        // NO podemos confiar en senderNumberProvided. Necesitamos identificar al usuario de otra forma.
        // La forma MÁS SIMPLE (pero menos escalable) es asumir que si el comando se ejecuta
        // en este grupo, DEBE ser uno de los allowedNumbers. Aquí asumiremos que es el
        // número que TÚ sabes que es el correcto para Isac en ESE grupo.

        // TU NÚMERO REAL DE ISAC (REEMPLAZAR)
        const numeroRealIsac = "51959442730";

        if (isGroupMessage && senderIdRaw.endsWith('@lid')) {
             console.warn(`[Privado Test] Detectado ID @lid (${senderIdRaw}). Verificando si el número real conocido (${numeroRealIsac}) está autorizado...`);
             if (allowedNumbersList.includes(numeroRealIsac)) {
                  targetNumber = numeroRealIsac; // Usar el número real conocido
                  console.log(`[Privado Test] Número real ${targetNumber} está autorizado.`);
             } else {
                  console.error(`[Privado Test] El número real conocido ${numeroRealIsac} NO está en allowedNumbers para ${chatId}, aunque se detectó @lid.`);
                  await message.reply(`🚫 Error de configuración: Tu número real no está autorizado, y la librería detectó un ID raro (@lid).`);
                  return;
             }
        } else {
            // Si no es @lid o es mensaje privado, confiamos en el número extraído SI está en la lista
             if (allowedNumbersList.includes(senderNumberProvided)) {
                  targetNumber = senderNumberProvided;
                  console.log(`[Privado Test] Número ${targetNumber} (de ID ${senderIdRaw}) encontrado en allowedNumbers.`);
             } else {
                  console.warn(`[Privado Test] Número ${senderNumberProvided} (de ID ${senderIdRaw}) NO está autorizado en ${chatId}.`);
                  await message.reply(`🚫 Tu número (${senderNumberProvided}) no está autorizado para usar este comando aquí.`);
                  return;
             }
        }

        // --- Si no pudimos determinar un número válido, salir ---
        if (!targetNumber) {
             console.error("[Privado Test] No se pudo determinar un número de destino autorizado.");
             await message.reply("❌ No pude determinar tu número autorizado para este comando.");
             return;
        }
        // --- Fin Determinación Número ---


        // --- Resolver ID @c.us y Enviar ---
        let targetChatId = null;
        try {
            console.log(`[Privado Test] Resolviendo ID para el número real/autorizado: ${targetNumber}...`);
            const numberDetails = await client.getNumberId(targetNumber); // Usar el número correcto

            if (numberDetails) {
                targetChatId = numberDetails._serialized; // ID...@c.us
                console.log(`[Privado Test] ID de WhatsApp resuelto a: ${targetChatId}`);
            } else {
                console.warn(`[Privado Test] No se pudo resolver ID para el número ${targetNumber}.`);
                await message.reply(`❌ No pude encontrar un usuario de WhatsApp para tu número (${targetNumber}).`);
                return;
            }
        } catch (resolveError) {
            console.error(`[Privado Test] Error resolviendo ID para ${targetNumber}:`, resolveError);
            await message.reply(`❌ Error verificando tu número de WhatsApp.`);
            return;
        }

        const messageToSend = "HOLA - Prueba Mensaje Privado (v4 - Forzado Num Real)";
        try {
            console.log(`[Privado Test] Intentando enviar "${messageToSend}" al ID resuelto ${targetChatId}...`);
            const sentMessage = await client.sendMessage(targetChatId, messageToSend);
            console.log('[Privado Test] Resultado:', JSON.stringify(sentMessage?.id, null, 2) || 'N/A');
            await message.reply(`✅ Intenté enviarte "${messageToSend}" a tu privado (${targetNumber}). ¡Revisa!`);
        } catch (error) {
            console.error(`[Privado Test] Error enviando a ${targetChatId}:`, error);
            await message.reply(`❌ Error al enviar a tu privado (${targetChatId}). Error: ${error.message}`);
        }
        // --- Fin Envío ---
    }
};