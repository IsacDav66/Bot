// plugins/slut.js
// Comando para "trabajos" arriesgados/ilegales y para "pagar por servicios" a otro usuario.
// Incluye verificación de registro.

const { getUserData, saveUserData, msToTime, pickRandom, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');
const MONEY_SYMBOL = '$';

const COOLDOWN_SLUT_SOLO_MS = 20 * 60 * 1000; // 20 minutos

const riskyActivities = [
    {
        description: "Te infiltras en una fiesta de alta sociedad para 'socializar' con gente adinerada 🍸💼",
        successMessage: (amount) => `¡Tu encanto funcionó! Conseguiste ${MONEY_SYMBOL}${amount} en 'donaciones generosas'.`,
        failureMessage: (penalty) => `🥂 Te pasaste de copas y te echaron. Tuviste que pagar ${MONEY_SYMBOL}${penalty} por los daños.`,
        minReward: 700, maxReward: 3500, penaltyPercent: 0.4, minPenaltyFlat: 250, successChance: 0.60
    },
    {
        description: "Participas en un 'intercambio cultural' muy privado y lucrativo 😉🤫",
        successMessage: (amount) => `El 'intercambio' fue un éxito. Obtuviste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `💔 Hubo un malentendido y terminaste perdiendo ${MONEY_SYMBOL}${penalty}.`,
        minReward: 1000, maxReward: 5000, penaltyPercent: 0.5, minPenaltyFlat: 400, successChance: 0.50
    },
    {
        description: "Ofreces 'servicios de consultoría especializada' en un callejón oscuro  alley🌃",
        successMessage: (amount) => `Tu 'consultoría' fue muy solicitada. Ganaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🚓 ¡Redada policial! Tuviste que pagar una fianza de ${MONEY_SYMBOL}${penalty}.`,
        minReward: 600, maxReward: 2800, penaltyPercent: 0.6, minPenaltyFlat: 300, successChance: 0.55
    },
    {
        description: "Intentas seducir a un millonario/a para obtener 'apoyo financiero' sugar💰",
        successMessage: (amount) => `¡Caña al anzuelo! Recibiste un generoso 'regalo' de ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🙅‍♂️ Te descubrieron tus intenciones y te dejaron sin nada, además perdiste ${MONEY_SYMBOL}${penalty} en el intento.`,
        minReward: 1200, maxReward: 6000, penaltyPercent: 0.3, minPenaltyFlat: 500, successChance: 0.45
    }
];

function ensureLastSlut(user) {
    if (typeof user.lastslut !== 'number' || isNaN(user.lastslut)) {
        user.lastslut = 0;
    }
}

const execute = async (client, message, args, commandName) => {
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Slut Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) {}
        return;
    }
    const commandSenderId = senderContact.id._serialized;
    const user = await getUserData(commandSenderId, message); // payerUser se convierte en 'user'

    if (!user) {
        console.error(`[Slut Plugin] No se pudieron obtener los datos para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) {}
        return;
    }

    // --- INICIO Bloque de Verificación de Registro ---
    if (!user.password) {
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply("🔒 Por favor, inicia tu registro usando un comando de economía (como `.slut`) en un chat grupal para configurar tu número y contraseña.");
            return;
        }
        const userNameToMention = user.pushname || commandSenderId.split('@')[0];
        if (!user.phoneNumber) { // CASO A: Sin contraseña NI número
            user.registration_state = 'esperando_numero_telefono';
            await saveUserData(commandSenderId, user); 
            console.log(`[Slut Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
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
        } else { // CASO B: Tiene número PERO no contraseña
            const dmChatIdForPassword = `${user.phoneNumber}@c.us`;
            let userStateTarget = await getUserData(dmChatIdForPassword); 
            userStateTarget.registration_state = 'esperando_contraseña_dm';
            await saveUserData(dmChatIdForPassword, userStateTarget); 
            console.log(`[Slut Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ${dmChatIdForPassword}.`);
            let displayPhoneNumber = user.phoneNumber;
            if (user.phoneNumber && !String(user.phoneNumber).startsWith('+')) {
                displayPhoneNumber = `+${user.phoneNumber}`;
            }
            await message.reply(
                `🛡️ ¡Hola @${userNameToMention}!\n\n` +
                `Ya tenemos tu número de teléfono registrado (*${displayPhoneNumber}*).\n` +
                `Ahora, para completar tu registro, te he enviado un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus DMs.`,
                undefined, { mentions: [commandSenderId] }
            );
            const dmMessageContent = "🔑 Por favor, responde a este mensaje con la contraseña que deseas establecer para los comandos de economía.";
            try {
                await client.sendMessage(dmChatIdForPassword, dmMessageContent);
                console.log(`[Slut Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdForPassword}.`);
            } catch(dmError){
                console.error(`[Slut Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdForPassword}:`, dmError);
                console.error(`[Slut Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
            }
            return; 
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // Si llegamos aquí, el usuario (commandSenderId) está registrado (tiene contraseña)
    console.log(`[Slut Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) está registrado. Procesando comando .slut.`);

    // --- Lógica del Comando .slut ---
    if (message.mentionedIds && message.mentionedIds.length > 0) {
        // --- Funcionalidad de Pagar a Otro Usuario ---
        const targetId = message.mentionedIds[0]; // ID del usuario mencionado
        let targetContactInfo = null;
        let initialTargetNameForDisplay;

        try {
            const contact = await client.getContactById(targetId);
            if (contact) {
                targetContactInfo = { id: contact.id._serialized || contact.id, pushname: contact.pushname, name: contact.name, number: contact.number };
                initialTargetNameForDisplay = contact.pushname || contact.name || `usuario (${targetId.split('@')[0]})`;
            } else {
                initialTargetNameForDisplay = `usuario (${targetId.split('@')[0]})`;
            }
        } catch (e) {
            initialTargetNameForDisplay = `usuario (${targetId.split('@')[0]})`;
        }
        
        const targetUser = await getUserData(targetId, targetContactInfo); // Obtener datos del objetivo, actualizando su pushname si es posible
        
        if (!targetUser) {
            console.error(`[Slut Plugin] No se pudieron obtener los datos del objetivo para ${targetId}`);
            return message.reply("❌ Hubo un error al obtener los datos del usuario objetivo.");
        }

        // El pushname de targetUser debería estar actualizado por la llamada anterior a getUserData
        const finalTargetName = targetUser.pushname || initialTargetNameForDisplay; 
        const payerName = user.pushname || commandSenderId.split('@')[0]; // 'user' es el pagador (commandSenderId)

        if (targetId === commandSenderId) {
            return message.reply("🤦 No puedes pagarte a ti mismo.");
        }

        let amountToPay;
        if (args.length > 0) { // args ya no contendría el comando ni la mención si bot.js los quita
            // Asumimos que la cantidad es el primer argumento después de la mención
            // Si args viene como ['@mencion', 'cantidad'], entonces args[0] es la mención, args[1] la cantidad
            // Si args solo tiene ['cantidad'] (porque la mención se procesó antes):
            const amountArg = args.find(arg => !arg.startsWith('@')); // Más seguro
            if (amountArg) {
                amountToPay = parseInt(amountArg);
            }
        }


        if (isNaN(amountToPay) || amountToPay <= 0) {
            return message.reply(`❓ Debes especificar una cantidad válida para pagar a *${finalTargetName}*. Ejemplo: \`.slut @usuario 100\``);
        }

        if (typeof user.money !== 'number' || isNaN(user.money) || user.money < amountToPay) {
            return message.reply(`💸 No tienes suficiente dinero en mano (${MONEY_SYMBOL}${user.money || 0}) para pagar ${MONEY_SYMBOL}${amountToPay} a *${finalTargetName}*.`);
        }

        user.money -= amountToPay;
        if (typeof targetUser.money !== 'number' || isNaN(targetUser.money)) targetUser.money = 0;
        targetUser.money += amountToPay;

        await saveUserData(commandSenderId, user);   // Guardar datos del pagador
        await saveUserData(targetId, targetUser); // Guardar datos del objetivo

        console.log(`[Slut Plugin - Pago] ${commandSenderId} (${payerName}) pagó ${amountToPay} a ${targetId} (${finalTargetName}). Saldo pagador: ${user.money}, Saldo receptor: ${targetUser.money}`);

        await message.reply(`💋 *${payerName}* le ha pagado ${MONEY_SYMBOL}${amountToPay} a *${finalTargetName}* por sus 'excelentes servicios'.\n\n`+
                            `*${payerName}* ahora tiene: ${MONEY_SYMBOL}${user.money}\n`+
                            `*${finalTargetName}* ahora tiene: ${MONEY_SYMBOL}${targetUser.money}`);
        
        try {
            // Enviar DM al targetId (que es el ID serializado del contacto mencionado)
            await client.sendMessage(targetId, `🤫 ¡Has recibido un pago de ${MONEY_SYMBOL}${amountToPay} de *${payerName}* por tus 'servicios discretos'! Tu saldo ahora es ${MONEY_SYMBOL}${targetUser.money}.`);
        } catch (privateMsgError) {
            console.error(`[Slut Plugin - Pago] Error enviando MD de notificación a ${targetId}:`, privateMsgError.message);
        }
        return; // Termina la ejecución para el caso de pago
    }

    // --- Si no hay mención, se ejecuta la actividad arriesgada individual ---
    ensureLastSlut(user); // user es el commandSenderId
    const now = Date.now();
    const timeSinceLastSlut = now - (user.lastslut || 0);

    if (timeSinceLastSlut < COOLDOWN_SLUT_SOLO_MS) {
        const timeLeft = COOLDOWN_SLUT_SOLO_MS - timeSinceLastSlut;
        return message.reply(`*💄 Necesitas recomponerte... Espera ${msToTime(timeLeft)} para tu próxima 'cita'.*`);
    }

    const activity = pickRandom(riskyActivities);
    user.lastslut = now;

    await message.reply(`*💋 ${activity.description}...*`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    if (Math.random() < activity.successChance) {
        const amountGained = Math.floor(Math.random() * (activity.maxReward - activity.minReward + 1)) + activity.minReward;
        if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
        user.money += amountGained;
        await saveUserData(commandSenderId, user);
        console.log(`[Slut Plugin - Solo] ${commandSenderId} (${user.pushname || 'N/A'}) tuvo éxito en '${activity.description}', ganó ${amountGained}. Dinero: ${user.money}`);
        return message.reply(`*🥂 ${activity.successMessage(amountGained)}*\nTu dinero: ${MONEY_SYMBOL}${user.money}`);
    } else {
        if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
        let penaltyAmount = Math.floor(user.money * activity.penaltyPercent);
        penaltyAmount = Math.max(penaltyAmount, activity.minPenaltyFlat);
        penaltyAmount = Math.min(penaltyAmount, user.money);
        user.money -= penaltyAmount;
        if (user.money < 0) user.money = 0;
        await saveUserData(commandSenderId, user);
        console.log(`[Slut Plugin - Solo] ${commandSenderId} (${user.pushname || 'N/A'}) falló en '${activity.description}', perdió ${penaltyAmount}. Dinero: ${user.money}`);
        let finalMessage = `*💥 ${activity.failureMessage(penaltyAmount)}*`;
        finalMessage += `\nTu dinero: ${MONEY_SYMBOL}${user.money}`;
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