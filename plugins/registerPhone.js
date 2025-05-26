// plugins/registerPhone.js
// Comando para que el usuario envíe su número de teléfono como parte del registro.
// El DM para la contraseña se envía al número de teléfono que el usuario proporciona.

const { getUserData, saveUserData, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy'); // getUserData y saveUserData son async

module.exports = {
    name: 'Registrar Teléfono',
    aliases: ['mifono', 'myphone', 'setphone', 'minumero'],
    description: 'Registra o confirma tu número de teléfono para completar la configuración de economía.',
    category: 'Configuración', // O 'Interno'
    // groupOnly: true, // Este comando se espera que se use en respuesta a una solicitud en grupo
    async execute(client, message, args, commandName) {
        const senderContact = await message.getContact();
        if (!senderContact) {
            console.error("[RegisterPhone] No se pudo obtener el contacto del remitente.");
            // No se puede responder si no hay message.reply y no hay contacto.
            // Esto es un caso muy raro.
            return;
        }
        const senderUserId = senderContact.id._serialized; // ID del que envió el comando .mifono (ej. "xxxxxxxxxxx@c.us")
        
        // Obtener/actualizar datos del usuario (pushname) que envió el comando .mifono
        const userExecutingCommand = await getUserData(senderUserId, message);

        if (!userExecutingCommand) {
            console.error(`[RegisterPhone] No se pudieron obtener los datos para el usuario ${senderUserId}`);
            try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch (e) {}
            return;
        }
        console.log(`[RegisterPhone DEBUG] Datos de usuario para ${senderUserId} al iniciar .mifono:`, JSON.stringify(userExecutingCommand, null, 2));

        // El estado y el phoneNumber que se guardan pertenecen a userExecutingCommand
        if (userExecutingCommand.registration_state !== 'esperando_numero_telefono') {
            console.log(`[RegisterPhone] Usuario ${senderUserId} (${userExecutingCommand.pushname}) usó .mifono pero no está en estado 'esperando_numero_telefono'. Estado actual: ${userExecutingCommand.registration_state}`);
            if (userExecutingCommand.password && userExecutingCommand.phoneNumber) {
                await message.reply(`✅ *${userExecutingCommand.pushname || 'Tú'}*, ya estás completamente registrado con el número +${userExecutingCommand.phoneNumber}.`);
            } else if (userExecutingCommand.phoneNumber && !userExecutingCommand.password) {
                // Si ya tiene número pero no contraseña, y usa .mifono, igual lo ponemos a esperar contraseña
                userExecutingCommand.registration_state = 'esperando_contraseña_dm';
                await saveUserData(senderUserId, userExecutingCommand); // Guardar el nuevo estado
                await message.reply(`👍 *${userExecutingCommand.pushname || 'Tú'}*, ya tenías un número (+${userExecutingCommand.phoneNumber}) registrado. Te he enviado un DM para configurar tu contraseña (si aún no lo has hecho).`);
                 try {
                    // Enviar DM al senderUserId (quien interactúa) en este caso de recordatorio
                    await client.sendMessage(senderUserId, "🔑 (Recordatorio) Por favor, responde a este mensaje con la contraseña que deseas establecer.");
                } catch(dmError){
                    console.error(`[RegisterPhone] Error enviando DM de recordatorio a ${senderUserId}: ${dmError.message}`);
                }
            } else {
                 await message.reply("❓ No estoy esperando tu número ahora. Si necesitas registrarte, por favor usa primero un comando de economía como `.work` en un grupo.");
            }
            return;
        }

        if (args.length === 0 || !args[0]) {
            const currentPrefix = message.body.charAt(0);
            await message.reply(`⚠️ Por favor, proporciona tu número de teléfono después del comando. Ejemplo: \`${currentPrefix}mifono +1234567890\``);
            return;
        }

        let phoneNumberWithPlusFromArg = args[0]; // ej: "+51959442730"
        if (!/^\+\d{7,15}$/.test(phoneNumberWithPlusFromArg)) { // Validar formato + seguido de 7 a 15 dígitos
            await message.reply("⚠️ El formato del número de teléfono no es válido. Debe empezar con '+' seguido de 7 a 15 números (ej: +5211234567890). Por favor, inténtalo de nuevo.");
            return;
        }
        
        // Guardar el número SIN el '+' inicial en el objeto 'userExecutingCommand'
        userExecutingCommand.phoneNumber = phoneNumberWithPlusFromArg.substring(1); 
        userExecutingCommand.registration_state = 'esperando_contraseña_dm'; // Cambiar estado
        
        // Guardar el número de teléfono, el nuevo estado, y el pushname (que pudo haberse actualizado)
        await saveUserData(senderUserId, userExecutingCommand); 
        console.log(`[RegisterPhone] Número ${userExecutingCommand.phoneNumber} (guardado sin '+') y estado 'esperando_contraseña_dm' guardados para ${senderUserId} (${userExecutingCommand.pushname}) en la BD.`);

        const userNameToMention = userExecutingCommand.pushname || senderUserId.split('@')[0];

        await message.reply(
            `👍 ¡Gracias @${userNameToMention}!\n\n` +
            `Tu número de teléfono (*${phoneNumberWithPlusFromArg}*) ha sido guardado.\n` + // Mostrar el número con + que ingresó
            `Ahora te enviaré un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus mensajes.`,
            undefined,
            { mentions: [senderUserId] } // Mencionar al usuario que ejecutó el comando
        );

        // --- ENVIAR DM AL NÚMERO DE TELÉFONO INGRESADO ---
        // Construir el ID de chat para el DM a partir del número de teléfono guardado (que no tiene '+')
        const targetChatIdForDM = `${userExecutingCommand.phoneNumber}@c.us`; 

        console.log(`[RegisterPhone DM DEBUG] Intentando enviar DM para contraseña a chatId (del número ingresado): ${targetChatIdForDM}`);
        try {
            // Verificar si el targetChatIdForDM es diferente del senderUserId
            if (targetChatIdForDM !== senderUserId) {
                console.warn(`[RegisterPhone DM DEBUG] El número ingresado (${userExecutingCommand.phoneNumber}) resulta en un ID de chat (${targetChatIdForDM}) diferente al remitente del comando .mifono (${senderUserId}). Se enviará el DM al número ingresado.`);
            }

            await client.sendMessage(targetChatIdForDM, "🔑 (Continuación del registro) Por favor, responde a este mensaje con la contraseña que deseas establecer para los comandos de economía.");
            console.log(`[RegisterPhone] DM para contraseña enviado a ${targetChatIdForDM}.`);
        } catch(dmError){
            console.error(`[RegisterPhone] Error EXPLICITO enviando DM para contraseña a ${targetChatIdForDM}:`, dmError);
            // Informar al usuario que ejecutó .mifono
            await message.reply(`⚠️ No pude enviarte el mensaje privado al número *${phoneNumberWithPlusFromArg}*. Asegúrate de que el número sea correcto, que pueda recibir mensajes de este bot (quizás necesita iniciar un chat primero), y que el bot no esté bloqueado.`, 
            undefined, 
            { mentions: [senderUserId] });
            // Considerar si revertir el estado o no.
            // Si se revierte, el usuario tendría que reintentar .mifono.
            // Si no se revierte, el usuario está en 'esperando_contraseña_dm' pero no recibió el DM.
            // Podría ser útil un comando para "reenviar DM de contraseña".
            // Por ahora, no revertimos el estado para que el flujo de .work pueda reintentar.
            // userExecutingCommand.registration_state = 'esperando_numero_telefono'; // Opcional: revertir estado
            // await saveUserData(senderUserId, userExecutingCommand);
        }
    }
};