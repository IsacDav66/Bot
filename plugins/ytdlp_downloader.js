// --- plugins/ytdlp_downloader.js ---
const { MessageMedia } = require('whatsapp-web.js');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const play = require('play-dl');

const TEMP_MEDIA_PROCESSING_DIR = path.join(__dirname, 'temp_media_processing_ytdlp');
if (!fs.existsSync(TEMP_MEDIA_PROCESSING_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_PROCESSING_DIR, { recursive: true });
}

const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe'); // AJUSTA ESTA RUTA
// ... (tu función checkYtdlpExists como antes) ...
function checkYtdlpExists() { /* ... tu código ... */
    if (!fs.existsSync(YTDLP_PATH) && YTDLP_PATH !== 'yt-dlp' && YTDLP_PATH !== 'yt-dlp.exe') {
        try { require('child_process').execSync(`${YTDLP_PATH} --version`); return true; }
        catch (e) { console.error(`[YTDLP ERR] yt-dlp no encontrado: ${YTDLP_PATH}`); return false; }
    } else if (fs.existsSync(YTDLP_PATH)) return true;
    if (YTDLP_PATH === 'yt-dlp' || YTDLP_PATH === 'yt-dlp.exe') return true;
    console.error(`[YTDLP ERR] Configuración de YTDLP_PATH problemática: ${YTDLP_PATH}.`); return false;
}


const TARGET_COMPRESSION_MB = 28; // Intentar comprimir si es mayor a esto
const WHATSAPP_VIDEO_LIMIT_MB = 60; // Límite duro para no enviar

