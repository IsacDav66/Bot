// --- bot.js ---
// vEstadoDirecto + Pairing Code + Hot Reload

// --- ¡¡¡ ADVERTENCIA DE ALTO RIESGO !!! ---
// Misma advertencia: NO OFICIAL, RIESGO DE BLOQUEO, INESTABLE.

// --- Importaciones CommonJS ---
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
// --- Fin Importaciones ---

// --- Códigos de Escape ANSI ---
const color = {
    reset: "\x1b[0m", bold: "\x1b[1m", black: "\x1b[30m", red: "\x1b[31m",
    green: "\x1b[32m", yellow: "\x1b[33m", blue: "\x1b[34m", magenta: "\x1b[35m",
    cyan: "\x1b[36m", white: "\x1b[37m", brightBlack: "\x1b[90m", brightRed: "\x1b[91m",
    brightGreen: "\x1b[92m", brightYellow: "\x1b[93m", brightBlue: "\x1b[94m",
    brightMagenta: "\x1b[95m", brightCyan: "\x1b[96m", brightWhite: "\x1b[97m",
    bgBlack: "\x1b[40m", bgRed: "\x1b[41m", bgGreen: "\x1b[42m", bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m", bgMagenta: "\x1b[45m", bgCyan: "\x1b[46m", bgWhite: "\x1b[47m",
    bgBrightBlack: "\x1b[100m", bgBrightRed: "\x1b[101m", bgBrightGreen: "\x1b[102m",
    bgBrightYellow: "\x1b[103m", bgBrightBlue: "\x1b[104m", bgBrightMagenta: "\x1b[105m",
    bgBrightCyan: "\x1b[106m", bgBrightWhite: "\x1b[107m",
};
// --- Fin Códigos ANSI ---

console.log("=======================================");
console.log(color.green + color.bold + "     INICIANDO MI-BOT-WA PERSONAL (vHotReload-EstadoDirecto) " + color.reset);
console.log("=======================================");

// --- Carga de Plugins ---
console.log(color.yellow + "\n--- Cargando Plugins ---" + color.reset);
const plugins = new Map();
const commandsList = [];
const pluginsPath = path.join(__dirname, 'plugins');
const IGNORED_BY_HOT_RELOAD = ['shared-economy.js']; // Lista de archivos a ignorar por el sistema de plugins

// --- Función para Cargar/Recargar un Plugin ---
function loadPlugin(filePath) {
    const fileName = path.basename(filePath);

    // *** NUEVA CONDICIÓN PARA IGNORAR ***
    if (IGNORED_BY_HOT_RELOAD.includes(fileName)) {
        console.log(color.blue + `[Plugin Loader] Archivo ${fileName} ignorado (es una librería compartida).` + color.reset);
        return;
    }

    const pluginKey = fileName.replace('.js', '');

    try {
        delete require.cache[require.resolve(filePath)];
        const plugin = require(filePath);
        console.log(color.cyan + `[HOT RELOAD] Intentando cargar/recargar plugin: ${fileName}` + color.reset);

        plugins.set(pluginKey, plugin);
        let loadedType = 'Desconocido';

        if (plugin.aliases && Array.isArray(plugin.aliases) && plugin.aliases.length > 0 && typeof plugin.execute === 'function') {
            loadedType = 'Comando';
            const existingCmdIndex = commandsList.findIndex(cmd => cmd.pluginKey === pluginKey);
            
            // *** MODIFICACIÓN AQUÍ para incluir category ***
            const commandData = {
                name: plugin.name || pluginKey,
                pluginKey: pluginKey,
                aliases: plugin.aliases,
                description: plugin.description || 'Sin desc.',
                groupOnly: plugin.groupOnly || false,
                category: plugin.category || 'Otros' // <--- AÑADIR ESTA LÍNEA
            };
            // *********************************************

            if (existingCmdIndex > -1) {
                commandsList[existingCmdIndex] = commandData;
            } else {
                commandsList.push(commandData);
            }
            // Ordenar después de añadir/actualizar para mantener el orden
            commandsList.sort((a, b) => {
                // Primero por categoría, luego por el primer alias
                const catCompare = (a.category || 'Otros').localeCompare(b.category || 'Otros');
                if (catCompare !== 0) return catCompare;
                return a.aliases[0].localeCompare(b.aliases[0]);
            });
            
            plugin.aliases.forEach(alias => {
                const commandName = alias.toLowerCase();
                if (plugins.has(commandName) && plugins.get(commandName) !== plugin) {
                    console.warn(color.yellow + `[WARN HOT RELOAD] Alias '${commandName}' del plugin ${pluginKey} sobreescribe otro.` + color.reset);
                }
                plugins.set(commandName, plugin);
            });
        } else if (typeof plugin.checkMessage === 'function') { loadedType = 'Listener'; }
        else if (typeof plugin.isUserRegistering === 'function' && typeof plugin.processStep === 'function') { loadedType = 'Estado (Directo)'; }
        else if (typeof plugin.isUserInState === 'function' && typeof plugin.processState === 'function') { loadedType = 'Estado (Genérico-Ignorado)'; }

        if (loadedType !== 'Desconocido') console.log(color.green + `[HOT RELOAD - ${loadedType}] Cargado/Recargado:` + color.reset + ` ${plugin.name || pluginKey}`);
        else if (Object.keys(plugin).length > 0) console.warn(color.yellow + `[WARN HOT RELOAD] ${fileName} es un archivo .js pero no exporta una estructura de plugin reconocida.` + color.reset);
        // else el archivo está vacío o no exporta nada, no es necesariamente un warning si es intencional.

    } catch (error) {
        console.error(color.red + `[ERROR HOT RELOAD] Falló al cargar/recargar ${fileName}:` + color.reset, error);
        if (!IGNORED_BY_HOT_RELOAD.includes(fileName)) { // Solo intentar descargar si no está ignorado
             unloadPlugin(filePath);
        }
    }
}

// --- Función para Descargar un Plugin ---
function unloadPlugin(filePath) {
    const fileName = path.basename(filePath);

    // *** NUEVA CONDICIÓN PARA IGNORAR ***
    if (IGNORED_BY_HOT_RELOAD.includes(fileName)) {
        // No hacemos nada si es un archivo ignorado, ya que no debería estar en 'plugins' map
        return;
    }

    const pluginKey = fileName.replace('.js', '');
    try {
        const resolvedPath = require.resolve(filePath); // Asegurarse de que existe antes de proceder
        const plugin = plugins.get(pluginKey);

        if (!plugin) { // Si el plugin no estaba en el mapa (ej. porque fue ignorado o falló al cargar)
            if (require.cache[resolvedPath]) { // Limpiar caché si existe
                delete require.cache[resolvedPath];
            }
            return;
        }

        console.log(color.magenta + `[HOT RELOAD] Descargando plugin: ${pluginKey}` + color.reset);
        if (plugin.aliases) {
            plugin.aliases.forEach(alias => { if (plugins.get(alias.toLowerCase()) === plugin) plugins.delete(alias.toLowerCase()); });
        }
        const cmdIndex = commandsList.findIndex(cmd => cmd.pluginKey === pluginKey);
        if (cmdIndex > -1) commandsList.splice(cmdIndex, 1);
        plugins.delete(pluginKey);
        delete require.cache[resolvedPath];
        console.log(color.magenta + `[HOT RELOAD] Plugin ${pluginKey} descargado.` + color.reset);
    } catch (error) {
        // Si require.resolve falla (archivo ya no existe), no es un error crítico para la descarga
        if (error.code !== 'MODULE_NOT_FOUND') {
            console.error(color.red + `[ERROR HOT RELOAD] Error al descargar ${pluginKey}:` + color.reset, error.message);
        }
        // Intentar limpiar del mapa de plugins de todas formas
        plugins.delete(pluginKey);
        const cmdIndex = commandsList.findIndex(cmd => cmd.pluginKey === pluginKey);
        if (cmdIndex > -1) commandsList.splice(cmdIndex, 1);
        // No intentar borrar de require.cache si el archivo no se pudo resolver
    }
}

// --- Carga Inicial de Plugins ---
try {
    if (!fs.existsSync(pluginsPath)) {
        console.warn(color.yellow + `[ADVERTENCIA] Carpeta plugins no encontrada: ${pluginsPath}.` + color.reset);
    } else {
        // *** MODIFICACIÓN AQUÍ para filtrar ANTES de llamar a loadPlugin ***
        const pluginFiles = fs.readdirSync(pluginsPath)
            .filter(file => file.endsWith('.js') && !IGNORED_BY_HOT_RELOAD.includes(file));

        console.log(`Cargando ${pluginFiles.length} plugins iniciales...`);
        pluginFiles.forEach(file => {
            console.log(color.blue + `[Carga Inicial] Procesando archivo: ${file}` + color.reset);
            loadPlugin(path.join(pluginsPath, file));
        });
        console.log(color.brightBlue + `\nTotal de ${commandsList.length} comandos registrados inicialmente.` + color.reset);
        console.log(color.brightBlue + `Total de ${plugins.size} entradas en mapa (incluye alias y keys de plugin).` + color.reset);
    }
} catch (error) { console.error(color.brightRed + `[ERROR CRÍTICO] Lectura inicial carpeta plugins:` + color.reset, error); }
console.log(color.yellow + "--- Fin Carga Inicial de Plugins ---\n" + color.reset);
// --- Fin Carga ---

// --- Inicialización del Cliente ---
console.log(color.yellow + "--- Inicializando Cliente WhatsApp ---" + color.reset);
// IMPORTANTE: Reemplaza con LA RUTA CORRECTA a tu ejecutable de Google Chrome
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // EJEMPLO PARA WINDOWS
// const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // EJEMPLO PARA MACOS
// const chromePath = '/usr/bin/google-chrome-stable'; // EJEMPLO PARA LINUX

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth_chrome') // Directorio para la sesión de WA con Chrome
        // Usar un dataPath diferente si antes usabas el Chromium por defecto
        // para forzar una nueva vinculación si es necesario.
        // Si quieres reusar la sesión anterior (si era estable), puedes usar
        // dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    puppeteer: {
        headless: true,
        executablePath: chromePath, // Usar Google Chrome instalado
        // NO userDataDir AQUÍ, LocalAuth lo maneja
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Importante para algunos entornos Linux/Docker
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            // '--single-process', // MANTENER COMENTADO O ELIMINAR, puede causar problemas con Chrome completo
            '--disable-gpu', // A menudo útil, especialmente en headless
            // Opcional: '--user-agent=...' si necesitas uno específico, pero wweb.js suele manejarlo.
            // Considera añadir:
            '--disable-extensions', // Deshabilita extensiones del navegador que podrían interferir
            '--window-size=1920,1080' // Establecer un tamaño de ventana puede ayudar a veces
        ],
    },
});

