// --- plugins/analisis.js ---

// --- Definición de Tipos de Análisis ---
const analysisTypes = {
    // Clave (lo que el usuario escribe) : { Datos del análisis }
    "gay": {
        name: "Gayómetro",       // Nombre para mostrar
        emoji: "🏳️‍🌈",            // Emoji representativo
        phrases: [              // Frases aleatorias específicas
            "¡Una revelación deslumbrante! ✨",
            "Los astros lo confirman. 🌟",
            "Científicamente comprobado... o casi. 🔬",
            "El resultado es... ¡interesante! 🤔",
            "¡Qué descubrimiento tan colorido!",
            "Esto podría explicar algunas cosas... 😉",
            "Tu luz es tan brillante que oscurece todo lo demás. 🌞",
            "Nivel de fabulosidad: ¡Detectado! 💅",
            "El análisis es concluyente. 📊",
            "Una puntuación... ¡memorable! 😄",
        ]
    },
    "otaku": {
        name: "Otaku Test",
        emoji: "🌸",
        phrases: [
            "¡Nivel de Ki superior a 9000! 🔥",
            "¡Dattebayo! El resultado es claro. 🍥",
            "Se necesita más investigación en el manga. 📖",
            "Diagnóstico: Necesita ver más anime. 😉",
            "¡Kawaii! El sensor otaku explotó. ✨",
            "Podría ser un personaje principal. 🤔",
            "Su Waifu/Husbando estaría orgulloso/a. 😊",
            "¡Listo para el Isekai! 🚚",
            "Detectando referencias por todas partes. 😅",
            "El poder del protagonista es fuerte en este. 💪",
        ]
    },
    "lesbiana": {
        name: "Lesbiómetro",
        emoji: "🏳️‍🌈",
        phrases: [
            "¡Conexión detectada! ✨",
            "Energía femenina poderosa. 💪",
            "El radar L detecta algo. 😉",
            "¡Vibras inconfundibles! 💖",
            "Análisis en progreso... ¡Confirmado! ✅",
            "Esto merece una canción de Tegan and Sara. 🎶",
            "Nivel de 'U-Haul' es... considerable. 😂",
            "Probablemente tenga un gato. 🐈",
            "¡El resultado es divino! ✨",
            "Se confirma la sospecha. 💜",
        ]
    },
    "simp": {
        name: "Simp Detector",
        emoji: "🥺",
        phrases: [
            "Nivel de 'haría cualquier cosa': ¡Alto! 😥",
            "La dedicación es... admirable (?). 🤔",
            "Detectando señales de alerta S.I.M.P. 🚨",
            "Podría necesitar una intervención. 😅",
            "¡Alerta de billetera vacía! 💸",
            "La lealtad roza lo... extremo. 👀",
            "¡Definitivamente está en la 'friendzone' premium! 😂",
            "Se detectó un exceso de 'buenas acciones'. 🙏",
            "El medidor de arrastrado está al máximo. 😔",
            "Confirmado: ¡Capitán de la Simp Navy! ⚓",
        ]
    },
    "toxico": {
        name: "Toxicómetro",
        emoji: "☢️",
        phrases: [
            "¡Advertencia! Niveles de toxicidad elevados. ☣️",
            "Se recomienda mantener distancia de seguridad. 🚶‍♀️➡️",
            "El ambiente se siente... ¡cargado! ⚡",
            "Bandera roja detectada. 🚩",
            "¡Peligro! Análisis preocupante. 😟",
            "Necesita un detox emocional urgente. 🧘",
            "Maestro/a del gaslighting, quizás. 🤔",
            "Probablemente culpe a los demás. 👀",
            "El drama lo/la sigue... o lo/la crea. 🎭",
            "¡Corre! 🏃‍♂️💨",
        ]
    },
    "facha": {
        name: "Fachómetro / Estilo",
        emoji: "🧐",
        phrases: [
            "¡Derrochando estilo! ✨",
            "Elegancia en estado puro. 💯",
            "Nivel de 'drip' por las nubes.💧",
            "Listo/a para la pasarela. 😎",
            "Impecable de pies a cabeza. 👌",
            "Marca tendencia sin esfuerzo. 😉",
            "El buen gusto es evidente. ✨",
            "Outfit perfectamente conjuntado. 👔",
            "¡Nacido/a para brillar! 🌟",
            "Simplemente... ¡clase! 🧐",
        ]
    },
};

// --- >> IDs ESPECIALES << ---
// Define el ID completo del usuario (incluyendo @c.us)
const SPECIAL_GAY_ID_100 = '15522129289370@lid'; // Usuario que obtiene 100%
const SPECIAL_GAY_ID_0 = '1658008416509@lid';    // Usuario que obtiene 0%
// --- >> FIN IDs ESPECIALES << ---

