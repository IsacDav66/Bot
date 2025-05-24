// --- plugins/sopa.js ---
const { MessageMedia } = require('whatsapp-web.js');
const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs').promises; // Usar promesas para fs
const path = require('path'); // Para manejar rutas de archivos

// --- Estado del Juego ---
// Estructura: Map<chatId, {
//   grid: string[][],
//   placements: { word: string, startRow: number, startCol: number, direction: {dr: number, dc: number}, found: boolean }[],
//   startTime: number,
//   size: number
// }>
const activeGames = new Map();
const GAME_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

// --- Configuración ---
const DEFAULT_GRID_SIZE = 10;
const MAX_GRID_SIZE = 15; // Limitar tamaño para mejor visualización en imagen
const MIN_GRID_SIZE = 7;  // Un poco más pequeño es viable en imagen
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_PLACEMENT_ATTEMPTS = 50;

// --- Lista de Palabras ---
const WORD_CATEGORIES = {
    animales: ["PERRO", "GATO", "LEON", "TIGRE", "ELEFANTE", "JIRAFA", "MONO", "OSO", "LOBO", "ZORRO", "CABALLO", "VACA", "CEBRA", "RATON", "PAJARO"],
    frutas: ["MANZANA", "PLATANO", "NARANJA", "FRESA", "UVA", "SANDIA", "MELON", "PIÑA", "MANGO", "PERA", "KIWI", "CEREZA", "LIMON"],
    programacion: ["CODIGO", "FUNCION", "VARIABLE", "CLASE", "OBJETO", "BUCLE", "PLUGIN", "BOT", "ERROR", "DEBUG", "SCRIPT", "ARRAY", "STRING", "NUMBER", "BOOLEAN"],
    general: ["HOLA", "WHATSAPP", "JUEGO", "AMIGO", "GRUPO", "MENSAJE", "NUMERO", "LETRA", "PALABRA", "TIEMPO", "BOT", "IMAGEN", "CASA", "AGUA", "FUEGO"],
};

// --- Direcciones ---
const DIRECTIONS = [
    { name: 'H+', dr: 0, dc: 1 },  // Horizontal ->
    { name: 'H-', dr: 0, dc: -1 }, // Horizontal <-
    { name: 'V+', dr: 1, dc: 0 },  // Vertical v
    { name: 'V-', dr: -1, dc: 0 }, // Vertical ^
    { name: 'D++', dr: 1, dc: 1 },  // Diagonal \ v
    { name: 'D+-', dr: 1, dc: -1 }, // Diagonal / v
    { name: 'D-+', dr: -1, dc: 1 }, // Diagonal / ^
    { name: 'D--', dr: -1, dc: -1 }  // Diagonal \ ^
];

// --- Funciones Auxiliares ---

function getLetterFromIndex(index) {
    return String.fromCharCode(65 + index);
}

function parseCoordinates(coordString, gridSize) {
    if (!coordString) return null;
    const match = coordString.toUpperCase().match(/^([A-Z])([1-9][0-9]?)$/);
    if (!match) return null;
    const letter = match[1];
    const number = parseInt(match[2], 10);
    const col = letter.charCodeAt(0) - 65;
    const row = number - 1;
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col };
    }
    return null;
}

function chooseWords(count, category = 'general', size = DEFAULT_GRID_SIZE) {
    let wordPool = WORD_CATEGORIES[category] || WORD_CATEGORIES['general'];
    if (!wordPool) wordPool = [];
    else if (category === 'todas') wordPool = Object.values(WORD_CATEGORIES).flat();
    if (!Array.isArray(wordPool)) wordPool = [];

    const maxSize = size;
    const filteredPool = wordPool.filter(word => word.length > 1 && word.length <= maxSize); // Mínimo 2 letras, máx tamaño

    if (filteredPool.length === 0) {
        console.warn(`[SOPA chooseWords] No quedaron palabras válidas para cat='${category}', size=${maxSize}.`);
        return [];
    }

    try {
        const uniqueWords = [...new Set(filteredPool)];
        return uniqueWords.sort(() => 0.5 - Math.random()).slice(0, count);
    } catch (error) {
        console.error("[SOPA chooseWords] Error:", error);
        return [];
    }
}

