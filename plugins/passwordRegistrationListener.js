// plugins/passwordRegistrationListener.js
const { 
    getUserData, 
    saveUserData, 
    hashPassword, 
    // clearUserRegistrationState, // Ya no lo usaremos directamente aquí de esta forma
    findUserByPhoneNumberAndState // Nueva función importada
} = require('./shared-economy');

module.exports = {
    name: 'Password Registration Listener',
    async checkMessage(client, message) {
        const chat = await message.getChat();
        if (chat.isGroup || message.fromMe) {
            return false;
        }

        const dmSenderContact = await message.getContact();
        if (!dmSenderContact) { /* ... error ... */ return false; }
        
        const dmUserId = dmSenderContact.id._serialized; // ej: "51959442730@c.us" (ID del chat DM)
        const dmUserPushname = dmSenderContact.pushname || dmSenderContact.name; // Pushname del remitente del DM

        console.log(`[PassListener DEBUG] Mensaje DM recibido de: ${dmUserId} (${dmUserPushname})`);

        // Extraer la parte numérica del ID del DM, que debería ser el número de teléfono
        const phoneNumberFromDmId = dmUserId.split('@')[0]; 
        if (!phoneNumberFromDmId) {
            console.warn(`[PassListener] No se pudo extraer el número de teléfono del ID de DM: ${dmUserId}`);
            return false;
        }

        // Buscar el usuario original que está esperando la contraseña con este número de teléfono
        const originalUserEntry = await findUserByPhoneNumberAndState(phoneNumberFromDmId, 'esperando_contraseña_dm');

        if (originalUserEntry) {
            const originalUserId = originalUserEntry.userId; // ej: "1658008416509@lid"
            console.log(`[PassListener] Usuario original encontrado (${originalUserId}) esperando contraseña para el número ${phoneNumberFromDmId}. Estado actual: ${originalUserEntry.registration_state}`);
            
            const newPassword = message.body.trim();

            if (!newPassword || newPassword.length < 4) {
                await message.reply("⚠️ Tu contraseña es muy corta. Debe tener al menos 4 caracteres. Por favor, envía una contraseña válida.");
                return true;
            }

            const hashedPassword = await hashPassword(newPassword);
            if (!hashedPassword) {
                await message.reply("❌ Hubo un error procesando tu contraseña. Inténtalo de nuevo más tarde.");
                return true;
            }

            // Actualizar la entrada ORIGINAL del usuario
            originalUserEntry.password = hashedPassword;
            originalUserEntry.registration_state = null; // Limpiar estado
            // Opcional: Actualizar el pushname del registro original con el del DM, por si es más reciente
            if (dmUserPushname && originalUserEntry.pushname !== dmUserPushname) {
                console.log(`[PassListener] Actualizando pushname de ${originalUserId} a '${dmUserPushname}' desde el DM.`);
                originalUserEntry.pushname = dmUserPushname;
            }
            // Si el phoneNumber del registro original era null o diferente, también podríamos actualizarlo aquí
            // con phoneNumberFromDmId, aunque ya debería coincidir si el flujo fue correcto.
            if (originalUserEntry.phoneNumber !== phoneNumberFromDmId) {
                console.warn(`[PassListener] Discrepancia de phoneNumber para ${originalUserId}. Guardado: ${originalUserEntry.phoneNumber}, De DM: ${phoneNumberFromDmId}. Actualizando a ${phoneNumberFromDmId}.`);
                originalUserEntry.phoneNumber = phoneNumberFromDmId;
            }

            try {
                await saveUserData(originalUserId, originalUserEntry); // Guardar en la entrada del ID original
                await message.reply("✅ ¡Tu contraseña ha sido establecida con éxito! Ahora puedes usar los comandos de economía en los grupos.");
                console.log(`[PassListener] Contraseña establecida y estado limpiado para el usuario original ${originalUserId} (${originalUserEntry.pushname}).`);
            } catch (saveError) {
                console.error(`[PassListener] Error guardando contraseña/estado para ${originalUserId}:`, saveError);
                await message.reply("❌ Hubo un error guardando tu contraseña. Por favor, intenta usar un comando de economía en el grupo para reiniciar el proceso si es necesario.");
            }
            return true; // Mensaje procesado
        } else {
            console.log(`[PassListener DEBUG] DM de ${dmUserId} (${dmUserPushname}) recibido, pero no se encontró ningún usuario en estado 'esperando_contraseña_dm' con el phoneNumber ${phoneNumberFromDmId}.`);
            // Podrías enviar un mensaje como "No estoy esperando una contraseña tuya en este momento."
            // pero es mejor ser silencioso si el usuario no está en el flujo correcto.
        }
        return false;
    }
};