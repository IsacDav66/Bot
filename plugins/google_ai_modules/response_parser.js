// plugins/google_ai_modules/response_parser.js
const { color } = require('./utils'); // Asumiendo que color está en utils

function processTagsAndMood(rawText) {
    let cleanedText = rawText;
    let mentionCreator = false;
    let imagePromptFromAI = null;
    let detectedMoodHint = 'sofia_cute'; // Default mood

    if (typeof cleanedText !== 'string') {
        console.warn(`${color.yellow}[RESPONSE PARSER WARN]${color.reset} rawText no es string, recibido:`, cleanedText);
        cleanedText = String(cleanedText || ''); // Convertir a string o string vacío
    }

    const creatorMentionTag = '[MENCIONAR_CREADOR]';
    // Usar regex para buscar al final, incluso con espacios
    const mentionRegex = new RegExp(RegExp.escape(creatorMentionTag) + '\\s*$', 'i');
    if (mentionRegex.test(cleanedText)) {
        mentionCreator = true;
        cleanedText = cleanedText.replace(mentionRegex, '').trim();
        console.log(`${color.magenta}[RESPONSE PARSER]${color.reset} Etiqueta MENCIONAR_CREADOR detectada y eliminada.`);
    }

    // Regex para la etiqueta de foto, permitiendo espacios y capturando el contenido
    const photoTagRegex = /\[GENERAR_FOTO:\s*([^\]]+)\s*\]/i; // No asume que está al final
    const photoTagMatch = cleanedText.match(photoTagRegex);
    if (photoTagMatch && photoTagMatch[1]) {
        imagePromptFromAI = photoTagMatch[1].trim();
        cleanedText = cleanedText.replace(photoTagMatch[0], '').trim(); // Reemplazar la etiqueta completa
        console.log(`${color.magenta}[RESPONSE PARSER]${color.reset} Etiqueta GENERAR_FOTO detectada: "${imagePromptFromAI}"`);
    }

    // Re-limpieza de la etiqueta de mención si la de foto estaba antes y la de mención quedó al final
    if (mentionRegex.test(cleanedText)) {
        mentionCreator = true; // Asegurar que esté activa
        cleanedText = cleanedText.replace(mentionRegex, '').trim();
        console.log(`${color.magenta}[RESPONSE PARSER]${color.reset} (Re-limpieza) Etiqueta MENCIONAR_CREADOR detectada y eliminada post-foto.`);
    }


    // Inferir mood (basado en el cleanedText)
    // Esta lógica puede ser tan compleja como necesites
    if (cleanedText.includes('😠') || cleanedText.toLowerCase().includes('reportado') || cleanedText.toLowerCase().includes('🤬')) {
        detectedMoodHint = 'sofia_angry';
    } else if (cleanedText.includes(':P') || cleanedText.includes(' ewe') || cleanedText.toLowerCase().includes('plis') || cleanedText.toLowerCase().includes('molesto')) {
        detectedMoodHint = 'sofia_annoyed';
    } else if (cleanedText.includes('uwu') || cleanedText.includes('owo') || cleanedText.includes('😊') || cleanedText.includes('jaja') || cleanedText.includes('XD') || cleanedText.includes('✨') || cleanedText.toLowerCase().includes('feliz')) {
        detectedMoodHint = 'sofia_happy';
    } else if (cleanedText.includes(':3') || cleanedText.toLowerCase().includes('vergüenza') || cleanedText.toLowerCase().includes('timida')) {
        detectedMoodHint = 'sofia_cute';
    } else if (cleanedText.toLowerCase().includes('triste') || cleanedText.includes(':c') || cleanedText.includes(' TT')) {
        detectedMoodHint = 'sofia_sad';
    }
    // ... más condiciones para otros moods

    console.log(`${color.yellow}[RESPONSE PARSER DEBUG]${color.reset} Texto Limpio: "${cleanedText.substring(0,100)}...". Mencionar: ${mentionCreator}. Prompt Foto: "${imagePromptFromAI}". Mood Inferido: ${detectedMoodHint}`);
    return { cleanedText, mentionCreator, imagePromptFromAI, detectedMoodHint };
}

// Helper para escapar strings para RegExp, si no lo tienes en utils
RegExp.escape = function(string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = {
    processTagsAndMood,
};