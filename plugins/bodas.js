// --- plugins/bodas.js ---
const fs = require('fs');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js'); // Asegúrate que esté importado
const { createCanvas, loadImage, registerFont } = require('canvas'); // <--- NUEVO
const axios = require('axios'); // <--- NUEVO (o usa node-fetch si prefieres)
const MARRIAGES_FILE = path.join(__dirname, 'bodas.json');
const PROPOSAL_TIMEOUT_MS = 15 * 60 * 1000;
const activeProposals = new Map();

function loadMarriages() { /* ... (tu función loadMarriages robusta) ... */
    try {
        if (fs.existsSync(MARRIAGES_FILE)) {
            const data = fs.readFileSync(MARRIAGES_FILE, 'utf8');
            if (data) {
                const marriages = JSON.parse(data);
                return (typeof marriages === 'object' && marriages !== null) ? marriages : {};
            }
        }
    } catch (error) {
        console.error('[BODAS LOAD] Error al cargar matrimonios:', error.message);
    }
    return {};
}

function saveMarriages(marriages) { /* ... (tu función saveMarriages) ... */
    try {
        fs.writeFileSync(MARRIAGES_FILE, JSON.stringify(marriages, null, 2));
    } catch (error) {
        console.error('[BODAS SAVE] Error al guardar matrimonios:', error.message);
    }
}

function cleanupExpiredProposals(chatId) { /* ... (tu función cleanupExpiredProposals) ... */
    if (!activeProposals.has(chatId)) return;
    const chatProposals = activeProposals.get(chatId);
    const now = Date.now();
    let changed = false;
    for (const [proposedId, proposalData] of chatProposals.entries()) {
        if (now - proposalData.timestamp > PROPOSAL_TIMEOUT_MS) {
            chatProposals.delete(proposedId);
            console.log(`[BODAS CLEANUP] Propuesta expirada y eliminada en chat ${chatId} para ${proposedId}`);
            changed = true;
        }
    }
    if (changed && chatProposals.size === 0) {
        activeProposals.delete(chatId);
    }
}

// --- Helper para dibujar imagen circular ---
async function drawCircularImage(ctx, image, x, y, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
}

