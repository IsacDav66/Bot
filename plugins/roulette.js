// plugins/roulette.js
// Juego de la Ruleta con imagen generada por node-canvas

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');
const { createCanvas, loadImage, registerFont } = require('canvas'); // Importar de node-canvas
const { getUserData, saveUserData, msToTime } = require('./shared-economy');

const MONEY_SYMBOL = '$';
// Ruta a tu imagen de fondo de la ruleta (sin bola)
const ROULETTE_BASE_IMAGE_PATH = path.join(__dirname, '..', 'assets', 'roulette_base.png'); // CAMBIA ESTO SI ES NECESARIO
// Opcional: registrar una fuente para dibujar el número si no usamos imagen base
// registerFont(path.join(__dirname, '..', 'assets', 'fonts', 'arial.ttf'), { family: 'Arial' });


const COOLDOWN_ROULETTE_MS = 1 * 60 * 1000;

const rouletteNumbers = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red',
    10: 'black', 11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red',
    28: 'black', 29: 'black', 30: 'red', 31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};
const numberKeys = Object.keys(rouletteNumbers).map(Number);

// Orden de los números en una ruleta europea estándar (para calcular ángulos)
// Esto es CRUCIAL y debe coincidir con tu imagen base si la usas, o con la disposición que dibujes.
const ROULETTE_LAYOUT = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const TOTAL_NUMBERS_ON_WHEEL = ROULETTE_LAYOUT.length; // 37
const ANGLE_PER_NUMBER = 360 / TOTAL_NUMBERS_ON_WHEEL;

function ensureLastRoulette(user) {
    if (typeof user.lastroulette !== 'number' || isNaN(user.lastroulette)) {
        user.lastroulette = 0;
    }
}

