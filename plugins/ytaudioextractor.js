// --- plugins/ytaudioextractor.js ---
const { MessageMedia } = require('whatsapp-web.js');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const play = require('play-dl');

const TEMP_AUDIO_PROCESSING_DIR = path.join(__dirname, 'temp_audio_processing_ytae');
if (!fs.existsSync(TEMP_AUDIO_PROCESSING_DIR)) {
    fs.mkdirSync(TEMP_AUDIO_PROCESSING_DIR, { recursive: true });
}
// --- IMPORTANTE: Ruta a tu archivo de cookies ---
const COOKIES_FILE_PATH = path.join(__dirname, 'cookies.txt'); // Ejemplo: si cookies.txt está en la raíz del bot

// --- IMPORTANTE: CONFIGURA LA RUTA A TU yt-dlp.exe ---
// Usaremos yt-dlp para descargar el video fuente, ya que es robusto
const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe'); // AJUSTA ESTA RUTA
// ... (tu función checkYtdlpExists como en el script anterior) ...
function checkYtdlpExists() { /* ... tu código ... */
    if (!fs.existsSync(YTDLP_PATH) && YTDLP_PATH !== 'yt-dlp' && YTDLP_PATH !== 'yt-dlp.exe') {
        try { require('child_process').execSync(`${YTDLP_PATH} --version`); return true; }
        catch (e) { console.error(`[YTAE ERR] yt-dlp no encontrado: ${YTDLP_PATH}`); return false; }
    } else if (fs.existsSync(YTDLP_PATH)) return true;
    if (YTDLP_PATH === 'yt-dlp' || YTDLP_PATH === 'yt-dlp.exe') return true;
    console.error(`[YTAE ERR] Configuración de YTDLP_PATH problemática: ${YTDLP_PATH}.`); return false;
}

