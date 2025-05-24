// --- plugins/group_admin_watcher.js ---

const color = { // Copiamos los colores para usarlos aquí también
    reset: "\x1b[0m", bold: "\x1b[1m", red: "\x1b[31m", green: "\x1b[32m",
    yellow: "\x1b[33m", blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m",
    white: "\x1b[37m", brightRed: "\x1b[91m", brightGreen: "\x1b[92m",
    brightYellow: "\x1b[93m", brightBlue: "\x1b[94m",
};

const name = 'Group Admin Watcher';
const description = 'Notifica cambios en los administradores del grupo.';

// --- Funciones exportadas que serán llamadas desde bot.js ---

/**
 * Maneja el evento de promoción de administrador.
 * @param {Client} client El cliente de WhatsApp.
 * @param {object} notification La notificación del evento group_update.
 */
async function handleGroupPromotion(client, notification) {
    console.log(color.cyan + `[ADMIN WATCHER] Detectado evento 'promote' en ${notification.chatId}` + color.reset);
    try {
        const chat = await client.getChatById(notification.chatId);
        if (!chat || !chat.isGroup) return; // Asegurarse de que es un grupo

        const authorId = notification.author;
        const recipientIds = notification.recipientIds;

        const authorContact = await client.getContactById(authorId);
        const authorName = authorContact.pushname || authorContact.name || authorContact.number || authorId.split('@')[0];

        let mentions = [authorContact]; // Mencionar al admin que hizo la acción
        let recipientNames = [];

        for (const recipientId of recipientIds) {
            const recipientContact = await client.getContactById(recipientId);
            const recipientName = recipientContact.pushname || recipientContact.name || recipientContact.number || recipientId.split('@')[0];
            recipientNames.push(`@${recipientContact.id.user}`); // Formato para mención
            mentions.push(recipientContact);
        }

        const messageText = `🎉 *¡Cambio de Roles!* 🎉\n\nEl administrador *${authorName}* (@${authorContact.id.user}) ha promovido a:\n- ${recipientNames.join('\n- ')}\n\n¡Felicidades por el nuevo rol! ✨`;

        console.log(color.green + `[ADMIN WATCHER] Enviando notificación de promoción a ${chat.name}` + color.reset);
        await client.sendMessage(notification.chatId, messageText, { mentions });

    } catch (error) {
        console.error(color.red + `[ERROR ADMIN WATCHER - Promote] Falló al procesar notificación en ${notification.chatId}:` + color.reset, error);
    }
}

/**
 * Maneja el evento de degradación de administrador.
 * @param {Client} client El cliente de WhatsApp.
 * @param {object} notification La notificación del evento group_update.
 */
async function handleGroupDemotion(client, notification) {
    console.log(color.cyan + `[ADMIN WATCHER] Detectado evento 'demote' en ${notification.chatId}` + color.reset);
    try {
        const chat = await client.getChatById(notification.chatId);
        if (!chat || !chat.isGroup) return; // Asegurarse de que es un grupo

        const authorId = notification.author;
        const recipientIds = notification.recipientIds;

        const authorContact = await client.getContactById(authorId);
        const authorName = authorContact.pushname || authorContact.name || authorContact.number || authorId.split('@')[0];

        let mentions = [authorContact]; // Mencionar al admin que hizo la acción
        let recipientNames = [];

        for (const recipientId of recipientIds) {
            const recipientContact = await client.getContactById(recipientId);
            const recipientName = recipientContact.pushname || recipientContact.name || recipientContact.number || recipientId.split('@')[0];
            recipientNames.push(`@${recipientContact.id.user}`); // Formato para mención
            mentions.push(recipientContact);
        }

        const messageText = `👥 *¡Cambio de Roles!* 👥\n\nEl administrador *${authorName}* (@${authorContact.id.user}) ha quitado el rol de administrador a:\n- ${recipientNames.join('\n- ')}`;

        console.log(color.green + `[ADMIN WATCHER] Enviando notificación de degradación a ${chat.name}` + color.reset);
        await client.sendMessage(notification.chatId, messageText, { mentions });

    } catch (error) {
        console.error(color.red + `[ERROR ADMIN WATCHER - Demote] Falló al procesar notificación en ${notification.chatId}:` + color.reset, error);
    }
}

module.exports = {
    name,
    description,
    handleGroupPromotion,
    handleGroupDemotion,
    // NO incluimos 'execute', 'checkMessage', 'isUserRegistering', etc.,
    // porque este plugin funciona diferente, siendo llamado desde bot.js
};