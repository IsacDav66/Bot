// plugins/crime.js
// Comando para cometer crímenes y ganar dinero (con riesgos).

const { getUserData, saveUserData, msToTime, pickRandom } = require('./shared-economy');
const MONEY_SYMBOL = '$';

const COOLDOWN_CRIME_MS = 15 * 60 * 1000; // 15 minutos de cooldown

const crimes = [
    {
        description: "Intentas robar una tienda de conveniencia 🏪",
        successMessage: (amount) => `¡Lograste robar la tienda! Te llevaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🚨 ¡Te atraparon! Tuviste que pagar una multa de ${MONEY_SYMBOL}${penalty}.`,
        minReward: 500,
        maxReward: 2500,
        penaltyPercent: 0.5, // Pierdes el 50% de tu dinero en mano si fallas
        minPenaltyFlat: 200, // O una multa mínima fija
        successChance: 0.65 // 65% de éxito
    },
    {
        description: "Hackeas un cajero automático 💻🏧",
        successMessage: (amount) => `¡Hackeo exitoso! Conseguiste ${MONEY_SYMBOL}${amount} del cajero.`,
        failureMessage: (penalty) => `🔒 ¡El sistema te detectó! Perdiste ${MONEY_SYMBOL}${penalty} mientras intentabas cubrir tus rastros.`,
        minReward: 800,
        maxReward: 4000,
        penaltyPercent: 0.6,
        minPenaltyFlat: 300,
        successChance: 0.55
    },
    {
        description: "Participas en una carrera callejera ilegal 🏎️💨",
        successMessage: (amount) => `¡Ganaste la carrera! Te llevaste el premio de ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `💥 ¡Chocaste el auto! Los daños te costaron ${MONEY_SYMBOL}${penalty}.`,
        minReward: 1000,
        maxReward: 5000,
        penaltyPercent: 0.4, // Menor riesgo de perder dinero, más riesgo de no ganar
        minPenaltyFlat: 150,
        successChance: 0.70
    },
    {
        description: "Robas un banco pequeño con una pistola de agua 🔫💧",
        successMessage: (amount) => `¡Nadie se dio cuenta de que era de agua! Te llevaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🤣 ¡Se rieron de ti y llamaron a la policía! Te multaron con ${MONEY_SYMBOL}${penalty}.`,
        minReward: 200,
        maxReward: 1500,
        penaltyPercent: 0.75, // Alto riesgo si fallas
        minPenaltyFlat: 400,
        successChance: 0.40 // Baja probabilidad de éxito
    }
];

const execute = async (client, message, args) => {
    const userId = message.author || message.from;
    const user = await getUserData(userId, message);
    const now = Date.now();

    const timeSinceLastCrime = now - user.lastcrime;
    if (timeSinceLastCrime < COOLDOWN_CRIME_MS) {
        const timeLeft = COOLDOWN_CRIME_MS - timeSinceLastCrime;
        return message.reply(`*👮‍♂️ Estás bajo el radar, debes esperar ${msToTime(timeLeft)} para cometer otro crimen.*`);
    }

    const crime = pickRandom(crimes);
    user.lastcrime = now; // Establecer cooldown inmediatamente

    await message.reply(`*⌛ ${crime.description}...*`);

    // Simular un pequeño retraso para el "suspenso"
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    if (Math.random() < crime.successChance) {
        // Éxito
        const amountGained = Math.floor(Math.random() * (crime.maxReward - crime.minReward + 1)) + crime.minReward;
        user.money += amountGained;
        await saveUserData(userId, user);
        console.log(`[Crime Plugin] ${userId} tuvo éxito en '${crime.description}', ganó ${amountGained}. Dinero: ${user.money}`);
        return message.reply(`*✅ ${crime.successMessage(amountGained)}*\nTu dinero: ${MONEY_SYMBOL}${user.money}`);
    } else {
        // Fallo
        let penaltyAmount = Math.floor(user.money * crime.penaltyPercent);
        penaltyAmount = Math.max(penaltyAmount, crime.minPenaltyFlat); // Asegurar que la penalización sea al menos el mínimo fijo
        penaltyAmount = Math.min(penaltyAmount, user.money); // No perder más de lo que se tiene en mano

        user.money -= penaltyAmount;
        await saveUserData(userId, user);
        console.log(`[Crime Plugin] ${userId} falló en '${crime.description}', perdió ${penaltyAmount}. Dinero: ${user.money}`);
        let finalMessage = `*❌ ${crime.failureMessage(penaltyAmount)}*`;
        if (user.money < 0) user.money = 0; // Evitar dinero negativo (aunque la lógica de penaltyAmount ya debería prevenirlo)
        finalMessage += `\nTu dinero: ${MONEY_SYMBOL}${user.money}`;
        return message.reply(finalMessage);
    }
};

module.exports = {
    name: 'Crimen',
    aliases: ['crime', 'crimen', 'delito'],
    description: 'Comete crímenes para intentar ganar dinero (con cooldown y riesgos).',
    category: 'Economía',
    execute,
};