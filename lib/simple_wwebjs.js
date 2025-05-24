// lib/simple_wwebjs.js - v2: Asegura m.sender sea @c.us

/**
 * Enriquece el objeto de mensaje de whatsapp-web.js
 * @param {import('whatsapp-web.js').Client} client El cliente de wwebjs
 * @param {import('whatsapp-web.js').Message} m El objeto de mensaje crudo
 * @returns {Promise<import('whatsapp-web.js').Message | null>} El objeto de mensaje enriquecido o null si falla críticamente
 */
async function smsg_wwebjs(client, m) {
    if (!m) return null; // Si no hay mensaje, no hay nada que hacer

    try {
        // --- Propiedades Básicas ---
        m.isGroup = m.from.endsWith('@g.us');
        m.chat = m.from; // Alias común para el ID del chat
        m.text = m.body || ''; // Alias para el cuerpo

        // --- Determinación del Remitente Real (@c.us) ---
const senderIdRaw = m.author || m.from;
m.sender = null;
m.pushName = '';
m.senderNumber = null;

if (senderIdRaw && senderIdRaw.includes('@')) {
    console.log(`[smsg DEBUG] ID raw detectado: ${senderIdRaw}`);

    try {
        const contact = await client.getContactById(senderIdRaw);

        if (contact) {
            m.pushName = contact.pushname || contact.name || '';
            const contactId = contact.id?._serialized;
            const contactNumber = contact.number || contactId?.split('@')[0];

            m.senderNumber = contactNumber;

            if (contactId && contactId.endsWith('@c.us')) {
                m.sender = contactId;
            } else if (contactNumber) {
                m.sender = `${contactNumber}@c.us`;
                console.log(`[smsg INFO] ID @c.us construido desde número de contacto: ${m.sender}`);
            }
        } else {
            console.warn(`[smsg WARN] Contacto no resuelto. Usando fallback.`);
            if (senderIdRaw.endsWith('@c.us')) {
                m.sender = senderIdRaw;
                m.senderNumber = senderIdRaw.split('@')[0];
            }
        }
    } catch (err) {
        console.warn(`[smsg WARN] Error en getContactById(${senderIdRaw}): ${err.message}`);
        if (senderIdRaw.endsWith('@c.us')) {
            m.sender = senderIdRaw;
            m.senderNumber = senderIdRaw.split('@')[0];
        }
    }
} else {
    console.error("[smsg ERROR] No se pudo determinar senderIdRaw inicial del mensaje.");
}

if (!m.sender && senderIdRaw && senderIdRaw.endsWith('@c.us')) {
    m.sender = senderIdRaw;
    m.senderNumber = senderIdRaw.split('@')[0];
}

if (!m.sender) {
    console.error(`[smsg ERROR FATAL] No se pudo determinar un sender @c.us válido para el mensaje con ID raw ${senderIdRaw}.`);
    return null;
}



        // --- Procesamiento de Mensaje Citado (Quoted) ---
        if (m.hasQuotedMsg) {
            try {
                m.quoted = await m.getQuotedMessage();
                if (m.quoted) {
                    // Aplicar lógica similar para obtener el sender del citado
                    m.quoted.chat = m.quoted.from;
                    m.quoted.isGroup = m.quoted.from.endsWith('@g.us');
                    const quotedSenderIdRaw = m.quoted.author || m.quoted.from;
                    m.quoted.sender = quotedSenderIdRaw; // Default
                    m.quoted.text = m.quoted.body || '';
                    m.quoted.type = m.quoted.type;
                    m.quoted.pushName = '';
                    m.quoted.senderNumber = null;

                    if (quotedSenderIdRaw) {
                        try {
                            const quotedContact = await client.getContactById(quotedSenderIdRaw);
                            if (quotedContact) {
                                m.quoted.pushName = quotedContact.pushname || quotedContact.name || '';
                                m.quoted.senderNumber = quotedContact.number;
                                const quotedContactId = quotedContact.id?._serialized;
                                if (quotedContactId && quotedContactId.endsWith('@c.us')) {
                                    m.quoted.sender = quotedContactId;
                                } else if (m.quoted.senderNumber) {
                                    m.quoted.sender = `${m.quoted.senderNumber}@c.us`;
                                }
                            } else if (quotedSenderIdRaw.endsWith('@c.us')) {
                                 m.quoted.sender = quotedSenderIdRaw;
                                 m.quoted.senderNumber = quotedSenderIdRaw.split('@')[0];
                            }
                        } catch (e) { console.warn(`[smsg] Error obteniendo contacto citado ${quotedSenderIdRaw}: ${e.message}`); }
                    }
                    // ... añadir lógica para media citada si es necesario ...
                }
            } catch (quoteError) {
                 console.error("[smsg] Error obteniendo mensaje citado:", quoteError);
                 m.quoted = null;
            }
        } else {
            m.quoted = null;
        }
        // --- Fin Procesamiento Citado ---


        // --- Otras Propiedades y Funciones (Opcional) ---
        // m.reply = (text, chatId = m.chat, options) => client.sendMessage(chatId, text, options); // wwebjs ya tiene m.reply
        // ... añadir más propiedades si son necesarias ...


        return m; // Devolver el objeto mensaje enriquecido

    } catch (error) {
        console.error("[smsg_wwebjs] Error general enriqueciendo mensaje:", error);
        // Devolver null para indicar fallo y que bot.js lo ignore
        return null;
    }
}

module.exports = { smsg_wwebjs }; // Exportar