// plugins/google_ai_modules/state_manager.js
const { aiChatStates } = require('./config'); // Importar el mapa de estados
const { color } = require('./utils');

function activateAI(chatId) {
    if (!chatId) return false;
    const currentState = aiChatStates.get(chatId);
    if (currentState === false) {
        aiChatStates.set(chatId, true);
        console.log(`${color.yellow}[Google AI CONTROL]${color.reset} IA Reactivada para chat: ${chatId.split('@')[0]}.`);
        return true;
    } else if (currentState === undefined) {
        aiChatStates.set(chatId, true);
        return false;
    }
    return false;
}

function deactivateAI(chatId) {
    // ... (tu código)
    if (!chatId) return false;
    const currentState = aiChatStates.get(chatId);
    if (currentState === undefined || currentState === true) {
        aiChatStates.set(chatId, false);
        console.log(`${color.yellow}[Google AI CONTROL]${color.reset} IA Desactivada para chat: ${chatId.split('@')[0]}.`);
        return true;
    }
    return false;
}

function isAiCurrentlyActive(chatId) {
    // ... (tu código)
    if (!chatId) return false;
    const currentState = aiChatStates.get(chatId);
    return currentState === undefined || currentState === true;
}

module.exports = {
    activateAI,
    deactivateAI,
    isAiCurrentlyActive,
};