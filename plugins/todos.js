module.exports = {
    name: 'mencionar_todos',
    aliases: ['todos', 'everyone', '@todos'],
    description: 'Menciona a todos los participantes del grupo (¡Solo Grupos!).',
    category: 'Utilidad',
    groupOnly: true, // Indicador para bot.js
    async execute(client, message, args) {
        const chat = await message.getChat();
        // La verificación de grupo se hará en bot.js usando groupOnly

        let textMessage = '📢 ¡Llamada general!\n';
        let mentions = [];
        console.log(`Intentando mencionar a todos en el grupo: ${chat.name}`);
        try {
            const participants = chat.participants;
            if (participants && Array.isArray(participants) && participants.length > 0) {
                for(let participant of participants) {
                    if(participant.id?._serialized) {
                       mentions.push(participant.id._serialized);
                       textMessage += `@${participant.id.user} `;
                    }
                }
                if (mentions.length > 0) {
                     await chat.sendMessage(textMessage.trim(), { mentions });
                     console.log(`Mensaje con ${mentions.length} menciones enviado al grupo ${chat.name}.`);
                } else { await message.reply("No encontré participantes válidos para mencionar."); }
            } else {
                 await chat.fetchParticipants().catch(e => console.error("Error fetching participants:", e));
                 const updatedParticipants = chat.participants;
                 if (updatedParticipants && updatedParticipants.length > 0) {
                     await message.reply("No tenía la lista de participantes. Intenta `!todos` de nuevo.");
                 } else {
                     await message.reply("No pude obtener la lista de participantes de este grupo.");
                 }
            }
        } catch (error) {
             console.error(`Error al intentar mencionar a todos en ${chat.name}:`, error);
             await message.reply("Ocurrió un error inesperado al intentar mencionar a todos.");
        }
    }
};