// plugins/rakion_register.js
// VERSIÓN PARA USAR CON bot.js ANTIGUO (usa message.from y exporta isUserRegistering/processStep)

const mysql = require('mysql2/promise');

// Configuración de la Base de Datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // <-- ¡ASEGURA ESTA CONTRASEÑA!
    database: process.env.DB_NAME || 'rakion',
    connectTimeout: 10000
};

// Validaciones
const validarIDPass = (input) => /^[a-zA-Z0-9]{1,11}$/.test(input);
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validarTelefono = (phone) => /^\d{7,15}$/.test(phone);

// Estado de Registro
let userRegistration = {};

// Función para registrar en la BD (lógica interna sin cambios)
const registerUser = async (client, message, userSession) => {
    // IMPORTANTE: El ID del usuario para el MENSAJE FINAL sí debe ser el autor real
    const senderUserId = message.author || message.from;
    const chatOrGroupId = message.from; // El ID usado para la sesión

    let connection;
    console.log(`[Rakion Register - registerUser] Iniciando registro en BD para ${userSession.id} (sesión de ${chatOrGroupId})`);
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log(`[Rakion Register - registerUser] Conexión a DB establecida.`);
        await connection.beginTransaction();
        console.log(`[Rakion Register - registerUser] Transacción iniciada.`);

        // ... (Las inserciones a la BD no cambian) ...
        console.log(`[Rakion Register - registerUser] Insertando en 'user'...`);
        await connection.execute('INSERT INTO `user` (`id`, `password`, `e_mail`, `phone`, `country`, `NoCountryUpdate`, `Authority`, `RestrictTime`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userSession.id, userSession.password, userSession.email, userSession.phone, 157, 0, 0, null]);
        console.log(`[Rakion Register - registerUser] Insertado en 'user' OK.`);
        console.log(`[Rakion Register - registerUser] Insertando en 'usergameinfo'...`);
        await connection.execute('INSERT INTO `usergameinfo` (`name`, `gold`) VALUES (?, ?)', [userSession.id, 5000]);
        console.log(`[Rakion Register - registerUser] Insertado en 'usergameinfo' OK.`);
        console.log(`[Rakion Register - registerUser] Insertando en 'cash'...`);
        await connection.execute('INSERT INTO `cash` (`id`, `cash`) VALUES (?, ?)', [userSession.id, 1000]);
        console.log(`[Rakion Register - registerUser] Insertado en 'cash' OK.`);

        await connection.commit();
        console.log(`[Rakion Register - registerUser] Transacción confirmada (commit).`);
        console.log(`[Rakion Register - registerUser] Usuario ${userSession.id} registrado exitosamente en BD.`);

        // Enviar mensaje de éxito AL USUARIO que inició (si es posible) o al chat
        const targetIdForSuccessMsg = senderUserId; // Enviar al usuario real
        // Enviar mensaje de éxito de vuelta al CHAT/GRUPO donde se hizo el registro
        const chatOrGroupId = message.from; // Asegurarse de tener el ID del chat/grupo
        console.log(`[Rakion Register - registerUser] Enviando mensaje de éxito a ${chatOrGroupId}`); // Log adicional
        await client.sendMessage(chatOrGroupId, `🎉 *Registro exitoso!*\n\n` +
            `🆔 *ID:* \`${userSession.id}\`\n` +
            `📧 *Email:* ${userSession.email}\n` +
            `📱 *Teléfono:* ${userSession.phone}\n` +
            `💰 *Gold recibido:* 5000\n` +
            `💵 *Cash recibido:* 1000\n\n` +
            `✅ *Bienvenido a Rakion!*`);
        console.log(`[Rakion Register - registerUser] Mensaje de éxito enviado a ${chatOrGroupId}.`); // Log adicional
    } catch (error) {
        console.error('[Rakion Register ERROR - registerUser] Error durante registro en BD:', error);
        if (connection) { try { await connection.rollback(); console.log('[Rakion Register - registerUser] Rollback realizado.'); } catch (rbError) { console.error('[Rakion Register ERROR - registerUser] Error en rollback:', rbError); } }
        // Enviar error al chat/grupo donde se estaba registrando
        await client.sendMessage(chatOrGroupId, `❌ *Error grave al guardar en la base de datos.* El registro no se completó. Contacta a un administrador.`);
    } finally {
        // Limpiar sesión usando el ID del chat/grupo
        delete userRegistration[chatOrGroupId];
        console.log(`[Rakion Register - registerUser] Sesión de registro eliminada para ${chatOrGroupId}.`);
        if (connection) { try { await connection.end(); console.log(`[Rakion Register - registerUser] Conexión DB cerrada.`); } catch (endError) { console.error('[Rakion Register ERROR - registerUser] Error cerrando conexión DB:', endError); } }
    }
};


