// google_ai_modules/personality_analyzer.js
const { textModel } = require('../google_ai_responder'); // O pasar textModel como argumento
const { color } = require('./utils'); // Asumiendo que tienes utils.js

async function analyzeAndRecordPersonality(userId, userName, messageText, personalityProfiles) {
    if (!textModel) {
        console.error(`${color.red}[PERSONALITY_ANALYZER]${color.reset} Modelo de texto no disponible.`);
        return;
    }

    const promptForPersonalityExtraction = `
Contexto: Estás analizando un mensaje de chat de un usuario llamado "${userName}" (ID: ${userId}) para entender mejor su personalidad, gustos, o disgustos. El mensaje es:
"${messageText}"

Tarea:
Extrae hasta 2-3 inferencias concisas sobre "${userName}" basadas ÚNICAMENTE en este mensaje.
Enfócate en:
- Gustos o intereses explícitamente mencionados (ej. "Me encanta el rock", "Mi hobby es dibujar").
- Disgustos explícitos (ej. "Odio madrugar").
- Aficiones o actividades que realiza (ej. "Fui a pescar el fin de semana").
- Emociones fuertes expresadas sobre un tema (ej. "Estoy muy emocionado por X").

NO extraigas:
- Opiniones sobre otros usuarios.
- Hechos triviales o información que no revele personalidad.
- Inferencias demasiado especulativas.

Si el mensaje no revela información clara sobre la personalidad/gustos de "${userName}", responde con "NO_DATA".

Formato de salida (si hay datos, cada inferencia en una nueva línea):
- [Inferencia 1]
- [Inferencia 2]

Ejemplo de salida:
- le gusta el anime de acción
- tiene un perro llamado Firulais
`;

    try {
        const result = await textModel.generateContent(promptForPersonalityExtraction);
        const rawResponse = (await result.response).text();

        if (rawResponse.trim().toUpperCase() === "NO_DATA" || rawResponse.trim() === "") {
            console.log(`${color.yellow}[PERSONALITY_ANALYZER]${color.reset} Gemini no extrajo datos de personalidad para "${userName}" del mensaje.`);
            return;
        }

        const newInferredTraits = rawResponse.split('\n')
            .map(line => line.replace(/^-/, '').trim())
            .filter(trait => trait.length > 0);

        if (newInferredTraits.length > 0) {
            if (!personalityProfiles[userId]) {
                personalityProfiles[userId] = { name: userName, inferredTraits: [], possibleInterests: [], possibleDislikes: [], lastPassiveAnalysis: '' };
            }
            const profile = personalityProfiles[userId];
            newInferredTraits.forEach(traitText => {
                // Evitar duplicados exactos recientes (podrías mejorar esto)
                if (!profile.inferredTraits.some(t => t.trait === traitText)) {
                    profile.inferredTraits.push({
                        trait: traitText,
                        sourceMessageContent: messageText.substring(0, 100), // Guardar un snippet del mensaje fuente
                        timestamp: new Date().toISOString()
                    });
                }
            });

            // Mantener un límite de rasgos inferidos
            profile.inferredTraits = profile.inferredTraits.slice(-15); // Guardar los últimos 15, por ejemplo
            profile.lastPassiveAnalysis = new Date().toISOString();
            console.log(`${color.green}[PERSONALITY_ANALYZER]${color.reset} Se añadieron/actualizaron ${newInferredTraits.length} rasgos inferidos para "${userName}".`);
        }

    } catch (error) {
        console.error(`${color.red}[PERSONALITY_ANALYZER ERROR]${color.reset} Falló el análisis de personalidad para "${userName}":`, error.message);
    }
}

module.exports = { analyzeAndRecordPersonality };