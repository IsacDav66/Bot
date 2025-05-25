// plugins/steal.js
// Comando para robar dinero EN MANO a otros usuarios.

const { getUserData, saveUserData, msToTime } = require('./shared-economy');

const COOLDOWN_STEAL_MS = 30 * 60 * 1000;
const STEAL_SUCCESS_CHANCE = 0.60;
const STEAL_MIN_PERCENT = 0.05;
const STEAL_MAX_PERCENT = 0.20;
const STEAL_FAIL_PENALTY_MONEY = 500;
const MONEY_SYMBOL = '$';

const execute = async (client, message, args, commandName) => {
    const attackerId = message.author || message.from;
    const attackerUser = await getUserData(attackerId, message);

    if (!attackerUser) {
        console.error(`[Steal Plugin] No se pudieron obtener los datos del atacante ${attackerId}`);
        return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
    }

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

    const targetUser = await getUserData(targetId, targetContactInfo);

    if (!targetUser) {
        console.error(`[Steal Plugin] No se pudieron obtener los datos del objetivo ${targetId}`);
        return message.reply("❌ Hubo un error al obtener los datos del usuario objetivo.");
    }
    
    const finalTargetName = targetUser.pushname || initialTargetNameForDisplay;
    const attackerName = attackerUser.pushname || attackerId.split('@')[0];

    if (typeof targetUser.money !== 'number' || isNaN(targetUser.money)) {
        targetUser.money = 0;
    }

    if (targetUser.money <= 0) {
        return message.reply(`💸 *${finalTargetName}* no tiene dinero en mano para robar. ¡Quizás lo tiene en el banco! 😉`);
    }
    
    attackerUser.laststeal = now; // Establecer cooldown para el atacante INMEDIATAMENTE

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
             // Solo se actualizó laststeal del atacante, así que solo guardamos al atacante
             await saveUserData(attackerId, attackerUser); // *** CORREGIDO ***
             return message.reply(`😅 Intentaste robar a *${finalTargetName}*, pero apenas tenía centavos en mano. No conseguiste nada.`);
        }
        
        attackerUser.money += stolenAmount;
        targetUser.money -= stolenAmount;

        // Guardar datos de AMBOS usuarios
        await saveUserData(attackerId, attackerUser); // *** CORREGIDO ***
        await saveUserData(targetId, targetUser);   // *** CORREGIDO ***

        console.log(`[Steal Plugin] ${attackerId} (${attackerName}) robó ${stolenAmount} de dinero EN MANO a ${targetId} (${finalTargetName}). Saldo atacante: ${attackerUser.money}, Saldo objetivo: ${targetUser.money}`);
        return message.reply(`*💰 ¡Éxito!* Le robaste *${MONEY_SYMBOL}${stolenAmount}* (en mano) a *${finalTargetName}*.\nAhora tienes ${MONEY_SYMBOL}${attackerUser.money}.`);
    } else { // ROBO FALLIDO
        const penalty = Math.min(attackerUser.money, STEAL_FAIL_PENALTY_MONEY);
        attackerUser.money -= penalty;
        if (attackerUser.money < 0) attackerUser.money = 0;

        // Solo se modificaron datos del atacante (laststeal y money)
        await saveUserData(attackerId, attackerUser); // *** CORREGIDO ***

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