// ===========================================================
//  NOMBRE ANTIGUO: processStep
// ===========================================================
// Función para procesar las respuestas del usuario durante el registro
const processStep = async (client, message) => { // <--- NOMBRE ANTIGUO
    console.log(`[Rakion Register DEBUG - processStep] Función INVOCADA.`); // Log actualizado

    // *** USA message.from (ID de Chat/Grupo) PARA BUSCAR LA SESIÓN ***
    const chatOrGroupId = message.from;
    const userSession = userRegistration[chatOrGroupId]; // Busca sesión por ID de chat/grupo
    const text = message.body ? message.body.trim() : '';

    if (!userSession) {
         console.warn(`[Rakion Register WARN - processStep] No se encontró sesión activa para ${chatOrGroupId}. Ignorando mensaje: "${text}"`);
         return;
    }
    console.log(`[Rakion Register DEBUG - processStep] Sesión encontrada para ${chatOrGroupId}. Paso actual: ${userSession.step}. Texto recibido: "${text}"`);

    // Manejo de Cancelación
    if (text.toLowerCase() === 'cancelar') {
        delete userRegistration[chatOrGroupId]; // Usa ID de chat/grupo
        console.log(`[Rakion Register INFO - processStep] Registro cancelado por mensaje en ${chatOrGroupId} en paso ${userSession.step}.`);
        await message.reply('❌ *Registro cancelado.*');
        return;
    }

    try {
        // La lógica interna de los pasos (switch/case) se mantiene igual
        switch (userSession.step) {
            case 1: // Esperando ID
                console.log(`[Rakion Register DEBUG - Step 1] Iniciando procesamiento para ID.`);
                if (!validarIDPass(text)) {
                    console.log(`[Rakion Register DEBUG - Step 1] Validación de ID fallida para "${text}".`);
                    return await message.reply('❌ *ID inválido:* Solo letras y números (máx. 11 caracteres). Intente de nuevo o escribe "cancelar".');
                }
                console.log(`[Rakion Register DEBUG - Step 1] Validación de ID pasada para "${text}".`);
                userSession.id = text; // Guardar ID en la sesión

                let connection = null;
                try {
                    console.log(`[Rakion Register DEBUG - Step 1] Intentando conectar a DB...`);
                    connection = await mysql.createConnection(dbConfig);
                    console.log(`[Rakion Register INFO - Step 1] Conexión a DB EXITOSA.`);

                    console.log(`[Rakion Register DEBUG - Step 1] Ejecutando SELECT para ID: ${userSession.id}`);
                    const [rows] = await connection.execute('SELECT `id` FROM `user` WHERE `id` = ?', [userSession.id]);
                    console.log(`[Rakion Register INFO - Step 1] Consulta SELECT ejecutada. Filas encontradas: ${rows.length}`);

                    if (rows.length > 0) {
                        console.log(`[Rakion Register INFO - Step 1] El ID "${userSession.id}" ya existe.`);
                        delete userRegistration[chatOrGroupId]; // Usa ID chat/grupo
                        return await message.reply(`⚠️ *El ID "${userSession.id}" ya está en uso.* Usa \`!regrakion\` para intentar con otro ID.`);
                    }

                    console.log(`[Rakion Register DEBUG - Step 1] El ID es único. Avanzando al paso 2.`);
                    userSession.step++;
                    await message.reply('🔐 *Ingrese una contraseña:*\n(Solo letras y números, máx. 11 caracteres)\n\nEscribe "cancelar" para detener.');
                    console.log(`[Rakion Register DEBUG - Step 1] Prompt de contraseña enviado.`);

                } catch (dbError) {
                    console.error('[Rakion Register ERROR - Step 1] ¡ERROR DE BASE DE DATOS!', dbError);
                    await message.reply(`❌ Error crítico al verificar el ID con la base de datos. El registro ha sido cancelado. Contacta a un administrador.`);
                    delete userRegistration[chatOrGroupId]; // Usa ID chat/grupo
                } finally {
                    if (connection) {
                        try { await connection.end(); console.log(`[Rakion Register DEBUG - Step 1] Conexión a DB cerrada.`); }
                        catch (endError) { console.error('[Rakion Register ERROR - Step 1] Error al cerrar conexión DB:', endError); }
                    }
                }
                break; // Fin case 1

            // ... (Cases 2, 3, 4, 5 igual que antes, solo asegurarse de que usen message.reply o client.sendMessage(chatOrGroupId, ...)) ...
             case 2: // Esperando Contraseña
                console.log(`[Rakion Register DEBUG - Step 2] Procesando contraseña.`);
                if (!validarIDPass(text)) { return await message.reply('❌ *Contraseña inválida:* ... Intente de nuevo o escribe "cancelar".'); }
                userSession.password = text; userSession.step++;
                await message.reply('📧 *Ingrese su correo electrónico:*\n(Ej: usuario@dominio.com)\n\nEscribe "cancelar" para detener.');
                break;
            case 3: // Esperando Email
                 console.log(`[Rakion Register DEBUG - Step 3] Procesando email.`);
                if (!validarEmail(text)) { return await message.reply('❌ *Correo inválido:* ... Intente de nuevo o escribe "cancelar".'); }
                userSession.email = text; userSession.step++;
                await message.reply('📱 *Ingrese su número de teléfono:*\n(Solo números, 7-15 dígitos)\n\nEscribe "cancelar" para detener.');
                break;
            case 4: // Esperando Teléfono
                 console.log(`[Rakion Register DEBUG - Step 4] Procesando teléfono.`);
                if (!validarTelefono(text)) { return await message.reply('❌ *Teléfono inválido:* ... Intente de nuevo o escribe "cancelar".'); }
                userSession.phone = text; userSession.step++;
                // Usar client.sendMessage dirigido al CHAT/GRUPO
                await client.sendMessage(chatOrGroupId, `✅ *Verifique sus datos antes de registrar:*\n\n`+`🆔 *ID:* \`${userSession.id}\`\n`+`🔑 *Contraseña:* \`${userSession.password}\`\n`+`📧 *Email:* ${userSession.email}\n`+`📱 *Teléfono:* ${userSession.phone}\n\n`+`✏️ *Responda con el número correspondiente:*\n`+`1️⃣ Confirmar Registro\n`+`2️⃣ Cancelar Registro`);
                break;
            case 5: // Esperando Confirmación
                console.log(`[Rakion Register DEBUG - Step 5] Procesando confirmación.`);
                if (text === "2") { delete userRegistration[chatOrGroupId]; return await message.reply('❌ *Registro cancelado.*'); }
                if (text !== "1") { return await message.reply('⚠️ Respuesta inválida. Responde "1" o "2".'); }
                console.log(`[Rakion Register INFO - Step 5] Confirmación (1) recibida. Iniciando registro final...`);
                await message.reply('⏳ Registrando tu cuenta, por favor espera...');
                await registerUser(client, message, userSession); // Llama a la función de registro
                break;

            default:
                console.error(`[Rakion Register ERROR - processStep] Estado inesperado: Paso ${userSession.step} para ${chatOrGroupId}.`);
                delete userRegistration[chatOrGroupId];
                await message.reply('❌ Ocurrió un error interno inesperado. Por favor, inicia de nuevo con `!regrakion`.');
                break;
        }
    } catch (error) {
         console.error(`[Rakion Register ERROR - processStep] Error GENERAL procesando paso ${userSession?.step || 'desconocido'} para ${chatOrGroupId}:`, error);
         if (userRegistration[chatOrGroupId]) { delete userRegistration[chatOrGroupId]; }
         await message.reply("❌ Ocurrió un error inesperado durante el proceso. El registro ha sido cancelado. Intenta de nuevo más tarde.");
    }
};