console.log(color.green + "Cliente configurado para usar Google Chrome en:", chromePath + color.reset);
console.log(color.green + "Directorio de datos de sesión de LocalAuth:", path.join(__dirname, '.wwebjs_auth_chrome') + color.reset);
// --- Fin Inicialización ---


// --- Eventos del Cliente ---
console.log(color.yellow + "\n--- Configurando Eventos del Cliente ---" + color.reset);
client.on('qr', qr => { console.log(color.yellow + '\n[QR CODE] Escanea:' + color.reset); qrcode.generate(qr, { small: true }); });
client.on('pairing_code', code => { console.log(color.cyan + `\n[PAIRING CODE] Código: ${color.bold}${color.white}${code}${color.reset}`); console.log(color.cyan + 'Vincular con número en WhatsApp.' + color.reset); });
client.on('authenticated', () => { console.log(color.brightGreen + '\n[AUTH] Autenticado OK.' + color.reset); });
client.on('auth_failure', msg => { console.error(color.brightRed + '\n[AUTH FALLO]' + color.reset, msg); process.exit(1); });
client.on('ready', () => { console.log(color.brightGreen + '\n**************** BOT LISTO ****************\n' + color.reset); });
client.on('disconnected', (reason) => { console.warn(color.yellow + '\n[DESCONECTADO]' + color.reset, reason); });
client.on('change_state', state => { console.log(color.blue + '[ESTADO CLIENTE]' + color.reset, state); });
// --- Fin Eventos ---


