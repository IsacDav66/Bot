// plugins/millonarios.js
// Muestra un ranking de los usuarios con más dinero.

const { getAllUserData, getUserData } = require('./shared-economy');
const MONEY_SYMBOL = '$';

module.exports = {
    name: 'Ranking Millonarios',
    aliases: ['millonarios', 'topmoney', 'rankmoney', 'ricos', 'ranking', 'topricos'],
    description: 'Muestra el top 10 de usuarios con más dinero (en mano + banco).',
    category: 'Economía',
    async execute(client, message, args, commandName) {
        console.log("[Millonarios Plugin] Iniciando obtención de ranking...");
        const allUserData = getAllUserData();

        if (!allUserData || Object.keys(allUserData).length === 0) {
            console.log("[Millonarios Plugin] No hay datos de usuarios en allUserData.");
            return message.reply("🏦 Aún no hay datos de usuarios para mostrar un ranking.");
        }

        const usersArray = [];
        for (const userId in allUserData) {
            const userEntry = allUserData[userId]; // Datos directos de la copia en memoria

            // Log para cada usuario procesado
            // console.log(`[Millonarios Plugin DEBUG] Procesando userId: ${userId}, pushname en allUserData: '${userEntry.pushname}'`);

            // Asegurarse de que los campos de dinero existan y sean números
            const moneyInHand = (typeof userEntry.money === 'number' && !isNaN(userEntry.money)) ? userEntry.money : 0;
            const moneyInBank = (typeof userEntry.bank === 'number' && !isNaN(userEntry.bank)) ? userEntry.bank : 0;
            const totalMoney = moneyInHand + moneyInBank;

            // Determinar el nombre a mostrar
            let displayName = "Usuario Desconocido";
            if (userEntry.pushname && typeof userEntry.pushname === 'string' && userEntry.pushname.trim() !== "") {
                displayName = userEntry.pushname;
            } else if (userId) { // Fallback al ID si no hay pushname válido
                displayName = userId.split('@')[0];
            }
            
            // console.log(`[Millonarios Plugin DEBUG] Para ${userId} - displayName: '${displayName}', totalMoney: ${totalMoney}`);

            usersArray.push({
                id: userId,
                name: displayName,
                totalMoney: totalMoney
            });
        }

        usersArray.sort((a, b) => b.totalMoney - a.totalMoney);
        const topUsers = usersArray.slice(0, 10);

        if (topUsers.length === 0) {
            return message.reply("🏦 No hay usuarios con dinero para mostrar en el ranking.");
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
        // Obtener datos actualizados del solicitante para asegurar el pushname más reciente
        const requesterDataCurrent = await getUserData(requesterId, message); 
        const requesterRankIndex = usersArray.findIndex(u => u.id === requesterId);

        if (requesterRankIndex !== -1) { // Si el solicitante está en el array general del ranking
            const rankedRequesterData = usersArray[requesterRankIndex]; // Datos del array ordenado
            const displayNameForRequester = requesterDataCurrent.pushname || rankedRequesterData.name; // Priorizar el pushname recién obtenido

            if (requesterRankIndex < 10) { // Ya está en el top 10 mostrado
                // rankingMessage += `\n(¡Estás en el Top 10!)`; // Opcional
            } else { // No está en el top 10, pero sí en el ranking
                rankingMessage += `\nTu posición: #${requesterRankIndex + 1} *${displayNameForRequester}* con ${MONEY_SYMBOL}${rankedRequesterData.totalMoney.toLocaleString('es-PE')}`;
            }
        } else if (requesterDataCurrent) { // Si no está en el ranking pero tenemos sus datos (probablemente dinero 0)
             rankingMessage += `\n¡Sigue jugando, *${requesterDataCurrent.pushname || requesterId.split('@')[0]}*! Aún no tienes suficiente para el ranking.`;
        }


        await message.reply(rankingMessage.trim());
        console.log("[Millonarios Plugin] Ranking enviado.");
    }
};