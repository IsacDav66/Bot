// plugins/slots.js
// Juego de Tragamonedas (Slot Machine)

const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { createCanvas, registerFont } = require('canvas');
const { getUserData, saveUserData, msToTime } = require('./shared-economy');

const MONEY_SYMBOL = '$';
const COOLDOWN_SLOTS_MS = 30 * 1000; // Puedes ponerlo a 0 para pruebas rápidas

const NUM_REELS = 3;
const SYMBOLS_VISIBLE_PER_REEL = 3;

const slotSymbolsConfig = [
    { id: 'cherry', emoji: '🍒', payout: { 2: 3, 3: 10 }, weight: 15, bgColor: 'rgba(255, 200, 200, 0.7)' },
    { id: 'lemon', emoji: '🍋', payout: { 3: 15 }, weight: 12, bgColor: 'rgba(255, 255, 180, 0.7)' },
    { id: 'orange', emoji: '🍊', payout: { 3: 15 }, weight: 12, bgColor: 'rgba(255, 220, 180, 0.7)' },
    { id: 'plum', emoji: '🍑', payout: { 3: 20 }, weight: 10, bgColor: 'rgba(255, 210, 230, 0.7)' },
    { id: 'watermelon', emoji: '🍉', payout: { 3: 25 }, weight: 8, bgColor: 'rgba(200, 255, 200, 0.7)' },
    { id: 'bell', emoji: '🔔', payout: { 3: 50 }, weight: 6, bgColor: 'rgba(240, 230, 190, 0.7)' },
    { id: 'star', emoji: '⭐', payout: { 3: 75 }, weight: 4, bgColor: 'rgba(200, 225, 255, 0.7)' },
    { id: 'diamond', emoji: '💎', payout: { 3: 100 }, weight: 3, bgColor: 'rgba(220, 240, 255, 0.7)' },
    { id: 'seven', emoji: '❼', payout: { 3: 250 }, weight: 2, bgColor: 'rgba(255, 190, 190, 0.8)' }
];

const weightedSymbolIds = [];
slotSymbolsConfig.forEach(s => {
    for (let i = 0; i < s.weight; i++) {
        weightedSymbolIds.push(s.id);
    }
});

const FONT_FAMILY_EMOJI = 'SlotsEmojiFontRegistered';
const fontPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoColorEmoji.ttf');
try {
    if (require('fs').existsSync(fontPath)) {
        registerFont(fontPath, { family: FONT_FAMILY_EMOJI });
        console.log(`[Slots Plugin] Fuente ${FONT_FAMILY_EMOJI} registrada desde ${fontPath}`);
    } else {
        console.warn(`[Slots Plugin] ADVERTENCIA: Archivo de fuente no encontrado en ${fontPath}. Los emojis podrían no renderizarse a color.`);
    }
} catch (fontError) {
    console.warn(`[Slots Plugin] ADVERTENCIA: No se pudo registrar la fuente ${FONT_FAMILY_EMOJI}.`, fontError.message);
}
const CANVAS_FONT = `60px "${FONT_FAMILY_EMOJI}", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif`;

function ensureLastSlots(user) {
    if (typeof user.lastslots !== 'number' || isNaN(user.lastslots)) {
        user.lastslots = 0;
    }
}

