// plugins/millonarios.js
// Muestra un ranking de los usuarios con más dinero.

const { getAllUserData, getUserData } = require('./shared-economy'); // Ambas son async ahora
const MONEY_SYMBOL = '$';

module.exports = {
    name: 'Ranking Millonarios',
    aliases: ['millonarios', 'topmoney', 'rankmoney', 'ricos', 'ranking', 'topricos'],
    description: 'Muestra el top 10 de usuarios con más dinero (en mano + banco).',
    category: 'Economía',
    async execute(client, message, args, commandName) {
        console.log("[Millonarios Plugin] Iniciando obtención de ranking...");
        // *** CORRECCIÓN AQUÍ: Añadir await ***
        const allUserData = await getAllUserData();

        if (!allUserData || Object.keys(allUserData).length === 0) {
            console.log("[Millonarios Plugin] No hay datos de usuarios en allUserData (después de await).");
            return message.reply("🏦 Aún no hay datos de usuarios para mostrar un ranking o la base de datos está vacía.");
        }

        const usersArray = [];
        for (const userId in allUserData) {
            const userEntry = allUserData[userId];

            const moneyInHand = (typeof userEntry.money === 'number' && !isNaN(userEntry.money)) ? userEntry.money : 0;
            const moneyInBank = (typeof userEntry.bank === 'number' && !isNaN(userEntry.bank)) ? userEntry.bank : 0;
            const totalMoney = moneyInHand + moneyInBank;

            let displayName = "Usuario Desconocido";
            if (userEntry.pushname && typeof userEntry.pushname === 'string' && userEntry.pushname.trim() !== "") {
                displayName = userEntry.pushname;
            } else if (userId) {
                displayName = userId.split('@')[0];
            }
            
            usersArray.push({
                id: userId,
                name: displayName,
                totalMoney: totalMoney
            });
        }

        usersArray.sort((a, b) => b.totalMoney - a.totalMoney);
        const topUsers = usersArray.slice(0, 10);

        if (topUsers.length === 0) {
            // Esto podría pasar si todos los usuarios tienen 0 dinero total
            return message.reply("🏦 Ningún usuario tiene dinero para mostrar en el ranking en este momento.");
        }

        let rankingMessage = `🏆 *TOP MILLONARIOS DEL BOT* 🏆\n\n`;
        rankingMessage += `(Dinero en Mano + Dinero en Banco)\n-------------------------------------\n`;

        topUsers.forEach((userRankEntry, index) => {
            let medal = '';
            if (index === 0) medal = '🥇';
            else if (index === 1) medal = '🥈';
            else if (index === 2) medal = '🥉';
            else medal = ` ${index + 1}.`;

            rankingMessage += `${medal} *${userRankEntry.name}* - ${MONEY_SYMBOL}${userRankEntry.totalMoney.toLocaleString('es-PE')}\n`;
        });
        rankingMessage += `-------------------------------------\n`;

        const requesterId = message.author || message.from;
        const requesterDataCurrent = await getUserData(requesterId, message); 
        const requesterRankIndex = usersArray.findIndex(u => u.id === requesterId);

        if (requesterDataCurrent) { // Asegurarse que requesterDataCurrent no sea null
            if (requesterRankIndex !== -1) {
                const rankedRequesterData = usersArray[requesterRankIndex];
                const displayNameForRequester = requesterDataCurrent.pushname || rankedRequesterData.name;
                if (requesterRankIndex >= 10) { // Solo mostrar si no está en el top 10 ya visible
                    rankingMessage += `\nTu posición: #${requesterRankIndex + 1} *${displayNameForRequester}* con ${MONEY_SYMBOL}${rankedRequesterData.totalMoney.toLocaleString('es-PE')}`;
                }
            } else {
                 rankingMessage += `\n¡Sigue jugando, *${requesterDataCurrent.pushname || requesterId.split('@')[0]}*! Aún no tienes suficiente para el ranking.`;
            }
        }

        await message.reply(rankingMessage.trim());
        console.log("[Millonarios Plugin] Ranking enviado.");
    }
};