// plugins/actions.js
const { MessageMedia } = require('whatsapp-web.js');
// NO necesitamos 'path' ni 'fs' si solo usamos URLs

const actionDetails = {
    kiss: {
        textWithMention: (actor, target) => `${actor} le dio un beso a ${target} 😘`,
        textSelf: (actor) => `${actor} se mandó un beso al aire 😘`,
        textNoMention: (actor) => `${actor} está repartiendo besos al azar 😘`,
        mp4Urls: [ // <--- CAMBIO: Ahora es un array
            "https://media.tenor.com/R-oYdfpAGpUAAAPo/pin-back.mp4",
            "https://media.tenor.com/cQzRWAWrN6kAAAPo/ichigo-hiro.mp4", // <-- AÑADE MÁS URLS AQUÍ
            "https://media.tenor.com/xDCr6DNYcZEAAAPo/sealyx-frieren-beyond-journey%27s-end.mp4",
            "https://media.tenor.com/YhGc7aQAI4oAAAPo/megumi-kato-kiss.mp4",
            "https://media.tenor.com/ZDqsYLDQzIUAAAPo/shirayuki-zen-kiss-anime.mp4",
            "https://media.tenor.com/OByUsNZJyWcAAAPo/emre-ada.mp4"
        ]
    },
    slap: {
        textWithMention: (actor, target) => `${actor} le dio una cachetada a ${target} 😠`,
        textSelf: (actor) => `${actor} se dio una cachetada a sí mismo/a... ¿por qué? 🤔`,
        textNoMention: (actor) => `${actor} está buscando a quién cachetear 😠`,
        mp4Urls: [
            "https://media.tenor.com/wOCOTBGZJyEAAAPo/chikku-neesan-girl-hit-wall.mp4",
            "https://media.tenor.com/Ws6Dm1ZW_vMAAAPo/girl-slap.mp4",
            "https://media.tenor.com/XiYuU9h44-AAAAPo/anime-slap-mad.mp4",
            "https://media.tenor.com/Sv8LQZAoQmgAAAPo/chainsaw-man-csm.mp4",
            "https://media.tenor.com/68_5cN3wpJcAAAPo/slap-anime-girl.mp4",
            "https://media.tenor.com/WYmal-WAnksAAAPo/yuzuki-mizusaka-nonoka-komiya.mp4"
        ]
    },
    spank: {
        textWithMention: (actor, target) => `${actor} le dio una nalgada a ${target} 😏`,
        textSelf: (actor) => `${actor} intentó darse una nalgada... ¡qué flexibilidad! 😂`,
        textNoMention: (actor) => `${actor} anda con ganas de dar nalgadas 😏`,
        mp4Urls: [
        "https://media.tenor.com/Sp7yE5UzqFMAAAPo/spank-slap.mp4",
        "https://media.tenor.com/iz6t2EwKeYMAAAPo/rikka-takanashi-chunibyo.mp4",
        "https://media.tenor.com/sdSmiixaAj0AAAPo/anime-anime-girl.mp4",
        "https://media.tenor.com/Tj6GzyCetQwAAAPo/spank-rank.mp4",
        "https://media.tenor.com/uER90n0laEEAAAPo/anime-spanking.mp4",
        "https://media.tenor.com/CAesvxP0KyEAAAPo/shinobu-kocho-giyuu-tomioka.mp4"
        ] 
    },
    hug: {
        textWithMention: (actor, target) => `${actor} abrazó tiernamente a ${target} 🤗`,
        textSelf: (actor) => `${actor} se dio un auto-abrazo. ¡Quiérete mucho! 🤗`,
        textNoMention: (actor) => `${actor} está regalando abrazos 🤗`,
        mp4Urls: [
            "https://media.tenor.com/Sp7yE5UzqFMAAAPo/spank-slap.mp4",
            "https://media.tenor.com/2HxamDEy7XAAAAPo/yukon-child-form-embracing-ulquiorra.mp4",
            "https://media.tenor.com/7f9CqFtd4SsAAAPo/hug.mp4",
            "https://media.tenor.com/IpGw3LOZi2wAAAPo/hugtrip.mp4",
            "https://media.tenor.com/HBTbcCNvLRIAAAPo/syno-i-love-you-syno.mp4",
            "https://media.tenor.com/nsqfGxcuD2cAAAPo/hug-comfortable.mp4"
        ]
    },
    pat: {
        textWithMention: (actor, target) => `${actor} le dio unas palmaditas en la cabeza a ${target} 😊`,
        textSelf: (actor) => `${actor} se dio palmaditas en la cabeza. ¡Buen chico/a! 😊`,
        textNoMention: (actor) => `${actor} está dando palmaditas al aire 😊`,
        mp4Urls: [
            "https://media.tenor.com/kIh2QZ7MhBMAAAPo/tsumiki-anime.mp4",
            "https://media.tenor.com/wLqFGYigJuIAAAPo/mai-sakurajima.mp4",
            "https://media.tenor.com/E6fMkQRZBdIAAAPo/kanna-kamui-pat.mp4",
            "https://media.tenor.com/fro6pl7src0AAAPo/hugtrip.mp4",
            "https://media.tenor.com/N41zKEDABuUAAAPo/anime-head-pat-anime-pat.mp4",
            "https://media.tenor.com/7xrOS-GaGAIAAAPo/anime-pat-anime.mp4"
        ]
    }
    // ... Añade más acciones y sus arrays de mp4Urls ...
    // Si una acción no tiene MP4s, puedes poner un array vacío: mp4Urls: []
    // o simplemente omitir la propiedad mp4Urls para esa acción.
};

