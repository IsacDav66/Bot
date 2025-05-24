// --- plugins/ytlyrics.js ---
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const play = require('play-dl');
const axios = require('axios');   // <--- NUEVO
const cheerio = require('cheerio'); // <--- NUEVO

const TEMP_LYRICS_DIR = path.join(__dirname, 'temp_lyrics_processing_ytl');
// ... (resto de constantes y checkYtdlpExists como antes) ...
if (!fs.existsSync(TEMP_LYRICS_DIR)) { fs.mkdirSync(TEMP_LYRICS_DIR, { recursive: true }); }
const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe');
function checkYtdlpExists() { /* ... */
    if (!fs.existsSync(YTDLP_PATH) && YTDLP_PATH !== 'yt-dlp' && YTDLP_PATH !== 'yt-dlp.exe') {
        try { require('child_process').execSync(`${YTDLP_PATH} --version`); return true; }
        catch (e) { console.error(`[LYRICS ERR] yt-dlp no encontrado: ${YTDLP_PATH}`); return false; }
    } else if (fs.existsSync(YTDLP_PATH)) return true;
    if (YTDLP_PATH === 'yt-dlp' || YTDLP_PATH === 'yt-dlp.exe') return true;
    console.error(`[LYRICS ERR] Configuración de YTDLP_PATH problemática: ${YTDLP_PATH}.`); return false;
}


function parseSubtitleContent(content, format = 'vtt') { /* ... (sin cambios) ... */
    let lines = [];
    if (format === 'vtt') {
        const rawLines = content.split(/\r?\n/); let collectingText = false;
        for (const line of rawLines) {
            if (line.includes('-->')) { collectingText = true; continue; }
            if (line.trim() === '' && collectingText) { collectingText = false; if (lines.length > 0 && lines[lines.length -1] !== '') lines.push(''); continue; }
            if (collectingText && line.trim() !== 'WEBVTT' && !/^[0-9]+$/.test(line.trim())) lines.push(line.trim().replace(/<[^>]+>/g, ''));
        }
    } else if (format === 'srt') {
        const blocks = content.split(/\r?\n\r?\n/);
        for (const block of blocks) {
            const parts = block.split(/\r?\n/);
            if (parts.length >= 3) { for (let i = 2; i < parts.length; i++) lines.push(parts[i].trim().replace(/<[^>]+>/g, '')); if (blocks.length > 1) lines.push('');}
        }
    }
    return lines.filter((line, index, self) => line !== '' || (index > 0 && self[index-1] !== '')).join('\n');
}

