// --- plugins/toggle_ai.js ---

const color = { // Reutilizamos los colores si quieres logs coloridos
    reset: "\x1b[0m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m",
};

// Lista de prefijos permitidos (debe coincidir con bot.js)
const allowedPrefixes = ['!', '.', '#', '/', '$', '%'];

module.exports = {
    name: 'ControlIAPorGrupo', // Nombre descriptivo
    aliases: ['offia', 'onia'],
    description: 'Activa o desactiva las respuestas de la IA específicamente para el grupo actual.',
    // ¡IMPORTANTE! Forzar que solo funcione en grupos para que siempre tengamos un chatId de grupo
    category: 'Inteligencia Artificial',
    groupOnly: true,

    async execute(client, message, args) {
        // --- Obtener Chat y ChatId ---
        let chat;
        let chatId;
        try {
             chat = await message.getChat();
             // Doble verificación por si acaso groupOnly falla en bot.js
             if (!chat.isGroup) {
                 return message.reply('Este comando solo está disponible en chats grupales.');
             }
             chatId = chat.id._serialized; // Obtenemos el ID específico del grupo
        } catch (e) {
             console.error(`${color.red}[Toggle AI ERROR]${color.reset} No se pudo obtener el chat del mensaje: ${e.message}`);
             return message.reply('❌ Error al identificar este chat.');
        }
        // --- Fin Obtener Chat ---

        // --- Requiere el plugin de IA aquí dentro ---
        let googleAiPlugin;
        try {
            // Asegúrate que el nombre del archivo coincida exactamente!
            googleAiPlugin = require('./google_ai_modules/google_ai_responder.js');
        } catch (e) {
            console.error(`${color.red}[Toggle AI ERROR]${color.reset} No se pudo cargar 'google_ai_responder.js' al ejecutar comando.`, e.message);
            return message.reply('❌ Error crítico: El módulo base de la IA no está disponible.');
        }

        // --- Verificación explícita de funciones ---
        if (!googleAiPlugin ||
            typeof googleAiPlugin.isAiCurrentlyActive !== 'function' ||
            typeof googleAiPlugin.deactivateAI !== 'function' ||
            typeof googleAiPlugin.activateAI !== 'function')
        {
             console.error(`${color.red}[Toggle AI ERROR]${color.reset} El módulo IA cargó, pero faltan funciones de control (isAiCurrentlyActive, deactivateAI, activateAI). Verifica google_ai_responder.js.`);
             return message.reply('❌ Error: El módulo de control de la IA parece incompleto o dañado. Revisa la consola del bot.');
        }
        // --- FIN Verificación ---


        // --- Determinar qué comando se usó ---
        let commandUsed = null;
        let usedPrefix = null;
        for (const pfx of allowedPrefixes) {
            if (message.body.startsWith(pfx)) {
                usedPrefix = pfx;
                const potentialCommand = message.body.slice(usedPrefix.length).trim().split(/ +/).shift().toLowerCase();
                if (this.aliases.includes(potentialCommand)) {
                    commandUsed = potentialCommand;
                    break;
                }
            }
        }
        if (!commandUsed) {
             console.warn(`${color.yellow}[Toggle AI WARN]${color.reset} Se ejecutó el plugin pero no se pudo determinar el comando usado desde: ${message.body}`);
             // Podríamos retornar aquí, pero si llegó a execute, es porque bot.js lo llamó por un alias válido.
             // Asumimos que el primer alias es el más probable si algo raro pasó.
             commandUsed = this.aliases[0]; // Fallback poco probable
        }
        // --- Fin determinación de comando ---


        try {
            // --- Pasamos el chatId a las funciones de control ---
            if (commandUsed === 'offia') {
                // Comprobamos estado PARA ESTE CHAT
                if (googleAiPlugin.isAiCurrentlyActive(chatId)) {
                    // Desactivamos PARA ESTE CHAT
                    googleAiPlugin.deactivateAI(chatId);
                    // Mensaje específico para el grupo
                    await message.reply(`🔴 IA desactivada para *este grupo*.`);
                    console.log(`${color.yellow}[Toggle AI]${color.reset} IA Desactivada por comando en ${chatId.split('@')[0]} de ${message.from}`);
                } else {
                    await message.reply(`❕ La IA ya estaba desactivada en *este grupo*.`);
                }
            } else if (commandUsed === 'onia') {
                // Comprobamos estado PARA ESTE CHAT
                if (!googleAiPlugin.isAiCurrentlyActive(chatId)) {
                    // Activamos PARA ESTE CHAT
                    googleAiPlugin.activateAI(chatId);
                     // Mensaje específico para el grupo
                    await message.reply(`🟢 IA activada para *este grupo*.`);
                    console.log(`${color.green}[Toggle AI]${color.reset} IA Activada por comando en ${chatId.split('@')[0]} de ${message.from}`);
                } else {
                    await message.reply(`❕ La IA ya estaba activada en *este grupo*.`);
                }
            }
        } catch (e) {
            console.error(`${color.red}[Toggle AI EXECUTE ERROR]${color.reset} Durante la ejecución del comando '${commandUsed}' en ${chatId.split('@')[0]}:`, e);
            await message.reply(`❌ Ocurrió un error al intentar cambiar el estado de la IA para *este grupo*.`);
        }
    }
};