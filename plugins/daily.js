// plugins/daily.js
// Comando para reclamar recompensas diarias y mantener rachas, con verificación de registro.

const { getUserData, saveUserData, msToTime, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy'); // Asegúrate de importar las funciones de estado
const MONEY_SYMBOL = '💵';
const EXP_SYMBOL = '⭐';

const COOLDOWN_DAILY_MS = 23 * 60 * 60 * 1000;
const MAX_STREAK_DAYS = 30;
const STREAK_LOSS_THRESHOLD_MS = 47 * 60 * 60 * 1000;

const BASE_DAILY_MONEY = 100;
const BASE_DAILY_EXP = 500;

function getStreakMultiplier(streakDays) {
    if (streakDays <= 0) return 1;
    if (streakDays >= MAX_STREAK_DAYS) streakDays = MAX_STREAK_DAYS;
    let multiplier = 1 + (0.05 * (streakDays -1));
    return Math.min(multiplier, 5);
}

// ensureDailyFields sigue siendo útil para inicializar campos específicos de daily si getUserData no lo hiciera
// (aunque con DEFAULT_USER_FIELDS en shared-economy, debería estar cubierto).
function ensureDailyFields(user) {
    if (typeof user.lastdaily !== 'number' || isNaN(user.lastdaily)) {
        user.lastdaily = 0;
    }
    if (typeof user.dailystreak !== 'number' || isNaN(user.dailystreak)) {
        user.dailystreak = 0;
    }
}

const execute = async (client, message, args, commandName) => {
    // --- INICIO Bloque de Verificación de Registro ---
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Daily Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error(`[Daily Plugin] Error enviando reply de no identificación:`, e); }
        return;
    }
    const commandSenderId = senderContact.id._serialized; 
    const user = await getUserData(commandSenderId, message); 

    if (!user) {
        console.error(`[Daily Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error(`[Daily Plugin] Error enviando reply de error de datos:`, e); }
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
            console.log(`[Daily Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía (como la recompensa diaria), primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${user.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] }
            );
            return; // Detener la ejecución del comando .daily
        } else { // CASO B: Tiene número (en user.phoneNumber de la BD, para commandSenderId) PERO NO contraseña
            // 'user' aquí es el objeto de datos para 'commandSenderId'
            // y user.phoneNumber ya tiene el número guardado.

            user.registration_state = 'esperando_contraseña_dm'; // Establecer el estado en el objeto del commandSenderId
            await saveUserData(commandSenderId, user); // Guardar el estado actualizado PARA EL commandSenderId
            
            const userNameToMention = user.pushname || commandSenderId.split('@')[0];
            // El console.log debe reflejar que el estado se guardó para commandSenderId
            console.log(`[Daily Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ÉL MISMO (${commandSenderId}).`);

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
            
            console.log(`[Daily Plugin DM DEBUG] Intentando enviar DM para contraseña.`);
            console.log(`[Daily Plugin DM DEBUG] Target para DM (construido desde phoneNumber): ${dmChatIdToSendTo}`);
            // ... (try-catch para client.sendMessage(dmChatIdToSendTo, ...)) ...
            try {
                await client.sendMessage(dmChatIdToSendTo, dmMessageContent);
                console.log(`[Daily Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdToSendTo}.`);
            } catch(dmError){
                console.error(`[Daily Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdToSendTo}:`, dmError);
                console.error(`[Daily Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
                // Si el DM falla, el estado 'esperando_contraseña_dm' sigue en commandSenderId.
                // No necesitamos limpiar el estado de dmChatIdToSendTo porque no lo modificamos allí.
            }
            return; 
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // Si llegamos aquí, el usuario (commandSenderId) está registrado (tiene contraseña)
    console.log(`[Daily Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) está registrado. Procesando comando .daily.`);
    
    ensureDailyFields(user); // 'user' es el objeto correcto, ya incluye los campos de daily si existen
    const now = Date.now();
    const timeSinceLastDaily = now - (user.lastdaily || 0); // Usar || 0 como fallback

    // Verificar si perdió la racha
    if (user.lastdaily !== 0 && timeSinceLastDaily > STREAK_LOSS_THRESHOLD_MS) {
        await message.reply(`😢 ¡Oh no, *${user.pushname || 'tú'}*! Has perdido tu racha de ${user.dailystreak} días por no reclamar a tiempo. Tu racha vuelve a 0.`);
        user.dailystreak = 0;
        // No es necesario guardar aquí inmediatamente, se guardará al reclamar la nueva recompensa o con el siguiente comando.
    } else if (user.lastdaily === 0 && user.dailystreak > 0) {
        console.warn(`[Daily Plugin] Usuario ${commandSenderId} tenía racha ${user.dailystreak} pero lastdaily era 0. Reseteando racha.`);
        user.dailystreak = 0;
    }

    // Verificar cooldown para reclamar
    if (user.lastdaily !== 0 && timeSinceLastDaily < COOLDOWN_DAILY_MS) {
        const timeLeft = COOLDOWN_DAILY_MS - timeSinceLastDaily;
        return message.reply(`🎁 Ya reclamaste tu recompensa diaria. Vuelve en *${msToTime(timeLeft)}*.\nTu racha actual: ${user.dailystreak || 0} día(s).`);
    }

    // Actualizar racha
    if (user.lastdaily === 0 || user.dailystreak === 0) { // Si es la primera vez o perdió la racha
        user.dailystreak = 1;
    } else { // Reclamando consecutivamente
        user.dailystreak = Math.min(user.dailystreak + 1, MAX_STREAK_DAYS);
    }

    const currentStreak = user.dailystreak;
    const streakMultiplier = getStreakMultiplier(currentStreak);

    const moneyEarned = Math.floor(BASE_DAILY_MONEY * streakMultiplier);
    const expEarned = Math.floor(BASE_DAILY_EXP * streakMultiplier);

    if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
    if (typeof user.exp !== 'number' || isNaN(user.exp)) user.exp = 0;
    user.money += moneyEarned;
    user.exp += expEarned;
    user.lastdaily = now;

    await saveUserData(commandSenderId, user);

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
    console.log(`[Daily Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) reclamó daily. Racha: ${currentStreak}. Ganó: $${moneyEarned}, EXP ${expEarned}.`);
};

module.exports = {
    name: 'Recompensa Diaria',
    aliases: ['daily', 'diario', 'recompensa'],
    description: 'Reclama tu recompensa diaria y mantén tu racha para mejores premios.',
    category: 'Economía',
    execute,
};