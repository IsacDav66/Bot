// plugins/work.js
// Comando para trabajar y ganar recompensas, con nuevo flujo de registro.

const { MessageMedia } = require('whatsapp-web.js');
const { getUserData, saveUserData, msToTime, pickRandom, setUserRegistrationState, clearUserRegistrationState } = require('./shared-economy');

const COOLDOWN_WORK_MS = 10 * 60 * 1000; // 10 minutos
const MONEY_SYMBOL = '💵';
const EXP_SYMBOL = '⭐';

const jobs = [
    { text: "Trabajas como cortador de galletas 🍪", moneyEarned: 100, img: "https://th.bing.com/th/id/R.55e10b871427974ca5fb30925f09313b?rik=AW%2bZzb9RfZmKrA&riu=http%3a%2f%2fpm1.aminoapps.com%2f6498%2fde1fb2ac69b2c44330a44d37fc513d05e4890cd9_00.jpg&ehk=BNfUAc0KY56X7AVEnB0Fjf1PiHxAXU%2bdoDSV8ZFVwjQ%3d&risl=&pid=ImgRaw&r=0" },
    { text: "Trabajas para una empresa militar privada 🎖️", moneyEarned: 120, img: "https://i.pinimg.com/originals/ba/26/09/ba2609705507fb66bdce02a85614472a.jpg" },
    { text: "Organizaste un evento de cata de vinos 🍷", moneyEarned: 200, img: "https://th.bing.com/th/id/OIP.5hdIQbv6cLiDNpIc4VcuhQHaFP?cb=thvnextc1&rs=1&pid=ImgDetMain" },
    { text: "Reparaste el DeLorean de Doc Brown ⚡", moneyEarned: 180, img: "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/65484c0f-247d-4dd6-bc0e-d23692d712e1/dfuv5h1-85108be2-f66b-4fb5-9b77-b6daebfc4071.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzY1NDg0YzBmLTI0N2QtNGRkNi1iYzBlLWQyMzY5MmQ3MTJlMVwvZGZ1djVoMS04NTEwOGJlMi1mNjZiLTRmYjUtOWI3Ny1iNmRhZWJmYzQwNzEuanBnIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.Pn-gKU95A2Mf-c5Uf94CCAqfi1FBU1Z16CNf-PKpuqE" },
    { text: "Ayudaste a programar este bot 🤖", moneyEarned: 220, img: "https://e1.pxfuel.com/desktop-wallpaper/484/178/desktop-wallpaper-anime-programming-anime-programmer.jpg" },
    { text: "Fuiste minero de Bitcoin por un día ⛏️", moneyEarned: 170, img: "https://th.bing.com/th/id/OIP.wpbC8Tn2sHETOVHM1JP07wHaHC?cb=thvnextc1&rs=1&pid=ImgDetMain" },
    { text: "Te convertiste en un streamer famoso 🎮", moneyEarned: 250, img: "https://as1.ftcdn.net/v2/jpg/05/62/98/28/1000_F_562982867_quxwUdvhalu0fUgYxMhk8HiIiZGuy3en.jpg" },
    { text: "Cocinaste como chef de 3 estrellas Michelin 👨‍🍳", moneyEarned: 300, img: "https://th.bing.com/th/id/OIP.mBh-RB3RLBpXrb_L7s9UmwHaIN?cb=thvnextc1&rs=1&pid=ImgDetMain" },
    { text: "Descubriste la cura para el resfriado común 🧪", moneyEarned: 280, img: "https://img.freepik.com/fotos-premium/laboratorio-cientifico-chica-manga-anime-estilo-ilustracion-generativa-ai_850000-19342.jpg?w=2000" },
    { text: "Encontraste un tesoro pirata perdido 🗺️", moneyEarned: 240, img: "https://multianime.com.mx/wp-content/uploads/2020/08/animeYT-regresa-anime-ilegal-streaming-anime-pirateria.jpg" },
    { text: "Vendiste limonada en la esquina 🍋", moneyEarned: 50, img: "https://thumb.ac-illust.com/bf/bf203fb3aff99476f540627c8a8d5b9d_t.jpeg" },
    { text: "Paseaste perros del vecindario 🐕", moneyEarned: 80, img: "https://th.bing.com/th/id/OIP.c7va0mYCHbSeQEbeGgbIMwHaFl?cb=thvnextc1&rs=1&pid=ImgDetMain" },
];

