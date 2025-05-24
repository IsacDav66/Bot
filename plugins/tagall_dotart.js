// plugins/tagall_dotart.js
// Mención masiva personalizada, con opción de adjuntar imagen citada.

const { MessageMedia } = require('whatsapp-web.js');

const execute = async (client, message, args) => {
    // 1. Verificar si es un grupo (bot.js ya lo hace, pero doble check)
    const chat = await message.getChat();
    if (!chat.isGroup) {
        // Este mensaje no debería aparecer si bot.js funciona bien
        return message.reply('Este comando solo funciona en grupos.');
    }

        // 2. Obtener participantes
    console.log(`[TagAllDotart] Accediendo a participantes para ${chat.name}...`);
    // El objeto Chat ya debería tenerlos si se obtuvo bien
    const participants = chat.participants;

    // Verificar si la lista existe y tiene miembros
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
        console.error(`[TagAllDotart] No se encontró la lista de participantes o está vacía para el chat ${chat.id._serialized}`);
        // Intentar obtener el chat de nuevo podría ayudar en casos raros, pero usualmente indica un problema
        // const updatedChat = await message.getChat(); // Podría intentar esto
        // if (!updatedChat.participants || updatedChat.participants.length === 0){...}
        return message.reply('❌ Error: No se pudo obtener la lista de participantes de este grupo.');
    }
    console.log(`[TagAllDotart] Participantes encontrados: ${participants.length}`);

    // 3. Preparar el mensaje de texto
    const messageContent = args.join(' ') || 'Atención a todos!'; // Mensaje por defecto
    const messageHeader = `*⺀🚨 Dotart en Vivo KICK🚨⺀*\n\n`; // Encabezado
    const announcement = `❏ *𝙼𝙴𝙽𝚂𝙰𝙹𝙴:* ${messageContent}\n\n`;

    // Truco "Leer más"
    const invisibleSpace = String.fromCharCode(8206);
    const readMore = invisibleSpace.repeat(4001); // Ojo: WhatsApp puede cambiar cómo maneja esto

    // Construir la lista de etiquetas
    let participantTags = `❏ *𝙴𝚃𝙸𝙶𝚄𝙴𝚃𝙰𝚂:*\n`;
    const mentions = []; // Array para las menciones que necesita WWebJS

    participants.forEach(p => {
        // Añadir etiqueta al texto (solo la parte numérica del ID)
        participantTags += `┣➥ @${p.id.user}\n`;
        // Añadir el objeto Contact o ID serializado al array de menciones
        mentions.push(p.id._serialized); // Usar ID completo para la librería
        // Alternativa si necesitas objetos Contact: mentions.push(await client.getContactById(p.id._serialized)); (más lento)
    });

    const footer = `\n└ *Creado por Dotart*\n\n*▌│█║▌║▌║║▌║▌║▌║█*`; // Pie de página
    const finalText = `${messageHeader}${announcement}${readMore}${participantTags}${footer}`;

    // 4. Verificar mensaje citado y si es imagen
    let mediaToSend = null;
    if (message.hasQuotedMsg) {
        try {
            const quotedMsg = await message.getQuotedMessage();
            if (quotedMsg.hasMedia && quotedMsg.type === 'image') {
                console.log('[TagAllDotart] Mensaje citado es una imagen. Descargando...');
                mediaToSend = await quotedMsg.downloadMedia();
                console.log('[TagAllDotart] Imagen descargada.');
            }
        } catch (error) {
            console.error('[TagAllDotart] Error al procesar mensaje citado:', error);
            await message.reply('⚠️ Hubo un error al descargar la imagen citada.');
            // Continuar enviando solo texto si falla la descarga
            mediaToSend = null;
        }
    }

    // 5. Enviar el mensaje final
    try {
        if (mediaToSend) {
            console.log(`[TagAllDotart] Enviando imagen con caption y ${mentions.length} menciones a ${chat.id._serialized}...`);
            await client.sendMessage(chat.id._serialized, mediaToSend, {
                caption: finalText,
                mentions: mentions
            });
        } else {
            console.log(`[TagAllDotart] Enviando texto con ${mentions.length} menciones a ${chat.id._serialized}...`);
            await client.sendMessage(chat.id._serialized, finalText, {
                mentions: mentions
            });
        }
        console.log('[TagAllDotart] Mensaje de mención enviado.');
    } catch (error) {
        console.error(`[TagAllDotart] Error al enviar mensaje:`, error);
        await message.reply(`❌ Error al enviar el mensaje de mención masiva. Detalles: ${error.message}`);
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'tagall_dotart',
    aliases: ['dotart', 'everyone'], // Comandos que lo activan
    description: 'Menciona a todos los miembros del grupo con un mensaje personalizado (opcionalmente con imagen citada).',
    category: 'Utilidad',
    groupOnly: true, // Marcar como comando de grupo
    execute: execute
};