// Opcional: Si ffmpeg no está en tu PATH global
// const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
// ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = {
    name: 'Extractor de Audio YouTube (MP3)',
    aliases: ['ytmp3', 'getaudio', 'ytaudio'],
    description: 'Descarga un video de YouTube, extrae el audio y lo envía como MP3.\nEj: `!ytmp3 <enlace/búsqueda>`',
    category: 'Descargas',
    groupOnly: false,

    async execute(client, message, args) {
        if (!checkYtdlpExists()) { // Todavía necesitamos yt-dlp para la descarga inicial robusta
            return message.reply("❌ Error de configuración: `yt-dlp` no encontrado.");
        }

        const queryOrUrl = args.join(' ');
        if (!queryOrUrl) {
            return message.reply('🎶 Por favor, proporciona un enlace de YouTube o un término de búsqueda.');
        }

        const tempFilePaths = [];
        let statusMessage = null;

        try {
            statusMessage = await message.reply(`🎶 Buscando información para: "${queryOrUrl}"...`);

            let videoUrl, videoTitle = "Audio de YouTube", videoId = "unknown", videoDurationRaw = "N/A", videoDurationSec = 0;

            if (play.yt_validate(queryOrUrl) === 'video') { /* ... obtener info ... */
                videoUrl = queryOrUrl;
                const info = await play.video_info(videoUrl);
                if (info?.video_details) { ({ title: videoTitle, id: videoId, durationRaw: videoDurationRaw, durationInSec: videoDurationSec } = info.video_details); videoId = videoId || play.extractID(videoUrl); }
            } else {
                if (statusMessage) await statusMessage.edit(`🎶 Buscando video para: "${queryOrUrl}"...`);
                else statusMessage = await message.reply(`🎶 Buscando video para: "${queryOrUrl}"...`);
                const searchResults = await play.search(queryOrUrl, { limit: 1, source: { youtube: 'video' } });
                if (!searchResults?.length) { if (statusMessage) await statusMessage.edit(`😥 No encontré videos.`); else message.reply(`😥 No encontré videos.`); return; }
                ({ url: videoUrl, title: videoTitle, id: videoId, durationRaw: videoDurationRaw, durationInSec: videoDurationSec } = searchResults[0]);
            }
            console.log(`[YTAE] Video para extraer audio: ${videoTitle} (URL: ${videoUrl})`);

            const MAX_AUDIO_DURATION_SEC = 20 * 60; // Límite de 20 minutos para audio (puedes ajustar)
            if (videoDurationSec > MAX_AUDIO_DURATION_SEC) {
                const limitMsg = `😥 El audio de "${videoTitle}" (${videoDurationRaw}) es demasiado largo. Límite: ${MAX_AUDIO_DURATION_SEC / 60} min.`;
                if (statusMessage) await statusMessage.edit(limitMsg); else message.reply(limitMsg); return;
            }

            if (statusMessage) await statusMessage.edit(`⬇️ Descargando fuente para "${videoTitle}" (${videoDurationRaw})...`);
            
            const randomSuffix = crypto.randomBytes(4).toString('hex');
            // ****** DEFINIR outputTemplate AQUÍ ******
            const outputTemplate = path.join(TEMP_AUDIO_PROCESSING_DIR, `ytae_source_${videoId}_${randomSuffix}.%(ext)s`);
            // ****************************************
            // yt-dlp descargará el mejor formato que contenga audio (puede ser video+audio o solo audio)
            const ytdlpOutputTemplate = path.join(TEMP_AUDIO_PROCESSING_DIR, `ytae_source_${videoId}_${randomSuffix}.%(ext)s`);
            let ytdlpDownloadedFilePath = null;

            const mp3OutputFileName = `audio_final_${videoId}_${randomSuffix}.mp3`;
            const mp3OutputPath = path.join(TEMP_AUDIO_PROCESSING_DIR, mp3OutputFileName);
            tempFilePaths.push(mp3OutputPath); // El MP3 final siempre se intentará eliminar


            // --- Descarga con yt-dlp (mejor audio o mejor formato general si es necesario) ---
            // -x o --extract-audio es una opción de yt-dlp, pero a veces es mejor descargar y luego ffmpeg
            // para más control. Por ahora, descargaremos un buen formato de video/audio.
            const ytdlpArgs = [
                videoUrl,
                '-f', 'bestaudio[ext=m4a]/bestaudio/best[ext=mp4]/best', // Prioriza M4A audio, luego mejor audio, luego mejor MP4 (que tendrá audio)
                '--no-playlist',
                '-o', ytdlpOutputTemplate,
                '--no-warnings',
            ];
            
            // Añadir argumento de cookies si el archivo existe
            if (fs.existsSync(COOKIES_FILE_PATH)) {
                ytdlpArgs.push('--cookies', COOKIES_FILE_PATH);
                console.log(`[YTDLP/YTAE/LYRICS] Usando archivo de cookies: ${COOKIES_FILE_PATH}`);
            } else {
                console.warn(`[YTDLP/YTAE/LYRICS] Archivo de cookies no encontrado en ${COOKIES_FILE_PATH}. La descarga podría fallar si YouTube requiere autenticación/verificación.`);
            }

            // Añadir el resto de tus argumentos
            ytdlpArgs.push('--no-playlist', '-o', outputTemplate, '--no-warnings');

            console.log(`[YTDLP/YTAE/LYRICS] Ejecutando: ${YTDLP_PATH} ${ytdlpArgs.join(' ')}`);
            const ytdlpProcess = spawn(YTDLP_PATH, ytdlpArgs);
            let ytdlpErrorOutput = '';
            ytdlpProcess.stderr.on('data', (data) => { ytdlpErrorOutput += data.toString(); console.error(`[YTAE STDERR] ${data.toString().trim()}`); });
            ytdlpProcess.stdout.on('data', (data) => { console.log(`[YTAE STDOUT] ${data.toString().trim()}`); });

            await new Promise((resolve, reject) => { /* ... tu promesa de yt-dlp ... */
                 ytdlpProcess.on('close', (code) => {
                    if (code === 0) {
                        const filesInDir = fs.readdirSync(TEMP_AUDIO_PROCESSING_DIR);
                        const dlFile = filesInDir.find(f => f.startsWith(`ytae_source_${videoId}_${randomSuffix}`));
                        if (dlFile) { ytdlpDownloadedFilePath = path.join(TEMP_AUDIO_PROCESSING_DIR, dlFile); tempFilePaths.push(ytdlpDownloadedFilePath); resolve(); }
                        else reject(new Error('yt-dlp no generó archivo fuente.'));
                    } else reject(new Error(`yt-dlp falló (código ${code}). ${ytdlpErrorOutput.split('\n')[0] || ''}`));
                });
                ytdlpProcess.on('error', (err) => reject(new Error(`No se pudo iniciar yt-dlp: ${err.message}`)));
            });

            if (!ytdlpDownloadedFilePath || !fs.existsSync(ytdlpDownloadedFilePath) || fs.statSync(ytdlpDownloadedFilePath).size === 0) {
                throw new Error('Archivo fuente de yt-dlp vacío o no encontrado.');
            }
            console.log(`[YTAE] yt-dlp descargó fuente en: ${ytdlpDownloadedFilePath}`);

            // --- Extracción y Conversión a MP3 con ffmpeg ---
            if (statusMessage) await statusMessage.edit(`🔄 Extrayendo y convirtiendo audio a MP3...`);
            else statusMessage = await message.reply(`🔄 Extrayendo y convirtiendo audio a MP3...`);

            await new Promise((resolve, reject) => {
                ffmpeg(ytdlpDownloadedFilePath) // Entrada es el archivo descargado por yt-dlp
                    .noVideo() // No incluir pista de video
                    .audioCodec('libmp3lame') // Códec MP3
                    .audioBitrate('192k')     // Calidad del MP3 (128k, 192k, 256k, 320k)
                    .toFormat('mp3')
                    .on('error', (err) => {
                        console.error('[YTAE FFMPEG ERR]', err.message);
                        reject(new Error(`Error durante la conversión a MP3: ${err.message.split('\n')[0]}`));
                    })
                    .on('end', () => {
                        console.log('[YTAE FFMPEG] Conversión a MP3 finalizada.');
                        resolve();
                    })
                    .save(mp3OutputPath);
            });

            if (!fs.existsSync(mp3OutputPath) || fs.statSync(mp3OutputPath).size === 0) {
                throw new Error('El archivo MP3 convertido está vacío o no existe.');
            }
            console.log(`[YTAE] Audio MP3 final en: ${mp3OutputPath} (Tamaño: ${(fs.statSync(mp3OutputPath).size / (1024*1024)).toFixed(2)} MB)`);

            // --- Envío del Audio MP3 ---
            const fileSizeMB = fs.statSync(mp3OutputPath).size / (1024 * 1024);
            const WHATSAPP_AUDIO_LIMIT_MB = 16; // Límite más común para audios en WhatsApp
            if (fileSizeMB > WHATSAPP_AUDIO_LIMIT_MB) {
                const limitMsg = `😥 El audio procesado "${videoTitle}" (${fileSizeMB.toFixed(2)} MB) es demasiado grande para enviar por WhatsApp (límite ~${WHATSAPP_AUDIO_LIMIT_MB}MB).`;
                if (statusMessage) await statusMessage.edit(limitMsg); else message.reply(limitMsg);
                return;
            }

            if (statusMessage) await statusMessage.edit(`▶️ Preparando envío de audio: *${videoTitle}*`);

            const media = MessageMedia.fromFilePath(mp3OutputPath);
            const friendlyFileName = `${videoTitle.replace(/[<>:"/\\|?*]+/g, '').trim()}.mp3`.substring(0, 250);
            media.filename = friendlyFileName; // Nombre de archivo amigable

            // Enviar como audio, no como nota de voz
            await client.sendMessage(message.from, media, { sendAudioAsVoice: false });
            console.log(`[YTAE] Audio MP3 "${videoTitle}" enviado.`);

            if (statusMessage) {
                 try { await statusMessage.delete(true); } catch(delErr) {} // Opcional: borrar mensaje de estado
            }

        } catch (error) { /* ... tu bloque catch mejorado con edición de statusMessage ... */
            console.error('[YTAE EXEC ERR]', error);
            let errorMessage = '😕 Hubo un error al procesar el audio.';
            const errMsgLower = error?.message?.toLowerCase() || "";
            if (errMsgLower.includes('unavailable') || errMsgLower.includes('private') || errMsgLower.includes('age-restricted')) errorMessage = '😥 Video privado o restringido.';
            else if (errMsgLower.includes('no results')) errorMessage = `😥 No encontré videos para "${queryOrUrl}".`;
            else if (errMsgLower.includes('yt-dlp falló')) errorMessage = `😕 yt-dlp tuvo un problema: ${error.message.substring(0,100)}`;
            else if (errMsgLower.includes('ffmpeg') || errMsgLower.includes('mp3')) errorMessage = `😕 Problema convirtiendo a MP3: ${error.message.substring(0,100)}`;
            else if (errMsgLower.includes('vacío') || errMsgLower.includes('empty')) errorMessage = '😕 Archivo procesado vacío.';
            
            if (statusMessage) { try { await statusMessage.edit(errorMessage); } catch { await message.reply(errorMessage); } }
            else { await message.reply(errorMessage); }
        } finally {
            // ... (tu bloque finally para limpiar todos los archivos en tempFilePaths) ...
            for (const filePath of tempFilePaths) {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
                catch (cleanupError) { console.error(`[YTAE CLEANUP ERR] ${filePath}:`, cleanupError); }
            }
        }
    }
};