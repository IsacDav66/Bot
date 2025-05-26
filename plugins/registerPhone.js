// plugins/registerPhone.js
// Maneja el registro inicial del teléfono y la actualización del mismo,
// permitiendo la actualización incluso durante el proceso de registro.

const { getUserData, saveUserData, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');

module.exports = {
    name: 'Gestión de Teléfono',
    aliases: [
        'mifono', 'myphone', 'setphone', 'minumero',         // Para registro inicial
        'actualizarfono', 'updatephone', 'cambiarfono' // Para actualizar
    ],
    description: 'Registra o actualiza tu número de teléfono asociado al bot.',
    category: 'Configuración',
    async execute(client, message, args, commandName) {
        const senderContact = await message.getContact();
        if (!senderContact) {
            console.error("[RegisterPhone] No se pudo obtener el contacto del remitente.");
            return message.reply("❌ No pude identificarte. Inténtalo de nuevo.");
        }
        const userId = senderContact.id._serialized;
        const user = await getUserData(userId, message);

        if (!user) { /* ... error ... */  
            console.error(`[RegisterPhone] No se pudieron obtener los datos para ${userId}`);
            return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
        }

        const isUpdateCommand = ['actualizarfono', 'updatephone', 'cambiarfono'].includes(commandName.toLowerCase());
        const isInitialSetupCommand = ['mifono', 'myphone', 'setphone', 'minumero'].includes(commandName.toLowerCase());
        const userNameToMention = user.pushname || userId.split('@')[0];

        // --- Lógica para ACTUALIZAR NÚMERO (.actualizarfono) ---
        if (isUpdateCommand) {
            // Permitir actualizar si:
            // 1. Está completamente registrado (tiene contraseña Y número)
            // 2. O está esperando el número (puso mal .mifono y quiere corregir ANTES de la contraseña)
            // 3. O está esperando la contraseña por DM (puso bien el .mifono, se le envió DM, pero se dio cuenta que el número era incorrecto)
            if (!user.phoneNumber && user.registration_state !== 'esperando_numero_telefono') {
                 // No tiene número y no está en el flujo de pedirlo, entonces debe iniciar el registro.
                await message.reply(`🔒 Parece que aún no has iniciado el proceso de registro de número. Por favor, usa un comando de economía como \`.work\` primero.`);
                return;
            }
            // Si no tiene contraseña, Y NO está en un estado de registro activo para número o contraseña, entonces es un caso raro.
            // Pero la lógica principal es que si tiene un número o está esperando uno, puede actualizar.

            if (args.length === 0 || !args[0]) {
                return message.reply(`❓ Para actualizar tu número, usa: \`.${commandName} +TUNUEVONUMERO\`\nTu número actual registrado es: ${user.phoneNumber ? '+' + user.phoneNumber : 'Ninguno'}`);
            }

            let newPhoneNumberWithPlus = args[0];
            if (!/^\+\d{7,15}$/.test(newPhoneNumberWithPlus)) {
                return message.reply("⚠️ El formato del nuevo número de teléfono no es válido. Debe empezar con '+' seguido de 7 a 15 números.");
            }

            const newPhoneNumberWithoutPlus = newPhoneNumberWithPlus.substring(1);
            if (user.phoneNumber === newPhoneNumberWithoutPlus) {
                return message.reply(`🤔 Este ya es tu número de teléfono registrado (+${user.phoneNumber}).`);
            }

            const oldPhoneNumber = user.phoneNumber;
            user.phoneNumber = newPhoneNumberWithoutPlus; // Actualizar al nuevo número
            
            let replyMessageText = `✅ ¡Tu número de teléfono ha sido actualizado a *${newPhoneNumberWithPlus}*!`;
            
            // Si estaba esperando la contraseña por DM, o si estaba esperando el número,
            // y ahora lo actualiza, debemos (re)enviar el DM de contraseña al NUEVO número.
            if (user.registration_state === 'esperando_numero_telefono' || user.registration_state === 'esperando_contraseña_dm' || !user.password) {
                user.registration_state = 'esperando_contraseña_dm'; // Poner/mantener en este estado
                replyMessageText += `\nTe he enviado un mensaje privado (DM) a tu nuevo número para que configures/confirmes tu contraseña.`;
                
                const dmChatIdFromNewPhone = `${user.phoneNumber}@c.us`;
                console.log(`[RegisterPhone - Update] Número actualizado para ${userId}. Enviando DM de contraseña a ${dmChatIdFromNewPhone}. Estado: esperando_contraseña_dm`);
                try {
                    await client.sendMessage(dmChatIdFromNewPhone, "🔑 (Actualización de número) Por favor, responde a este mensaje con la contraseña que deseas establecer/confirmar.");
                } catch (dmError) {
                    console.error(`[RegisterPhone - Update] Error enviando DM de contraseña a nuevo número ${dmChatIdFromNewPhone}:`, dmError);
                    replyMessageText += "\n⚠️ No pude enviarte el DM al nuevo número. Asegúrate de que sea correcto y puedas recibir mensajes.";
                    // No revertir el estado, se puede intentar de nuevo con .work o similar
                }
            }
            
            await saveUserData(userId, user); // Guardar el nuevo número y el estado
            console.log(`[RegisterPhone - Update] Usuario ${userId} (${user.pushname}) actualizó su número de +${oldPhoneNumber || 'N/A'} a +${user.phoneNumber}. Estado: ${user.registration_state}`);
            await message.reply(replyMessageText, undefined, { mentions: [userId] });
            return;
        }

        // --- Lógica para REGISTRO INICIAL DE NÚMERO (.mifono) ---
        if (isInitialSetupCommand) {
            if (user.registration_state !== 'esperando_numero_telefono') {
                if (user.password && user.phoneNumber) {
                    await message.reply(`✅ *${userNameToMention}*, ya estás completamente registrado con el número +${user.phoneNumber}. Si quieres cambiarlo, usa \`.actualizarfono +TUNUEVONUMERO\`.`);
                } else if (user.phoneNumber && !user.password) {
                    // Si ya tiene número y usa .mifono (quizás para corregir), lo tratamos como una actualización.
                    // O podríamos simplemente reenviar el DM de contraseña. Por ahora, le indicamos que use actualizarfono.
                    // O podemos asumir que quiere confirmar/cambiar y seguir el flujo de .mifono:
                    user.registration_state = 'esperando_numero_telefono'; // Forzar de nuevo este estado para que procese el número
                    console.log(`[RegisterPhone] Usuario ${userId} (${userNameToMention}) usó .mifono, ya tiene número pero no pass. Re-entrando a flujo de número.`);
                    // No hacer return aquí, dejar que la lógica de abajo procese el número.
                } else { // No tiene número y no está esperando uno.
                     await message.reply("❓ No estoy esperando tu número ahora. Si necesitas registrarte, por favor usa primero un comando de economía como `.work` en un grupo.", undefined, { mentions: [userId] });
                     return;
                }
            }
            // Si llegó aquí, está en 'esperando_numero_telefono' o lo forzamos a estarlo.

            if (args.length === 0 || !args[0]) {
                const currentPrefix = message.body.charAt(0);
                await message.reply(`⚠️ Por favor, proporciona tu número de teléfono después del comando. Ejemplo: \`${currentPrefix}mifono +1234567890\``, undefined, { mentions: [userId] });
                return;
            }

            let phoneNumberWithPlusFromArg = args[0];
            if (!/^\+\d{7,15}$/.test(phoneNumberWithPlusFromArg)) {
                await message.reply("⚠️ El formato del número de teléfono no es válido. Debe empezar con '+' seguido de 7 a 15 números (ej: +5211234567890). Por favor, inténtalo de nuevo.", undefined, { mentions: [userId] });
                return;
            }
            
            user.phoneNumber = phoneNumberWithPlusFromArg.substring(1); 
            user.registration_state = 'esperando_contraseña_dm';
            await saveUserData(userId, user); 
            console.log(`[RegisterPhone - Setup] Número ${user.phoneNumber} y estado 'esperando_contraseña_dm' guardados para ${userId} (${user.pushname}) en la BD.`);

            await message.reply(
                `👍 ¡Gracias @${userNameToMention}!\n\n` +
                `Tu número de teléfono (*${phoneNumberWithPlusFromArg}*) ha sido guardado.\n` +
                `Ahora te enviaré un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus mensajes.`,
                undefined, { mentions: [userId] }
            );

            const dmChatIdFromPhoneNumber = `${user.phoneNumber}@c.us`;
            try {
                await client.sendMessage(dmChatIdFromPhoneNumber, "🔑 (Continuación del registro) Por favor, responde a este mensaje con la contraseña que deseas establecer.");
                console.log(`[RegisterPhone - Setup] DM para contraseña enviado a ${dmChatIdFromPhoneNumber}.`);
            } catch(dmError){ /* ... manejo de error de DM ... */ 
                console.error(`[RegisterPhone] Error EXPLICITO enviando DM para contraseña a ${dmChatIdFromPhoneNumber}:`, dmError);
                await message.reply(`⚠️ No pude enviarte el mensaje privado al número *${phoneNumberWithPlusFromArg}*. Asegúrate de que el número sea correcto y que el bot pueda enviarle mensajes.`, undefined, { mentions: [userId] });
            }
            return;
        }

        await message.reply("❓ Comando no reconocido. Usa `.mifono` para el registro inicial o `.actualizarfono` para cambiar tu número.");
    }
};