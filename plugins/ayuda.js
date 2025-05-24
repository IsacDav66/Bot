// plugins/ayuda.js
// Muestra la lista de comandos disponibles categorizados con emojis.

const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'Ayuda Comandos',
    aliases: ['help', 'ayuda', 'comandos', 'cmds', 'menu'],
    description: 'Muestra la lista de comandos disponibles categorizados.',
    category: 'Utilidad', // El propio plugin de ayuda
    async execute(client, message, args, helpArgsOrCommandsList) {
        // Determinar cómo se pasaron los argumentos desde bot.js
        // Si helpArgsOrCommandsList es un objeto, asumimos que es { commandsList, usedPrefix }
        // Si es un array, asumimos que es directamente commandsList (compatibilidad con versiones anteriores)
        let commands;
        let usedPrefix;

        if (typeof helpArgsOrCommandsList === 'object' && helpArgsOrCommandsList !== null && !Array.isArray(helpArgsOrCommandsList)) {
            commands = helpArgsOrCommandsList.commandsList;
            usedPrefix = helpArgsOrCommandsList.usedPrefix;
        } else if (Array.isArray(helpArgsOrCommandsList)) {
            commands = helpArgsOrCommandsList;
            usedPrefix = null; // No se pasó, usaremos fallback
        } else {
            console.error("[Ayuda Plugin] Error: El argumento de comandos no es válido.");
            return message.reply("❌ No pude cargar la lista de comandos.");
        }

        if (!commands || !Array.isArray(commands)) {
            console.error("[Ayuda Plugin] Error: La lista de comandos está vacía o no es un array.");
            return message.reply("❌ No hay comandos para mostrar o la lista es inválida.");
        }
        
        const prefix = usedPrefix || '.'; // Usa el prefijo pasado por bot.js, o '.' como fallback


        // --- MAPEO DE CATEGORÍAS A EMOJIS ---
        const categoryEmojis = {
            'Economía': '💰',
            'Juegos': '🎮',
            'Utilidad': '🛠️',
            'Inteligencia Artificial': '🤖',
            'Interacción': '💬',
            'Descargas': '📥',
            'Moderación': '🛡️',
            'Diversión': '🎉',
            'Información': 'ℹ️',
            'Social': '🫂', // Ejemplo adicional
            'Administración': '⚙️', // Ejemplo adicional
            'Otros': '❓'    // Emoji para la categoría por defecto
            // Añade más categorías y sus emojis aquí.
            // ¡Asegúrate de que los nombres de categoría aquí coincidan EXACTAMENTE
            // con los que usas en la propiedad 'category' de tus plugins!
        };
        // --- FIN MAPEO ---


        // --- Agrupar comandos por categoría ---
        const categorizedCommands = {};
        commands.forEach(cmd => {
            // cmd ya debería tener la propiedad 'category' gracias a bot.js
            const category = cmd.category || 'Otros'; // Fallback si bot.js no asignó 'Otros'
            if (!categorizedCommands[category]) {
                categorizedCommands[category] = [];
            }
            categorizedCommands[category].push({
                name: cmd.name,
                mainAlias: cmd.aliases[0],
                // Mostrar otros alias sin el prefijo, ya que el prefijo se muestra en el comando principal
                aliases: cmd.aliases.slice(1),
                description: cmd.description,
                prefix: prefix // Usar el prefijo determinado
            });
        });
        // --- Fin Agrupación ---

        // --- Construcción del Texto de Ayuda Categorizado ---
        let helpTextMessage = '🤖 *Comandos Disponibles del Bot* 🤖\n\n';
        const sortedCategories = Object.keys(categorizedCommands).sort((a, b) => {
            // Opcional: Poner "Otros" al final
            if (a === 'Otros') return 1;
            if (b === 'Otros') return -1;
            return a.localeCompare(b);
        });

        sortedCategories.forEach((category, index) => {
            const emoji = categoryEmojis[category] || '📂'; // Emoji genérico si no está en el mapeo
            helpTextMessage += `╭─「 ${emoji} *${category}* 」\n`;
            
            categorizedCommands[category].forEach(cmd => {
                helpTextMessage += `│ ✅ *${cmd.prefix}${cmd.mainAlias}*\n`;
                if (cmd.aliases.length > 0) {
                    // Mostrar los alias con el prefijo para que sean copiables
                    helpTextMessage += `│    ↳ _Alias: ${cmd.aliases.map(a => `${cmd.prefix}${a}`).join(', ')}_\n`;
                }
                helpTextMessage += `│    ↦ ${cmd.description}\n`;
                // Añadir una línea vacía entre comandos dentro de una categoría, excepto para el último
                if (categorizedCommands[category].indexOf(cmd) < categorizedCommands[category].length - 1) {
                     helpTextMessage += `│\n`;
                }
            });
            // Línea final de la categoría
            helpTextMessage += `╰─${index === sortedCategories.length - 1 ? '─◉' : '─◉'}\n\n`;
        });
        
        const finalText = helpTextMessage.trim();
        // --- Fin Construcción del Texto ---

        // --- Manejo de la Imagen ---
        const imageName = 'ayuda_imagen.jpg'; // Nombre de tu imagen
        const imagePath = path.join(__dirname, '..', imageName); // Asume que está en la raíz del proyecto

        try {
            if (fs.existsSync(imagePath)) {
                const media = MessageMedia.fromFilePath(imagePath);
                console.log(`[Ayuda Plugin] Enviando ayuda categorizada con imagen: ${imageName}`);
                await message.reply(media, undefined, {
                    caption: finalText
                });
            } else {
                console.warn(`[Ayuda Plugin ADVERTENCIA] Imagen no encontrada en ${imagePath}. Enviando solo texto.`);
                await message.reply(finalText);
            }
        } catch (error) {
            console.error(`[Ayuda Plugin ERROR] No se pudo procesar o enviar la imagen de ayuda:`, error);
            await message.reply(`⚠️ Hubo un problema al cargar la imagen de ayuda. Aquí están los comandos:\n\n${finalText}`);
        }
    }
};