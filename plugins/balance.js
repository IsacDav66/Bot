// plugins/balance.js
// Comando para ver el balance de EXP, Dinero en mano y Dinero en banco.

const { getUserData } = require('./shared-economy'); // getUserData ahora es async
const MONEY_SYMBOL = '$';

const execute = async (client, message, args, commandName) => {
    let targetId;
    let userToDisplay; // Guardará los datos del usuario cuyo balance se mostrará
    let displayName;   // Guardará el nombre a mostrar para ese usuario

    if (message.mentionedIds && message.mentionedIds.length > 0) {
        targetId = message.mentionedIds[0];
        // Obtener datos del usuario mencionado, pasando 'null' para message
        // ya que el 'message' actual es del solicitante, no del mencionado.
        // El pushname del mencionado se actualizará cuando él mismo interactúe.
        // O, si quieres FORZAR la actualización del pushname del mencionado AHORA usando client:
        // userToDisplay = await getUserData(targetId, { getContact: async () => await client.getContactById(targetId), author: targetId, from: targetId });
        // Pero es más simple confiar en que su pushname se actualizará cuando él interactúe.
        userToDisplay = await getUserData(targetId); // No pasar 'message' del solicitante
        
        if (!userToDisplay) {
            console.error(`[Balance Plugin] No se pudieron obtener los datos para el usuario mencionado ${targetId}`);
            return message.reply("❌ Hubo un error al obtener los datos del usuario mencionado.");
        }

        // Intentar obtener el nombre del contacto en tiempo real como fallback si no hay pushname guardado
        try {
            const contact = await client.getContactById(targetId);
            displayName = userToDisplay.pushname || contact.pushname || contact.name || `Usuario (${targetId.split('@')[0]})`;
        } catch (e) {
            console.warn(`[Balance Plugin] No se pudo obtener info del contacto ${targetId}, usando ID o pushname guardado.`);
            displayName = userToDisplay.pushname || `Usuario (${targetId.split('@')[0]})`;
        }

    } else {
        targetId = message.author || message.from;
        // Obtener datos del usuario que ejecuta el comando, pasando 'message' para actualizar su pushname
        userToDisplay = await getUserData(targetId, message);
        
        if (!userToDisplay) {
            console.error(`[Balance Plugin] No se pudieron obtener los datos para el solicitante ${targetId}`);
            return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
        }
        displayName = "Tu"; // Para el mensaje "Balance de Tu"
        // Si queremos mostrar el nombre del solicitante en lugar de "Tu":
        // displayName = userToDisplay.pushname || `Usuario (${targetId.split('@')[0]})`;
    }

    // --- LOG DE DEPURACIÓN ---
    console.log(`[Balance Plugin DEBUG] Mostrando balance para ${targetId} (Nombre: ${userToDisplay.pushname || displayName}). Datos: money=${userToDisplay.money}, exp=${userToDisplay.exp}, bank=${userToDisplay.bank}`);
    // -------------------------

    const balanceMessage = `*📊 Balance de ${displayName}*\n\n` +
                           `⭐ *EXP Total:* ${userToDisplay.exp || 0}\n` +
                           `💵 *Dinero en Mano:* ${MONEY_SYMBOL}${userToDisplay.money || 0}\n` +
                           `🏦 *Dinero en Banco:* ${MONEY_SYMBOL}${userToDisplay.bank || 0}`;
    
    console.log(`[Balance Plugin] Consulta de balance para ${targetId} (solicitado por ${message.author || message.from})`);
    await message.reply(balanceMessage);
};

module.exports = {
    name: 'Balance',
    aliases: ['bal', 'balance', 'profile', 'saldo'],
    description: 'Muestra tu balance de EXP, Dinero en mano y Dinero en banco, o el de un usuario mencionado.',
    category: 'Economía',
    execute,
};