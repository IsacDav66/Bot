// plugins/google_ai_modules/history_manager.js
const { chatHistories, MAX_HISTORY_LENGTH } = require('./config');
const { color } = require('./utils');

function updateChatHistory(chatId, userMessageContent, modelResponseContent) {
    let history = chatHistories.get(chatId) || [];

    // El userMessageContent ya debería venir formateado con (Hora Actual) Nombre: texto
    // desde callTextAPI.
    if (userMessageContent && typeof userMessageContent === 'string' && userMessageContent.trim() !== '') {
        history.push({ role: 'user', parts: [{ text: userMessageContent }] });
    } else if (userMessageContent) {
        // Loguear si el mensaje del usuario no es un string válido para el historial
        console.warn(`${color.yellow}[HISTORY WARN]${color.reset} Contenido de mensaje de usuario inválido para historial:`, userMessageContent);
    }


    if (modelResponseContent && typeof modelResponseContent === 'string' && modelResponseContent.trim() !== '') {
        history.push({ role: 'model', parts: [{ text: modelResponseContent }] });
    } else if (modelResponseContent) {
        // Loguear si la respuesta del modelo no es un string válido para el historial
        // Esto puede pasar si la IA solo quería enviar una foto y el texto limpio quedó vacío.
        console.log(`${color.blue}[HISTORY DEBUG]${color.reset} Respuesta de modelo vacía o no string para historial:`, modelResponseContent, "(Esto puede ser normal si solo era una acción como generar foto)");
        // Decidir si quieres añadir un placeholder o nada. Por ahora, no añade nada si está vacío.
    }

    // Mantener el historial dentro del límite
    if (history.length > MAX_HISTORY_LENGTH) {
        history = history.slice(history.length - MAX_HISTORY_LENGTH);
    }

    chatHistories.set(chatId, history);
    console.log(`${color.blue}[HISTORY MANAGER]${color.reset} Historial para ${chatId.split('@')[0]} actualizado a ${history.length} mensajes.`);
}

module.exports = {
    updateChatHistory,
};