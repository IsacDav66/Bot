// plugins/steal.js
// Comando para robar dinero EN MANO a otros usuarios, con verificación de registro.

const { getUserData, saveUserData, msToTime, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy'); // Añadir setUserRegistrationState y clearUserRegistrationState si se usan directamente

const COOLDOWN_STEAL_MS = 30 * 60 * 1000;
const STEAL_SUCCESS_CHANCE = 0.60;
const STEAL_MIN_PERCENT = 0.05;
const STEAL_MAX_PERCENT = 0.20;
const STEAL_FAIL_PENALTY_MONEY = 500;
const MONEY_SYMBOL = '$';

const execute = async (client, message, args, commandName) => {
    // --- INICIO Bloque de Verificación de Registro ---
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Steal Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error(`[Steal Plugin] Error enviando reply de no identificación:`, e); }
        return;
    }
    const commandSenderId = senderContact.id._serialized; 
    const attackerUser = await getUserData(commandSenderId, message); // Renombrar 'user' a 'attackerUser' para claridad en este plugin

    if (!attackerUser) {
        console.error(`[Steal Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error(`[Steal Plugin] Error enviando reply de error de datos:`, e); }
        return;
    }

    if (!attackerUser.password) { // Si el ATACANTE no tiene contraseña, iniciar flujo de registro
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply("🔒 Por favor, inicia tu registro usando un comando de economía (como `.steal`) en un chat grupal para configurar tu número y contraseña.");
            return;
        }
        const userNameToMention = attackerUser.pushname || commandSenderId.split('@')[0];
        if (!attackerUser.phoneNumber) { // CASO A: Sin contraseña NI número
            attackerUser.registration_state = 'esperando_numero_telefono';
            await saveUserData(commandSenderId, attackerUser); 
            console.log(`[Steal Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía (como robar), primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${attackerUser.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] }
            );
            return; // Detener la ejecución del comando .steal
        } else { // CASO B: Tiene número PERO no contraseña
            const dmChatIdForPassword = `${attackerUser.phoneNumber}@c.us`;
            let userStateTarget = await getUserData(dmChatIdForPassword); 
            userStateTarget.registration_state = 'esperando_contraseña_dm';
            await saveUserData(dmChatIdForPassword, userStateTarget); 
            console.log(`[Steal Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${attackerUser.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ${dmChatIdForPassword}.`);
            let displayPhoneNumber = attackerUser.phoneNumber;
            if (attackerUser.phoneNumber && !String(attackerUser.phoneNumber).startsWith('+')) {
                displayPhoneNumber = `+${attackerUser.phoneNumber}`;
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
                console.log(`[Steal Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdForPassword}.`);
            } catch(dmError){
                console.error(`[Steal Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdForPassword}:`, dmError);
                console.error(`[Steal Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña...", undefined, { mentions: [commandSenderId] });
            }
            return; // Detener la ejecución del comando .steal
        }
    }
    // --- FIN Bloque de Verificación de Registro ---

    // Si llegamos aquí, el attackerUser está registrado (tiene contraseña)
    console.log(`[Steal Plugin] Usuario ${commandSenderId} (${attackerUser.pushname || 'N/A'}) está registrado. Procesando comando .steal.`);

    // --- Lógica Específica del Comando .steal ---
    const attackerId = commandSenderId; // Reafirmar para claridad, ya lo teníamos
    // attackerUser ya está definido y es el objeto de datos del atacante

    const now = Date.now();
    const timeSinceLastSteal = now - (attackerUser.laststeal || 0);

    if (timeSinceLastSteal < COOLDOWN_STEAL_MS) {
        const timeLeft = COOLDOWN_STEAL_MS - timeSinceLastSteal;
        return message.reply(`*⏳ Debes esperar ${msToTime(timeLeft)} para intentar robar de nuevo.*`);
    }

    if (!message.mentionedIds || message.mentionedIds.length === 0) {
        return message.reply("❓ Debes mencionar a quién quieres robar. Ejemplo: `.steal @usuario`");
    }

    const targetId = message.mentionedIds[0];

    if (targetId === attackerId) {
        return message.reply("🤦 No puedes robarte a ti mismo.");
    }

    let targetContactInfo = null;
    let initialTargetNameForDisplay;

    try {
        const contact = await client.getContactById(targetId);
        if (contact) {
            targetContactInfo = {
                id: contact.id._serialized || contact.id,
                pushname: contact.pushname,
                name: contact.name,
                number: contact.number
            };
            initialTargetNameForDisplay = contact.pushname || contact.name || `usuario (${targetId.split('@')[0]})`;
        } else {
            initialTargetNameForDisplay = `usuario (${targetId.split('@')[0]})`;
        }
    } catch (e) {
        console.warn(`[Steal Plugin] No se pudo obtener info de contacto para ${targetId} directamente: ${e.message}`);
        initialTargetNameForDisplay = `usuario (${targetId.split('@')[0]})`;
    }

    const targetUser = await getUserData(targetId, targetContactInfo); // Obtener datos del objetivo, actualizando su pushname

    if (!targetUser) {
        console.error(`[Steal Plugin] No se pudieron obtener los datos del objetivo ${targetId}`);
        return message.reply("❌ Hubo un error al obtener los datos del usuario objetivo.");
    }
    
    // IMPORTANTE: El objetivo (targetUser) NO necesita estar registrado con contraseña para ser robado.
    // Solo el atacante (attackerUser) necesita estar registrado.

    const finalTargetName = targetUser.pushname || initialTargetNameForDisplay;
    const attackerName = attackerUser.pushname || attackerId.split('@')[0];

    if (typeof targetUser.money !== 'number' || isNaN(targetUser.money)) {
        targetUser.money = 0;
    }

    if (targetUser.money <= 0) {
        return message.reply(`💸 *${finalTargetName}* no tiene dinero en mano para robar. ¡Quizás lo tiene en el banco! 😉`);
    }
    
    attackerUser.laststeal = now;

    if (typeof attackerUser.money !== 'number' || isNaN(attackerUser.money)) {
        attackerUser.money = 0;
    }

    if (Math.random() < STEAL_SUCCESS_CHANCE) { // ROBO EXITOSO
        const maxCanSteal = targetUser.money; 
        let stolenAmount = Math.floor(targetUser.money * (Math.random() * (STEAL_MAX_PERCENT - STEAL_MIN_PERCENT) + STEAL_MIN_PERCENT));
        stolenAmount = Math.min(stolenAmount, maxCanSteal);
        stolenAmount = Math.max(stolenAmount, 1); 

        if (stolenAmount <= 0 && targetUser.money > 0) {
             stolenAmount = Math.min(1, targetUser.money);
        }
        if (stolenAmount <= 0 ) {
             await saveUserData(attackerId, attackerUser);
             return message.reply(`😅 Intentaste robar a *${finalTargetName}*, pero apenas tenía centavos en mano. No conseguiste nada.`);
        }
        
        attackerUser.money += stolenAmount;
        targetUser.money -= stolenAmount;

        await saveUserData(attackerId, attackerUser);
        await saveUserData(targetId, targetUser);

        console.log(`[Steal Plugin] ${attackerId} (${attackerName}) robó ${stolenAmount} de dinero EN MANO a ${targetId} (${finalTargetName}). Saldo atacante: ${attackerUser.money}, Saldo objetivo: ${targetUser.money}`);
        return message.reply(`*💰 ¡Éxito!* Le robaste *${MONEY_SYMBOL}${stolenAmount}* (en mano) a *${finalTargetName}*.\nAhora tienes ${MONEY_SYMBOL}${attackerUser.money}.`);
    } else { // ROBO FALLIDO
        const penalty = Math.min(attackerUser.money, STEAL_FAIL_PENALTY_MONEY);
        attackerUser.money -= penalty;
        if (attackerUser.money < 0) attackerUser.money = 0;
        await saveUserData(attackerId, attackerUser);

        console.log(`[Steal Plugin] ${attackerId} (${attackerName}) falló robando a ${targetId} (${finalTargetName}) y perdió ${penalty} de dinero. Saldo atacante: ${attackerUser.money}`);
        let replyMsg = `*🚓 ¡Fallaste!* *${finalTargetName}* te descubrió.`;
        if (penalty > 0) {
            replyMsg += ` Perdiste *${MONEY_SYMBOL}${penalty}* en la huida.\nAhora tienes ${MONEY_SYMBOL}${attackerUser.money}.`;
        } else {
            replyMsg += ` Por suerte no perdiste nada.`;
        }
        return message.reply(replyMsg);
    }
};

module.exports = {
    name: 'Robar',
    aliases: ['steal', 'robar'],
    description: 'Intenta robar dinero EN MANO a otro usuario (con cooldown y riesgo).',
    category: 'Economía',
    execute,
};