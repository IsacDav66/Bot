// plugins/top_custom.js
// Comando para generar tops aleatorios con título personalizado.

// No necesitamos fs, path, o MessageMedia si no enviamos audio local/URL

const execute = async (client, message, args) => {
    // 1. Obtener Chat y verificar grupo
    let chat;
    try {
        chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('Este comando solo funciona en grupos.');
        }
    } catch (error) {
        console.error("[TopCustom] Error obteniendo chat:", error);
        return message.reply('❌ Error al obtener la información del chat.');
    }

    // 2. Verificar si se proporcionó texto
    const topTitleText = args.join(' ').trim();
    if (!topTitleText) {
        return message.reply('⚠️ Debes escribir un texto para el top.\nEjemplo: `!top Los más pro`');
    }

    // 3. Obtener Participantes
    console.log(`[TopCustom] Obteniendo participantes para ${chat.name}...`);
    let participants;
    try {
        participants = chat.participants;
        if (!participants || participants.length === 0) {
            await chat.fetchParticipants(); // Intentar fetch como fallback
             participants = chat.participants;
        }
        if (!participants || participants.length === 0) {
            throw new Error("Lista de participantes vacía.");
        }
        console.log(`[TopCustom] Participantes obtenidos: ${participants.length}`);
    } catch (error) {
        console.error(`[TopCustom] Error obteniendo participantes:`, error);
        return message.reply('❌ Error al obtener la lista de participantes.');
    }

    // 4. Seleccionar Participantes Aleatorios
    const participantIds = participants.map(p => p.id._serialized);
    const amountToShow = Math.min(participantIds.length, 10); // Máximo 10
    const selectedIds = participantIds.sort(() => Math.random() - 0.5).slice(0, amountToShow);

    // 5. Elegir Emoji Aleatorio
    const emojis = ['🤓', '😅', '😂', '😳', '😎', '🥵', '😱', '🤑', '🙄', '💩', '🍑', '🤨', '🥴', '🔥', '👇🏻', '😔', '👀', '🌚', '⭐', '🏆', '🥇', '💯'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // 6. Construir Mensaje de Texto con Menciones
    let topListText = '';
    selectedIds.forEach((id, index) => {
        const userNumber = id.split('@')[0];
        topListText += `*${index + 1}.* @${userNumber}\n`;
    });

    const finalText = `*${randomEmoji} Top ${amountToShow} ${topTitleText} ${randomEmoji}*\n\n${topListText}`;

    // 7. Enviar Mensaje de Texto
    console.log(`[TopCustom] Enviando top "${topTitleText}" a ${chat.id._serialized}`);
    try {
        await client.sendMessage(chat.id._serialized, finalText, {
            mentions: selectedIds // Pasar IDs completos para mención real
        });
    } catch (error) {
        console.error(`[TopCustom] Error enviando mensaje de texto:`, error);
        await message.reply(`❌ Error al enviar el top. Detalles: ${error.message}`);
    }

    // 8. (Opcional) Enviar Audio Aleatorio desde URL (Descomentar si se desea)
    /*
    const { MessageMedia } = require('whatsapp-web.js'); // Necesitarías descomentar esto arriba también
    try {
        const k = Math.floor(Math.random() * 70) + 1; // Asegurar que k sea al menos 1
        const audioUrl = `https://hansxd.nasihosting.com/sound/sound${k}.mp3`;
        console.log(`[TopCustom] Intentando enviar audio desde: ${audioUrl}`);

        // Descargar y enviar
        const media = await MessageMedia.fromUrl(audioUrl, { unsafeMime: true }); // Intentar descargar
        // Verificar si es audio antes de enviar como PTT
        if (media && media.mimetype.startsWith('audio/')) {
             await client.sendMessage(chat.id._serialized, media, { sendAudioAsVoice: true });
             console.log(`[TopCustom] Audio ${k} enviado como PTT.`);
        } else {
             console.warn(`[TopCustom] El archivo de ${audioUrl} no es un audio válido o no se pudo descargar. Mimetype: ${media?.mimetype}`);
        }
    } catch (audioError) {
        console.error(`[TopCustom] Error al obtener o enviar audio aleatorio:`, audioError);
        // No enviar mensaje de error al chat por esto, puede ser molesto
    }
    */

};

// Exportar como Comando estándar
module.exports = {
    name: 'top_personalizado',
    aliases: ['top'], // Comando
    description: 'Crea un top 10 aleatorio del grupo con el título que especifiques.',
    category: 'Diversión',
    groupOnly: true, // Solo grupos
    execute: execute
};