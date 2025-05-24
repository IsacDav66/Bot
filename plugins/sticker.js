// Necesita MessageMedia, así que lo importamos aquí
const { MessageMedia } = require('whatsapp-web.js');

module.exports = {
    name: 'sticker',
    aliases: ['s', 'sticker', 'stiker'],
    description: 'Crea un sticker (responde a img/gif/video, usa URL o envía con comando).',
    category: 'Utilidad',
    async execute(client, message, args) {
        const sender = message.from; // Podríamos necesitarlo para logs
        console.log(`Comando Sticker detectado de ${sender}`);
        await message.reply('⚙️ Procesando tu sticker...');

        let mediaToProcess = null;
        const urlArg = args.join(' '); // Args son las palabras después del comando

        try {
            if (message.hasQuotedMsg) {
                const quotedMsg = await message.getQuotedMessage();
                if (quotedMsg.hasMedia && quotedMsg.type !== 'sticker') {
                    mediaToProcess = await quotedMsg.downloadMedia();
                } else if (quotedMsg.type === 'sticker') { await message.reply('¡Eso ya es un sticker!'); return; }
                else { await message.reply('Responde a una imagen/GIF/video corto.'); return; }
            }
            else if (urlArg && (urlArg.startsWith('http://') || urlArg.startsWith('https://'))) {
                 const urlRegex = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
                 if (urlRegex.test(urlArg)) {
                    try {
                        mediaToProcess = await MessageMedia.fromUrl(urlArg, { unsafeMime: true });
                    } catch (urlError) { console.error("Error descargando URL:", urlError); await message.reply("No pude descargar desde esa URL. Verifica que sea válida y pública."); return; }
                 } else { await message.reply("URL no parece ser de imagen/GIF válida."); return; }
            }
            else if (message.hasMedia && message.type !== 'sticker') {
                 mediaToProcess = await message.downloadMedia();
            }
            else {
                // El comando de ayuda es !s pero el módulo se llama sticker, accedemos por alias[0]
                const mainCmd = this.aliases[0];
                await message.reply(`Uso:\n1. Responde a img/GIF/video con \`!${mainCmd}\`\n2. Envía \`!${mainCmd} [URL de img/GIF]\`\n3. Envía img/GIF/video con \`!${mainCmd}\` como pie de foto.`);
                return;
            }

            if (mediaToProcess) {
                console.log(`Enviando media como sticker (Tipo: ${mediaToProcess.mimetype})...`);
                await message.reply(mediaToProcess, undefined, {
                    sendMediaAsSticker: true,
                    stickerName: "BotSticker",
                    stickerAuthor: "Mi Bot"
                });
                console.log("Sticker enviado.");
            } else { console.log("No se obtuvo media válida."); }

        } catch (error) {
            console.error("Error procesando sticker:", error);
            await message.reply("❌ Error creando sticker. ¿Es un formato válido? (img, gif, video corto)");
             if (error.message && (error.message.includes('ffmpeg') || error.message.includes('Server blew up'))) {
                 await message.reply("Problema técnico con la conversión. Puede requerir 'ffmpeg' o el archivo no es compatible/muy grande.");
             }
        }
    }
};