// --- Función para generar la imagen de la ruleta ---
async function generateRouletteImage(winningNumber) {
    const canvasWidth = 500; // Ajusta según tu imagen base o preferencia
    const canvasHeight = 500; // Ajusta según tu imagen base o preferencia
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // 1. Dibujar fondo (opcional, o cargar imagen base)
    let baseImage;
    try {
        if (fs.existsSync(ROULETTE_BASE_IMAGE_PATH)) {
            baseImage = await loadImage(ROULETTE_BASE_IMAGE_PATH);
            ctx.drawImage(baseImage, 0, 0, canvasWidth, canvasHeight);
        } else {
            console.warn(`[Roulette Canvas] Imagen base no encontrada en ${ROULETTE_BASE_IMAGE_PATH}. Dibujando ruleta simple.`);
            // Dibuja una ruleta muy básica si no hay imagen
            ctx.fillStyle = 'darkgreen';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.beginPath();
            ctx.arc(canvasWidth / 2, canvasHeight / 2, canvasWidth / 2 - 20, 0, Math.PI * 2);
            ctx.fillStyle = 'green';
            ctx.fill();
            ctx.strokeStyle = 'gold';
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    } catch (err) {
        console.error('[Roulette Canvas] Error cargando imagen base:', err);
        // Dibuja fondo de emergencia
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }


    // 2. Calcular posición de la bola
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    // El radio donde se asientan los números. Ajusta esto cuidadosamente.
    // Debería ser un poco menos que el radio del anillo de números en tu imagen.
    const numbersRingRadius = canvasWidth / 2 * 0.75; // Ejemplo: 75% del radio del canvas/2

    const numberIndexInLayout = ROULETTE_LAYOUT.indexOf(winningNumber);
    if (numberIndexInLayout === -1) {
        console.error(`[Roulette Canvas] Número ganador ${winningNumber} no encontrado en ROULETTE_LAYOUT.`);
        // Dibuja la bola en el centro o en el 0 por defecto si hay error
        const angle = 0; // Ángulo para el número 0
         const ballX = centerX + numbersRingRadius * Math.cos(angle * Math.PI / 180 - Math.PI / 2);
         const ballY = centerY + numbersRingRadius * Math.sin(angle * Math.PI / 180 - Math.PI / 2);
         ctx.beginPath();
         ctx.arc(ballX, ballY, 10, 0, Math.PI * 2); // Dibuja la bola (radio 10)
         ctx.fillStyle = 'white';
         ctx.fill();
         ctx.strokeStyle = 'black';
         ctx.lineWidth = 1;
         ctx.stroke();
         return canvas.toBuffer('image/png'); // Devuelve buffer en caso de error de layout
    }

    // El ángulo 0 es arriba. El primer número en ROULETTE_LAYOUT (0) está en la parte superior.
    // Los ángulos aumentan en sentido horario.
    // Restamos 90 grados (Math.PI / 2) porque en canvas 0 rad es a la derecha, y queremos que sea arriba.
    const angleDegrees = numberIndexInLayout * ANGLE_PER_NUMBER;
    const angleRadians = (angleDegrees * Math.PI / 180) - (Math.PI / 2);

    const ballX = centerX + numbersRingRadius * Math.cos(angleRadians);
    const ballY = centerY + numbersRingRadius * Math.sin(angleRadians);
    const ballRadius = canvasWidth / 40; // Radio de la bola, ej: 1/40 del ancho del canvas

    // 3. Dibujar la bola
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Opcional: Dibujar el número ganador en el centro
    // ctx.fillStyle = 'white';
    // ctx.font = 'bold 48px Arial'; // Asegúrate que la fuente esté disponible o regístrala
    // ctx.textAlign = 'center';
    // ctx.textBaseline = 'middle';
    // ctx.fillText(winningNumber.toString(), centerX, centerY);

    return canvas.toBuffer('image/png');
}


const execute = async (client, message, args, commandName) => {
    const userId = message.author || message.from;
    const user = await getUserData(userId, message);
    ensureLastRoulette(user);
    const now = Date.now();

    const timeSinceLastRoulette = now - user.lastroulette;
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
        return message.reply(`💸 No tienes suficiente dinero en mano (${MONEY_SYMBOL}${user.money || 0}) para apostar ${MONEY_SYMBOL}${betAmount}.`);
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
    await saveUserData();

    await message.reply(`*💸 ${message.pushName || 'Tú'} apuestas ${MONEY_SYMBOL}${betAmount} en ${betType}.*\nGirando la ruleta... 🎡`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Menor espera si la imagen se genera rápido

    const winningNumber = numberKeys[Math.floor(Math.random() * numberKeys.length)];
    const winningColor = rouletteNumbers[winningNumber];
    const colorEmoji = winningColor === 'red' ? '🔴' : winningColor === 'black' ? '⚫' : '💚';

    let resultMessage = `*La bola cayó en ${colorEmoji} ${winningNumber} ${winningColor.charAt(0).toUpperCase() + winningColor.slice(1)}!*\n\n`;
    let won = false;

    if (winningCondition(winningColor, winningNumber)) {
        won = true;
        const winnings = betAmount * payoutMultiplier;
        const profit = winnings - betAmount;
        user.money += winnings;
        resultMessage += `*🎉 ¡Felicidades! ¡Has ganado!*\nRecibes ${MONEY_SYMBOL}${winnings} (ganancia neta de ${MONEY_SYMBOL}${profit}).`;
    } else {
        resultMessage += `*😥 ¡Mala suerte! Has perdido tu apuesta de ${MONEY_SYMBOL}${betAmount}.*`;
    }
    user.money = Math.max(0, user.money);
    await saveUserData();
    resultMessage += `\n\nTu dinero actual: ${MONEY_SYMBOL}${user.money}`;
    console.log(`[Roulette Plugin] Usuario ${userId} apostó ${betAmount} en ${betType}. Resultado: ${winningNumber} ${winningColor}. Ganó: ${won}. Dinero final: ${user.money}`);

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
    category: 'Juegos',
    execute,
};