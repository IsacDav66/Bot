// plugins/crime.js
// Comando para cometer crímenes y ganar dinero (con riesgos), con verificación de registro.

const { getUserData, saveUserData, msToTime, pickRandom, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');
const MONEY_SYMBOL = '💵';

const COOLDOWN_CRIME_MS = 15 * 60 * 1000; // 15 minutos de cooldown

const crimes = [
    {
        description: "Intentas robar una tienda de conveniencia 🏪",
        successMessage: (amount) => `¡Lograste robar la tienda! Te llevaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🚨 ¡Te atraparon! Tuviste que pagar una multa de ${MONEY_SYMBOL}${penalty}.`,
        minReward: 500, maxReward: 2500, penaltyPercent: 0.5, minPenaltyFlat: 200, successChance: 0.65
    },
    {
        description: "Hackeas un cajero automático 💻🏧",
        successMessage: (amount) => `¡Hackeo exitoso! Conseguiste ${MONEY_SYMBOL}${amount} del cajero.`,
        failureMessage: (penalty) => `🔒 ¡El sistema te detectó! Perdiste ${MONEY_SYMBOL}${penalty} mientras intentabas cubrir tus rastros.`,
        minReward: 800, maxReward: 4000, penaltyPercent: 0.6, minPenaltyFlat: 300, successChance: 0.55
    },
    {
        description: "Participas en una carrera callejera ilegal 🏎️💨",
        successMessage: (amount) => `¡Ganaste la carrera! Te llevaste el premio de ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `💥 ¡Chocaste el auto! Los daños te costaron ${MONEY_SYMBOL}${penalty}.`,
        minReward: 1000, maxReward: 5000, penaltyPercent: 0.4, minPenaltyFlat: 150, successChance: 0.70
    },
    {
        description: "Robas un banco pequeño con una pistola de agua 🔫💧",
        successMessage: (amount) => `¡Nadie se dio cuenta de que era de agua! Te llevaste ${MONEY_SYMBOL}${amount}.`,
        failureMessage: (penalty) => `🤣 ¡Se rieron de ti y llamaron a la policía! Te multaron con ${MONEY_SYMBOL}${penalty}.`,
        minReward: 200, maxReward: 1500, penaltyPercent: 0.75, minPenaltyFlat: 400, successChance: 0.40
    }
];

// ensureLastCrime ya no es tan necesaria si getUserData inicializa bien los campos
// function ensureLastCrime(user) {
//     if (typeof user.lastcrime !== 'number' || isNaN(user.lastcrime)) {
//         user.lastcrime = 0;
//     }
// }

const execute = async (client, message, args, commandName) => { // commandName es pasado por bot.js
    // --- INICIO Bloque de Verificación de Registro ---
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Crime Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error(`[Crime Plugin] Error enviando reply de no identificación:`, e); }
        return;
    }
    const commandSenderId = senderContact.id._serialized; 
    const user = await getUserData(commandSenderId, message); 

    if (!user) {
        console.error(`[Crime Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error(`[Crime Plugin] Error enviando reply de error de datos:`, e); }
        return;
    }

    if (!user.password) {
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply("🔒 Por favor, inicia tu registro usando un comando de economía (como `.crime`) en un chat grupal para configurar tu número y contraseña.");
            return;
        }
        const userNameToMention = user.pushname || commandSenderId.split('@')[0];
        if (!user.phoneNumber) { // CASO A: Sin contraseña NI número
            user.registration_state = 'esperando_numero_telefono';
            await saveUserData(commandSenderId, user); 
            console.log(`[Crime Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía (como cometer crímenes), primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${user.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] }
            );
            return; // Detener la ejecución del comando .crime
        } else { // CASO B: Tiene número PERO no contraseña
            const dmChatIdForPassword = `${user.phoneNumber}@c.us`;
            let userStateTarget = await getUserData(dmChatIdForPassword); 
            userStateTarget.registration_state = 'esperando_contraseña_dm';
            await saveUserData(dmChatIdForPassword, userStateTarget); 
            console.log(`[Crime Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ${dmChatIdForPassword}.`);
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
                console.log(`[Crime Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdForPassword}.`);
            } catch(dmError){
                console.error(`[Crime Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdForPassword}:`, dmError);
                console.error(`[Crime Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
            }
            return; // Detener la ejecución del comando .crime
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // Si llegamos aquí, el usuario (commandSenderId) está registrado (tiene contraseña)
    console.log(`[Crime Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) está registrado. Procesando comando .crime.`);
    
    // ensureLastCrime(user); // Ya no es tan necesaria, getUserData debe inicializar user.lastcrime
    const now = Date.now();
    const timeSinceLastCrime = now - (user.lastcrime || 0); // Usar || 0 como fallback

    if (timeSinceLastCrime < COOLDOWN_CRIME_MS) {
        const timeLeft = COOLDOWN_CRIME_MS - timeSinceLastCrime;
        return message.reply(`*👮‍♂️ Estás bajo el radar, debes esperar ${msToTime(timeLeft)} para cometer otro crimen.*`);
    }

    const crime = pickRandom(crimes);
    user.lastcrime = now; // Establecer cooldown inmediatamente
    // No guardamos aquí todavía, guardaremos después del resultado del crimen.

    await message.reply(`*⌛ ${crime.description}...*`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0; // Asegurar que money sea número

    if (Math.random() < crime.successChance) {
        // Éxito
        const amountGained = Math.floor(Math.random() * (crime.maxReward - crime.minReward + 1)) + crime.minReward;
        user.money += amountGained;
        await saveUserData(commandSenderId, user); // Guardar lastcrime y nuevo money
        console.log(`[Crime Plugin] ${commandSenderId} (${user.pushname || 'N/A'}) tuvo éxito en '${crime.description}', ganó ${amountGained}. Dinero: ${user.money}`);
        return message.reply(`*✅ ${crime.successMessage(amountGained)}*\nTu dinero: ${MONEY_SYMBOL}${user.money.toLocaleString()}`);
    } else {
        // Fallo
        let penaltyAmount = Math.floor(user.money * crime.penaltyPercent);
        penaltyAmount = Math.max(penaltyAmount, crime.minPenaltyFlat);
        penaltyAmount = Math.min(penaltyAmount, user.money);

        user.money -= penaltyAmount;
        // user.money ya se aseguró que no sea < 0 dentro de la lógica de penalización
        // (Math.min(penaltyAmount, user.money)), pero un chequeo extra no daña:
        if (user.money < 0) user.money = 0; 
        
        await saveUserData(commandSenderId, user); // Guardar lastcrime y nuevo money
        console.log(`[Crime Plugin] ${commandSenderId} (${user.pushname || 'N/A'}) falló en '${crime.description}', perdió ${penaltyAmount}. Dinero: ${user.money}`);
        let finalMessage = `*❌ ${crime.failureMessage(penaltyAmount)}*`;
        finalMessage += `\nTu dinero: ${MONEY_SYMBOL}${user.money.toLocaleString()}`;
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