// --- NUEVA FUNCIÓN PARA BUSCAR LETRAS EN GENIUS (EJEMPLO) ---
async function fetchLyricsFromGenius(songTitle, artistName = "") {
    try {
        let searchTerm = songTitle;
        if (artistName) searchTerm += ` ${artistName}`;
        console.log(`[LYRICS GENIUS] Buscando en Genius: "${searchTerm}"`);

        // 1. Buscar en Genius para obtener el enlace a la página de la canción
        const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(searchTerm)}`;
        // Necesitarás un Access Token de Cliente de la API de Genius
        // Ve a https://genius.com/api-clients para crear uno. ¡Mantenlo seguro!
        const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN || "Y5OdriUVNDrtftzSgBd0lh454cHPm8Qnah9z5X052IejEoxPwvVrIOQpXuzyTtUG"; // ¡REEMPLAZA ESTO!

        if (GENIUS_ACCESS_TOKEN === "TU_ACCESS_TOKEN_DE_GENIUS_AQUI") {
            console.warn("[LYRICS GENIUS] Falta el Access Token de Genius. La búsqueda de letras alternativas fallará.");
            return null;
        }

        const searchResponse = await axios.get(searchUrl, {
            headers: { 'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}` }
        });

        if (searchResponse.data.meta.status !== 200 || !searchResponse.data.response.hits || searchResponse.data.response.hits.length === 0) {
            console.log('[LYRICS GENIUS] No se encontraron resultados en la API de Genius.');
            return null;
        }

        const songPageUrl = searchResponse.data.response.hits[0].result.url;
        if (!songPageUrl) {
            console.log('[LYRICS GENIUS] No se encontró URL de la página de la canción en Genius.');
            return null;
        }
        console.log(`[LYRICS GENIUS] URL de la canción encontrada: ${songPageUrl}`);

        // 2. Obtener el HTML de la página de la canción y extraer las letras
        const pageResponse = await axios.get(songPageUrl);
        const $ = cheerio.load(pageResponse.data);

        // Genius usa diferentes selectores, este es uno común. Puede cambiar.
        // El contenedor principal de las letras a menudo tiene data-lyrics-container="true"
        let lyrics = $('div[data-lyrics-container="true"]').html();

        if (!lyrics) { // Intenta con otro selector si el primero falla
            lyrics = $('.lyrics').html(); // Selector más antiguo
        }
        if (!lyrics) { // Otro intento
             $('div[class^="Lyrics__Container"]').each((i, el) => {
                $(el).find('br').replaceWith('\n'); // Reemplazar <br> con saltos de línea
                lyrics += $(el).text() + '\n';
            });
        }


        if (!lyrics || lyrics.trim() === "") {
            console.log('[LYRICS GENIUS] No se pudieron extraer las letras de la página de Genius.');
            return null;
        }

        // Limpiar el HTML de las letras (reemplazar <br> con \n, quitar otros tags)
        lyrics = lyrics.replace(/<br\s*\/?>/gi, '\n') // Reemplazar <br>
                       .replace(/<a [^>]*>([^<]+)<\/a>/gi, '$1') // Quitar <a> tags pero mantener texto
                       .replace(/<[^>]+>/g, '') // Quitar todos los demás tags HTML
                       .trim();

        // Decodificar entidades HTML (ej. & -> &)
        const he = require('he'); // npm install he
        lyrics = he.decode(lyrics);


        return lyrics.split('\n').map(line => line.trim()).filter(line => line !== "").join('\n');

    } catch (error) {
        console.error('[LYRICS GENIUS] Error buscando letras en Genius:', error.message);
        if (error.response && error.response.status === 401) {
            console.error("[LYRICS GENIUS] Error 401: Token de acceso de Genius inválido o expirado.");
        }
        return null;
    }
}
// --- FIN FUNCIÓN GENIUS ---


