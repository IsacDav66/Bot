// plugins/google_ai_modules/image_generator.js
const { MessageMedia } = require('whatsapp-web.js');
const { IMAGE_GEN_MAX_RETRIES, IMAGE_GEN_RETRY_DELAY_MS } = require('./config');
const { color } = require('./utils');
// Necesitarás pasar 'imageModel' a estas funciones o inicializarlo aquí si es apropiado.
// Por ahora, asumiré que se pasa como argumento desde el archivo principal.

async function generateImageInternal(imageModel, prompt) {
    console.log(`${color.cyan}[IMAGE_GEN_INTERNAL_ENTRY]${color.reset} Prompt: "${prompt}"`); // <--- LOG
    if (!imageModel) 
        return { success: false, errorText: "Modelo de imagen no disponible." };
    // ... (tu lógica de generateImageInternal)
    try {
        const result = await imageModel.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] } // Asumiendo que quieres texto e imagen
        });
        const response = result.response; // Acceso directo a la respuesta
        let imageData = null;
        let textResponse = '';

        if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    textResponse += part.text + "\n";
                } else if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
                    imageData = part.inlineData; // Guarda { data, mimeType }
                }
            }
        }

        if (imageData) {
            return { success: true, imageData, textResponse: textResponse.trim() };
        } else {
            console.warn(`${color.yellow}[IMAGE GEN INTERNAL WARN]${color.reset} No se encontró imagen válida. Texto del modelo: ${textResponse.trim() || 'Ninguno'}`);
            return { success: false, errorText: textResponse.trim() || "No se generó imagen." };
        }
    } catch (error) {
        console.error(`${color.red}[IMAGE GEN INTERNAL ERROR]${color.reset} Falló llamada a generateContent:`, error);
        const errorMessage = error.errorDetails ? JSON.stringify(error.errorDetails) : (error.message || "Error desconocido");
        return { success: false, errorText: errorMessage };
    }
}

async function generateAndSendImageWithRetries(client, imageModel, chatId, initialPrompt, caption = '') {
    let success = false;
    let attempts = 0;
    const waitingMessages = [ "Uhm, déjame buscar bien la cámara... 📸", "Espera, que esta foto se resiste un poquito... dame un segundo ewe", "Buscando el ángulo perfecto... ✨", "Casi la tengo, ¡no te vayas! :3", "Procesando... modo fotógrafa activado uwu" ];
    let lastImageModelErrorText = '';
    let currentPrompt = initialPrompt;

    console.log(`${color.blue}[IMAGE GEN RETRY]${color.reset} Iniciando generación con prompt original: "${initialPrompt}"`);

    while (attempts <= IMAGE_GEN_MAX_RETRIES && !success) {
        attempts++;
        console.log(`${color.cyan}[IMAGE GEN RETRY]${color.reset} Intento #${attempts} para prompt: "${currentPrompt}"`);

        if (attempts > 1) {
            const waitingMsg = waitingMessages[Math.floor(Math.random() * waitingMessages.length)];
            await client.sendMessage(chatId, waitingMsg);
            await new Promise(resolve => setTimeout(resolve, IMAGE_GEN_RETRY_DELAY_MS));
        }

        const generationResult = await generateImageInternal(imageModel, currentPrompt); // Pasar imageModel

        if (generationResult.success && generationResult.imageData) {
            try {
                const imageMedia = new MessageMedia(generationResult.imageData.mimeType, generationResult.imageData.data);
                await client.sendMessage(chatId, imageMedia, { caption: caption || generationResult.textResponse }); // Usar texto del modelo como caption si no hay uno
                console.log(`${color.magenta}[IMAGE GEN RETRY]${color.reset} Imagen generada con éxito en intento #${attempts}.`);
                if (generationResult.textResponse) {
                    console.log(`${color.blue}[IMAGE GEN RETRY DEBUG]${color.reset} Texto adicional con imagen (usado como caption o loggeado): ${generationResult.textResponse}`);
                }
                success = true;
                break; // Salir del bucle si la imagen se envió con éxito
            } catch (sendError) {
                console.error(`${color.red}[IMAGE GEN SEND ERROR]${color.reset} Error al enviar imagen:`, sendError);
                lastImageModelErrorText = "Error al enviar la imagen generada a WhatsApp.";
                // No se rompe el bucle aquí, se podría reintentar la generación si la política lo permite.
            }
        } else {
            lastImageModelErrorText = generationResult.errorText || "Fallo en la generación interna sin detalles.";
            console.warn(`${color.yellow}[IMAGE GEN RETRY]${color.reset} Falló intento #${attempts}. ${lastImageModelErrorText ? `Error: ${lastImageModelErrorText}` : ''}`);

            if (attempts === 1 && IMAGE_GEN_MAX_RETRIES >= 1) {
                console.log(`${color.yellow}[IMAGE GEN RETRY]${color.reset} Simplificando prompt para el siguiente intento...`);
                let baseDescription = initialPrompt.match(/Sofia, a 17-year-old girl with fair skin, freckles, long light brown hair with bangs.*?blue-grey eyes.*?(shy smile|shy expression)/i);
                if (baseDescription && baseDescription[0]) {
                    currentPrompt = `Realistic selfie photo of ${baseDescription[0]}. Simple indoor setting, natural light.`;
                } else {
                    currentPrompt = initialPrompt.substring(0, Math.floor(initialPrompt.length * 0.7)) + ", simple setting.";
                }
                console.log(`${color.cyan}[IMAGE GEN RETRY]${color.reset} Prompt simplificado: "${currentPrompt}"`);
            }
        }
    }
     if (!success) {
        console.error(`${color.red}[IMAGE GEN RETRY]${color.reset} Todos los ${attempts} intentos fallaron.`);
        let finalErrorMsg = "¡Ay, no pude sacar la foto al final! 😖";
        if (lastImageModelErrorText && lastImageModelErrorText !== "No se generó imagen.") {
            finalErrorMsg += ` Parece que el problema fue: "${lastImageModelErrorText}". ¿Intentamos con otra cosa?`;
        } else {
            finalErrorMsg += " No sé qué pasó, ¿intentamos con otra cosa? :c";
        }
        await client.sendMessage(chatId, finalErrorMsg);
    }
    return success;
}

module.exports = {
    generateAndSendImageWithRetries,
    // generateImageInternal // Podrías exportarla si la necesitas fuera
};