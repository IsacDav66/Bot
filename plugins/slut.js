// plugins/slut.js
// Comando para "trabajos" arriesgados/ilegales y para "pagar por servicios" a otro usuario.

const { getUserData, saveUserData, msToTime, pickRandom } = require('./shared-economy'); // getUserData ahora es async
const MONEY_SYMBOL = '$';

const COOLDOWN_SLUT_SOLO_MS = 20 * 60 * 1000; // Lo restauré a 20 minutos, puedes ponerlo en 0 para pruebas

const riskyActivities = [ // Estas son para la versión .slut (sin mención)
    {
        description: "Te infiltras en una fiesta de alta sociedad para 'socializar' con gente adinerada 🍸💼",
        successMessage: (amount) => `¡Tu encanto funcionó! Conseguiste ${MONEY_SYMBOL}${amount} en 'donaciones generosas'.`,
        failureMessage: (penalty) => `🥂 Te pasaste de copas y te echaron. Tuviste que pagar ${MONEY_SYMBOL}${penalty} por los daños.`,
        minReward: 700,
        maxReward: 3500,
        penaltyPercent: 0.4,
        minPenaltyFlat: 250,
        successChance: 0.60
    },
    {
        description: "Participas en un 'intercambio cultural' muy privado y lucrativo 😉🤫",
        successMessage: (amount) => `El 'intercambio' fue un éxito. Obtuviste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `💔 Hubo un malentendido y terminaste perdiendo ${MONEY_SYMBOL}${penalty}.`,
        minReward: 1000,
        maxReward: 5000,
        penaltyPercent: 0.5,
        minPenaltyFlat: 400,
        successChance: 0.50
    },
    {
        description: "Ofreces 'servicios de consultoría especializada' en un callejón oscuro  alley🌃",
        successMessage: (amount) => `Tu 'consultoría' fue muy solicitada. Ganaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🚓 ¡Redada policial! Tuviste que pagar una fianza de ${MONEY_SYMBOL}${penalty}.`,
        minReward: 600,
        maxReward: 2800,
        penaltyPercent: 0.6,
        minPenaltyFlat: 300,
        successChance: 0.55
    },
    {
        description: "Intentas seducir a un millonario/a para obtener 'apoyo financiero' sugar💰",
        successMessage: (amount) => `¡Caña al anzuelo! Recibiste un generoso 'regalo' de ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🙅‍♂️ Te descubrieron tus intenciones y te dejaron sin nada, además perdiste ${MONEY_SYMBOL}${penalty} en el intento.`,
        minReward: 1200,
        maxReward: 6000,
        penaltyPercent: 0.3,
        minPenaltyFlat: 500,
        successChance: 0.45
    }
];

function ensureLastSlut(user) {
    if (typeof user.lastslut !== 'number' || isNaN(user.lastslut)) {
        user.lastslut = 0; // Esto debería ser manejado por getUserData ahora, pero lo dejamos como doble seguro
    }
}

const execute = async (client, message, args, commandName) => {
    const payerId = message.author || message.from;
    // *** CORRECCIÓN AQUÍ: await y pasar message ***
    const payerUser = await getUserData(payerId, message);

    if (!payerUser) {
        console.error(`[Slut Plugin] No se pudieron obtener los datos del pagador para ${payerId}`);
        return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
    }

    // Verificar si hay una mención para la funcionalidad de pago
    if (message.mentionedIds && message.mentionedIds.length > 0) {
        const targetId = message.mentionedIds[0];
        // *** CORRECCIÓN AQUÍ: await y pasar message (aunque el message es del pagador, obtendrá info del targetId) ***
        // Pasar 'null' o no pasar 'message' si no queremos intentar actualizar el pushname del target con ESTE message.
        // O, si queremos que SE INTENTE actualizar con el cliente:
        // const contactTarget = await client.getContactById(targetId); // Necesitaríamos client
        // Y luego pasar contactTarget a una función especializada si fuera necesario.
        // Por ahora, obtendremos los datos del target SIN actualizar su pushname desde ESTE mensaje.
        // El pushname del target se actualizará cuando EL TARGET use un comando.
        const targetUser = await getUserData(targetId); // No pasamos 'message' aquí para el target
        
        if (!targetUser) {
            console.error(`[Slut Plugin] No se pudieron obtener los datos del objetivo para ${targetId}`);
            return message.reply("❌ Hubo un error al obtener los datos del usuario objetivo.");
        }

        const targetContact = await client.getContactById(targetId);
        const targetName = targetUser.pushname || targetContact.pushname || targetContact.name || `usuario (${targetId.split('@')[0]})`;
        const payerName = payerUser.pushname || payerId.split('@')[0];


        if (targetId === payerId) {
            return message.reply("🤦 No puedes pagarte a ti mismo por... bueno, ya sabes.");
        }

        let amountToPay;
        if (args.length > 0) {
            const amountArg = args.find(arg => !arg.startsWith('@'));
            if (amountArg) {
                amountToPay = parseInt(amountArg);
            }
        }

        if (isNaN(amountToPay) || amountToPay <= 0) {
            return message.reply(`❓ Debes especificar una cantidad válida para pagar a ${targetName}. Ejemplo: \`.slut @usuario 100\``);
        }

        if (typeof payerUser.money !== 'number' || isNaN(payerUser.money) || payerUser.money < amountToPay) {
            return message.reply(`💸 No tienes suficiente dinero en mano (${MONEY_SYMBOL}${payerUser.money || 0}) para pagar ${MONEY_SYMBOL}${amountToPay} a ${targetName}.`);
        }

        payerUser.money -= amountToPay;
        if (typeof targetUser.money !== 'number' || isNaN(targetUser.money)) targetUser.money = 0;
        targetUser.money += amountToPay;

        await saveUserData();
        console.log(`[Slut Plugin - Pago] ${payerId} (${payerName}) pagó ${amountToPay} a ${targetId} (${targetName}). Saldo pagador: ${payerUser.money}, Saldo receptor: ${targetUser.money}`);

        await message.reply(`💋 *${payerName}* le ha pagado ${MONEY_SYMBOL}${amountToPay} a *${targetName}* por sus 'excelentes servicios'.\n\n`+
                            `*${payerName}* ahora tiene: ${MONEY_SYMBOL}${payerUser.money}\n`+
                            `*${targetName}* ahora tiene: ${MONEY_SYMBOL}${targetUser.money}`);
        
        try {
            const targetChat = await client.getChatById(targetId);
            await targetChat.sendMessage(`🤫 ¡Has recibido un pago de ${MONEY_SYMBOL}${amountToPay} de *${payerName}* por tus 'servicios discretos'! Tu saldo ahora es ${MONEY_SYMBOL}${targetUser.money}.`);
        } catch (privateMsgError) {
            console.error(`[Slut Plugin - Pago] Error enviando MD de notificación a ${targetId}:`, privateMsgError.message);
        }
        return;
    }

    // --- Si no hay mención, se ejecuta la actividad arriesgada individual ---
    ensureLastSlut(payerUser); // payerUser ya está definido y es el objeto correcto
    const now = Date.now();

    const timeSinceLastSlut = now - (payerUser.lastslut || 0);
    if (timeSinceLastSlut < COOLDOWN_SLUT_SOLO_MS) {
        const timeLeft = COOLDOWN_SLUT_SOLO_MS - timeSinceLastSlut;
        return message.reply(`*💄 Necesitas recomponerte... Espera ${msToTime(timeLeft)} para tu próxima 'cita'.*`);
    }

    const activity = pickRandom(riskyActivities);
    payerUser.lastslut = now;

    await message.reply(`*💋 ${activity.description}...*`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    if (Math.random() < activity.successChance) {
        const amountGained = Math.floor(Math.random() * (activity.maxReward - activity.minReward + 1)) + activity.minReward;
        if (typeof payerUser.money !== 'number' || isNaN(payerUser.money)) payerUser.money = 0;
        payerUser.money += amountGained;
        await saveUserData();
        console.log(`[Slut Plugin - Solo] ${payerId} (${payerUser.pushname}) tuvo éxito en '${activity.description}', ganó ${amountGained}. Dinero: ${payerUser.money}`);
        return message.reply(`*🥂 ${activity.successMessage(amountGained)}*\nTu dinero: ${MONEY_SYMBOL}${payerUser.money}`);
    } else {
        if (typeof payerUser.money !== 'number' || isNaN(payerUser.money)) payerUser.money = 0;
        let penaltyAmount = Math.floor(payerUser.money * activity.penaltyPercent);
        penaltyAmount = Math.max(penaltyAmount, activity.minPenaltyFlat);
        penaltyAmount = Math.min(penaltyAmount, payerUser.money);
        payerUser.money -= penaltyAmount;
        if (payerUser.money < 0) payerUser.money = 0;
        await saveUserData();
        console.log(`[Slut Plugin - Solo] ${payerId} (${payerUser.pushname}) falló en '${activity.description}', perdió ${penaltyAmount}. Dinero: ${payerUser.money}`);
        let finalMessage = `*💥 ${activity.failureMessage(penaltyAmount)}*`;
        finalMessage += `\nTu dinero: ${MONEY_SYMBOL}${payerUser.money}`;
        return message.reply(finalMessage);
    }
};

module.exports = {
    name: 'Actividades Especiales',
    aliases: ['slut', 'cita', 'trabajonocturno', 'pagar'],
    description: 'Realiza "trabajos" arriesgados o paga a otro usuario por sus "servicios".',
    category: 'Economía', // O 'Interacción'
    execute,
};