const execute = async (client, message, args, commandName) => {
    const senderContact = await message.getContact();
    if (!senderContact) {
        console.error(`[Work Plugin] No se pudo obtener el contacto del remitente.`);
        try { await message.reply("❌ No pude identificarte. Inténtalo de nuevo."); } catch(e) { console.error("[Work Plugin] Error enviando reply de no identificación:", e); }
        return;
    }
    // Este es el ID del usuario que ejecuta el comando, en formato numero@c.us (o @lid si es el bot mismo en un grupo, pero para usuarios es @c.us)
    const commandSenderId = senderContact.id._serialized; 
    const chatId = message.from; // ID del chat donde se envió el mensaje
    
    // Obtener/actualizar datos del usuario. 'message' ayuda a actualizar pushname.
    // 'commandSenderId' es la clave primaria en la BD.
    const user = await getUserData(commandSenderId, message); 

    if (!user) {
        console.error(`[Work Plugin] No se pudieron obtener los datos del usuario para ${commandSenderId}`);
        try { await message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo."); } catch(e) { console.error("[Work Plugin] Error enviando reply de error de datos:", e); }
        return;
    }
    // console.log(`[Work Plugin DEBUG] Datos iniciales para ${commandSenderId}:`, JSON.stringify(user, null, 2));

    // --- VERIFICACIÓN DE REGISTRO COMPLETO (Contraseña y Número de Teléfono) ---
    if (!user.password) {
        const currentChat = await message.getChat();
        if (!currentChat.isGroup) {
            await message.reply("🔒 Por favor, inicia tu registro usando un comando de economía (como `.work`) en un chat grupal para configurar tu número y contraseña.");
            return;
        }

        const userNameToMention = user.pushname || commandSenderId.split('@')[0];

        if (!user.phoneNumber) {
            // CASO A: NO TIENE CONTRASEÑA NI NÚMERO DE TELÉFONO REGISTRADO EN LA BD
            user.registration_state = 'esperando_numero_telefono';
            // Guardamos el estado y el pushname (actualizado por getUserData) para el commandSenderId
            await saveUserData(commandSenderId, user); 
            
            console.log(`[Work Plugin] Usuario ${commandSenderId} (${userNameToMention}) no tiene contraseña ni teléfono. Solicitando número. Estado: esperando_numero_telefono.`);
            
            const currentPrefix = message.body.charAt(0);
            await message.reply(
                `👋 ¡Hola @${userNameToMention}!\n\n` +
                `Para usar las funciones de economía, primero necesitamos registrar tu número de teléfono.\n\n` +
                `Por favor, responde en ESTE CHAT GRUPAL con el comando:\n` +
                `*${currentPrefix}mifono +TUNUMEROCOMPLETO*\n` +
                `(Ej: ${currentPrefix}mifono +11234567890)\n\n` +
                `Tu nombre de perfil actual es: *${user.pushname || 'No detectado'}*.`,
                undefined, { mentions: [commandSenderId] } // Mencionar al commandSenderId
            );
            return;

        } else {
            // CASO B: TIENE NÚMERO (en user.phoneNumber de la BD) PERO NO CONTRASEÑA
            // El 'user' object aquí pertenece al 'commandSenderId'.
            // El 'user.phoneNumber' es el que se registró para 'commandSenderId'.

            // CONSTRUIR el ID de chat para el DM y para el ESTADO a partir del phoneNumber guardado.
            const dmChatIdForPassword = `${user.phoneNumber}@c.us`;

            // Establecer el estado 'esperando_contraseña_dm' para el dmChatIdForPassword.
            // Esto implica que necesitamos una entrada en la BD para dmChatIdForPassword si aún no existe.
            // getUserData para dmChatIdForPassword se asegurará de que exista una entrada.
            let userStateTarget = await getUserData(dmChatIdForPassword); // Obtener/crear entrada para el ID del número de teléfono
            userStateTarget.registration_state = 'esperando_contraseña_dm';
            // Si el pushname del dmChatIdForPassword no se conoce, getUserData no lo actualizará aquí (no hay 'message' de ESE usuario).
            // Es importante que el pushname de userStateTarget se actualice cuando responda al DM.
            // Si el dmChatIdForPassword es el mismo que commandSenderId, esto actualizará el 'user' original.
            await saveUserData(dmChatIdForPassword, userStateTarget); 
            
            console.log(`[Work Plugin] Usuario ${commandSenderId} (${userNameToMention}) tiene teléfono (+${user.phoneNumber}). Estado 'esperando_contraseña_dm' establecido para ${dmChatIdForPassword}.`);

            let displayPhoneNumber = user.phoneNumber;
            if (user.phoneNumber && !String(user.phoneNumber).startsWith('+')) {
                displayPhoneNumber = `+${user.phoneNumber}`;
            }

            await message.reply(
                `🛡️ ¡Hola @${userNameToMention}!\n\n` +
                `Ya tenemos tu número de teléfono registrado (*${displayPhoneNumber}*).\n` +
                `Ahora, para completar tu registro, te he enviado un mensaje privado (DM) a ese número para que configures tu contraseña. Por favor, revisa tus DMs.`,
                undefined, { mentions: [commandSenderId] } // Mencionar al commandSenderId
            );
            
            const dmMessageContent = "🔑 Por favor, responde a este mensaje con la contraseña que deseas establecer para los comandos de economía.";
            
            console.log(`[Work Plugin DM DEBUG] Intentando enviar DM para contraseña.`);
            console.log(`[Work Plugin DM DEBUG] Target para DM (construido desde phoneNumber): ${dmChatIdForPassword}`);
            console.log(`[Work Plugin DM DEBUG] Mensaje a enviar: "${dmMessageContent}"`);

            try {
                await client.sendMessage(dmChatIdForPassword, dmMessageContent);
                console.log(`[Work Plugin DM SUCCESS] DM para contraseña enviado exitosamente a ${dmChatIdForPassword}.`);
            } catch(dmError){
                console.error(`[Work Plugin DM ERROR] Error EXPLICITO enviando DM para contraseña a ${dmChatIdForPassword}:`, dmError);
                console.error(`[Work Plugin DM ERROR Object Details]`, JSON.stringify(dmError, Object.getOwnPropertyNames(dmError)));
                await message.reply("⚠️ No pude enviarte el DM para la contraseña. Asegúrate de que el número que registraste (+"+user.phoneNumber+") sea correcto y que puedas recibir mensajes de mí (quizás inicia un chat privado conmigo). Intenta usar un comando de economía nuevamente.", undefined, { mentions: [commandSenderId] });
                // Si el DM falla, podríamos querer limpiar el estado del dmChatIdForPassword.
                // let tempUserStateForClear = await getUserData(dmChatIdForPassword);
                // tempUserStateForClear.registration_state = null;
                // await saveUserData(dmChatIdForPassword, tempUserStateForClear);
                // O usar clearUserRegistrationState(dmChatIdForPassword);
            }
            return; 
        }
    }
    // --- FIN VERIFICACIÓN DE REGISTRO ---

    // --- Lógica del Comando .work (si ya está registrado) ---
    const now = Date.now();
    const timeSinceLastWork = now - (user.lastwork || 0);

    if (timeSinceLastWork < COOLDOWN_WORK_MS) {
        const timeLeft = COOLDOWN_WORK_MS - timeSinceLastWork;
        return message.reply(`*😜 Estás cansado, debes esperar ${msToTime(timeLeft)} para volver a trabajar.*`);
    }

    const earnedExp = Math.floor(Math.random() * 3000) + 500;
    if (typeof user.exp !== 'number' || isNaN(user.exp)) user.exp = 0;
    user.exp += earnedExp;

    const job = pickRandom(jobs);
    if (!job || job.moneyEarned === undefined) { /* ... manejo de error ... */ return; }

    const earnedAmount = Number(job.moneyEarned);
    if (isNaN(earnedAmount)) { /* ... manejo de error ... */ return; }
    
    if (typeof user.money !== 'number' || isNaN(user.money)) user.money = 0;
    user.money += earnedAmount;
    user.lastwork = now;

    await saveUserData(commandSenderId, user); // Guardar los datos actualizados del trabajo para el commandSenderId

    const caption = `*🏢 ${job.text}*\n\n` +
                    `${EXP_SYMBOL} *EXP Ganada:* ${earnedExp.toLocaleString()}\n` +
                    `${MONEY_SYMBOL} *Dinero Ganado:* ${earnedAmount.toLocaleString()}\n\n` +
                    `*Tu Saldo Actual:*\n` +
                    `${EXP_SYMBOL} EXP: ${user.exp.toLocaleString()}\n` +
                    `${MONEY_SYMBOL} Dinero: ${user.money.toLocaleString()}`;

    console.log(`[Work Plugin] Usuario ${commandSenderId} (${user.pushname || 'N/A'}) trabajó como '${job.text}'. EXP: +${earnedExp}, Dinero Ganado: +${earnedAmount}, Saldo Dinero: ${user.money}`);
    try {
        if (job.img) {
            const media = await MessageMedia.fromUrl(job.img, { unsafeMime: true });
            await client.sendMessage(chatId, media, { caption: caption });
        } else {
            await message.reply(caption);
        }
    } catch (error) {
        console.error(`[Work Plugin] Error al enviar imagen para el trabajo:`, error);
        await message.reply(caption + `\n\n_(Error al cargar imagen del trabajo)_`);
    }
};

module.exports = {
    name: 'Trabajar',
    aliases: ['work', 'trabajar', 'chambear'],
    description: 'Trabaja para ganar EXP y Dinero (con cooldown).',
    category: 'Economía',
    execute,
};