// --- Helper para dibujar corazón pixelado ---
function drawPixelHeart(ctx, centerX, centerY, pixelSize, color) {
    const heartShape = [
        [0, 1, 1, 0, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0]
    ];
    const heartWidth = heartShape[0].length * pixelSize;
    const heartHeight = heartShape.length * pixelSize;
    const startX = centerX - heartWidth / 2;
    const startY = centerY - heartHeight / 2;

    ctx.fillStyle = color;
    for (let r = 0; r < heartShape.length; r++) {
        for (let c = 0; c < heartShape[r].length; c++) {
            if (heartShape[r][c] === 1) {
                ctx.fillRect(startX + c * pixelSize, startY + r * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    return { width: heartWidth, height: heartHeight, top: startY, left: startX };
}


// --- Helper para cargar imagen desde URL o usar placeholder ---
async function loadProfilePicOrDefault(url, defaultSize = 150) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return await loadImage(Buffer.from(response.data));
    } catch (error) {
        console.warn(`[SHIP IMG] No se pudo cargar imagen desde ${url}: ${error.message}. Usando placeholder.`);
        // Crear un placeholder simple
        const canvas = createCanvas(defaultSize, defaultSize);
        const ctx = canvas.getContext('2d');
        // Fondo gris claro
        ctx.fillStyle = '#E0E0E0'; // Gris claro
        ctx.fillRect(0, 0, defaultSize, defaultSize);
        // Icono de persona simple (gris oscuro)
        ctx.fillStyle = '#606060'; // Gris oscuro
        const r = defaultSize / 3;
        const centerX = defaultSize / 2;
        const centerY = defaultSize / 2.2; // Un poco más arriba para el cuerpo
        // Cabeza
        ctx.beginPath();
        ctx.arc(centerX, centerY - r / 2, r / 1.5, 0, Math.PI * 2, true);
        ctx.fill();
        // Cuerpo
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + r, r, r * 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        return await loadImage(canvas.toBuffer('image/png'));
    }
}

module.exports = {
    name: 'Sistema de Parejas, Buscador y Shipeos', // Nombre actualizado
    aliases: [
        'pareja', 'proponer', 'bodas', 'aceptar', 'rechazar', 'parejas', 'divorcio', 'cancelarpropuesta',
        'buscarpareja', 'buscamepareja',
        'ship', 'shippear' // <-- NUEVOS ALIASES
    ],
    description: 'Gestiona propuestas, matrimonios y busca parejas aleatorias.\n`!pareja @u`\n`!aceptar` `!rechazar`\n`!cancelarpropuesta`\n`!parejas`\n`!divorcio`\n`!buscarpareja`\n`!buscamepareja`\n`!ship @u1 @u2`', // Descripción actualizada
    category: 'Social',
    groupOnly: true,

    async execute(client, message, args) {
        const chatId = message.from;
        const senderId = message.author || message.from;
        let senderContact;
        try { senderContact = await message.getContact(); }
        catch (e) { console.warn("[BODAS EXEC] No se pudo obtener contacto del remitente:", senderId, e.message); }
        const senderTag = senderContact?.id?.user || senderId.split('@')[0];

        const prefix = message.body.charAt(0);
        const command = message.body.split(' ')[0].substring(prefix.length).toLowerCase();

        let chat;
        try {
            chat = await message.getChat();
            if (!chat.isGroup) return message.reply("Este comando solo funciona en grupos.");
        } catch(e) {
            console.error("[BODAS EXEC] Error al obtener el chat:", e);
            return message.reply("Error al procesar la información del chat.");
        }

        let marriages = loadMarriages();
        cleanupExpiredProposals(chatId); // Limpiar propuestas para el chat actual

        // --- Comando: !pareja @usuario (Proponer) ---
        if (command === 'pareja' || command === 'proponer' || command === 'bodas') {
            const mentions = await message.getMentions();
            if (!mentions || mentions.length === 0) {
                return message.reply('Debes mencionar a alguien para proponerle. Ejemplo: `!pareja @usuario`');
            }
            const proposedContact = mentions[0];
            const proposedId = proposedContact.id._serialized;
            const proposedTag = proposedContact.id.user;

            if (proposedContact.isMe) return message.reply("💍 No puedes proponerte matrimonio a ti mismo.");
            if (proposedId === senderId) return message.reply("🤦 No puedes proponerte ser pareja contigo mismo.");

            const senderPartnerId = marriages[senderId]; // ID de la pareja actual del proponente
            const proposedUserIsAlreadyPartner = senderPartnerId === proposedId; // True si el propuesto ES la pareja actual

            if (senderPartnerId) { // El proponente ya está casado
                let currentPartnerContact;
                try { currentPartnerContact = await client.getContactById(senderPartnerId); }
                catch (e) { console.warn(`[BODAS PROP DEBUG] No se pudo obtener contacto para la pareja actual ${senderPartnerId}`); }
                const currentPartnerTag = currentPartnerContact?.id?.user || senderPartnerId.split('@')[0];

                if (proposedUserIsAlreadyPartner) {
                    // CASO: Intentando proponer a la persona con la que YA ESTÁS CASADO
                    console.log("[BODAS PROP DEBUG] Remitente intentando proponer a su pareja actual. SenderId:", senderId, "ProposedId (Partner):", proposedId);
                    const replyText = `💖 ¡Pero si @${proposedTag} ya es tu pareja! Disfruten su amor. 🥰`; // Usar proposedTag ya que es la misma persona
                    try {
                        await chat.sendMessage(replyText, { mentions: [senderId, proposedId] });
                    } catch (e) { console.error("[BODAS PROP ERR] Error enviando 'ya casado con esta persona':", e); await message.reply(replyText); }
                } else {
                    // CASO: Ya estás casado, pero intentando proponer a OTRA PERSONA
                    console.log("[BODAS PROP DEBUG] Remitente ya casado con OTRO. SenderId:", senderId, "CurrentPartnerId:", senderPartnerId, "ProposedId:", proposedId);
                    const replyText = `💔 Ya tienes una pareja: @${currentPartnerTag}. ¡Si quieres proponer a @${proposedTag}, primero el divorcio!`;
                    try {
                        await chat.sendMessage(replyText, { mentions: [senderId, senderPartnerId, proposedId] });
                    } catch (e) { console.error("[BODAS PROP ERR] Error enviando 'remitente ya casado con otro':", e); await message.reply(replyText); }
                }
                return;
            }

            const proposedUsersCurrentPartnerId = marriages[proposedId]; // Pareja actual del propuesto (si tiene)
            if (proposedUsersCurrentPartnerId) {
                console.log("[BODAS PROP DEBUG] Propuesto ya casado. ProposedId:", proposedId, "PartnerId:", proposedUsersCurrentPartnerId);
                let pContact; try { pContact = await client.getContactById(proposedUsersCurrentPartnerId); } catch(e) { console.warn(`[BODAS PROP DEBUG] No se pudo obtener contacto para el partner del propuesto ${proposedUsersCurrentPartnerId}`); }
                const pTag = pContact?.id?.user || proposedUsersCurrentPartnerId.split('@')[0];
                const replyText = `💔 @${proposedTag} ya tiene pareja y es @${pTag}.`;
                try {
                    await chat.sendMessage(replyText, { mentions: [senderId, proposedId, proposedUsersCurrentPartnerId] });
                } catch (e) { console.error("[BODAS PROP ERR] Error enviando 'propuesto ya casado':", e); await message.reply(replyText); }
                return;
            }

            // Validaciones de propuestas pendientes...
            if (activeProposals.has(chatId)) {
                const chatProposals = activeProposals.get(chatId);
                if (Array.from(chatProposals.values()).some(p => p.proposerId === senderId)) {
                    return message.reply(`Ya tienes una propuesta pendiente. Cancela con \`!cancelarpropuesta\` o espera.`);
                }
                if (chatProposals.has(proposedId)) {
                     const existingProposal = chatProposals.get(proposedId);
                     const existingProposerContact = await client.getContactById(existingProposal.proposerId);
                     const existingProposerTag = existingProposerContact?.id?.user || existingProposal.proposerId.split('@')[0];
                     return message.reply(`@${proposedTag} ya tiene una propuesta pendiente de @${existingProposerTag}.`, { mentions: [proposedId, existingProposal.proposerId] });
                }
            }

            if (!activeProposals.has(chatId)) activeProposals.set(chatId, new Map());
            activeProposals.get(chatId).set(proposedId, { proposerId: senderId, timestamp: Date.now() });
            console.log(`[BODAS PROP] Nueva propuesta en ${chatId}: ${senderTag} -> ${proposedTag}`);

            const proposalPhrases = [ /* ... Tus frases aleatorias aquí ... */
                 "¡Oh là là! Parece que @"+senderTag+" quiere formalizar las cosas con @"+proposedTag+"... 👀",
            ];
            const randomPhrase = proposalPhrases[Math.floor(Math.random() * proposalPhrases.length)];

            const proposalMsg = `💘 *¡Propuesta de Pareja!* 💘\n\n` +
                              `${randomPhrase}\n\n` +
                              `@${proposedTag}, tienes 15 minutos para responder en este chat:\n` +
                              `✅ Escribe \`!aceptar\`\n` +
                              `❌ Escribe \`!rechazar\``;
            try {
                await chat.sendMessage(proposalMsg, { mentions: [senderId, proposedId] });
            } catch (error) { console.error("[BODAS PROP ERR] Error al enviar mensaje de propuesta:", error); }
            return;
        }

        // --- Comando: !aceptar ---
        // (Tu código para !aceptar, sin cambios relevantes para esta modificación)
        if (command === 'aceptar') {
            if (!activeProposals.has(chatId) || !activeProposals.get(chatId).has(senderId)) {
                return message.reply(`🤔 No tienes propuestas pendientes para aceptar.`);
            }
            const proposal = activeProposals.get(chatId).get(senderId);
            const proposerId = proposal.proposerId;
            let proposerContact; try {proposerContact = await client.getContactById(proposerId);} catch(e) {}
            const proposerTag = proposerContact?.id?.user || proposerId.split('@')[0];

            marriages = loadMarriages(); 
            if (marriages[senderId]) return message.reply(`💍 Ya tienes pareja.`);
            if (marriages[proposerId]) return message.reply(`💔 @${proposerTag} ya está en una relación.`, { mentions: [proposerId] });

            marriages[senderId] = proposerId; marriages[proposerId] = senderId; saveMarriages(marriages);
            activeProposals.get(chatId).delete(senderId); if (activeProposals.get(chatId).size === 0) activeProposals.delete(chatId);

            const acceptMsg = `🎉 *¡Felicidades!* 🎉\n\n¡@${senderTag} aceptó a @${proposerTag}!\n¡Ahora son pareja! 🥳💖`;
            try { await chat.sendMessage(acceptMsg, { mentions: [senderId, proposerId] }); }
            catch (error) { console.error("[BODAS ACCEPT ERR]", error); await message.reply(acceptMsg); }
            return;
        }


        // --- Comando: !rechazar ---
        // (Tu código para !rechazar, sin cambios relevantes)
         if (command === 'rechazar') {
             if (!activeProposals.has(chatId) || !activeProposals.get(chatId).has(senderId)) return message.reply(`🤔 No tienes propuestas que rechazar.`);
             const proposal = activeProposals.get(chatId).get(senderId); const proposerId = proposal.proposerId;
             let proposerContact; try {proposerContact = await client.getContactById(proposerId);} catch(e) {}
             const proposerTag = proposerContact?.id?.user || proposerId.split('@')[0];
             activeProposals.get(chatId).delete(senderId); if (activeProposals.get(chatId).size === 0) activeProposals.delete(chatId);
             const rejectMsg = `😥 Oh... @${senderTag} rechazó la propuesta de @${proposerTag}.`;
             try { await chat.sendMessage(rejectMsg, { mentions: [senderId, proposerId] }); }
             catch (error) { console.error("[BODAS REJECT ERR]", error); await message.reply(rejectMsg); }
             return;
        }

        // --- Comando: !cancelarpropuesta ---
        // (Tu código para !cancelarpropuesta, sin cambios relevantes)
        if (command === 'cancelarpropuesta') {
            let proposalCancelled = false;
            if (activeProposals.has(chatId)) {
                const chatProposals = activeProposals.get(chatId);
                for(const [pId, prop] of chatProposals.entries()) {
                    if (prop.proposerId === senderId) { 
                        let proposedContact; try { proposedContact = await client.getContactById(pId); } catch (e) {}
                        const proposedTag = proposedContact?.id?.user || pId.split('@')[0];
                        chatProposals.delete(pId); if (chatProposals.size === 0) activeProposals.delete(chatId);
                        proposalCancelled = true;
                        const cancelMsg = `❌ @${senderTag} ha cancelado su propuesta a @${proposedTag}.`;
                        try { await chat.sendMessage(cancelMsg, { mentions: [senderId, pId]}); } 
                        catch (error) { console.error("[BODAS CANCEL ERR]", error); await message.reply(cancelMsg); }
                        break;
                    }
                }
            }
            if (!proposalCancelled) await message.reply(`🤷 No tienes propuestas activas para cancelar.`);
            return;
        }

        // --- Comando: !parejas ---
        // (Tu código para !parejas, sin cambios relevantes)
        if (command === 'parejas') {
            marriages = loadMarriages();
            const marriageKeys = Object.keys(marriages);
            if (marriageKeys.length === 0) return message.reply("💔 Aún no hay parejas formadas.");

            let replyMsg = "📜 *Lista de Parejas* 📜\n\n";
            const processed = new Set();
            let coupleCount = 0;
            const mentionObjects = []; 

            for (const p1_id of marriageKeys) {
                if (processed.has(p1_id)) continue;
                const p2_id = marriages[p1_id];
                if (!p2_id || marriages[p2_id] !== p1_id) { 
                    console.warn(`[BODAS LISTA] Inconsistencia para ${p1_id}, pareja ${p2_id} no corresponde. Limpiando.`);
                    delete marriages[p1_id];
                    if(p2_id) delete marriages[p2_id]; 
                    continue;
                }
                processed.add(p1_id); processed.add(p2_id);
                let p1_tag = p1_id.split('@')[0]; let p2_tag = p2_id.split('@')[0];
                try { const p1_contact = await client.getContactById(p1_id); if(p1_contact?.id?.user) p1_tag = p1_contact.id.user; } catch(e){}
                try { const p2_contact = await client.getContactById(p2_id); if(p2_contact?.id?.user) p2_tag = p2_contact.id.user; } catch(e){}
                replyMsg += `❤️ @${p1_tag} y @${p2_tag}\n`;
                mentionObjects.push(p1_id); mentionObjects.push(p2_id);
                coupleCount++;
            }
            if (Object.keys(marriages).length !== marriageKeys.length) { 
                saveMarriages(marriages);
            }
            if (coupleCount === 0) replyMsg = "💔 No hay parejas formadas actualmente.";
            try {
                await chat.sendMessage(replyMsg, { mentions: mentionObjects });
            } catch (error) { /* ... tu fallback para !parejas ... */ }
            return;
        }

        // --- Comando: !divorcio ---
        // (Tu código para !divorcio, sin cambios relevantes)
        if (command === 'divorcio') {
            marriages = loadMarriages();
            const partnerId = marriages[senderId];
            if (!partnerId) return message.reply("🤷 No tienes pareja actualmente.");
            let partnerContact; try { partnerContact = await client.getContactById(partnerId); } catch(e) {}
            const partnerTag = partnerContact?.id?.user || partnerId.split('@')[0];
            delete marriages[senderId]; delete marriages[partnerId]; saveMarriages(marriages);
            const divorceMsg = `💔 *¡Relación Terminada!* 💔\n\n@${senderTag} y @${partnerTag} ya no son pareja.`;
            try { await chat.sendMessage(divorceMsg, { mentions: [senderId, partnerId] }); }
            catch (error) { console.error("[BODAS DIVORCIO ERR]", error); await message.reply(divorceMsg); }
            return;
        }
        
     // --- NUEVO Comando: !buscarpareja ---
     if (command === 'buscarpareja') {
        const participants = chat.participants;
        if (!participants || participants.length < 2) {
            return message.reply("Cupido necesita al menos 2 personas en el grupo para trabajar su magia. 🏹");
        }

        // Filtrar para excluir al bot (si es necesario, aunque generalmente no está en la lista de participantes de esta forma)
        // y obtener solo los IDs de usuario para seleccionar.
        // Convertimos los participantInfo a Contactos para obtener sus IDs serializados y tags.
        let eligibleParticipants = [];
        for (const pInfo of participants) {
            try {
                const contact = await client.getContactById(pInfo.id._serialized);
                if (!contact.isMe) { // Excluir al bot
                    eligibleParticipants.push(contact);
                }
            } catch (e) {
                console.warn(`[BUSCARPAREJA] No se pudo obtener contacto para ${pInfo.id._serialized}`);
            }
        }
        
        if (eligibleParticipants.length < 2) {
            return message.reply("No hay suficientes personas elegibles en el grupo para formar una pareja. 😕");
        }

        // Seleccionar dos personas diferentes aleatoriamente
        let index1 = Math.floor(Math.random() * eligibleParticipants.length);
        let person1 = eligibleParticipants[index1];

        let index2;
        do {
            index2 = Math.floor(Math.random() * eligibleParticipants.length);
        } while (index1 === index2); // Asegurarse de que no sean la misma persona
        let person2 = eligibleParticipants[index2];

        const person1Tag = person1.id.user;
        const person2Tag = person2.id.user;

        const phrases = [
            `💘 ¡Cupido ha hablado! @${person1Tag} y @${person2Tag}, ¿qué tal si lo intentan? 😉`,
            `✨ Las estrellas se alinean para @${person1Tag} y @${person2Tag}. ¡Podría ser el inicio de algo! ✨`,
            `🔮 Mi bola de cristal dice que @${person1Tag} y @${person2Tag} harían una linda pareja. ¿Opiniones? 🔮`,
            `💌 Mensaje del destino: @${person1Tag} + @${person2Tag} = ❤️?`,
            `🤔 Mmmm... Veo potencial entre @${person1Tag} y @${person2Tag}. ¡Digo, nomás! 🤔`
        ];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

        try {
            await chat.sendMessage(randomPhrase, { mentions: [person1.id._serialized, person2.id._serialized] });
        } catch (error) {
            console.error("[BUSCARPAREJA] Error al enviar mensaje:", error);
            // Fallback sin menciones
            await message.reply(`Cupido sugiere a ${person1.pushname || person1Tag} y ${person2.pushname || person2Tag}.`);
        }
        return;
    }

    // --- Comando: !buscamepareja (CON LA NUEVA VERIFICACIÓN) ---
    if (command === 'buscamepareja') {
        // Verificar si el remitente ya tiene pareja
        const currentPartnerId = marriages[senderId];
        if (currentPartnerId) {
            let currentPartnerContact;
            try { currentPartnerContact = await client.getContactById(currentPartnerId); }
            catch (e) { console.warn(`[BUSCAMEPAREJA] No se pudo obtener contacto de la pareja actual ${currentPartnerId}`); }
            const currentPartnerTag = currentPartnerContact?.id?.user || currentPartnerId.split('@')[0];

            const replyText = `💔 @${senderTag}, ¡pero si ya tienes pareja con @${currentPartnerTag}! Si quieres buscar de nuevo, primero deberías usar \`!divorcio\`. 😉`;
            try {
                await chat.sendMessage(replyText, { mentions: [senderId, currentPartnerId] });
            } catch (error) {
                console.error("[BUSCAMEPAREJA] Error enviando mensaje 'ya casado':", error);
                await message.reply(`@${senderTag}, ya tienes pareja con ${currentPartnerContact?.pushname || currentPartnerTag}. Primero divórciate.`);
            }
            return; // Importante: Salir si ya tiene pareja
        }

        // Si no tiene pareja, continuar con la lógica de buscarle una
        const participants = chat.participants;
        if (!participants || participants.length < 2) {
            return message.reply("Cupido necesita más opciones en el grupo para encontrarte pareja. 🏹");
        }

        let eligibleTargets = [];
        for (const pInfo of participants) {
            try {
                const contact = await client.getContactById(pInfo.id._serialized);
                if (!contact.isMe && contact.id._serialized !== senderId) {
                    eligibleTargets.push(contact);
                }
            } catch (e) {
                 console.warn(`[BUSCAMEPAREJA] No se pudo obtener contacto para ${pInfo.id._serialized}`);
            }
        }
        
        if (eligibleTargets.length < 1) {
            return message.reply("😥 Parece que no hay nadie más disponible en el grupo para ti en este momento...");
        }

        const targetIndex = Math.floor(Math.random() * eligibleTargets.length);
        const targetPerson = eligibleTargets[targetIndex];
        const targetPersonTag = targetPerson.id.user;

        const phrases = [
            `💘 ¡Atención @${senderTag}! Cupido cree que @${targetPersonTag} podría ser tu media naranja. 🍊`,
            `✨ @${senderTag}, las estrellas dicen que deberías conocer mejor a @${targetPersonTag}. ✨`,
            `🔮 Para ti, @${senderTag}, mi bola de cristal sugiere una conexión con @${targetPersonTag}. ¡Inténtalo! 🔮`,
            `💌 @${senderTag}, el destino te ha elegido a @${targetPersonTag}. ¿Aceptas el desafío? 😉`,
            `🤔 @${senderTag}, he estado pensando... ¿qué tal @${targetPersonTag}? ¡Podría funcionar! 🤔`
        ];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];

        try {
            await chat.sendMessage(randomPhrase, { mentions: [senderId, targetPerson.id._serialized] });
        } catch (error) {
            console.error("[BUSCAMEPAREJA] Error al enviar mensaje de sugerencia:", error);
            await message.reply(`Ok ${senderContact?.pushname || senderTag}, Cupido te sugiere a ${targetPerson.pushname || targetPersonTag}.`);
        }
        return;
    }

// --- Comando: !ship @usuario1 @usuario2 ---
if (command === 'ship' || command === 'shippear') {
    const mentions = await message.getMentions();
    if (!mentions || mentions.length < 2) {
        return message.reply("🚢 Para shippear necesitas mencionar a DOS personas. Ejemplo: `!ship @persona1 @persona2`");
    }

    const person1Contact = mentions[0];
    const person2Contact = mentions[1];
    const person1Id = person1Contact.id._serialized;
    const person2Id = person2Contact.id._serialized;

    if (person1Id === person2Id) return message.reply(`🤔 @${senderTag}, shippear a @${person1Contact.id.user} consigo mismo/a es... original.`, { mentions: [senderId, person1Id] });
    if (person1Contact.isMe || person2Contact.isMe) return message.reply(`Aww, gracias @${senderTag}, pero soy el motor de los ships, no el pasajero. 💘`, { mentions: [senderId] });

    // --- Generación de Imagen ---
    const CANVAS_WIDTH = 700;
    const CANVAS_HEIGHT = 350;
    const PFP_RADIUS = 75; // Radio para las fotos de perfil
    const PFP_Y_POS = CANVAS_HEIGHT / 2;
    const PFP1_X_POS = CANVAS_WIDTH * 0.22;
    const PFP2_X_POS = CANVAS_WIDTH * 0.78;
    const HEART_PIXEL_SIZE = 15;
    const HEART_COLOR = '#FF4136'; // Rojo
    const TEXT_COLOR = '#FFFFFF'; // Blanco para el porcentaje

    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. Dibujar Fondo (Gradiente Rojo/Morado Oscuro)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#4A001F'); // Rojo oscuro/vino
    gradient.addColorStop(1, '#2A003D'); // Morado oscuro/azul
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Cargar y dibujar fotos de perfil
    let pfp1Url, pfp2Url;
    try { pfp1Url = await person1Contact.getProfilePicUrl(); } catch (e) { console.warn("No pfp URL for person 1"); }
    try { pfp2Url = await person2Contact.getProfilePicUrl(); } catch (e) { console.warn("No pfp URL for person 2"); }

    const img1 = await loadProfilePicOrDefault(pfp1Url, PFP_RADIUS * 2);
    const img2 = await loadProfilePicOrDefault(pfp2Url, PFP_RADIUS * 2);

    await drawCircularImage(ctx, img1, PFP1_X_POS, PFP_Y_POS, PFP_RADIUS);
    await drawCircularImage(ctx, img2, PFP2_X_POS, PFP_Y_POS, PFP_RADIUS);

    // 3. Dibujar Corazón Pixelado en el centro
    const heartData = drawPixelHeart(ctx, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, HEART_PIXEL_SIZE, HEART_COLOR);

    // 4. Calcular y dibujar porcentaje
    const compatibility = Math.floor(Math.random() * 71) + 30; // 30% a 100%
    const percentageText = `${compatibility}%`;

    // Intentar registrar una fuente (opcional, pero mejora la apariencia)
    // Necesitarías tener un archivo de fuente .ttf en tu proyecto
    // try {
    //     registerFont(path.join(__dirname, 'fonts', 'PixelEmulator.ttf'), { family: 'Pixel' });
    //     ctx.font = `bold ${HEART_PIXEL_SIZE * 2.5}px Pixel`;
    // } catch (fontError) {
    //     console.warn("Fuente Pixel no encontrada, usando default.");
    //     ctx.font = `bold ${HEART_PIXEL_SIZE * 2.8}px Sans-Serif`;
    // }
    ctx.font = `bold ${HEART_PIXEL_SIZE * 2.8}px Sans-Serif`; // Ajusta el tamaño según sea necesario
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(percentageText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2); // Centrado en el canvas (y corazón)


    // 5. Mensaje de texto para el caption y fallback
    const person1Tag = person1Contact.id.user;
    const person2Tag = person2Contact.id.user;
    let shipTextMessage;
     if (marriages[person1Id] === person2Id && marriages[person2Id] === person1Id) {
         shipTextMessage = `¡@${senderTag} ha detectado a la pareja estrella @${person1Tag} y @${person2Tag}! ✨ ¡Ya son un ${compatibility}% de amor puro!`;
     } else {
         shipTextMessage = `🚢 ¡Ship a la vista! @${senderTag} cree que @${person1Tag} y @${person2Tag} tienen un ${compatibility}% de compatibilidad. ¿Qué opinan?`;
     }

    // 6. Convertir canvas a MessageMedia y enviar
    try {
        const imageBuffer = canvas.toBuffer('image/png');
        const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'ship.png');
        await client.sendMessage(chatId, media, {
            caption: shipTextMessage,
            mentions: [senderId, person1Id, person2Id]
        });
    } catch (imgError) {
        console.error("[SHIP IMG ERR] Error generando o enviando imagen:", imgError);
        // Fallback a solo texto si la generación/envío de imagen falla
        await chat.sendMessage(shipTextMessage, { mentions: [senderId, person1Id, person2Id] });
    }
    return;
}
}
};