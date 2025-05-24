// plugins/google_ai_modules/response_sender.js
const { CREATOR_ID, STICKER_PROBABILITY } = require('./config');
const { color } = require('./utils');
// Las funciones sendRandomSticker y generateAndSendImageWithRetries
// se pasarán como argumentos.

async function sendBotResponse(
    client,
    message, // Mensaje original del usuario
    chat,    // Objeto Chat
    textToSend,
    mentionCreator,
    imagePromptFromAI,
    detectedMoodHint,
    // textModel, // No se usa directamente aquí, pero podría ser para futuras expansiones
    imageModel, // Necesario para generateAndSendImageWithRetries
    sendRandomStickerFunc, // Función para enviar sticker
    generateAndSendImageFunc // Función para generar y enviar imagen
) {
    let textSent = false;
    const sendOptions = {};
    let finalMessageText = textToSend; // textToSend ya debería estar 100% limpio

    if (mentionCreator) {
        sendOptions.mentions = [CREATOR_ID];
        const creatorNumber = CREATOR_ID.split('@')[0];
        // El prompt de la IA (#10) le pide que incluya @Numero ella misma.
        // Si no lo hace, esta lógica es un fallback.
        if (finalMessageText && !finalMessageText.includes(`@${creatorNumber}`)) {
            finalMessageText = (finalMessageText ? finalMessageText + " " : "") + `@${creatorNumber}`;
            console.log(`${utils.color.yellow}[RESPONSE SENDER DEBUG]${utils.color.reset} Añadido @${creatorNumber} a textToSend para mención.`);
        } else if (!finalMessageText) { // Si no hay texto pero sí mención
            finalMessageText = `@${creatorNumber}`;
        }
    }

    // --- Enviar el mensaje de texto principal ---
    if (finalMessageText && finalMessageText.trim() !== '') {
        console.log(`${color.brightMagenta}[RESPONSE SENDER]${color.reset} Enviando texto: "${finalMessageText.substring(0,100)}..." ${mentionCreator ? 'con mención' : ''}`);
        try {
            if (mentionCreator && chat.id._serialized) { // chat.sendMessage es más robusto para menciones
                await client.sendMessage(chat.id._serialized, finalMessageText, sendOptions);
                console.log(`${color.magenta}[RESPONSE SENDER]${color.reset} Mención enviada vía client.sendMessage.`);
            } else {
                await message.reply(finalMessageText); // Usar reply para respuesta directa
            }
            textSent = true;
            console.log(`${color.green}[RESPONSE SENDER]${color.reset} Texto enviado.`);
        } catch (sendError) {
            console.error(`${color.red}[RESPONSE SENDER ERROR]${color.reset} Falló el envío de texto:`, sendError.message);
            try { await message.reply("Algo salió mal al intentar responderte... 😖"); } catch (e) { console.error("Fallback reply failed", e); }
        }
    } else {
        console.log(`${color.yellow}[RESPONSE SENDER]${color.reset} No hay texto válido para enviar (podría ser solo foto y/o mención vacía).`);
    }

    // --- Generar y Enviar FOTO si la IA lo indicó ---
    if (imagePromptFromAI) {
        console.log(`${color.magenta}[RESPONSE SENDER]${color.reset} Iniciando generación de imagen contextual...(Prompt: "${imagePromptFromAI}")`); // <--- LOG ADICIONAL
        await new Promise(resolve => setTimeout(resolve, 500)); // Pequeña pausa visual
        // El caption es opcional. Si ya se envió texto, podría ser vacío o un "Mira esto".
        // Si no se envió texto, el caption podría ser el mismo imagePromptFromAI o algo genérico.
        let imageCaption = '';
        if (!textSent && imagePromptFromAI.length < 100) { // Si no hubo texto y el prompt es corto
             imageCaption = imagePromptFromAI; // Usar el prompt como caption
        } else if (!textSent) {
             imageCaption = "Mira esto que generé uwu";
        }
        // De lo contrario, si textSent es true, el caption será vacío por defecto en generateAndSendImageFunc

        console.log(`${color.blue}[RESPONSE SENDER DEBUG]${color.reset} Llamando a generateAndSendImageFunc...`); // <--- LOG ANTES DE LLAMAR
        await generateAndSendImageFunc(client, imageModel, chat.id._serialized, imagePromptFromAI, imageCaption);
        console.log(`${color.blue}[RESPONSE SENDER DEBUG]${color.reset} LLAMADA a generateAndSendImageFunc completada (o falló silenciosamente).`); // <--- LOG DESPUÉS DE LLAMAR
    }

    // --- Enviar STICKER ocasional ---
    // Solo si se envió texto y NO se generó una imagen contextual por la IA
    if (textSent && !imagePromptFromAI && Math.random() < STICKER_PROBABILITY) {
        console.log(`${color.magenta}[RESPONSE SENDER]${color.reset} Decidió enviar sticker (prob: ${STICKER_PROBABILITY}). Mood: ${detectedMoodHint}`);
        await new Promise(resolve => setTimeout(resolve, 300)); // Pausa antes del sticker
        await sendRandomStickerFunc(client, chat.id._serialized, detectedMoodHint);
    } else if (textSent && !imagePromptFromAI) {
        console.log(`${color.blue}[RESPONSE SENDER DEBUG]${color.reset} No toca sticker esta vez.`);
    }
}

module.exports = {
    sendBotResponse,
};