// plugins/tagall.js
// Mención masiva estándar con mensaje personalizado.

// No se necesitan importaciones extra aquí

const execute = async (client, message, args) => {
    // 1. Obtener Chat y verificar si es grupo
    let chat;
    try {
        chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('Este comando solo funciona en grupos.');
        }
    } catch (error) {
        console.error("[TagAll] Error obteniendo chat:", error);
        return message.reply('❌ Error al obtener la información del chat.');
    }

    // 2. Obtener Participantes
    console.log(`[TagAll] Obteniendo participantes para ${chat.name}...`);
    let participants;
    try {
        participants = chat.participants;
        if (!participants || participants.length === 0) {
            await chat.fetchParticipants(); // Fallback
             participants = chat.participants;
        }
        if (!participants || participants.length === 0) {
            throw new Error("Lista de participantes vacía.");
        }
        console.log(`[TagAll] Participantes obtenidos: ${participants.length}`);
    } catch (error) {
        console.error(`[TagAll] Error obteniendo participantes:`, error);
        return message.reply('❌ Error al obtener la lista de participantes del grupo.');
    }

    // 3. Preparar el mensaje de texto
    const messageContent = args.join(' ') || 'Sin mensaje especificado.'; // Mensaje del usuario o default
    const messageHeader = `*⺀🚨 RALLY/ANUNCIO 🚨⺀*\n\n`;
    const announcement = `❏ *𝙼𝙴𝙽𝚂𝙰𝙹𝙴:* ${messageContent}\n\n`;

    // Truco "Leer más"
    const invisibleSpace = String.fromCharCode(8206);
    const readMore = invisibleSpace.repeat(4001);

    // Construir la lista de etiquetas y el array de menciones para WWebJS
    let participantTags = `❏ *𝙴𝚃𝙸𝙶𝚄𝙴𝚃𝙰𝚂:*\n`;
    const mentions = [];

    participants.forEach(p => {
        participantTags += `┣➥ @${p.id.user}\n`;       // Texto visible con @numero
        mentions.push(p.id._serialized); // ID completo para la librería
    });

    const footer = `\n*└* *Creado por Gowther Shop 7*\n\n*▌│█║▌║▌║║▌║▌║▌║█*`;
    const finalText = `${messageHeader}${announcement}${readMore}${participantTags}${footer}`;

    // 4. Enviar el mensaje con menciones
    try {
        console.log(`[TagAll] Enviando mención masiva a ${chat.id._serialized}`);
        await client.sendMessage(chat.id._serialized, finalText, {
            mentions: mentions // Array de IDs serializados
        });
        console.log('[TagAll] Mensaje de mención enviado.');
    } catch (error) {
        console.error(`[TagAll] Error al enviar mensaje:`, error);
        await message.reply(`❌ Error al enviar el mensaje de mención masiva. Detalles: ${error.message}`);
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'tagall_general',
    aliases: ['tagall', 'rally', 'invocar', 'invocacion', 'todos', 'invocación', 'aviso'], // Comandos
    description: 'Menciona a todos los miembros del grupo con un mensaje.',
    category: 'Utilidad',
    groupOnly: true, // Solo grupos
    execute: execute
};