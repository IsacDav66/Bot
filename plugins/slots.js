// plugins/slots.js
// Juego de Tragamonedas (Slot Machine) con verificación de registro.

const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { createCanvas, registerFont } = require('canvas');
const { getUserData, saveUserData, msToTime, pickRandom, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');

const MONEY_SYMBOL = '$';
const EXP_SYMBOL = '⭐'; // Aunque no se usa directamente aquí, por consistencia si lo añades
const COOLDOWN_SLOTS_MS = 30 * 1000; // 30 segundos

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
        console.warn(`[Slots Plugin] ADVERTENCIA: Archivo de fuente no encontrado en ${fontPath}.`);
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
    // ... (código de generateSlotsImage como en tu última versión, con la corrección de fillStyle si es necesario)
    // (Para brevedad, no lo repito aquí, asumo que es la versión que te funcionaba visualmente)
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
            ctx.fillText(symbolData.emoji, symbolXCenter, symbolYCenter); // Dibujar dos veces si ayuda con la opacidad
        }
    }
    // ... (resto del dibujo de la línea de pago, etc., como antes) ...
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


function spinReels() { /* ... (como antes) ... */ 
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

function calculateWinnings(paylineEmojis, betAmount) { /* ... (como antes) ... */
    const paylineIds = paylineEmojis.map(emoji => slotSymbolsConfig.find(s => s.emoji === emoji)?.id);
    let multiplier = 0;
    let winDesc = "";

    if (paylineIds.length === NUM_REELS && paylineIds[0] && paylineIds[0] === paylineIds[1] && paylineIds[1] === paylineIds[2]) {
        const symbolConfig = slotSymbolsConfig.find(s => s.id === paylineIds[0]);
        if (symbolConfig && symbolConfig.payout['3']) {
            multiplier = symbolConfig.payout['3'];
            winDesc = `3 x ${symbolConfig.emoji}`;
            return { amount: betAmount * multiplier, description: winDesc };
        }
    }
    const cherryConfig = slotSymbolsConfig.find(s => s.id === 'cherry');
    if (cherryConfig && cherryConfig.payout['2']) {
        const cherryCount = paylineIds.filter(id => id === 'cherry').length;
        if (cherryCount === 2 && multiplier === 0) { 
            multiplier = cherryConfig.payout['2'];
            winDesc = `2 x ${cherryConfig.emoji}`;
        }
    }
    return { amount: betAmount * multiplier, description: winDesc };
}

const execute = async (client, message, args, commandName) => {
    // --- INICIO Bloque de Verificación de Registro ---
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Slots Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error(`[Slots Plugin] Error enviando reply de no identificación:`, e); }
        return;
    }
    const commandSenderId = senderContact.id._serialized; 
    const user = await getUserData(commandSenderId, message); 

    if (!user) {
        console.error(`[Slots Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error(`[Slots Plugin] Error enviando reply de error de datos:`, e); }
        return;
    }

    if (!user.password) {
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply(" 🔒Comando exclusivo de grupos. Por favor, usa este comando en un grupo para iniciar tu registro o usar las funciones de economía.");
            return;
        }
        const userNameToMention = user.pushname || commandSenderId.split('@')[0];
        if (!user.phoneNumber) {
            user.registration_state = 'esperando_numero_telefono';
            await saveUserData(commandSenderId, user); 
            console.log(`[Slots Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía, primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${user.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] }
            );
            return;
        } else { // CASO B: Tiene número (en user.phoneNumber de la BD, para commandSenderId) PERO NO contraseña
            // 'user' aquí es el objeto de datos para 'commandSenderId'
            // y user.phoneNumber ya tiene el número guardado.

            user.registration_state = 'esperando_contraseña_dm'; // Establecer el estado en el objeto del commandSenderId
            await saveUserData(commandSenderId, user); // Guardar el estado actualizado PARA EL commandSenderId
            
            const userNameToMention = user.pushname || commandSenderId.split('@')[0];
            // El console.log debe reflejar que el estado se guardó para commandSenderId
            console.log(`[Work Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ÉL MISMO (${commandSenderId}).`);

            let displayPhoneNumber = user.phoneNumber;
            if (user.phoneNumber && !String(user.phoneNumber).startsWith('+')) {
                displayPhoneNumber = `+${user.phoneNumber}`;
            }

            await message.reply(
                `🛡️ ¡Hola @${userNameToMention}!\n\n` +
                `Ya tenemos tu número de teléfono registrado (*${displayPhoneNumber}*).\n` +
                `Ahora, para completar tu registro, te he enviado un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus DMs.\n`+
                `‼️Si quieres actualizar tu numero escribe .actualizarfono +52111222333 RECUERDA INCLUIR TODO TU NUMERO Y CODIGO DE PAIS\n` ,
                undefined, { mentions: [commandSenderId] }
            );
            
            // El DM se sigue enviando al ID construido a partir del phoneNumber, lo cual está bien.
            const dmChatIdToSendTo = `${user.phoneNumber}@c.us`;
            const dmMessageContent = "🔑 Por favor, responde a este mensaje con la contraseña que deseas establecer para los comandos de economía.";
            
            console.log(`[Work Plugin DM DEBUG] Intentando enviar DM para contraseña.`);
            console.log(`[Work Plugin DM DEBUG] Target para DM (construido desde phoneNumber): ${dmChatIdToSendTo}`);
            // ... (try-catch para client.sendMessage(dmChatIdToSendTo, ...)) ...
            try {
                await client.sendMessage(dmChatIdToSendTo, dmMessageContent);
                console.log(`[Work Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdToSendTo}.`);
            } catch(dmError){
                console.error(`[Work Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdToSendTo}:`, dmError);
                console.error(`[Work Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
                // Si el DM falla, el estado 'esperando_contraseña_dm' sigue en commandSenderId.
                // No necesitamos limpiar el estado de dmChatIdToSendTo porque no lo modificamos allí.
            }
            return; 
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // --- Lógica Específica del Comando .slots (si el usuario ya está registrado) ---
    console.log(`[Slots Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) está registrado. Ejecutando comando slots.`);
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
    await saveUserData(commandSenderId, user); // Guardar apuesta y cooldown

    const { reelsResultSymbols, paylineResultEmojis } = spinReels();
    const { amount: winnings, description: winDesc } = calculateWinnings(paylineResultEmojis, betAmount);

    let resultMessage = "";
    if (winnings > 0) {
        if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0; // Por si acaso
        user.money += winnings; // Sumar ganancias (winnings ya incluye la apuesta devuelta si el multiplicador es >1)
        resultMessage = `*🎉 ¡GANASTE ${MONEY_SYMBOL}${winnings.toLocaleString()}! 🎉*\nCon ${winDesc}.`;
    } else {
        resultMessage = `*😥 Suerte para la próxima...*`;
    }
    
    user.money = Math.max(0, user.money); // Asegurar que no sea negativo
    await saveUserData(commandSenderId, user); // Guardar el resultado final del dinero

    resultMessage += `\n\nTu dinero actual: ${MONEY_SYMBOL}${user.money.toLocaleString()}`;
    console.log(`[Slots Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) apostó ${betAmount}. Línea: ${paylineResultEmojis.join('')}. Ganó: ${winnings}. Dinero final: ${user.money}`);

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
    category: 'Juegos', // O 'Economía'
    execute,
};