module.exports = {
    name: 'Obtener Letras/Subtítulos (YT + Genius)',
    // ... (aliases, description, groupOnly como antes) ...
    aliases: ['lyrics', 'letra', 'subtitulos', 'ytlyrics'],
    description: 'Obtiene subtítulos de YT o letras de Genius.\nEj: `!lyrics <enlace/búsqueda>`',
    category: 'Descargas',
    groupOnly: false,

    async execute(client, message, args) {
        if (!checkYtdlpExists()) return message.reply("❌ yt-dlp no encontrado.");

        const queryOrUrl = args.join(' ');
        if (!queryOrUrl) return message.reply('📜 Proporciona enlace/búsqueda.');

        const tempFilePaths = [];
        let statusMessage = null;
        let lyricsText = null;
        let lyricsSource = "YouTube"; // Fuente por defecto

        try {
            statusMessage = await message.reply(`📜 Buscando info: "${queryOrUrl}"...`);
            let videoUrl, videoTitle = "Video/Canción", videoId = "unknown", artistName = "";

            if (play.yt_validate(queryOrUrl) === 'video') {
                videoUrl = queryOrUrl;
                const info = await play.video_info(videoUrl);
                if (info?.video_details) {
                    videoTitle = info.video_details.title;
                    videoId = info.video_details.id || play.extractID(videoUrl);
                    artistName = info.video_details.channel?.name || ""; // Intentar obtener artista del canal
                }
            } else {
                if (statusMessage) await statusMessage.edit(`📜 Buscando: "${queryOrUrl}"...`);
                else statusMessage = await message.reply(`📜 Buscando: "${queryOrUrl}"...`);
                const searchResults = await play.search(queryOrUrl, { limit: 1 }); // Búsqueda más general
                if (!searchResults?.length) { /* ... no encontrado ... */ if(statusMessage) await statusMessage.edit(`😥 No encontré resultados.`); else message.reply(`😥 No encontré resultados.`); return; }

                if (searchResults[0].type === 'video') {
                    ({ url: videoUrl, title: videoTitle, id: videoId } = searchResults[0]);
                    artistName = searchResults[0].channel?.name || "";
                } else if (searchResults[0].type === 'track' && searchResults[0].แหล่งที่มา === 'youtube') { // Si play-dl devuelve un 'track' de YT
                     videoUrl = searchResults[0].url;
                     videoTitle = searchResults[0].title;
                     artistName = searchResults[0].artist?.name || searchResults[0].channel?.name || "";
                     videoId = searchResults[0].id;
                } else {
                    videoTitle = queryOrUrl; // Usar query como título si no es video de YT
                    artistName = ""; // No podemos inferir artista fácilmente
                    console.log("[LYRICS] Búsqueda no es un video de YT directo, se intentará Genius con el query.");
                }
            }
            console.log(`[LYRICS] Título base para letras: ${videoTitle}, Artista: ${artistName}`);

            // --- Intento 1: Subtítulos de YouTube con yt-dlp ---
            if (videoUrl) { // Solo intentar yt-dlp si tenemos una URL de video de YT
                if (statusMessage) await statusMessage.edit(`⬇️ Buscando subtítulos en YouTube para "${videoTitle}"...`);
                else statusMessage = await message.reply(`⬇️ Buscando subtítulos en YouTube para "${videoTitle}"...`);

                const randomSuffix = crypto.randomBytes(4).toString('hex');
                const subtitleOutputTemplate = path.join(TEMP_LYRICS_DIR, `subs_${videoId}_${randomSuffix}.%(ext)s`);
                let downloadedSubtitlePath = null; let subtitleFormat = 'vtt';
                const ytdlpArgs = [ videoUrl, '--write-subs', '--write-auto-subs', '--sub-langs', 'es,en', '--skip-download', '--no-playlist', '-o', subtitleOutputTemplate, '--no-warnings' ];
                const ytdlpProcess = spawn(YTDLP_PATH, ytdlpArgs);
                let ytdlpSuccess = false;
                // ... (manejo de stdout/stderr y promesas para yt-dlp) ...
                await new Promise((resolve) => {
                    ytdlpProcess.on('close', (code) => {
                        if (code === 0) {
                            const filesInDir = fs.readdirSync(TEMP_LYRICS_DIR);
                            const subFile = filesInDir.find(f => f.startsWith(`subs_${videoId}_${randomSuffix}`));
                            if (subFile) { downloadedSubtitlePath = path.join(TEMP_LYRICS_DIR, subFile); tempFilePaths.push(downloadedSubtitlePath); subtitleFormat = path.extname(downloadedSubtitlePath).substring(1); ytdlpSuccess = true; }
                        }
                        resolve(); // Resolver siempre, incluso si falla, para intentar Genius
                    });
                    ytdlpProcess.on('error', resolve); // Resolver en error para intentar Genius
                });

                if (ytdlpSuccess && downloadedSubtitlePath && fs.existsSync(downloadedSubtitlePath)) {
                    const subtitleFileContent = fs.readFileSync(downloadedSubtitlePath, 'utf8');
                    lyricsText = parseSubtitleContent(subtitleFileContent, subtitleFormat);
                    if (lyricsText && lyricsText.trim() !== "") {
                        console.log(`[LYRICS] Subtítulos de YouTube encontrados y parseados.`);
                        lyricsSource = "YouTube";
                    } else {
                        lyricsText = null; // No se pudo parsear o estaba vacío
                        console.log(`[LYRICS] Subtítulos de YouTube descargados pero vacíos o no parseables.`);
                    }
                } else {
                    console.log(`[LYRICS] No se encontraron subtítulos en YouTube o yt-dlp falló.`);
                }
            }


            // --- Intento 2: Letras de Genius si YouTube falló o no se intentó ---
            if (!lyricsText) {
                lyricsSource = "Genius.com";
                if (statusMessage) await statusMessage.edit(`☁️ No se encontraron subtítulos en YT. Buscando letra en ${lyricsSource} para "${videoTitle}"...`);
                else statusMessage = await message.reply(`☁️ No se encontraron subtítulos en YT. Buscando letra en ${lyricsSource} para "${videoTitle}"...`);

                // Para Genius, es mejor tener título de canción y artista si es posible
                // Intentar extraer artista y título de forma más limpia de videoTitle si es un formato "Artista - Título"
                let songQuery = videoTitle;
                let artistQuery = artistName;

                if (!artistQuery && videoTitle.includes(" - ")) {
                    const parts = videoTitle.split(" - ");
                    artistQuery = parts[0].trim();
                    songQuery = parts.slice(1).join(" - ").trim();
                }
                // Remover cosas como (Official Video), (Letra), etc. del título de la canción para Genius
                songQuery = songQuery.replace(/\s*\(.*?(official|video|lyric|audio|लाइव|ریمیکس|ریمیکس|现场|MV|Lyric).*\)/gi, "").trim();


                lyricsText = await fetchLyricsFromGenius(songQuery, artistQuery);
            }


            // --- Enviar Resultados ---
            if (lyricsText && lyricsText.trim() !== "") {
                const finalText = `📜 Letra/Subtítulos para: *${videoTitle}*\n(Fuente: ${lyricsSource})\n\n${lyricsText}`;
                const MAX_MSG_LENGTH = 3500;
                if (finalText.length > MAX_MSG_LENGTH) {
                    if (statusMessage) await statusMessage.edit(`📄 Letra muy larga, enviando en partes...`);
                    else statusMessage = await message.reply(`📄 Letra muy larga, enviando en partes...`);
                    for (let i = 0; i < finalText.length; i += MAX_MSG_LENGTH) { /* ... enviar chunks ... */
                        const chunk = finalText.substring(i, i + MAX_MSG_LENGTH);
                        await client.sendMessage(message.from, chunk);
                        if (i + MAX_MSG_LENGTH < finalText.length) await new Promise(r => setTimeout(r, 500));
                    }
                    if (statusMessage) { try {await statusMessage.delete(true); } catch(e){}}
                } else {
                    if (statusMessage) await statusMessage.edit(finalText); else await message.reply(finalText);
                }
                console.log(`[LYRICS] Letras/Subtítulos enviados para "${videoTitle}".`);
            } else {
                const notFoundError = `😥 No se pudieron encontrar letras ni subtítulos para "${videoTitle}" en YouTube ni en Genius.`;
                if (statusMessage) await statusMessage.edit(notFoundError); else await message.reply(notFoundError);
            }

        } catch (error) { /* ... tu bloque catch mejorado con edición de statusMessage ... */
            console.error('[LYRICS EXEC ERR]', error);
            let errorMessage = '😕 Hubo un error al obtener la letra.';
            // ... (tu lógica de mensajes de error)
            if (statusMessage) { try { await statusMessage.edit(errorMessage); } catch { await message.reply(errorMessage); } }
            else { await message.reply(errorMessage); }
        } finally { /* ... tu bloque finally para limpiar tempFilePaths ... */
            for (const filePath of tempFilePaths) {
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
                catch (cleanupError) { console.error(`[LYRICS CLEANUP ERR] ${filePath}:`, cleanupError); }
            }
        }
    }
};