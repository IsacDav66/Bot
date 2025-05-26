// plugins/roulette.js
// Juego de la Ruleta con imagen generada por node-canvas y verificación de registro.

const fs = require('fs'); // Para fs.existsSync
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { getUserData, saveUserData, msToTime, pickRandom, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');

const MONEY_SYMBOL = '$';
const ROULETTE_BASE_IMAGE_PATH = path.join(__dirname, '..', 'assets', 'roulette_base.png');
const COOLDOWN_ROULETTE_MS = 1 * 60 * 1000; // 1 minuto

const rouletteNumbers = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red',
    10: 'black', 11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red',
    28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};
const numberKeys = Object.keys(rouletteNumbers).map(Number);
const ROULETTE_LAYOUT = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const TOTAL_NUMBERS_ON_WHEEL = ROULETTE_LAYOUT.length;
const ANGLE_PER_NUMBER = 360 / TOTAL_NUMBERS_ON_WHEEL;

// Opcional: Registrar fuente si es necesario para algo en generateRouletteImage, aunque no para los símbolos de ruleta en sí.
// try {
//     registerFont(path.join(__dirname, '..', 'assets', 'fonts', 'SomeFont.ttf'), { family: 'SomeFontForRoulette' });
// } catch (fontError) {
//     console.warn("[Roulette Plugin] No se pudo registrar la fuente.", fontError.message);
// }

function ensureLastRoulette(user) {
    if (typeof user.lastroulette !== 'number' || isNaN(user.lastroulette)) {
        user.lastroulette = 0;
    }
}

async function generateRouletteImage(winningNumber) {
    // ... (código de generateRouletteImage como en tu última versión) ...
    // (Para brevedad, no lo repito aquí, asumo que es la versión que te funcionaba visualmente)
    const canvasWidth = 500; 
    const canvasHeight = 500; 
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    let baseImage;
    try {
        if (fs.existsSync(ROULETTE_BASE_IMAGE_PATH)) {
            baseImage = await loadImage(ROULETTE_BASE_IMAGE_PATH);
            ctx.drawImage(baseImage, 0, 0, canvasWidth, canvasHeight);
        } else {
            console.warn(`[Roulette Canvas] Imagen base no encontrada en ${ROULETTE_BASE_IMAGE_PATH}.`);
            ctx.fillStyle = 'darkgreen'; ctx.fillRect(0,0,canvasWidth, canvasHeight); // Fallback
        }
    } catch (err) {
        console.error('[Roulette Canvas] Error cargando imagen base:', err);
        ctx.fillStyle = 'gray'; ctx.fillRect(0,0,canvasWidth, canvasHeight); // Fallback
    }
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const numbersRingRadius = canvasWidth / 2 * 0.75;
    const numberIndexInLayout = ROULETTE_LAYOUT.indexOf(winningNumber);
    if (numberIndexInLayout === -1) {
        console.error(`[Roulette Canvas] Número ganador ${winningNumber} no encontrado en ROULETTE_LAYOUT.`);
        // Dibuja algo por defecto o simplemente devuelve el canvas base
        return canvas.toBuffer('image/png');
    }
    const angleDegrees = numberIndexInLayout * ANGLE_PER_NUMBER;
    const angleRadians = (angleDegrees * Math.PI / 180) - (Math.PI / 2);
    const ballX = centerX + numbersRingRadius * Math.cos(angleRadians);
    const ballY = centerY + numbersRingRadius * Math.sin(angleRadians);
    const ballRadius = canvasWidth / 40;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    return canvas.toBuffer('image/png');
}


