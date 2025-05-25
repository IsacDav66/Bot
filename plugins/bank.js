// plugins/bank.js
// Comandos para depositar y retirar dinero del banco.

const { getUserData, saveUserData } = require('./shared-economy');
const MONEY_SYMBOL = '$';

const execute = async (client, message, args, commandName) => {
    const userId = message.author || message.from;
    const user = await getUserData(userId, message);

    const actionType = commandName.toLowerCase(); // 'dep', 'deposit', 'withdraw', 'wd', 'with'
    const amountArg = args[0] ? args[0].toLowerCase() : null;

    if (actionType === 'bank' || actionType === 'banco') {
         return message.reply(`🏦 *Estado de tu Cuenta Bancaria:*\n\n`.trim() +
                             `  • Dinero en mano: ${MONEY_SYMBOL}${user.money}\n` +
                             `  • Dinero en banco: ${MONEY_SYMBOL}${user.bank}\n\n` +
                             `Usa \`.dep <cantidad|all>\` para depositar o \`.withdraw <cantidad|all>\` (o \`.with\`) para retirar.`); // Mensaje actualizado
    }

    let amount;

    if (actionType === 'dep' || actionType === 'deposit') {
        if (!amountArg) return message.reply("❓ ¿Cuánto quieres depositar? Usa `.dep <cantidad>` o `.dep all`.");

        if (amountArg === 'all') {
            amount = user.money;
        } else {
            amount = parseInt(amountArg);
            if (isNaN(amount) || amount <= 0) {
                return message.reply("⚠️ Cantidad inválida para depositar. Debe ser un número positivo.");
            }
        }

        if (amount === 0 && user.money === 0) {
             return message.reply(`🤷 No tienes dinero para depositar.`);
        }
        if (amount === 0 && user.money > 0 && amountArg !== 'all'){
            return message.reply(`🤔 No puedes depositar ${MONEY_SYMBOL}0. Si quieres depositar todo, usa \`.dep all\`.`);
        }
        if (user.money < amount) {
            return message.reply(`❌ No tienes suficiente dinero en mano para depositar ${MONEY_SYMBOL}${amount}.\nTienes: ${MONEY_SYMBOL}${user.money}`);
        }
        if (amount === 0 && amountArg === 'all' && user.money === 0) {
             return message.reply(`🤷 No tienes dinero en mano para depositar.`);
        }

        user.money -= amount;
        user.bank += amount;
        await saveUserData(userId, user);
        console.log(`[Bank Plugin] ${userId} depositó ${amount}. Dinero: ${user.money}, Banco: ${user.bank}`);
        return message.reply(`✅ Depositaste ${MONEY_SYMBOL}${amount} en el banco.\n` +
                             `Dinero en mano: ${MONEY_SYMBOL}${user.money}\n` +
                             `Dinero en banco: ${MONEY_SYMBOL}${user.bank}`);

    } else if (actionType === 'withdraw' || actionType === 'wd' || actionType === 'with') { // <--- AÑADIDO 'with' AQUÍ
        if (!amountArg) return message.reply("❓ ¿Cuánto quieres retirar? Usa `.withdraw <cantidad|all>` o `.with <cantidad|all>`."); // Mensaje actualizado

        if (amountArg === 'all') {
            amount = user.bank;
        } else {
            amount = parseInt(amountArg);
            if (isNaN(amount) || amount <= 0) {
                return message.reply("⚠️ Cantidad inválida para retirar. Debe ser un número positivo.");
            }
        }
        
        if (amount === 0 && user.bank === 0) {
            return message.reply(`🤷 No tienes dinero en el banco para retirar.`);
        }
        if (amount === 0 && user.bank > 0 && amountArg !== 'all'){
             return message.reply(`🤔 No puedes retirar ${MONEY_SYMBOL}0. Si quieres retirar todo, usa \`.withdraw all\` o \`.with all\`.`); // Mensaje actualizado
        }
        if (user.bank < amount) {
            return message.reply(`❌ No tienes suficiente dinero en el banco para retirar ${MONEY_SYMBOL}${amount}.\nEn banco: ${MONEY_SYMBOL}${user.bank}`);
        }
        if (amount === 0 && amountArg === 'all' && user.bank === 0) {
            return message.reply(`🤷 No tienes dinero en el banco para retirar.`);
        }

        user.bank -= amount;
        user.money += amount;
        await saveUserData(userId, user);
        console.log(`[Bank Plugin] ${userId} retiró ${amount} (usando '${actionType}'). Dinero: ${user.money}, Banco: ${user.bank}`); // Log actualizado
        return message.reply(`✅ Retiraste ${MONEY_SYMBOL}${amount} del banco.\n` +
                             `Dinero en mano: ${MONEY_SYMBOL}${user.money}\n` +
                             `Dinero en banco: ${MONEY_SYMBOL}${user.bank}`);
    } else {
        console.warn(`[Bank Plugin] Acción desconocida o no manejada: '${actionType}'`);
        return message.reply("Comando de banco no reconocido. Usa `.dep`, `.withdraw` (o `.with`), o simplemente `.bank` para ver tu saldo."); // Mensaje actualizado
    }
};

module.exports = {
    name: 'Banco',
    aliases: ['bank', 'banco', 'dep', 'deposit', 'withdraw', 'wd', 'with'], // <--- AÑADIDO 'with' AQUÍ
    description: 'Deposita o retira dinero. Muestra estado si se usa .bank o .banco.',
    category: 'Economía',
    execute,
};