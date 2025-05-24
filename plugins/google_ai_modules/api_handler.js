// plugins/google_ai_modules/api_handler.js
const { chatHistories, MAX_HISTORY_LENGTH } = require('./config');
const { getCurrentTimeFormatted, color } = require('./utils');

async function callTextAPI(chatId, senderName, textForAI, systemPrompt, textModel) {
    if (!textModel) {
        console.error(`${color.red}[Google AI API ERROR]${color.reset} Modelo de TEXTO no proporcionado a callTextAPI.`);
        return { success: false, errorText: "Modelo de texto no inicializado para la API.", userMessage: textForAI };
    }
    if (!textForAI || textForAI.trim() === '') {
        console.warn(`${color.yellow}[Google AI API WARN]${color.reset} Texto para IA está vacío. No se llamará a la API.`);
        return { success: false, errorText: "Texto para IA vacío.", userMessage: textForAI };
    }

    let history = chatHistories.get(chatId) || [];
    const limitedHistory = history.slice(-MAX_HISTORY_LENGTH);
    const currentTimeString = getCurrentTimeFormatted();
    const messageToSendToAI = `(Hora actual: ${currentTimeString}) ${senderName}: ${textForAI}`;

    console.log(`${color.cyan}[Google AI API]${color.reset} Historial: ${limitedHistory.length}. Enviando a Gemini: "${messageToSendToAI.substring(0, 100)}..."`);

    try {
        const chatSession = textModel.startChat({
            history: limitedHistory,
            systemInstruction: { parts: [{ text: systemPrompt }] }
        });
        const result = await chatSession.sendMessage(messageToSendToAI);
        let aiResponseText = (result.response).text();
        // Limpieza básica inicial, el parser hará más
        aiResponseText = aiResponseText.replace(/^tu respuesta corta e informal:/i, '').trim().replace(/^respuesta:/i, '').trim();
        console.log(`${color.green}[Google AI API]${color.reset} Respuesta cruda Gemini: "${aiResponseText.substring(0, 100)}..."`);
        return { success: true, rawText: aiResponseText, userMessage: messageToSendToAI };
    } catch (apiError) {
        console.error(`${color.red}[Google AI API ERROR]${color.reset} Falló sendMessage (Texto):`, apiError.message);
        if (apiError.message && (apiError.message.includes('blocked') || apiError.message.includes('SAFETY'))) {
            console.warn(`${color.yellow}[Google AI API WARN]${color.reset} Respuesta bloqueada por seguridad.`);
        }
        return { success: false, errorText: apiError.message || "Error desconocido en API de texto.", userMessage: messageToSendToAI };
    }
}

module.exports = {
    callTextAPI,
};