const execute = async (client, message, args, commandName) => {
    // --- INICIO Bloque de Verificación de Registro ---
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Roulette Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error(`[Roulette Plugin] Error enviando reply de no identificación:`, e); }
        return;
    }
    const commandSenderId = senderContact.id._serialized; 
    const user = await getUserData(commandSenderId, message); 

    if (!user) {
        console.error(`[Roulette Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error(`[Roulette Plugin] Error enviando reply de error de datos:`, e); }
        return;
    }

    if (!user.password) {
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply(" 🔒Comando exclusivo de grupos. Por favor, usa este comando en un grupo para iniciar tu registro o usar las funciones de economía.");
            return;
        }
        const userNameToMention = user.pushname || commandSenderId.split('@')[0];
        if (!user.phoneNumber) { // CASO A: Sin contraseña NI número
            user.registration_state = 'esperando_numero_telefono';
            await saveUserData(commandSenderId, user); 
            console.log(`[Roulette Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía (como la ruleta), primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${user.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] }
            );
            return; // Detener la ejecución del comando .roulette
        } else { // CASO B: Tiene número (en user.phoneNumber de la BD, para commandSenderId) PERO NO contraseña
            // 'user' aquí es el objeto de datos para 'commandSenderId'
            // y user.phoneNumber ya tiene el número guardado.

            user.registration_state = 'esperando_contraseña_dm'; // Establecer el estado en el objeto del commandSenderId
            await saveUserData(commandSenderId, user); // Guardar el estado actualizado PARA EL commandSenderId
            
            const userNameToMention = user.pushname || commandSenderId.split('@')[0];
            // El console.log debe reflejar que el estado se guardó para commandSenderId
            console.log(`[Roulette Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ÉL MISMO (${commandSenderId}).`);

            let displayPhoneNumber = user.phoneNumber;
            if (user.phoneNumber && !String(user.phoneNumber).startsWith('+')) {
                displayPhoneNumber = `+${user.phoneNumber}`;
            }

            await message.reply(
                `🛡️ ¡Hola @${userNameToMention}!\n\n` +
                `Ya tenemos tu número de teléfono registrado (*${displayPhoneNumber}*).\n` +
                `Ahora, para completar tu registro, te he enviado un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus DMs.`+
                `‼️Si quieres actualizar tu numero escribe .actualizarfono +52111222333 RECUERDA INCLUIR TODO TU NUMERO Y CODIGO DE PAIS\n` ,
                undefined, { mentions: [commandSenderId] }
            );
            
            // El DM se sigue enviando al ID construido a partir del phoneNumber, lo cual está bien.
            const dmChatIdToSendTo = `${user.phoneNumber}@c.us`;
            const dmMessageContent = "🔑 Por favor, responde a este mensaje con la contraseña que deseas establecer para los comandos de economía.";
            
            console.log(`[Roulette Plugin DM DEBUG] Intentando enviar DM para contraseña.`);
            console.log(`[Roulette Plugin DM DEBUG] Target para DM (construido desde phoneNumber): ${dmChatIdToSendTo}`);
            // ... (try-catch para client.sendMessage(dmChatIdToSendTo, ...)) ...
            try {
                await client.sendMessage(dmChatIdToSendTo, dmMessageContent);
                console.log(`[Roulette Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdToSendTo}.`);
            } catch(dmError){
                console.error(`[Roulette Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdToSendTo}:`, dmError);
                console.error(`[Roulette Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
                // Si el DM falla, el estado 'esperando_contraseña_dm' sigue en commandSenderId.
                // No necesitamos limpiar el estado de dmChatIdToSendTo porque no lo modificamos allí.
            }
            return; 
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // Si llegamos aquí, el usuario (commandSenderId) está registrado (tiene contraseña)
    console.log(`[Roulette Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) está registrado. Procesando comando .roulette.`);
    
    ensureLastRoulette(user); // 'user' es el objeto correcto
    const now = Date.now();
    const timeSinceLastRoulette = now - (user.lastroulette || 0);

    if (timeSinceLastRoulette < COOLDOWN_ROULETTE_MS) {
        const timeLeft = COOLDOWN_ROULETTE_MS - timeSinceLastRoulette;
        return message.reply(`*🎰 La mesa de la ruleta aún está ocupada. Espera ${msToTime(timeLeft)}.*`);
    }

    if (args.length < 2) {
        return message.reply(`❓ Uso: \`.roulette <cantidad> <rojo|negro|verde|numero>\`\nEj: \`.roulette 100 rojo\``);
    }

    const betAmountArg = args[0];
    const betChoiceArg = args[1].toLowerCase();
    const betAmount = parseInt(betAmountArg);

    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply("⚠️ Debes apostar una cantidad de dinero válida y positiva.");
    }
    if (typeof user.money !== 'number' || isNaN(user.money) || user.money < betAmount) {
        return message.reply(`💸 No tienes suficiente dinero en mano (${MONEY_SYMBOL}${(user.money || 0).toLocaleString()}) para apostar ${MONEY_SYMBOL}${betAmount.toLocaleString()}.`);
    }

    let isValidBet = false, betType = '', payoutMultiplier = 0, winningCondition;
    if (['red', 'rojo'].includes(betChoiceArg)) {
        isValidBet = true; betType = 'Rojo'; payoutMultiplier = 2; winningCondition = (color, num) => color === 'red';
    } else if (['black', 'negro'].includes(betChoiceArg)) {
        isValidBet = true; betType = 'Negro'; payoutMultiplier = 2; winningCondition = (color, num) => color === 'black';
    } else if (['green', 'verde', '0'].includes(betChoiceArg)) {
        isValidBet = true; betType = 'Verde (0)'; payoutMultiplier = 35; winningCondition = (color, num) => num === 0;
    } else {
        const betNumber = parseInt(betChoiceArg);
        if (!isNaN(betNumber) && betNumber >= 0 && betNumber <= 36) {
            isValidBet = true; betType = `Número ${betNumber}`; payoutMultiplier = 36; winningCondition = (color, num) => num === betNumber;
        }
    }

    if (!isValidBet) return message.reply("⚠️ Apuesta no válida. Elige 'rojo', 'negro', 'verde', o un número entre 0 y 36.");

    user.money -= betAmount;
    user.lastroulette = now;
    await saveUserData(commandSenderId, user); // Guardar apuesta y cooldown

    await message.reply(`*💸 ${user.pushname || 'Tú'} apuestas ${MONEY_SYMBOL}${betAmount.toLocaleString()} en ${betType}.*\nGirando la ruleta... 🎡`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const winningNumber = numberKeys[Math.floor(Math.random() * numberKeys.length)];
    const winningColor = rouletteNumbers[winningNumber];
    const colorEmoji = winningColor === 'red' ? '🔴' : winningColor === 'black' ? '⚫' : '💚';

    let resultMessage = `*La bola cayó en ${colorEmoji} ${winningNumber} ${winningColor.charAt(0).toUpperCase() + winningColor.slice(1)}!*\n\n`;
    let won = false;

    if (winningCondition(winningColor, winningNumber)) {
        won = true;
        const winnings = betAmount * payoutMultiplier; // Ganancia total (incluye la apuesta original)
        // const profit = winnings - betAmount; // Ganancia neta (si payoutMultiplier ya es la ganancia neta, ajustar)
                                            // Si payoutMultiplier es 2 (para rojo/negro), winnings = bet*2, profit = bet.
        if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
        user.money += winnings; 
        resultMessage += `*🎉 ¡Felicidades! ¡Has ganado!*\nRecibes ${MONEY_SYMBOL}${winnings.toLocaleString()}.`;
    } else {
        resultMessage += `*😥 ¡Mala suerte! Has perdido tu apuesta de ${MONEY_SYMBOL}${betAmount.toLocaleString()}.*`;
    }
    user.money = Math.max(0, user.money); // Asegurar que no sea negativo
    await saveUserData(commandSenderId, user); // Guardar el resultado final del dinero

    resultMessage += `\n\nTu dinero actual: ${MONEY_SYMBOL}${user.money.toLocaleString()}`;
    console.log(`[Roulette Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) apostó ${betAmount} en ${betType}. Resultado: ${winningNumber} ${winningColor}. Ganó: ${won}. Dinero final: ${user.money}`);

    try {
        const imageBuffer = await generateRouletteImage(winningNumber);
        const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'roulette_result.png');
        await client.sendMessage(message.from, media, { caption: resultMessage });
    } catch (e) {
        console.error("[Roulette Plugin] Error generando o enviando imagen de ruleta:", e);
        await message.reply(resultMessage + "\n_(Error al generar la imagen de la ruleta)_");
    }
};

module.exports = {
    name: 'Ruleta Canvas',
    aliases: ['roulette', 'ruleta', 'rl'],
    description: 'Apuesta dinero en la ruleta (rojo/negro/verde/número) con imagen generada.',
    category: 'Juegos', // O 'Economía'
    execute,
};