// plugins/tops_fun.js
// Comandos divertidos de Tops aleatorios en grupos con audio.

const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const execute = async (client, message, args) => {
    // 1. Obtener Chat y verificar si es grupo
    let chat;
    try {
        chat = await message.getChat();
        if (!chat.isGroup) {
            return message.reply('Este comando solo funciona en grupos.');
        }
    } catch (error) {
        console.error("[TopsFun] Error obteniendo chat:", error);
        return message.reply('❌ Error al obtener la información del chat.');
    }

    // 2. Obtener Participantes
    console.log(`[TopsFun] Obteniendo participantes para ${chat.name}...`);
    let participants;
    try {
        // Podríamos usar fetch, pero para un top aleatorio quizás no sea crucial tener la lista 100% actualizada
        participants = chat.participants;
        if (!participants || participants.length === 0) {
             // Intentar fetch como fallback
             await chat.fetchParticipants();
             participants = chat.participants;
        }
        if (!participants || participants.length === 0) {
            throw new Error("La lista de participantes sigue vacía después de intentar obtenerla.");
        }
        console.log(`[TopsFun] Participantes obtenidos: ${participants.length}`);
    } catch (error) {
        console.error(`[TopsFun] Error obteniendo participantes:`, error);
        return message.reply('❌ Error al obtener la lista de participantes del grupo.');
    }

    // 3. Seleccionar Participantes Aleatorios
    const participantIds = participants.map(p => p.id._serialized); // Obtener solo los IDs serializados
    const numberOfParticipants = Math.min(participantIds.length, 10); // Máximo 10
    // Barajar y seleccionar
    const selectedIds = participantIds.sort(() => Math.random() - 0.5).slice(0, numberOfParticipants);

    // 4. Determinar Comando, Mensaje y Audio
    const command = message.body.slice(1).split(/ +/)[0].toLowerCase(); // Obtener el comando usado (!topgays, !topotakus)
    let messageTitle = '';
    let audioFileName = '';
    let emoji = '';

    if (command === 'topgays') {
        messageTitle = '🏳️‍🌈 *Top Gays del Grupo* 🏳️‍🌈';
        audioFileName = 'gay2.mp3'; // Nombre del archivo en media/audios
        emoji = '🏳️‍🌈';
    } else if (command === 'topotakus') {
        messageTitle = '📺 *Top Otakus del Grupo* 📺';
        audioFileName = 'otaku.mp3'; // Nombre del archivo en media/audios
        emoji = '🍙';
    } else {
        // Fallback si se añade un alias pero no se maneja aquí
        console.warn(`[TopsFun] Comando no reconocido dentro del plugin: ${command}`);
        return message.reply("Comando de Top no reconocido.");
    }

    // 5. Construir Mensaje de Texto con Menciones
    let responseText = `${messageTitle}\n\n`;
    selectedIds.forEach((id, index) => {
        const userNumber = id.split('@')[0]; // Obtener solo el número para el @texto
        responseText += `${emoji} ${index + 1}. @${userNumber}\n`;
    });

    // 6. Enviar Mensaje de Texto con Menciones
    console.log(`[TopsFun] Enviando top ${command} a ${chat.id._serialized}`);
    try {
        await client.sendMessage(chat.id._serialized, responseText, {
            mentions: selectedIds // Pasar los IDs completos para la mención real
        });
    } catch (error) {
        console.error(`[TopsFun] Error enviando mensaje de texto:`, error);
        // No detener, intentar enviar audio igual
    }

    // 7. Enviar Audio (si existe)
    if (audioFileName) {
        // Construir ruta RELATIVA a la raíz del proyecto
        const audioPath = path.join(__dirname, '..', 'media', 'audios', audioFileName);
        console.log(`[TopsFun] Buscando audio en: ${audioPath}`);

        if (fs.existsSync(audioPath)) {
            try {
                console.log(`[TopsFun] Enviando audio ${audioFileName} como PTT...`);
                const media = MessageMedia.fromFilePath(audioPath);
                await client.sendMessage(chat.id._serialized, media, {
                    sendAudioAsVoice: true // Enviar como PTT (mensaje de voz)
                });
                console.log(`[TopsFun] Audio enviado.`);
            } catch (audioError) {
                console.error(`[TopsFun] Error al enviar audio ${audioFileName}:`, audioError);
                // Opcional: Notificar error de audio
                // await message.reply(`Error al enviar el audio ${audioFileName}.`);
            }
        } else {
            console.warn(`[TopsFun] Archivo de audio no encontrado: ${audioPath}`);
            // Opcional: Notificar que falta el audio
            // await message.reply(`Audio ${audioFileName} no encontrado.`);
        }
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'tops_divertidos',
    aliases: ['topgays', 'topotakus'], // Comandos que activan el plugin
    description: 'Genera un top 10 aleatorio de Gays u Otakus del grupo.',
    category: 'Diversión',
    groupOnly: true, // Marcar como comando de grupo
    execute: execute
};