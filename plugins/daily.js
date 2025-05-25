// plugins/daily.js
// Comando para reclamar recompensas diarias y mantener rachas.

const { getUserData, saveUserData, msToTime } = require('./shared-economy');
const MONEY_SYMBOL = '$';
const EXP_SYMBOL = '⭐'; // O el que uses para EXP

const COOLDOWN_DAILY_MS = 23 * 60 * 60 * 1000; // 23 horas para reclamar
const MAX_STREAK_DAYS = 30;
const STREAK_LOSS_THRESHOLD_MS = 47 * 60 * 60 * 1000; // Si pasan más de 47h, pierde racha

// --- Configuración de Recompensas Base ---
// Estas son las recompensas para el día 1 de racha. Aumentarán con la racha.
const BASE_DAILY_MONEY = 100;
const BASE_DAILY_EXP = 500;

// --- Multiplicadores por Racha (Ejemplos, puedes ajustarlos) ---
// Cuanto más alta la racha, mayor el multiplicador sobre la recompensa base.
// Esta función determina el multiplicador. Puedes hacerla más compleja.
function getStreakMultiplier(streakDays) {
    if (streakDays <= 0) return 1; // Día 0 o racha perdida
    if (streakDays >= MAX_STREAK_DAYS) streakDays = MAX_STREAK_DAYS; // Capar en el máximo

    // Ejemplo: Aumenta un 10% por día de racha, hasta un máximo.
    // Multiplicador = 1 + (0.10 * (días_de_racha - 1))
    // Para el día 1: 1 + (0.10 * 0) = 1
    // Para el día 5: 1 + (0.10 * 4) = 1.4
    // Para el día 30: 1 + (0.10 * 29) = 3.9
    let multiplier = 1 + (0.05 * (streakDays -1)); // 5% por día de racha adicional
    return Math.min(multiplier, 5); // Limitar el multiplicador máximo (ej. a 5x)
}


// Asegurar que los campos para daily existan en el usuario
function ensureDailyFields(user) {
    if (typeof user.lastdaily !== 'number' || isNaN(user.lastdaily)) {
        user.lastdaily = 0;
    }
    if (typeof user.dailystreak !== 'number' || isNaN(user.dailystreak)) {
        user.dailystreak = 0;
    }
}

const execute = async (client, message, args, commandName) => {
    const userId = message.author || message.from;
    const user = await getUserData(userId, message); // Obtener/actualizar pushname
    ensureDailyFields(user); // Asegurar que lastdaily y dailystreak existan y sean números

    const now = Date.now();
    const timeSinceLastDaily = now - user.lastdaily;

    // Verificar si perdió la racha
    // Si no ha reclamado (lastdaily es 0) Y su racha es > 0, es un error, resetear. O si han pasado más de X horas.
    if (user.lastdaily !== 0 && timeSinceLastDaily > STREAK_LOSS_THRESHOLD_MS) {
        await message.reply(`😢 ¡Oh no, *${user.pushname || 'tú'}*! Has perdido tu racha de ${user.dailystreak} días por no reclamar a tiempo. Tu racha vuelve a 0.`);
        user.dailystreak = 0;
        // No actualizamos lastdaily aquí, se actualizará si reclama ahora.
        // Podrías guardar aquí si quieres que el reseteo de racha sea inmediato en el JSON.
        // await saveUserData();
    } else if (user.lastdaily === 0 && user.dailystreak > 0) { // Raro, pero por si acaso
        console.warn(`[Daily Plugin] Usuario ${userId} tenía racha ${user.dailystreak} pero lastdaily era 0. Reseteando racha.`);
        user.dailystreak = 0;
    }


    // Verificar cooldown para reclamar
    if (user.lastdaily !== 0 && timeSinceLastDaily < COOLDOWN_DAILY_MS) {
        const timeLeft = COOLDOWN_DAILY_MS - timeSinceLastDaily;
        return message.reply(`🎁 Ya reclamaste tu recompensa diaria. Vuelve en *${msToTime(timeLeft)}*.\nTu racha actual: ${user.dailystreak} día(s).`);
    }

    // Si llega aquí, puede reclamar.
    // Si lastdaily es 0 (primera vez o racha perdida y no ha reclamado desde entonces), la racha es 0.
    // Si no, incrementar la racha.
    if (user.lastdaily === 0) { // Primera vez reclamando o después de perder racha
        user.dailystreak = 1; // Comienza racha en 1
    } else { // Reclamando consecutivamente (dentro del umbral)
        user.dailystreak = Math.min(user.dailystreak + 1, MAX_STREAK_DAYS);
    }

    const currentStreak = user.dailystreak;
    const streakMultiplier = getStreakMultiplier(currentStreak);

    const moneyEarned = Math.floor(BASE_DAILY_MONEY * streakMultiplier);
    const expEarned = Math.floor(BASE_DAILY_EXP * streakMultiplier);

    // Aplicar recompensas
    if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
    if (typeof user.exp !== 'number' || isNaN(user.exp)) user.exp = 0;
    user.money += moneyEarned;
    user.exp += expEarned;
    user.lastdaily = now; // Actualizar el timestamp de la última reclamación

    await saveUserData(userId, user); // Guardar todos los cambios

    let replyMessage = `🎉 ¡Recompensa Diaria Reclamada por *${user.pushname || 'ti'}*! 🎉\n\n` +
                       ` Streak Actual: 🔥 *${currentStreak} día(s)* (Multiplicador: x${streakMultiplier.toFixed(2)})\n\n` +
                       `Has recibido:\n` +
                       `  ${MONEY_SYMBOL} ${moneyEarned.toLocaleString()}\n` +
                       `  ${EXP_SYMBOL} ${expEarned.toLocaleString()}\n\n`;

    if (currentStreak === MAX_STREAK_DAYS) {
        replyMessage += `✨ ¡Felicidades! ¡Has alcanzado la racha máxima de ${MAX_STREAK_DAYS} días! Sigue reclamando para mantener tus recompensas máximas.\n\n`;
    } else {
        const nextClaimApprox = new Date(now + COOLDOWN_DAILY_MS);
        replyMessage += `Vuelve mañana (aprox. ${nextClaimApprox.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit'})}) para continuar tu racha.\n\n`;
    }
    
    replyMessage += `Tu saldo actual:\n` +
                    `  ${MONEY_SYMBOL} ${user.money.toLocaleString()}\n` +
                    `  ${EXP_SYMBOL} ${user.exp.toLocaleString()}`;

    await message.reply(replyMessage);
    console.log(`[Daily Plugin] Usuario ${userId} (${user.pushname}) reclamó daily. Racha: ${currentStreak}. Ganó: $${moneyEarned}, EXP ${expEarned}.`);
};

module.exports = {
    name: 'Recompensa Diaria',
    aliases: ['daily', 'diario', 'recompensa'],
    description: 'Reclama tu recompensa diaria y mantén tu racha para mejores premios.',
    category: 'Economía', // O 'Juegos'
    execute,
};