// --- Manejador Principal de Mensajes ---
client.on('message', async message => {
    // --- Logging ---
    try {
        const chat = await message.getChat(); const contact = await message.getContact(); const senderIdRaw = message.author || message.from; let senderName = "Desconocido"; let senderIdForLog = senderIdRaw || 'ID_Err'; let realContactNumber = null; if (senderIdRaw && senderIdRaw.includes('@')) { try { if (contact) { senderName = contact.pushname || contact.name || contact.number || senderIdRaw.split('@')[0] || '?'; realContactNumber = contact.number; senderIdForLog = realContactNumber ? `${realContactNumber}@c.us` : (contact.id?._serialized || senderIdRaw); } else { senderName = senderIdRaw.split('@')[0] || 'ID'; senderIdForLog = senderIdRaw; } } catch { senderName = senderIdRaw.split('@')[0] || 'ID'; senderIdForLog = senderIdRaw; } } senderName = String(senderName || '?').trim(); senderIdForLog = String(senderIdForLog || 'ID?').trim();
        const timestamp = new Date().toLocaleTimeString('es-PE',{timeZone:'America/Lima'}); const isGroup = chat.isGroup; const groupName = isGroup ? chat.name : 'Priv'; const chatIdLog = message.from; const msgType = message.type.toUpperCase(); const msgBody = message.body || `(${message.type})`;
        const clr = color; const icon = clr.cyan+'❖'+clr.reset; const bT=clr.brightBlue+'╭'+'─'.repeat(30)+clr.cyan+'𖡼'+clr.reset; const bB=clr.brightBlue+'╰'+'─'.repeat(30)+clr.cyan+'𖡼'+clr.reset; const bP=clr.brightBlue+'┃ '+clr.reset;
        const logStr = `\n${bT}\n${bP}${icon} ${clr.white+clr.bold}Hora:${clr.reset} ${clr.black+clr.bgGreen} ${timestamp} ${clr.reset}\n${bP}${icon} ${clr.white+clr.bold}Usuario:${clr.reset} ${clr.white}${senderName}${clr.reset}\n${bP}${icon} ${clr.white+clr.bold}ID_privado:${clr.reset}(${senderIdForLog})\n${bP}${icon} ${clr.white+clr.bold}En:${clr.reset} ${clr.yellow}${isGroup?`${groupName}(${chatIdLog})`:`Priv(${chatIdLog})`}${clr.reset}\n${bP}${icon} ${clr.white+clr.bold}Tipo:${clr.reset} ${clr.white+clr.bgBrightBlue+clr.bold} ${msgType} ${clr.reset}\n${bP}${clr.white}${msgBody}${clr.reset}\n${bB}`; console.log(logStr);
    } catch (logError) { console.log(color.red + `[ERROR LOG] ${message?.from}: ${logError.message}` + color.reset); }
    // --- Fin Logging ---

    // --- Procesamiento (Prioridades) ---
    let messageProcessed = false;
    const userIdForCheck = message.from; // ID Chat/Grupo para estado (estilo antiguo)

    // --- Prioridad 1: Estados (ESTILO ANTIGUO - Múltiples Plugins) ---
    const pluginKeysInState = ['rakion_register', 'reporte_kills', 'saldo', 'recargar','levelpoint','inventario']; // Plugins que usan este método

    for (const pluginKeyToCheck of pluginKeysInState) {
         if (messageProcessed) break; 

         const currentPlugin = plugins.get(pluginKeyToCheck);

         if (currentPlugin && typeof currentPlugin.isUserRegistering === 'function' && currentPlugin.isUserRegistering(userIdForCheck)) {
             messageProcessed = true;
             console.log(color.magenta + `[PROCESO ESTADO (${pluginKeyToCheck})] Chat ${userIdForCheck} en estado.` + color.reset);
             const commandPrefix = '!';
             let allowedCommands = []; 
             if (currentPlugin.aliases) { allowedCommands = currentPlugin.aliases.map(a => `!${a.toLowerCase()}`); }

             if (message.body && message.body.startsWith(commandPrefix) && !allowedCommands.includes(message.body.toLowerCase())) {
                  await message.reply("⚠️ Estás en medio de un proceso. Responde la pregunta o escribe 'cancelar'.");
             } else if (typeof currentPlugin.processStep === 'function') {
                  try {
                       console.log(color.cyan + `[DEBUG BOT.JS] >>> Llamando a processStep de ${pluginKeyToCheck} para chat ${userIdForCheck}...` + color.reset);
                       await currentPlugin.processStep(client, message);
                       console.log(color.cyan + `[DEBUG BOT.JS] <<< processStep de ${pluginKeyToCheck} completado.` + color.reset);
                  } catch (pluginError) {
                       console.error(color.red + `[ERROR ESTADO (${pluginKeyToCheck})] Error EJECUTANDO processStep para ${userIdForCheck}:` + color.reset, pluginError);
                       await message.reply(`❌ Error procesando tu respuesta (${pluginKeyToCheck}).`);
                  }
             } else {
                  console.error(color.red + `[ERROR CONFIG] Plugin '${pluginKeyToCheck}' detectado en estado pero falta 'processStep'.` + color.reset);
             }
         } 
    } 

    if (messageProcessed) { console.log(`[DEBUG BOT.JS] Mensaje procesado por estado, retornando.`); return; }
    // --- Fin Prioridad 1 ---


    // --- Prioridad 2: Listeners ---
    for (const [key, plugin] of plugins.entries()) { if (!messageProcessed && plugin?.checkMessage) { try { const handled = await plugin.checkMessage(client, message); if (handled) { console.log(color.blue + `[LISTENER] ${plugin.name || key}` + color.reset); messageProcessed = true; break; } } catch (e) { console.error(color.red+`[ERR LISTENER] ${plugin.name||key}`+color.reset, e); } } }
    if (messageProcessed) { console.log(`[DEBUG BOT.JS] Mensaje procesado por listener.`); return; }
    // --- Fin Listeners ---

        // --- Prioridad 3: Comandos con Prefijo ---
    if (message.fromMe || !message.body || messageProcessed) return;

    const allowedPrefixes = ['!', '.', '#', '/', '$', '%']; 
    let usedPrefix = null; 
    let potentialCommandName = '';
    let args = [];
    let command = null;

    for (const pfx of allowedPrefixes) {
        if (message.body.startsWith(pfx)) {
            usedPrefix = pfx; 
            args = message.body.slice(usedPrefix.length).trim().split(/ +/);
            potentialCommandName = args.shift().toLowerCase(); 
            command = plugins.get(potentialCommandName); 
            break; 
        }
    }

    if (usedPrefix === null) {
        return;
    }

    if (!command || typeof command.execute !== 'function') {
        return; 
    }


    const chatCmd = await message.getChat();
    if (command.groupOnly && !chatCmd.isGroup) {
        await message.reply(`⛔ Comando \`${usedPrefix}${potentialCommandName}\` solo para grupos.`);
        return;
    }

    try {
        const requesterId = message.author || message.from;
        console.log(color.cyan + `[CMD] ${usedPrefix}${potentialCommandName} por ${requesterId}` + color.reset);
        const isHelp = command.aliases.includes('ayuda') || command.aliases.includes('help');
        if (isHelp) {
            await command.execute(client, message, args, commandsList);
        } else {
            await command.execute(client, message, args, potentialCommandName);
        }
        messageProcessed = true;
    } catch (e) {
        console.error(color.red+`[ERR CMD] ${usedPrefix}${potentialCommandName}`+color.reset, e);
        await message.reply(`❌ Error ejecutando \`${usedPrefix}${potentialCommandName}\`.`);
        messageProcessed = true; 
    }
    // --- Fin Comandos ---

}); // Fin client.on('message')
// --- Fin Manejador Mensajes ---


