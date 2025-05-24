// --- plugins/ppt.js ---
const { MessageMedia } = require('whatsapp-web.js');

// --- Estado del Juego ---
const activeChallenges = new Map();
const CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

// --- Constantes del Juego ---
const CHOICES = ['piedra', 'papel', 'tijera'];
const EMOJIS = {
    piedra: '🗿',
    papel: '📄',
    tijera: '✂️'
};
const RULES = {
    piedra: { vence: 'tijera', pierde: 'papel' },
    papel: { vence: 'piedra', pierde: 'tijera' },
    tijera: { vence: 'papel', pierde: 'piedra' }
};

// --- Función para determinar el ganador ---
function determineWinner(choice1, choice2) {
    if (choice1 === choice2) return 'tie';
    if (RULES[choice1].vence === choice2) return 'player1';
    return 'player2';
}

// --- Función para limpiar retos expirados ---
function cleanupExpiredChallenges(chatId) {
    if (!activeChallenges.has(chatId)) return;
    const now = Date.now();
    const chatChallenges = activeChallenges.get(chatId);
    let changed = false;
    for (const [challengedUserId, challenge] of chatChallenges.entries()) {
        if (now - challenge.timestamp > CHALLENGE_TIMEOUT_MS) {
            chatChallenges.delete(challengedUserId);
            console.log(`[PPT] Reto expirado eliminado en chat ${chatId} para ${challengedUserId}`);
            changed = true;
        }
    }
    if (changed && chatChallenges.size === 0) {
        activeChallenges.delete(chatId);
    }
}

