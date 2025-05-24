// plugins/google_ai_modules/config.js
const path = require('path');

const GOOGLE_API_KEY = 'AIzaSyCZGfaAx0gsLrcHTH4V_dsEJG_MHLItXFk'; // ¡¡REEMPLAZAR!!
const TEXT_MODEL_NAME = 'gemini-1.5-flash-latest';
const IMAGE_MODEL_NAME = 'gemini-2.0-flash-exp-image-generation'; // Experimental
const STICKER_PROBABILITY = 0.50;
const IMAGE_GEN_MAX_RETRIES = 2;
const IMAGE_GEN_RETRY_DELAY_MS = 3000;
const MAX_HISTORY_LENGTH = 10;
const CREATOR_ID = '51959442730@c.us';
const ALLOWED_PREFIXES = ['!', '.', '#', '/', '$', '%']; // Prefijos de comando

const STICKERS_BASE_PATH = path.join(__dirname, '..', '..', 'stickers'); // Ajustar ruta si es necesario

// Almacenamiento en memoria (podría quedarse aquí o en un módulo de "storage" si crece)
const chatHistories = new Map();
const aiChatStates = new Map();

module.exports = {
    GOOGLE_API_KEY,
    TEXT_MODEL_NAME,
    IMAGE_MODEL_NAME,
    STICKER_PROBABILITY,
    IMAGE_GEN_MAX_RETRIES,
    IMAGE_GEN_RETRY_DELAY_MS,
    MAX_HISTORY_LENGTH,
    CREATOR_ID,
    ALLOWED_PREFIXES,
    STICKERS_BASE_PATH,
    chatHistories,
    aiChatStates,
};