// --- Inicialización y Manejo Errores Globales ---
let watcher;
console.log(color.yellow + "\n--- Iniciando Conexión a WhatsApp ---" + color.reset);

client.initialize()
    .then(() => {
        // --- INICIAR WATCHER ---
        console.log(color.blue + "\n--- Iniciando Observador de Plugins (Hot Reload) ---" + color.reset);
        watcher = chokidar.watch(pluginsPath, { ignored: /(^|[\/\\])\../, persistent: true, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 } });
        
        watcher // <--- Tenías "watcher" dos veces aquí, eliminé uno.
        .on('add', fp => {
            const fileName = path.basename(fp);
            if (fp.endsWith('.js') && !IGNORED_BY_HOT_RELOAD.includes(fileName)) { 
                console.log(color.green + `[WATCHER] Nuevo plugin: ${fileName}` + color.reset);
                loadPlugin(fp);
            } else if (IGNORED_BY_HOT_RELOAD.includes(fileName)) {
                console.log(color.blue + `[WATCHER] Archivo ${fileName} añadido, pero ignorado por Hot Reload.` + color.reset);
            }
        })
        .on('change', fp => {
            const fileName = path.basename(fp);
            if (fp.endsWith('.js') && !IGNORED_BY_HOT_RELOAD.includes(fileName)) { 
                console.log(color.yellow + `[WATCHER] Plugin modificado: ${fileName}. Recargando...` + color.reset);
                unloadPlugin(fp);
                loadPlugin(fp);
            } else if (IGNORED_BY_HOT_RELOAD.includes(fileName)) {
                console.log(color.blue + `[WATCHER] Archivo ${fileName} modificado, pero ignorado por Hot Reload. Si es una dependencia crítica, reinicia el bot para aplicar cambios.` + color.reset);
            }
        })
        .on('unlink', fp => {
            const fileName = path.basename(fp);
            if (fp.endsWith('.js') && !IGNORED_BY_HOT_RELOAD.includes(fileName)) { 
                console.log(color.red + `[WATCHER] Plugin eliminado: ${fileName}` + color.reset);
                unloadPlugin(fp);
            } else if (IGNORED_BY_HOT_RELOAD.includes(fileName)){
                console.log(color.blue + `[WATCHER] Archivo ${fileName} eliminado, pero estaba ignorado por Hot Reload.` + color.reset);
            }
        })
            .on('error', error => console.error(color.red + '[WATCHER ERROR]' + color.reset, error));
        console.log(color.blue + `Observando cambios en: ${pluginsPath}` + color.reset);
        // ---------------------
    })
    .catch(err => { console.error(color.brightRed + "[ERROR FATAL INIT]" + color.reset, err); process.exit(1); });

process.on('SIGINT', async () => {
    console.log(color.yellow + "\n[PROCESO] SIGINT (Ctrl+C). Cerrando..." + color.reset);
    if (watcher) { console.log(color.yellow + "[PROCESO] Cerrando watcher..." + color.reset); await watcher.close(); console.log(color.green + "[PROCESO] Watcher cerrado." + color.reset); }
    if (client) { await client.destroy().catch(e => console.error(color.red + "[ERROR CIERRE]" + color.reset, e)); console.log(color.green + "[PROCESO] Cliente destruido." + color.reset); }
    process.exit(0);
});
process.on('uncaughtException', (err, origin) => { console.error(color.brightRed + '[ERROR NO CAPTURADO]' + color.reset, origin, err); });
process.on('unhandledRejection', (reason, promise) => { console.error(color.brightRed + '[RECHAZO PROMESA NO MANEJADO]' + color.reset, reason); });

console.log(color.blue + "\nNúcleo cargado. Esperando conexión e inicialización del watcher..." + color.reset);
// --- Fin Script ---