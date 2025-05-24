module.exports = {
    name: 'mencionar_aleatorio',
    aliases: ['random', 'aleatorio', '@random'],
    description: 'Menciona a un miembro del grupo al azar (¡Solo Grupos!).',
    category: 'Diversión',
    groupOnly: true, // Indicador
    async execute(client, message, args) {
        const chat = await message.getChat();
        // Verificación de grupo en bot.js

        console.log(`Comando !random detectado en el grupo: ${chat.name}`);
        await message.reply('🎲 Eligiendo a alguien al azar...');
        try {
            const participants = chat.participants;
            const botId = client.info.wid._serialized;

            if (participants && Array.isArray(participants) && participants.length > 0) {
                const actualParticipants = participants.filter(p => p.id._serialized !== botId && p.id._serialized);
                if (actualParticipants.length > 0) {
                    const randomIndex = Math.floor(Math.random() * actualParticipants.length);
                    const randomParticipant = actualParticipants[randomIndex];
                    const mentionText = `✨ ¡El elegido por el destino es @${randomParticipant.id.user}! ✨`;
                    await chat.sendMessage(mentionText, { mentions: [randomParticipant.id._serialized] });
                    console.log(`Mencionado al azar: ${randomParticipant.id.user} en ${chat.name}`);
                } else { await message.reply('¡Solo quedo yo aquí!'); }
            } else {
                await chat.fetchParticipants().catch(e => console.error("Error fetching participants:", e));
                const updatedParticipants = chat.participants;
                const filteredUpdated = updatedParticipants ? updatedParticipants.filter(p => p.id._serialized !== botId && p.id._serialized) : [];
                if(filteredUpdated.length > 0) { await message.reply("No tenía la lista actualizada. Intenta `!random` de nuevo."); }
                else { await message.reply('No pude obtener la lista de participantes de este grupo.'); }
            }
        } catch (error) {
            console.error(`Error en mención aleatoria en ${chat.name}:`, error);
            await message.reply('Ocurrió un error al intentar seleccionar a alguien al azar.');
        }
    }
};