// ===========================================================
//  NOMBRE ANTIGUO: isUserRegistering
// ===========================================================
// Función para que bot.js verifique si un usuario está registrándose
const isUserRegistering = (chatOrGroupId) => { // <--- NOMBRE ANTIGUO
    // *** USA message.from (ID de Chat/Grupo) PARA VERIFICAR ***
    const isInState = Object.prototype.hasOwnProperty.call(userRegistration, chatOrGroupId);
    console.log(`[Rakion Register DEBUG - isUserRegistering] Verificando estado para ${chatOrGroupId}. Resultado: ${isInState}`);
    return isInState;
};


// Exportación del plugin para bot.js
module.exports = {
    name: 'rakion_register',
    aliases: ['regrakion', 'rakionreg'],
    description: 'Inicia el proceso de registro para una cuenta de Rakion.',

    // Función principal que se ejecuta con el comando !regrakion
    async execute(client, message, args) {
        // *** USA message.from (ID de Chat/Grupo) PARA INICIAR/VERIFICAR ***
        const chatOrGroupId = message.from;
        console.log(`[Rakion Register INFO - execute] Comando !regrakion recibido en ${chatOrGroupId}`);

        if (userRegistration[chatOrGroupId]) { // Verifica usando ID chat/grupo
            console.log(`[Rakion Register INFO - execute] Chat ${chatOrGroupId} ya tiene un registro en proceso.`);
            return await message.reply('⚠️ Ya hay un registro en proceso en este chat/grupo. Responde a la última pregunta o escribe "cancelar" para detenerlo.');
        }

        console.log(`[Rakion Register INFO - execute] Iniciando nuevo registro para ${chatOrGroupId}`);
        // Guarda el estado usando el ID chat/grupo
        userRegistration[chatOrGroupId] = { step: 1 };

        await message.reply('📌 *¡Bienvenido al registro de Rakion!*\n\n' + 'Por favor, ingresa un *ID* para tu cuenta:\n' + '(Solo letras y números, máx. 11 caracteres)\n\n' + '💡 Puedes escribir "cancelar" en cualquier momento para detener el proceso.');
    },

    // --- EXPORTAR LAS FUNCIONES CON LOS NOMBRES ANTIGUOS ---
    isUserRegistering: isUserRegistering,
    processStep: processStep
    // ----------------------------------------------------
};