module.exports = {
    name: 'Analizador Universal',
    aliases: ['analisis', 'analizar', 'test'], // Alias principal y secundarios
    description: 'Realiza un análisis aleatorio de un tipo específico a la persona mencionada.\nTipos disponibles: ' + Object.keys(analysisTypes).join(', ') + '\nUso: `!analisis [tipo] @usuario`',
    category: 'Juegos',
    groupOnly: true, // Necesita grupo para mencionar

    async execute(client, message, args) {
        const senderId = message.author || message.from;
        const analysisTypeKey = args[0]?.toLowerCase(); // El tipo es el primer argumento

        // Obtener el Chat para usar chat.sendMessage
        let chat;
        try {
            chat = await message.getChat();
            if (!chat.isGroup) { // Doble verificación por si acaso groupOnly falla
                 return message.reply('Este comando solo funciona en grupos.');
            }
        } catch (e) {
            console.error("[ANALISIS] Error obteniendo el chat:", e);
            return message.reply("Hubo un error al obtener la información de este chat.");
        }

        // 1. Verificar si se especificó el tipo de análisis
        if (!analysisTypeKey) {
            const availableTypes = Object.keys(analysisTypes).join(', ');
            return message.reply(`Debes especificar el tipo de análisis. 🤔\nTipos disponibles: ${availableTypes}\nEjemplo: \`!analisis gay @usuario\``);
        }

        // 2. Validar el tipo de análisis
        const analysisData = analysisTypes[analysisTypeKey];
        if (!analysisData) {
            const availableTypes = Object.keys(analysisTypes).join(', ');
            return message.reply(`"${analysisTypeKey}" no es un tipo de análisis válido. ❌\nTipos disponibles: ${availableTypes}`);
        }

        // 3. Verificar si se mencionó a alguien
        const mentions = await message.getMentions();
        if (!mentions || mentions.length === 0) {
            return message.reply(`Debes mencionar a alguien para realizar el análisis de ${analysisData.name}. Ejemplo: \`!analisis ${analysisTypeKey} @usuario\``);
        }

        // 4. Seleccionar objetivo y validar
        const mentionedContact = mentions[0];
        if (mentionedContact.isMe) {
            return message.reply(`🤖 ¡No puedo analizarme a mí mismo para el ${analysisData.name}!`);
        }
        if (mentionedContact.id._serialized === senderId) {
            return message.reply(`🤦 ¿Intentando hacerte un auto-análisis de ${analysisData.name}? ¡Así no funciona!`);
        }
        const mentionedName = mentionedContact.pushname || mentionedContact.name || mentionedContact.id.user;

        // 5. Generar porcentaje aleatorio base y frase
        let percentage = Math.floor(Math.random() * 101);
        let randomPhrase = analysisData.phrases[Math.floor(Math.random() * analysisData.phrases.length)];

        // 6. Lógica de puntajes especiales (solo para tipo 'gay')
        if (analysisTypeKey === 'gay') {
            const mentionedId = mentionedContact.id._serialized;
            console.log(`[ANALISIS DEBUG] Verificando ID especial para 'gay': ${mentionedId}`);

            // Condición 1: Usuario para 100%
            if (mentionedId === SPECIAL_GAY_ID_100) {
                percentage = 100;
                console.log(`[ANALISIS OVERRIDE] Condición 100% CUMPLIDA para ${mentionedId}.`);
                // randomPhrase = "¡La máxima puntuación! 💯🏳️‍🌈"; // Opcional
            }
            // Condición 2: Usuario para 0% (SOLO si no se cumplió la anterior)
            else if (mentionedId === SPECIAL_GAY_ID_0) {
                percentage = 0;
                console.log(`[ANALISIS OVERRIDE] Condición 0% CUMPLIDA para ${mentionedId}.`);
                 // randomPhrase = "¡Absolutamente nada que ver! 🚫"; // Opcional
            }
             // Si no es ninguno de los especiales para 'gay'
            else {
                console.log(`[ANALISIS OVERRIDE] ID ${mentionedId} no coincide con ninguna condición especial 'gay'.`);
            }
        } else {
            // Si no es análisis 'gay', no se aplica ninguna condición especial
            console.log(`[ANALISIS DEBUG] Análisis tipo '${analysisTypeKey}', no se aplican condiciones especiales.`);
        }

        // 7. Formatear el mensaje USANDO LOS DATOS DEL TIPO
        const replyMsg = `${analysisData.emoji} *ANÁLISIS DE ${analysisData.name.toUpperCase()}* ${analysisData.emoji}\n\n` +
                       `@${mentionedContact.id.user} tiene un *${percentage}%* de ${analysisTypeKey}.\n\n` + // Usamos la clave como descripción corta
                       `💭 ${randomPhrase}`;

        // 8. Enviar la respuesta usando chat.sendMessage
        try {
            await chat.sendMessage(replyMsg, { mentions: [mentionedContact.id._serialized] });
        } catch (error) {
            console.error(`[ANALISIS ${analysisTypeKey.toUpperCase()}] Error enviando:`, error);
            // No se responde al error para evitar posibles bucles
        }
    }
};