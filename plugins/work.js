// plugins/work.js
// Comando para trabajar y ganar recompensas.

const { MessageMedia } = require('whatsapp-web.js');
const { getUserData, saveUserData, msToTime, pickRandom } = require('./shared-economy');

const COOLDOWN_WORK_MS = 10 * 60 * 1000; // 10 minutos
const MONEY_SYMBOL = '$'; 

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
    const userId = message.author || message.from;
    const chatId = message.from;
    // *** CORRECCIÓN AQUÍ: Añadir await y pasar message ***
    const user = await getUserData(userId, message); 
    const now = Date.now();

    // Asegurarse de que 'user' no sea null o undefined si getUserData fallara por alguna razón
    if (!user) {
        console.error(`[Work Plugin] No se pudieron obtener los datos del usuario para ${userId}`);
        return message.reply("❌ Hubo un error al obtener tus datos. Inténtalo de nuevo.");
    }

    const timeSinceLastWork = now - (user.lastwork || 0); // Fallback por si lastwork es undefined
    if (timeSinceLastWork < COOLDOWN_WORK_MS) {
        const timeLeft = COOLDOWN_WORK_MS - timeSinceLastWork;
        return message.reply(`*😜 Estás cansado, debes esperar ${msToTime(timeLeft)} para volver a trabajar.*`);
    }

    const earnedExp = Math.floor(Math.random() * 3000) + 500;
    
    if (typeof user.exp !== 'number' || isNaN(user.exp)) {
        user.exp = 0;
    }
    user.exp += earnedExp;

    const job = pickRandom(jobs);

    if (!job || job.moneyEarned === undefined) {
        console.error("[Work Plugin] ERROR CRÍTICO: El trabajo seleccionado es inválido o no tiene 'moneyEarned'.", job);
        await message.reply("🛠️ Hubo un pequeño error al asignarte un trabajo. Inténtalo de nuevo más tarde.");
        return;
    }

    if (typeof user.money !== 'number' || isNaN(user.money)) {
        user.money = 0; 
    }
    
    const earnedAmount = Number(job.moneyEarned);

    if (isNaN(earnedAmount)) {
        console.error(`[Work Plugin] CRÍTICO: job.moneyEarned ('${job.moneyEarned}') del trabajo '${job.text}' no es un número válido.`);
        await message.reply("🛠️ Hubo un error con la recompensa del trabajo. No se añadió dinero esta vez.");
        return;
    }
    
    user.money += earnedAmount;
    user.lastwork = now;
    await saveUserData(); // saveUserData usa el 'userData' global que 'user' referencia

    const caption = `*🏢 ${job.text}*\n\n` +
                    `✨ *EXP Ganada:* ${earnedExp}\n` +
                    `💵 *Dinero Ganado:* ${MONEY_SYMBOL}${earnedAmount}\n\n` +
                    `*Tu Saldo Actual:*\n` +
                    `⭐ EXP: ${user.exp}\n` +
                    `💵 Dinero: ${MONEY_SYMBOL}${user.money}`;

    console.log(`[Work Plugin] Usuario ${userId} (Nombre: ${user.pushname || 'N/A'}) trabajó como '${job.text}'. EXP: +${earnedExp}, Dinero Ganado: +${earnedAmount}, Saldo Dinero: ${user.money}`);
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