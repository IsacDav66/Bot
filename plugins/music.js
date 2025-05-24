// --- plugins/music.js ---
// const { MessageMedia } = require('whatsapp-web.js'); // Ya no se necesita para enviar audio
const yts = require('youtube-sr').default; // O usa play.search si prefieres

// Ya NO necesitamos: ytdl-core, fluent-ffmpeg, fs, path, crypto para esta versión simple

module.exports = {
    name: 'Buscador de Música (YouTube Link)',
    aliases: ['playlink', 'musica', 'p', 'plink'], // Puedes ajustar los alias
    description: 'Busca una canción en YouTube y envía el enlace.\nEj: `!playlink nombre de la cancion`',
    category: 'Descargas',
    groupOnly: false,

    async execute(client, message, args) {
        const query = args.join(' ');
        if (!query) {
            return message.reply('🎶 Por favor, dime qué canción o video quieres buscar. Ejemplo: `!playlink temazo`');
        }

        try {
            await message.reply(`🎶 Buscando "${query}" en YouTube...`);

            // 1. Buscar el video en YouTube
            // Usando youtube-sr
            const searchResults = await yts.search(query, { limit: 1, type: 'video' });

            // // Alternativa usando play-dl para la búsqueda (descomenta si prefieres play-dl y lo tienes instalado)
            // const play = require('play-dl');
            // const searchResultsPd = await play.search(query, {
            //     limit: 1,
            //     source: { youtube: 'video' }
            // });
            // const searchResults = searchResultsPd; // Asignar para compatibilidad con el resto del código

            if (!searchResults || searchResults.length === 0) {
                return message.reply(`😥 No encontré resultados para "${query}" en YouTube.`);
            }

            const video = searchResults[0]; // video es un objeto con title, id, url, durationFormatted, etc.

            console.log(`[MUSIC LINK] Video encontrado: ${video.title} (URL: ${video.url})`);

            // 2. Construir y enviar el mensaje con el enlace
            const replyText = `🎶 ¡Encontré esto para ti!\n\n*Título:* ${video.title}\n*Duración:* ${video.durationFormatted}\n*Enlace:* ${video.url}`;

            // Enviar el mensaje. WhatsApp generalmente genera una vista previa para los enlaces de YouTube.
            await client.sendMessage(message.from, replyText);
            // No necesitamos message.reply() aquí si queremos que el mensaje no sea una respuesta directa al comando,
            // sino un nuevo mensaje en el chat. Si prefieres responder, usa message.reply(replyText).

        } catch (error) {
            console.error('[MUSIC LINK EXEC ERR]', error);
            await message.reply('😕 Hubo un error al buscar tu video. Intenta de nuevo.');
        }
        // No hay archivos temporales que limpiar en esta versión
    }
};