function createEmptyGrid(size) {
    return Array(size).fill(null).map(() => Array(size).fill(' '));
}

function tryPlaceWord(grid, word) {
    const size = grid.length;
    const directions = [...DIRECTIONS].sort(() => 0.5 - Math.random());

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
        const dir = directions[attempt % directions.length];
        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);
        let canPlace = true;
        const placements = [];

        for (let i = 0; i < word.length; i++) {
            const r = startRow + i * dir.dr;
            const c = startCol + i * dir.dc;
            if (r < 0 || r >= size || c < 0 || c >= size) { canPlace = false; break; }
            const existingChar = grid[r][c];
            if (existingChar !== ' ' && existingChar !== word[i]) { canPlace = false; break; }
            placements.push({ r, c, char: word[i] });
        }

        if (canPlace) {
            placements.forEach(p => grid[p.r][p.c] = p.char);
            return { success: true, startRow, startCol, direction: dir };
        }
    }
    return { success: false };
}

function fillEmptyCells(grid) {
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === ' ') {
                grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
            }
        }
    }
}

// --- FUNCIÓN: Generar Imagen ---
async function generateGameImage(grid, placements, title = "🔎 Sopa de Letras 🔎", chatId) {
    const size = grid.length;
    const tempDir = path.join(require('os').tmpdir(), 'mi-bot-wa-temp');
    const outputPath = path.join(tempDir, `sopa_${chatId}_${Date.now()}.png`);

    try {
        await fs.mkdir(tempDir, { recursive: true });
    } catch (err) {
        console.error("[SOPA IMG] Error creando directorio temporal:", err);
        return null;
    }

    // --- Generar HTML (sin cambios en el HTML en sí) ---
    let htmlContent = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                /* El CSS sigue siendo relevante para dar estilo DENTRO del container */
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 10px; margin: 0;} /* El fondo del body ya no importará */
                .container { background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: inline-block; border: 1px solid #ddd;}
                h2 { text-align: center; margin-top: 5px; margin-bottom: 15px; color: #333; font-weight: 600; }
                table { border-collapse: collapse; margin: 0 auto; background-color: #fff; }
                th, td { border: 1px solid #d0d0d0; width: 28px; height: 28px; text-align: center; vertical-align: middle; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace; font-size: 15px; font-weight: bold; color: #444; }
                th { background-color: #f0f0f0; font-weight: bold; color: #555;}
                td { background-color: #ffffff; }
                .word-list-container { margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee;}
                .word-list { column-count: 3; column-gap: 15px; margin-top: 5px; }
                .word-list h3 { font-size: 14px; margin-bottom: 8px; color: #555; font-weight: 600; text-align: center; }
                .word-list p { margin: 2px 0; font-size: 13px; color: #333; line-height: 1.4; }
                .word-list s { color: #999; text-decoration: line-through; font-style: italic; }
                .instructions { text-align: center; margin-top: 15px; font-size: 11px; color: #777; }
                code { background-color: #eee; padding: 1px 3px; border-radius: 3px; font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;}
            </style>
        </head>
        <body>
            <div class="container"> <!-- Este es el div que seleccionaremos -->
                <h2>${title}</h2>
                <table>
                    <thead><tr><th></th>
    `;
    for (let c = 0; c < size; c++) htmlContent += `<th>${getLetterFromIndex(c)}</th>`;
    htmlContent += `</tr></thead><tbody>`;
    for (let r = 0; r < size; r++) {
        htmlContent += `<tr><th>${r + 1}</th>`;
        for (let c = 0; c < size; c++) htmlContent += `<td>${grid[r][c]}</td>`;
        htmlContent += `</tr>`;
    }
    htmlContent += `</tbody></table>`;
    htmlContent += `<div class="word-list-container"><div class="word-list"><h3>Palabras:</h3>`;
    const wordsToList = placements.slice().sort((a, b) => a.word.localeCompare(b.word));
    wordsToList.forEach(p => { htmlContent += `<p>${p.found ? `<s>${p.word}</s>` : p.word}</p>`; });
    htmlContent += `</div></div>`;
    const allFound = placements.every(p => p.found);
    if (!allFound) { htmlContent += `<p class="instructions">Usa <code>!sopa encontrar [palabra] [coord]</code></p>`; }
    else { htmlContent += `<h3 style="text-align: center; margin-top: 15px; color: green;">¡Felicidades! 🎉</h3>`; }
    htmlContent += `</div> <!-- Cierre del container -->
            </body></html>`;
    // --- Fin Generar HTML ---

    try {
        console.log(`[SOPA IMG] Generando imagen en: ${outputPath}`);
        await nodeHtmlToImage({
            output: outputPath,
            html: htmlContent,
            // --- >>> ¡EL CAMBIO ESTÁ AQUÍ! <<< ---
            selector: '.container', // Renderiza solo el div con la clase 'container'
            quality: 90,
            puppeteerArgs: { args: ['--no-sandbox', '--disable-setuid-sandbox'] } // A menudo necesario
        });
        console.log(`[SOPA IMG] Imagen generada con éxito.`);
        return outputPath;
    } catch (error) {
        console.error('[SOPA IMG] Error generando la imagen:', error);
        // Intenta capturar más detalles del error de puppeteer si existe
        if (error.message.includes('Protocol error')) {
             console.error('[SOPA IMG] Posible problema con Puppeteer/Chromium. Asegúrate de que esté instalado correctamente y las dependencias estén satisfechas.');
        }
        return null;
    }
}

// --- Exportación del Plugin ---
module.exports = {
    name: 'Sopa de Letras (Imagen)',
    aliases: ['sopa', 'wordsearch'],
    description: 'Juego de Sopa de Letras (genera imagen).\nUso:\n`!sopa [tamaño] [cat]` - Inicia\n`!sopa encontrar [palabra] [Coord]` - Marca palabra\n`!sopa mostrar` - Muestra tablero\n`!sopa cancelar` - Termina',
    category: 'Juegos',
    groupOnly: false,

    async execute(client, message, args) {
        const chatId = message.from;
        const senderId = message.author || message.from;
        const subCommand = args[0]?.toLowerCase();
        const game = activeGames.get(chatId);

        // --- Limpieza ---
        const now = Date.now();
        for (const [cId, g] of activeGames.entries()) {
            if (now - g.startTime > GAME_TIMEOUT_MS) {
                activeGames.delete(cId); console.log(`[SOPA] Juego expirado ${cId}`);
            }
        }

        // --- Subcomando: encontrar ---
        if (subCommand === 'encontrar' || subCommand === 'find') {
             if (args.length < 3) return message.reply("Uso: `!sopa encontrar PALABRA COORD` (ej: `!sopa encontrar PERRO A5`)");
             if (!game) return message.reply("No hay Sopa activa.");
             const wordToFind = args[1].toUpperCase();
             const coordString = args[2];
             const coords = parseCoordinates(coordString, game.size);
             if (!coords) return message.reply(`Coordenada "${coordString}" inválida. Formato: LetraNumero (A1, C5...).`);
             const targetPlacement = game.placements.find(p => p.word === wordToFind);
             if (!targetPlacement) return message.reply(`🤔 Palabra "${wordToFind}" no está en la lista.`);
             if (targetPlacement.found) return message.reply(`👍 Ya encontraste "${wordToFind}".`);

             if (targetPlacement.startRow === coords.row && targetPlacement.startCol === coords.col) {
                 targetPlacement.found = true;
                 activeGames.set(chatId, game);

                 const remainingCount = game.placements.filter(p => !p.found).length;
                 let replyMsg = `¡Correcto! ✅ Has encontrado "${wordToFind}" en ${coordString.toUpperCase()}.`;
                 let imagePath = null; // Para guardar la ruta de la imagen generada

                 try {
                     if (remainingCount === 0) {
                         replyMsg += "\n\n🎉 ¡Felicidades! ¡Has encontrado todas! 🎉";
                         await message.reply(replyMsg);
                         imagePath = await generateGameImage(game.grid, game.placements, "🏁 Sopa Completada 🏁", chatId);
                         if (imagePath) {
                             const media = MessageMedia.fromFilePath(imagePath);
                             await client.sendMessage(chatId, media);
                         } else {
                             await message.reply("⚠️ Error generando imagen final.");
                         }
                         activeGames.delete(chatId); // Limpiar juego terminado
                     } else {
                         replyMsg += ` Quedan ${remainingCount} palabra(s).`;
                         await message.reply(replyMsg);
                         // Generar y enviar imagen actualizada en cada acierto
                         imagePath = await generateGameImage(game.grid, game.placements, undefined, chatId);
                         if (imagePath) {
                            const media = MessageMedia.fromFilePath(imagePath);
                            await client.sendMessage(chatId, media);
                         } else {
                            await message.reply("⚠️ Error generando imagen actualizada.");
                         }
                     }
                 } catch (error) {
                     console.error("[SOPA FIND] Error durante procesamiento/envío de imagen:", error);
                     await message.reply("Ocurrió un error procesando la imagen.");
                 } finally {
                      // Limpiar imagen temporal SIEMPRE si se generó
                      if (imagePath) {
                         await fs.unlink(imagePath).catch(e => console.error("[SOPA IMG CLEANUP] Error eliminando imagen temporal:", e));
                      }
                 }

             } else {
                 return message.reply(`❌ "${wordToFind}" existe, pero no empieza en ${coordString.toUpperCase()}.`);
             }
             return;
        } // --- Fin encontrar ---


        // --- Subcomando: cancelar ---
        if (subCommand === 'cancelar' || subCommand === 'stop') {
            if (!game) return message.reply("No hay Sopa activa.");
            activeGames.delete(chatId);
            return message.reply("❌ Sopa de Letras cancelada.");
        }

        // --- Subcomando: mostrar ---
        if (subCommand === 'mostrar' || subCommand === 'show') {
             if (!game) return message.reply("No hay Sopa activa.");
             await message.reply("Generando imagen del tablero...");
             let imagePath = null;
             try {
                 imagePath = await generateGameImage(game.grid, game.placements, undefined, chatId);
                 if (imagePath) {
                     const media = MessageMedia.fromFilePath(imagePath);
                     await client.sendMessage(chatId, media);
                 } else {
                     await message.reply("❌ Error al generar la imagen.");
                 }
             } catch (sendError) {
                 console.error("[SOPA SHOW] Error enviando imagen:", sendError);
                 await message.reply("❌ Error al enviar la imagen.");
             } finally {
                 if (imagePath) {
                     await fs.unlink(imagePath).catch(e => console.error("[SOPA IMG CLEANUP] Error eliminando imagen temporal:", e));
                 }
             }
             return;
        } // --- Fin mostrar ---


        // --- Iniciar juego ---
        if (!subCommand || ['iniciar', 'start'].includes(subCommand) || !isNaN(parseInt(subCommand)) || Object.keys(WORD_CATEGORIES).includes(subCommand) || subCommand === 'todas') {
             if (game) {
                 await message.reply("Ya hay una Sopa en curso. Usa `!sopa cancelar` o `!sopa mostrar`.");
                 // Mostrar imagen existente si ya hay juego
                 let imagePath = null;
                 try {
                     imagePath = await generateGameImage(game.grid, game.placements, undefined, chatId);
                     if(imagePath) {
                         const media = MessageMedia.fromFilePath(imagePath);
                         await client.sendMessage(chatId, media);
                     }
                 } catch(e){ console.error("[SOPA START] Error mostrando imagen existente", e); }
                 finally { if(imagePath) await fs.unlink(imagePath).catch(e => {}); }
                 return;
             }

             // Parsear tamaño y categoría
             let size = DEFAULT_GRID_SIZE; let category = 'general'; let currentArgIndex = 0;
             if (args.length > currentArgIndex && !isNaN(parseInt(args[currentArgIndex]))) { size = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, parseInt(args[currentArgIndex]))); currentArgIndex++; }
             if (args.length > currentArgIndex && (Object.keys(WORD_CATEGORIES).includes(args[currentArgIndex].toLowerCase()) || args[currentArgIndex].toLowerCase() === 'todas')) { category = args[currentArgIndex].toLowerCase(); }
             else if (currentArgIndex === 0 && args.length > currentArgIndex && (Object.keys(WORD_CATEGORIES).includes(args[currentArgIndex].toLowerCase()) || args[currentArgIndex].toLowerCase() === 'todas')) { category = args[currentArgIndex].toLowerCase(); }

             const wordCount = Math.floor(size * size / (size + 4)); // Ajustar cálculo palabras
             const words = chooseWords(wordCount, category, size);

             if (!Array.isArray(words) || words.length < 3) { return message.reply(`No encontré suficientes palabras válidas (min 3).`); }

             console.log(`[SOPA] Iniciando ${chatId}: ${size}x${size}, cat: ${category}, palabras: ${words.join(', ')}`);
             let placedWordData = []; let retries = 3; let success = false; let grid;
             let imagePath = null; // Para limpieza final

             const workingMsg = await message.reply("⏳ Generando sopa de letras, un momento..."); // Mensaje de espera

             while (retries > 0 && !success) {
                placedWordData = []; grid = createEmptyGrid(size);
                for (const word of words) { const placementResult = tryPlaceWord(grid, word); if (placementResult.success) { placedWordData.push({ word: word, startRow: placementResult.startRow, startCol: placementResult.startCol, direction: placementResult.direction, found: false }); } else { /* console.warn */ } }

                if (placedWordData.length >= Math.max(3, words.length * 0.65)) { // Ser un poco más permisivo
                     fillEmptyCells(grid);
                     activeGames.set(chatId, { grid: grid, placements: placedWordData, startTime: Date.now(), size: size });

                     try {
                        await workingMsg.edit("✅ Sopa generada. Creando imagen..."); // Actualizar estado
                        imagePath = await generateGameImage(grid, placedWordData, undefined, chatId);

                         if (imagePath) {
                             const media = MessageMedia.fromFilePath(imagePath);
                             await client.sendMessage(chatId, media);
                             success = true; // Éxito total
                             await workingMsg.delete(true).catch(e => {}); // Borrar mensaje "Generando..."
                         } else {
                             await workingMsg.edit("❌ Error al generar la imagen del tablero.");
                             activeGames.delete(chatId);
                             success = true; // Marcar como terminado para no reintentar
                         }
                     } catch(err) {
                          console.error("[SOPA START] Error generando/enviando imagen inicial:", err);
                          await workingMsg.edit("❌ Error inesperado al crear la sopa.");
                          activeGames.delete(chatId);
                          success = true; // Marcar como terminado
                     } finally {
                          if(imagePath) await fs.unlink(imagePath).catch(e => console.error("[SOPA IMG CLEANUP] Error eliminando:", e));
                     }

                } else {
                    retries--; console.log(`[SOPA] Reintentando generación (${placedWordData.length}/${words.length})...`);
                }
             } // Fin while

             if (!success) {
                 console.error(`[SOPA] Error crítico: Muy pocas palabras colocadas`);
                 await workingMsg.edit("⚠️ Hubo un problema generando la sopa. Intenta de nuevo.");
             }
             return;
         } // Fin iniciar juego

        // --- Subcomando no reconocido ---
        await message.reply("Comando Sopa no reconocido. Usa: `!sopa`, `!sopa encontrar ...`, `!sopa mostrar`, `!sopa cancelar`");
    } // Fin execute
}; // Fin module.exports