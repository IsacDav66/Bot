// plugins/google_ai_modules/sticker_handler.js
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { STICKERS_BASE_PATH } = require('./config');
const { color } = require('./utils');

async function sendRandomSticker(client, chatId, moodCategory = 'sofia_cute') {
    const categoryPath = path.join(STICKERS_BASE_PATH, moodCategory);
    // ... (resto de tu lógica de sendRandomSticker)
    // Asegúrate de que las rutas a STICKERS_BASE_PATH sean correctas
    // y que MessageMedia esté disponible.
    console.log(`${color.blue}[STICKER DEBUG]${color.reset} Buscando stickers en: ${categoryPath}`);
    try {
        if (!fs.existsSync(categoryPath)) {
             console.warn(`${color.yellow}[STICKER WARN]${color.reset} Carpeta de stickers '${moodCategory}' no existe.`);
             return;
        }
        const files = fs.readdirSync(categoryPath).filter(file => file.toLowerCase().endsWith('.webp'));
        if (files.length === 0) {
            console.warn(`${color.yellow}[STICKER WARN]${color.reset} No hay stickers .webp en '${moodCategory}'.`);
            return;
        }
        const randomStickerFile = files[Math.floor(Math.random() * files.length)];
        const stickerPath = path.join(categoryPath, randomStickerFile);
        console.log(`${color.cyan}[STICKER DEBUG]${color.reset} Sticker seleccionado: ${randomStickerFile}`);
        const stickerMedia = MessageMedia.fromFilePath(stickerPath);
        await client.sendMessage(chatId, stickerMedia, { sendMediaAsSticker: true });
        console.log(`${color.magenta}[STICKER]${color.reset} Sticker '${randomStickerFile}' enviado a ${chatId.split('@')[0]}.`);
    } catch (error) {
        console.error(`${color.red}[STICKER ERROR]${color.reset} Falló al enviar sticker de '${moodCategory}':`, error.message);
    }
}

module.exports = {
    sendRandomSticker,
};