module.exports = {
    name: 'Descargador YT Avanzado (yt-dlp + ffmpeg Compresión/Edición)',
    aliases: ['playvideo', 'descargamp4'], // Nuevos alias para la versión con compresión
    description: 'Descarga, re-codifica y comprime video de YouTube a MP4.\nEj: `!ytdlpxc <enlace/búsqueda>`',
    category: 'Descargas',
    groupOnly: false,

    async execute(client, message, args) {
        if (!checkYtdlpExists()) {
            return message.reply("❌ Error de configuración: `yt-dlp` no encontrado.");
        }
        // ... (lógica inicial de query, statusMessage, videoInfo como antes) ...
        const queryOrUrl = args.join(' ');
        if (!queryOrUrl) return message.reply('📹 Proporciona un enlace/búsqueda.');
        const tempFilePaths = [];
        let statusMessage = null;

        try {
            statusMessage = await message.reply(`📹 Buscando info: "${queryOrUrl}"...`);
            let videoUrl, videoTitle = "Video YT", videoId = "unknown", videoDurationRaw = "N/A", videoDurationSec = 0;

            if (play.yt_validate(queryOrUrl) === 'video') { /* ... obtener info ... */
                videoUrl = queryOrUrl;
                const info = await play.video_info(videoUrl);
                if (info?.video_details) { ({ title: videoTitle, id: videoId, durationRaw: videoDurationRaw, durationInSec: videoDurationSec } = info.video_details); videoId = videoId || play.extractID(videoUrl); }
            } else {
                if (statusMessage) await statusMessage.edit(`🎶 Buscando video: "${queryOrUrl}"...`);
                const searchResults = await play.search(queryOrUrl, { limit: 1, source: { youtube: 'video' } });
                if (!searchResults?.length) { if (statusMessage) await statusMessage.edit(`😥 No encontré videos.`); else message.reply(`😥 No encontré videos.`); return; }
                ({ url: videoUrl, title: videoTitle, id: videoId, durationRaw: videoDurationRaw, durationInSec: videoDurationSec } = searchResults[0]);
            }
            console.log(`[YTDLPXC] Video: ${videoTitle} (URL: ${videoUrl})`);

            const MAX_VIDEO_DURATION_SEC = 15 * 60; // Límite de 15 minutos
            if (videoDurationSec > MAX_VIDEO_DURATION_SEC) { /* ... mensaje de duración ... */
                const limitMsg = `😥 Video muy largo (${videoDurationRaw}). Límite: ${MAX_VIDEO_DURATION_SEC / 60} min.`;
                if (statusMessage) await statusMessage.edit(limitMsg); else message.reply(limitMsg); return;
            }

            if (statusMessage) await statusMessage.edit(`⬇️ Descargando "${videoTitle}" (${videoDurationRaw}) con yt-dlp...`);
            
            const randomSuffix = crypto.randomBytes(4).toString('hex');
            const ytdlpOutputTemplate = path.join(TEMP_MEDIA_PROCESSING_DIR, `ytdlp_raw_${videoId}_${randomSuffix}.%(ext)s`);
            let ytdlpDownloadedFilePath = null;
            const recodedMp4FileName = `video_recoded_${videoId}_${randomSuffix}.mp4`; // Paso de re-codificación inicial
            let currentProcessingFile = null; // Para rastrear el archivo actual (descargado o re-codificado)

            // --- Descarga con yt-dlp ---
            const ytdlpArgs = [ videoUrl, '-f', 'bv*+ba/b', '--merge-output-format', 'mkv', '--no-playlist', '-o', ytdlpOutputTemplate, '--no-warnings' ];
            console.log(`[YTDLPXC] Ejecutando yt-dlp: ${YTDLP_PATH} ${ytdlpArgs.join(' ')}`);
            const ytdlpProcess = spawn(YTDLP_PATH, ytdlpArgs);
            // ... (manejo de stdout/stderr y promesas para yt-dlp como antes) ...
            let ytdlpErrorOutput = '';
            ytdlpProcess.stderr.on('data', (data) => { ytdlpErrorOutput += data.toString(); console.error(`[YTDLPXC STDERR] ${data.toString().trim()}`); });
            ytdlpProcess.stdout.on('data', (data) => { console.log(`[YTDLPXC STDOUT] ${data.toString().trim()}`); });
            await new Promise((resolve, reject) => { /* ... tu promesa de yt-dlp ... */
                 ytdlpProcess.on('close', (code) => {
                    if (code === 0) {
                        const filesInDir = fs.readdirSync(TEMP_MEDIA_PROCESSING_DIR);
                        const dlFile = filesInDir.find(f => f.startsWith(`ytdlp_raw_${videoId}_${randomSuffix}`));
                        if (dlFile) { ytdlpDownloadedFilePath = path.join(TEMP_MEDIA_PROCESSING_DIR, dlFile); tempFilePaths.push(ytdlpDownloadedFilePath); resolve(); }
                        else reject(new Error('yt-dlp no generó archivo.'));
                    } else reject(new Error(`yt-dlp falló (código ${code}). ${ytdlpErrorOutput.split('\n')[0] || ''}`));
                });
                ytdlpProcess.on('error', (err) => reject(new Error(`No se pudo iniciar yt-dlp: ${err.message}`)));
            });
            if (!ytdlpDownloadedFilePath || !fs.existsSync(ytdlpDownloadedFilePath) || fs.statSync(ytdlpDownloadedFilePath).size === 0) throw new Error('Video de yt-dlp vacío o no encontrado.');
            currentProcessingFile = ytdlpDownloadedFilePath;
            console.log(`[YTDLPXC] yt-dlp descargó: ${currentProcessingFile}`);

            // --- Re-codificación Inicial a MP4 Estándar ---
            if (statusMessage) await statusMessage.edit(`🔄 Re-codificando a MP4 estándar...`);
            const initialRecodedPath = path.join(TEMP_MEDIA_PROCESSING_DIR, recodedMp4FileName);
            tempFilePaths.push(initialRecodedPath);

            await new Promise((resolve, reject) => {
                ffmpeg(currentProcessingFile)
                    .videoCodec('libx264').audioCodec('aac')
                    .outputOptions(['-preset', 'medium', '-crf', '23', '-profile:v', 'baseline', '-level', '3.0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'])
                    .toFormat('mp4').on('error', reject).on('end', resolve)
                    .save(initialRecodedPath);
            });
            if (!fs.existsSync(initialRecodedPath) || fs.statSync(initialRecodedPath).size === 0) throw new Error('MP4 re-codificado inicial vacío.');
            currentProcessingFile = initialRecodedPath; // Ahora trabajamos con este MP4
            console.log(`[YTDLPXC] MP4 estándar en: ${currentProcessingFile} (Tamaño: ${(fs.statSync(currentProcessingFile).size / (1024*1024)).toFixed(2)} MB)`);

            // --- Compresión Adicional si Supera TARGET_COMPRESSION_MB ---
            let finalFileToSend = currentProcessingFile;
            const currentSizeMB = fs.statSync(currentProcessingFile).size / (1024 * 1024);

            if (currentSizeMB > TARGET_COMPRESSION_MB) {
                if (statusMessage) await statusMessage.edit(`📦 Comprimiendo video (era ${currentSizeMB.toFixed(1)}MB)...`);
                const compressedFileName = `video_compressed_${videoId}_${randomSuffix}.mp4`;
                const compressedFilePath = path.join(TEMP_MEDIA_PROCESSING_DIR, compressedFileName);
                tempFilePaths.push(compressedFilePath);

                await new Promise((resolve, reject) => {
                    ffmpeg(currentProcessingFile) // Entrada es el MP4 re-codificado inicial
                        .videoCodec('libx264').audioCodec('aac')
                        .outputOptions([
                            '-preset', 'medium', // Podría usar 'fast' o 'faster' si la compresión es muy lenta
                            '-crf', '28',        // CRF más alto para mayor compresión (menor calidad)
                            '-profile:v', 'baseline', '-level', '3.0',
                            '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                            // Opcional: Reducir resolución si es muy grande y la compresión CRF no es suficiente
                            // '-vf', 'scale=iw/N:ih/N' o 'scale=-2:480' (para altura 480p, ajusta el ancho)
                        ])
                        .toFormat('mp4').on('error', reject).on('end', resolve)
                        .save(compressedFilePath);
                });

                if (fs.existsSync(compressedFilePath) && fs.statSync(compressedFilePath).size > 0) {
                    finalFileToSend = compressedFilePath;
                    console.log(`[YTDLPXC] Video comprimido en: ${finalFileToSend} (Tamaño: ${(fs.statSync(finalFileToSend).size / (1024*1024)).toFixed(2)} MB)`);
                } else {
                    console.warn("[YTDLPXC] Falló la compresión adicional, se usará el video re-codificado inicial.");
                    // finalFileToSend sigue siendo currentProcessingFile (el MP4 re-codificado sin compresión extra)
                }
            }

            const finalFileSizeMB = fs.statSync(finalFileToSend).size / (1024 * 1024);
            if (finalFileSizeMB > WHATSAPP_VIDEO_LIMIT_MB) {
                const limitMsg = `😥 Video final "${videoTitle}" (${finalFileSizeMB.toFixed(2)} MB) sigue siendo grande (límite ~${WHATSAPP_VIDEO_LIMIT_MB}MB). Enlace: ${videoUrl}`;
                if (statusMessage) await statusMessage.edit(limitMsg); else message.reply(limitMsg);
                return;
            }

            if (statusMessage) await statusMessage.edit(`▶️ Preparando envío: *${videoTitle}*`);

            const media = MessageMedia.fromFilePath(finalFileToSend);
            const friendlyFileName = `${videoTitle.replace(/[<>:"/\\|?*]+/g, '').trim()}.mp4`.substring(0, 250);
            media.filename = friendlyFileName;

            await client.sendMessage(message.from, media, { caption: `✅ ¡Video listo!\n\n*${videoTitle}*\n${videoUrl}` });
            console.log(`[YTDLPXC] Video "${videoTitle}" enviado.`);

            if (statusMessage) { // Opcional: Borrar el mensaje de estado después de un envío exitoso
                 try { await statusMessage.delete(true); } catch(delErr) {}
            }

        } catch (error) { /* ... tu bloque catch mejorado con edición de statusMessage ... */
            console.error('[YTDLPXC EXEC ERR]', error);
            let errorMessage = '😕 Hubo un error procesando el video.';
            const errMsgLower = error?.message?.toLowerCase() || "";
            if (errMsgLower.includes('unavailable') || errMsgLower.includes('private') || errMsgLower.includes('age-restricted')) errorMessage = '😥 Video privado o restringido.';
            else if (errMsgLower.includes('no results')) errorMessage = `😥 No encontré videos para "${queryOrUrl}".`;
            else if (errMsgLower.includes('yt-dlp falló')) errorMessage = `😕 yt-dlp tuvo un problema: ${error.message.substring(0,100)}`;
            else if (errMsgLower.includes('ffmpeg')) errorMessage = `😕 Problema convirtiendo: ${error.message.substring(0,100)}`;
            else if (errMsgLower.includes('vacío') || errMsgLower.includes('empty')) errorMessage = '😕 Archivo procesado vacío.';
            
            if (statusMessage) { try { await statusMessage.edit(errorMessage); } catch { await message.reply(errorMessage); } }
            else { await message.reply(errorMessage); }
        } finally {
            // ... (tu bloque finally para limpiar todos los archivos en tempFilePaths) ...
            for (const filePath of tempFilePaths) {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
                catch (cleanupError) { console.error(`[YTDLPXC CLEANUP ERR] ${filePath}:`, cleanupError); }
            }
        }
    }
};