module.exports = {
    name: 'Piedra Papel Tijera',
    aliases: ['ppt', 'rps', 'jugar'],
    description: 'Juega Piedra, Papel o Tijeras contra el bot o reta a otro usuario. El mensaje del reto se elimina (!ppt [piedra|papel|tijera] [@mencion] | !ppt aceptar [piedra|papel|tijera] | !ppt cancelar)',
    category: 'Juegos',
    groupOnly: false,

    async execute(client, message, args) {
        const senderId = message.author || message.from;
        const chatId = message.from;
        const chat = await message.getChat();
        const senderContact = await message.getContact();
        const senderName = senderContact.pushname || senderContact.name || senderId.split('@')[0];

        cleanupExpiredChallenges(chatId);

        const actionOrChoice = args[0]?.toLowerCase();

        // --- Comando !ppt cancelar ---
        if (actionOrChoice === 'cancelar') {
            let cancelled = false;
            if (activeChallenges.has(chatId)) {
                const chatChallenges = activeChallenges.get(chatId);
                // Buscar si el sender es un retador
                for (const [challengedUserId, challenge] of chatChallenges.entries()) {
                    if (challenge.challengerId === senderId) {
                        chatChallenges.delete(challengedUserId);
                        cancelled = true;
                        // No podemos eliminar el mensaje original aquí porque ya no tenemos la referencia directa
                        // y el usuario que cancela puede no ser el que inició.
                        await message.reply(`❌ @${senderId.split('@')[0]}, has cancelado tu reto pendiente en este chat.`, { mentions: [senderContact] });
                        break;
                    }
                }
                // Buscar si el sender es un retado
                if (!cancelled && chatChallenges.has(senderId)) {
                     const challenge = chatChallenges.get(senderId);
                     const challengerContact = await client.getContactById(challenge.challengerId);
                     chatChallenges.delete(senderId);
                     cancelled = true;
                     await message.reply(`❌ @${senderId.split('@')[0]}, has cancelado/rechazado el reto pendiente de @${challenge.challengerId.split('@')[0]}.`, { mentions: [senderContact, challengerContact] });
                }

                if (cancelled && chatChallenges.size === 0) {
                    activeChallenges.delete(chatId);
                }
            }
            if (!cancelled) {
                 await message.reply(`🤷‍♂️ No tienes ningún reto de PPT pendiente para cancelar en este chat.`);
            }
            return;
        }

        // --- Comando !ppt aceptar [eleccion] ---
        if (actionOrChoice === 'aceptar') {
            if (!chat.isGroup) {
                return message.reply('⛔ Solo puedes aceptar retos en grupos.');
            }
            if (!activeChallenges.has(chatId) || !activeChallenges.get(chatId).has(senderId)) {
                return message.reply(`🤔 No tienes ningún reto de PPT pendiente para aceptar aquí, @${senderName}.`, { mentions: [senderContact] });
            }

            const responderChoice = args[1]?.toLowerCase();
            if (!CHOICES.includes(responderChoice)) {
                return message.reply(`❓ Tu elección debe ser 'piedra', 'papel' o 'tijera'. Ejemplo: \`!ppt aceptar piedra\``);
            }

            // --- ¡NUEVO! Intentar eliminar el mensaje de "aceptar" ---
            try {
                await message.delete(true); // Eliminar el "!ppt aceptar [choice]"
                 console.log(`[PPT] Mensaje de aceptación de ${senderId} eliminado.`);
            } catch (deleteError) {
                 console.error(`[PPT] Error al intentar eliminar mensaje de aceptación de ${senderId}:`, deleteError);
                 // Continuar igualmente, la funcionalidad principal es el juego.
            }
            // --- Fin Eliminación Aceptar ---


            const challenge = activeChallenges.get(chatId).get(senderId);
            const challengerId = challenge.challengerId;
            const challengerChoice = challenge.challengerChoice;
            const challengerContact = await client.getContactById(challengerId);
            const challengerName = challengerContact.pushname || challengerContact.name || challengerId.split('@')[0];

            const result = determineWinner(challengerChoice, responderChoice);

            let resultMessage = `*¡Duelo de PPT Terminado!* 💥\n\n`;
            resultMessage += `Retador: @${challengerName} eligió ${EMOJIS[challengerChoice]} ~~(${challengerChoice})~~\n`; // Ocultamos la palabra
            resultMessage += `Retado: @${senderName} eligió ${EMOJIS[responderChoice]} ~~(${responderChoice})~~\n\n`; // Ocultamos la palabra

            if (result === 'tie') {
                resultMessage += "Resultado: *¡Empate!* 🤝";
            } else if (result === 'player1') {
                resultMessage += `Resultado: *¡Ganó @${challengerName}!* 🎉`;
            } else {
                resultMessage += `Resultado: *¡Ganó @${senderName}!* 🎉`;
            }

            activeChallenges.get(chatId).delete(senderId);
            if (activeChallenges.get(chatId).size === 0) {
                activeChallenges.delete(chatId);
            }

            // Enviamos el resultado como un nuevo mensaje
            await client.sendMessage(chatId, resultMessage, { mentions: [challengerContact, senderContact] });
            return;
        }

        // --- Comando !ppt [eleccion] [@mencion] --- (Reto o Vs Bot)
        const playerChoice = actionOrChoice;

        if (!CHOICES.includes(playerChoice)) {
            // No eliminamos este mensaje porque es un error del usuario
            return message.reply(`❓ Para jugar o retar, tu primer argumento debe ser 'piedra', 'papel' o 'tijera'.\n\n*Ejemplos:*\nJugar vs Bot: \`!ppt piedra\`\nRetar a alguien: \`!ppt papel @usuario\``);
        }

        const mentionedUserContact = message.mentionedIds && message.mentionedIds.length > 0 ? await client.getContactById(message.mentionedIds[0]) : null;

        if (mentionedUserContact) {
            // --- Modo Reto (Player vs Player) ---
            if (!chat.isGroup) {
                // No eliminamos, es un error de contexto
                return message.reply('⛔ Solo puedes retar a otros usuarios dentro de un grupo.');
            }
            if (mentionedUserContact.id._serialized === senderId) {
                // No eliminamos, error lógico del usuario
                return message.reply('🤦‍♂️ No puedes retarte a ti mismo.');
            }
             if (mentionedUserContact.isMe) {
                 // No eliminamos, error lógico
                 return message.reply('🤖 Quieres retarme a mí? Usa `!ppt [tu elección]` sin mencionar a nadie.');
            }

            const challengedId = mentionedUserContact.id._serialized;
            const challengedName = mentionedUserContact.pushname || mentionedUserContact.name || challengedId.split('@')[0];

             cleanupExpiredChallenges(chatId); // Limpiar antes de verificar conflictos

            if (activeChallenges.has(chatId)) {
                const chatChallenges = activeChallenges.get(chatId);
                 if (chatChallenges.has(challengedId) && chatChallenges.get(challengedId).challengerId === senderId) {
                    // No eliminamos, el reto ya existe
                    return message.reply(`⏳ Ya has retado a @${challengedName}. Espera a que responda o usa \`!ppt cancelar\`.`, { mentions: [mentionedUserContact] });
                 }
                 if (chatChallenges.has(senderId) && chatChallenges.get(senderId).challengerId === challengedId) {
                    // No eliminamos, el reto ya existe en la otra dirección
                    return message.reply(`⏳ @${challengedName} ya te ha retado. Responde con \`!ppt aceptar [tu elección]\` o usa \`!ppt cancelar\`.`, { mentions: [mentionedUserContact] });
                 }
            }

            // ---- Punto Clave: Guardar y luego intentar eliminar ----
            if (!activeChallenges.has(chatId)) {
                activeChallenges.set(chatId, new Map());
            }

            // 1. Registrar el nuevo reto (GUARDAMOS LA ELECCIÓN ANTES DE BORRAR)
            activeChallenges.get(chatId).set(challengedId, {
                challengerId: senderId,
                challengerChoice: playerChoice, // La elección se guarda aquí
                timestamp: Date.now()
            });
            console.log(`[PPT] Nuevo reto registrado: ${senderId} -> ${challengedId} en chat ${chatId}. Elección guardada: ${playerChoice}`);

            // 2. Intentar eliminar el mensaje original del retador
            let deleteFailed = false;
            try {
                await message.delete(true); // true para eliminar para todos
                console.log(`[PPT] Mensaje original del reto de ${senderId} eliminado.`);
            } catch (deleteError) {
                deleteFailed = true;
                console.error(`[PPT] FALLO al eliminar mensaje de reto de ${senderId} (¿El bot no es admin?):`, deleteError.message);
                // Opcional: Notificar al retador en privado si falla la eliminación
                // await client.sendMessage(senderId, `⚠️ No pude eliminar tu mensaje de reto en el grupo "${chat.name}". Tu elección podría ser visible.`);
            }

            // 3. Enviar el mensaje de notificación del reto (ya no necesita la elección)
            let challengeAnnounce = `⚔️ *¡Reto de PPT Lanzado!* ⚔️\n\n` +
                                  `@${senderName} ha elegido su jugada y reta a @${challengedName}!\n\n` +
                                  `@${challengedName}, responde con \`!ppt aceptar [piedra|papel|tijera]\` para jugar.\n` +
                                  `(El reto expira en 5 minutos)`;

            // Si falló la eliminación, añadir una advertencia sutil
            //if (deleteFailed) {
            //    challengeAnnounce += "\n\n_(Psst... parece que no pude borrar el mensaje original del retador)_";
            //}

            await client.sendMessage(chatId, challengeAnnounce, { mentions: [senderContact, mentionedUserContact] });
            // Ya no usamos message.reply porque el mensaje original podría haber sido eliminado

        } else {
            // --- Modo Vs Bot ---
            // Aquí NO eliminamos el mensaje, ya que no hay riesgo de que otro jugador vea la elección.
            const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
            const result = determineWinner(playerChoice, botChoice);

            let resultMessage = `*Jugando PPT contra el Bot* 🤖\n\n`;
            resultMessage += `Tú elegiste: ${EMOJIS[playerChoice]} ${playerChoice}\n`;
            resultMessage += `El Bot eligió: ${EMOJIS[botChoice]} ${botChoice}\n\n`;

            if (result === 'tie') {
                resultMessage += "Resultado: *¡Empate!* 🤝";
            } else if (result === 'player1') {
                resultMessage += `Resultado: *¡Ganaste!* 🎉`;
            } else {
                resultMessage += `Resultado: *¡Perdiste!* 😭`;
            }
            // Usamos reply aquí porque el mensaje original sigue existiendo
            await message.reply(resultMessage);
        }
    }
};