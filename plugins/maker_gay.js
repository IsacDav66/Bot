// plugins/maker_gay.js
// Crea una imagen "gay" usando la foto de perfil y una API externa.

const fetch = require('node-fetch'); // Para hacer la llamada a la API
const { MessageMedia } = require('whatsapp-web.js');

// URL de la API
const API_URL = 'https://some-random-api.com/canvas/gay?avatar=';
// URL de imagen por defecto si no hay avatar
const DEFAULT_AVATAR = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';

const execute = async (client, message, args) => {
    const chatId = message.from;
    let targetUserId = null;
    let mentioned = false;

    // 1. Determinar usuario objetivo
    if (message.mentionedIds && message.mentionedIds.length > 0) {
        targetUserId = message.mentionedIds[0]; // Tomar la primera mención
        mentioned = true;
        console.log(`[MakerGay] Usuario objetivo (mencionado): ${targetUserId}`);
    } else {
        targetUserId = message.author || message.from; // El remitente
        // En grupos, message.author es el remitente real. En privado, message.from es el remitente.
        console.log(`[MakerGay] Usuario objetivo (remitente): ${targetUserId}`);
    }

    // Verificar que tengamos un ID válido
    if (!targetUserId || !targetUserId.includes('@')) {
         console.error("[MakerGay] No se pudo determinar un ID de usuario válido.");
         return message.reply("❌ No pude identificar a quién aplicar el efecto.");
    }

    await message.reply('🏳️‍🌈 Procesando imagen...');

    // 2. Obtener URL de la foto de perfil
    let profilePicUrl = DEFAULT_AVATAR; // Usar por defecto
    try {
        const fetchedUrl = await client.getProfilePicUrl(targetUserId);
        if (fetchedUrl) {
            profilePicUrl = fetchedUrl;
            console.log(`[MakerGay] URL de avatar obtenida para ${targetUserId}`);
        } else {
             console.log(`[MakerGay] ${targetUserId} no tiene foto de perfil, usando default.`);
        }
    } catch (error) {
        console.warn(`[MakerGay] No se pudo obtener avatar para ${targetUserId} (¿bloqueado, sin foto?), usando default. Error: ${error.message}`);
        // Usar la default ya asignada
    }

    // 3. Llamar a la API externa
    const apiUrlWithAvatar = API_URL + encodeURIComponent(profilePicUrl);
    console.log(`[MakerGay] Llamando a API: ${apiUrlWithAvatar}`);
    let imageBuffer = null;
    try {
        const response = await fetch(apiUrlWithAvatar);
        if (!response.ok) {
            throw new Error(`API respondió con estado: ${response.status} ${response.statusText}`);
        }
        imageBuffer = await response.buffer(); // Obtener la imagen como Buffer
        console.log(`[MakerGay] Imagen recibida de la API.`);
    } catch (error) {
        console.error(`[MakerGay] Error al llamar a la API (${apiUrlWithAvatar}):`, error);
        return message.reply(`❌ Error al contactar la API para generar la imagen. ${error.message}`);
    }

    // 4. Crear MessageMedia y enviar
    if (imageBuffer) {
        try {
            const media = new MessageMedia('image/png', imageBuffer.toString('base64'), 'gay-effect.png'); // Crear media desde buffer
            const caption = 'Eres gay 🏳️‍🌈';

            // Mencionar si corresponde
            const options = { caption: caption };
            if (mentioned) {
                 // Necesitamos obtener el objeto Contact para mencionar
                 try {
                      const contact = await client.getContactById(targetUserId);
                      if (contact) options.mentions = [contact];
                 } catch (e) { console.warn("No se pudo obtener contacto para mencionar", e.message); }
            }

            console.log(`[MakerGay] Enviando imagen generada a ${chatId}...`);
            await client.sendMessage(chatId, media, options);
            console.log(`[MakerGay] Imagen enviada.`);

        } catch (error) {
            console.error("[MakerGay] Error al crear/enviar MessageMedia:", error);
            await message.reply("❌ Error al preparar o enviar la imagen generada.");
        }
    } else {
         // Esto no debería pasar si la API respondió OK, pero por si acaso
         console.error("[MakerGay] imageBuffer está vacío después de llamar a la API.");
         await message.reply("❌ Hubo un problema inesperado al obtener la imagen de la API.");
    }
};

// Exportar como Comando estándar
module.exports = {
    name: 'maker_gay',
    aliases: ['gay'], // Comando
    description: 'Aplica un filtro de arcoíris a tu avatar o al de alguien mencionado.',
    category: 'Diversión',
    // groupOnly: false, // Funciona en cualquier chat
    execute: execute
};