async function generateSlotsImage(reelsResultSymbols) {
    const symbolSize = 80;
    const reelPaddingVertical = 15;
    const symbolVisibleHeight = symbolSize + (reelPaddingVertical * 2);
    const reelWidth = symbolSize + 40;
    const spacingBetweenReels = 15;
    const canvasPaddingHorizontal = 20;
    const canvasPaddingVertical = 20;
    const canvasWidth = (reelWidth * NUM_REELS) + (spacingBetweenReels * (NUM_REELS - 1)) + (canvasPaddingHorizontal * 2);
    const canvasHeight = (symbolVisibleHeight * SYMBOLS_VISIBLE_PER_REEL) + (canvasPaddingVertical * 2);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, canvasWidth - 16, canvasHeight - 16);

    ctx.font = CANVAS_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < NUM_REELS; i++) {
        const reelSymbolsData = reelsResultSymbols[i];
        const currentReelXStart = canvasPaddingHorizontal + i * (reelWidth + spacingBetweenReels);
        
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(currentReelXStart, canvasPaddingVertical, reelWidth, symbolVisibleHeight * SYMBOLS_VISIBLE_PER_REEL);
        ctx.strokeStyle = '#a0a0a0';
        ctx.lineWidth = 2;
        ctx.strokeRect(currentReelXStart, canvasPaddingVertical, reelWidth, symbolVisibleHeight * SYMBOLS_VISIBLE_PER_REEL);

        for (let j = 0; j < SYMBOLS_VISIBLE_PER_REEL; j++) {
            const symbolData = reelSymbolsData[j];
            const symbolXCenter = currentReelXStart + reelWidth / 2;
            const symbolYCenter = canvasPaddingVertical + (j * symbolVisibleHeight) + symbolVisibleHeight / 2;
            
            if (symbolData.bgColor) {
                const currentGlobalAlphaForBg = ctx.globalAlpha;
                let bgColorAlpha = 0.7;
                const rgbaParts = symbolData.bgColor.match(/[\d\.]+/g);
                if (rgbaParts && rgbaParts.length === 4) {
                    bgColorAlpha = parseFloat(rgbaParts[3]);
                }
                ctx.globalAlpha = isNaN(bgColorAlpha) ? 0.7 : bgColorAlpha;

                ctx.fillStyle = symbolData.bgColor;
                const bgRadius = symbolSize / 2 * 1.1;
                ctx.beginPath();
                ctx.arc(symbolXCenter, symbolYCenter, bgRadius, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.globalAlpha = currentGlobalAlphaForBg;
            }
            
            ctx.globalAlpha = 1.0; // Asegurar opacidad completa
            // === VOLVIENDO A ESTABLECER fillStyle ANTES DE DIBUJAR EL EMOJI ===
            ctx.fillStyle = '#000000'; // Negro opaco.
                                       // Si la fuente emoji tiene color, esto NO debería sobreescribirlo,
                                       // pero puede ayudar a que el motor lo renderice opaco.
                                       // Si la fuente NO tiene color, se dibujará negro.
            
            ctx.fillText(symbolData.emoji, symbolXCenter, symbolYCenter);
            // No dibujar múltiples veces por ahora, hasta ver el efecto de fillStyle
        }
    }

    ctx.globalAlpha = 1.0;
    const paylineY = canvasPaddingVertical + (Math.floor(SYMBOLS_VISIBLE_PER_REEL / 2) * symbolVisibleHeight) + symbolVisibleHeight / 2;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(canvasPaddingHorizontal / 2, paylineY);
    ctx.lineTo(canvasWidth - (canvasPaddingHorizontal / 2), paylineY);
    ctx.stroke();
    
    const arrowSize = 10;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(canvasPaddingHorizontal / 2, paylineY);
    ctx.lineTo(canvasPaddingHorizontal / 2 + arrowSize, paylineY - arrowSize / 2);
    ctx.lineTo(canvasPaddingHorizontal / 2 + arrowSize, paylineY + arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(canvasWidth - (canvasPaddingHorizontal / 2), paylineY);
    ctx.lineTo(canvasWidth - (canvasPaddingHorizontal / 2) - arrowSize, paylineY - arrowSize / 2);
    ctx.lineTo(canvasWidth - (canvasPaddingHorizontal / 2) - arrowSize, paylineY + arrowSize / 2);
    ctx.closePath();
    ctx.fill();

    return canvas.toBuffer('image/png');
}

// ... (resto de spinReels, calculateWinnings, execute, module.exports SIN CAMBIOS respecto a la última versión completa que te di)
// Solo la función generateSlotsImage ha sido modificada como se muestra arriba.
// Asegúrate de que las llamadas a getUserData en execute usen 'await' y pasen 'message'.

function spinReels() {
    const reelsResultSymbols = [];
    const paylineResultEmojis = [];
    for (let i = 0; i < NUM_REELS; i++) {
        const currentReelSymbolsData = [];
        for (let j = 0; j < SYMBOLS_VISIBLE_PER_REEL; j++) {
            const randomSymbolId = weightedSymbolIds[Math.floor(Math.random() * weightedSymbolIds.length)];
            const symbolObject = slotSymbolsConfig.find(s => s.id === randomSymbolId);
            currentReelSymbolsData.push(symbolObject);
        }
        reelsResultSymbols.push(currentReelSymbolsData);
        paylineResultEmojis.push(currentReelSymbolsData[Math.floor(SYMBOLS_VISIBLE_PER_REEL / 2)].emoji);
    }
    return { reelsResultSymbols, paylineResultEmojis };
}

function calculateWinnings(paylineEmojis, betAmount) {
    const paylineIds = paylineEmojis.map(emoji => slotSymbolsConfig.find(s => s.emoji === emoji)?.id);
    let multiplier = 0;
    let winDesc = "";

    if (paylineIds.length === NUM_REELS && paylineIds[0] && paylineIds[0] === paylineIds[1] && paylineIds[1] === paylineIds[2]) {
        const symbolConfig = slotSymbolsConfig.find(s => s.id === paylineIds[0]);
        if (symbolConfig && symbolConfig.payout['3']) {
            multiplier = symbolConfig.payout['3'];
            winDesc = `3 x ${symbolConfig.emoji}`; // Usar emoji de la config para descripción
            return { amount: betAmount * multiplier, description: winDesc };
        }
    }

    const cherryConfig = slotSymbolsConfig.find(s => s.id === 'cherry');
    if (cherryConfig && cherryConfig.payout['2']) {
        const cherryCount = paylineIds.filter(id => id === 'cherry').length;
        if (cherryCount === 2 && multiplier === 0) { 
            multiplier = cherryConfig.payout['2'];
            winDesc = `2 x ${cherryConfig.emoji}`; // Usar emoji de la config para descripción
        }
    }
    return { amount: betAmount * multiplier, description: winDesc };
}

const execute = async (client, message, args, commandName) => {
    const userId = message.author || message.from;
    const user = await getUserData(userId, message); 
    
    if (!user) {
        console.error(`[Slots Plugin] No se pudieron obtener los datos del usuario para ${userId}`);
        return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
    }

    ensureLastSlots(user);
    const now = Date.now();

    const timeSinceLastSlots = now - (user.lastslots || 0);
    if (timeSinceLastSlots < COOLDOWN_SLOTS_MS) {
        const timeLeft = COOLDOWN_SLOTS_MS - timeSinceLastSlots;
        return message.reply(`*🎰 El tragamonedas está caliente. Espera ${msToTime(timeLeft)}.*`);
    }

    if (args.length < 1) {
        return message.reply(`❓ Uso: \`.slots <cantidad>\`\nEj: \`.slots 100\``);
    }

    const betAmount = parseInt(args[0]);

    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply("⚠️ Debes apostar una cantidad de dinero válida y positiva.");
    }
    if (typeof user.money !== 'number' || isNaN(user.money) || user.money < betAmount) {
        return message.reply(`💸 No tienes suficiente dinero en mano (${MONEY_SYMBOL}${user.money || 0}) para apostar ${MONEY_SYMBOL}${betAmount}.`);
    }

    user.money -= betAmount;
    user.lastslots = now;
    await saveUserData(userId, user);

    const { reelsResultSymbols, paylineResultEmojis } = spinReels();
    const { amount: winnings, description: winDesc } = calculateWinnings(paylineResultEmojis, betAmount);

    let resultMessage = "";
    if (winnings > 0) {
        user.money += winnings;
        resultMessage = `*🎉 ¡GANASTE ${MONEY_SYMBOL}${winnings}! 🎉*\nCon ${winDesc}.`;
    } else {
        resultMessage = `*😥 Suerte para la próxima...*`;
    }
    
    user.money = Math.max(0, user.money);
    await saveUserData(userId, user);

    resultMessage += `\n\nTu dinero actual: ${MONEY_SYMBOL}${user.money}`;
    console.log(`[Slots Plugin] Usuario ${userId} (${user.pushname || 'N/A'}) apostó ${betAmount}. Línea: ${paylineResultEmojis.join('')}. Ganó: ${winnings}. Dinero final: ${user.money}`);

    try {
        const imageBuffer = await generateSlotsImage(reelsResultSymbols);
        const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'slots_result.png');
        await client.sendMessage(message.from, media, { caption: resultMessage });
    } catch (e) {
        console.error("[Slots Plugin] Error generando o enviando imagen de tragamonedas:", e);
        await message.reply(resultMessage + "\n_(Error al generar la imagen del tragamonedas)_");
    }
};

module.exports = {
    name: 'Tragamonedas',
    aliases: ['slots', 'slot', 'tragamonedas', 'tragaperras'],
    description: 'Juega al tragamonedas y prueba tu suerte.',
    category: 'Juegos',
    execute,
};