module.exports = {
    name: 'Acciones Interactivas (URLs MP4 Aleatorias + Respuesta)',
    aliases: Object.keys(actionDetails),
    description: 'Realiza acciones interactivas con MP4s aleatorios, mencionando o respondiendo.',
    category: 'Diversión',
    groupOnly: false,

    async execute(client, message, args) {
        const usedPrefix = message.body.charAt(0);
        const commandUsed = message.body.split(' ')[0].slice(usedPrefix.length).toLowerCase();
        const action = actionDetails[commandUsed];

        if (!action) {
            console.warn(`[Acciones Plugin] Comando '${commandUsed}' no encontrado.`);
            return message.reply("Acción no reconocida o mal configurada.");
        }

        const senderContact = await message.getContact();
        let responseText = "";
        let targetContact = null; // Variable para el contacto objetivo
        let mentionIdsForReply = [];

        // --- LÓGICA PARA DETERMINAR EL OBJETIVO ---
        const mentionsFromMessage = await message.getMentions();

        if (mentionsFromMessage && mentionsFromMessage.length > 0) {
            // Prioridad 1: Mención explícita
            targetContact = mentionsFromMessage[0];
            console.log(`[Acciones Plugin] Objetivo por mención: ${targetContact.pushname || targetContact.id.user}`);
        } else if (message.hasQuotedMsg) {
            // Prioridad 2: Mensaje respondido
            const quotedMsg = await message.getQuotedMessage();
            // El autor del mensaje citado puede ser el bot mismo si respondió a un mensaje del bot.
            // O puede ser un ID de participante si el mensaje fue enviado por otro en un grupo.
            // Necesitamos obtener el Contacto del autor del mensaje citado.
            if (quotedMsg.fromMe && quotedMsg.hasReact) { // Si es un mensaje del bot con reacción (puede ser un truco)
                 // Esta parte es especulativa y puede no ser siempre fiable para obtener el "target"
                 // Si el bot reaccionó a su propio mensaje que era una respuesta a alguien.
                 // Podríamos necesitar una lógica más compleja o simplemente tomar al autor del mensaje que se está citando.
            }
            // La forma más directa es obtener el contacto del autor del mensaje citado
            targetContact = await quotedMsg.getContact();
            if (targetContact) {
                console.log(`[Acciones Plugin] Objetivo por respuesta a: ${targetContact.pushname || targetContact.id.user}`);
            } else {
                 console.log(`[Acciones Plugin] No se pudo obtener el contacto del mensaje citado.`);
            }
        }
        // --- FIN LÓGICA PARA DETERMINAR EL OBJETIVO ---

        if (targetContact) {
            if (targetContact.id._serialized === senderContact.id._serialized) {
                // Acción a uno mismo (mencionándose o respondiéndose a sí mismo)
                responseText = action.textSelf(`@${senderContact.id.user}`);
                mentionIdsForReply.push(senderContact.id._serialized);
            } else {
                // Acción a otro usuario
                responseText = action.textWithMention(`@${senderContact.id.user}`, `@${targetContact.id.user}`);
                mentionIdsForReply.push(senderContact.id._serialized);
                mentionIdsForReply.push(targetContact.id._serialized);
            }
        } else {
            // No hay objetivo claro (ni mención, ni respuesta válida) -> acción general
            responseText = action.textNoMention(`@${senderContact.id.user}`);
            mentionIdsForReply.push(senderContact.id._serialized);
        }

        const baseReplyOptions = {
            mentions: mentionIdsForReply
        };

        // Lógica para MP4 desde URL aleatoria
        if (action.mp4Urls && action.mp4Urls.length > 0) {
            const randomIndex = Math.floor(Math.random() * action.mp4Urls.length);
            const randomMp4Url = action.mp4Urls[randomIndex];

            try {
                console.log(`[Acciones Plugin] Intentando enviar MP4 aleatorio: ${randomMp4Url}`);
                const media = await MessageMedia.fromUrl(randomMp4Url, { unsafeMime: true });
                const sendMediaOptions = { ...baseReplyOptions, caption: responseText, sendVideoAsGif: true };
                await client.sendMessage(message.from, media, sendMediaOptions);
                return;
            } catch (error) {
                console.error(`Error al descargar o enviar MP4 desde URL ${randomMp4Url} para ${commandUsed}:`, error);
            }
        } else {
            console.log(`[Acciones Plugin] No se encontraron URLs de MP4 para la acción '${commandUsed}'. Enviando solo texto.`);
        }

        // Fallback a solo texto
        const textOnlyReplyOptions = { ...baseReplyOptions, quotedMessageId: message.id._serialized };
        await client.sendMessage(message.from, responseText, textOnlyReplyOptions);
    }
};