// plugins/ping.js
// Comprueba latencia y muestra info del sistema.

const os = require('os'); // Módulo nativo para info del sistema

// Función para formatear segundos a tiempo legible (días, horas, minutos, segundos)
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);

    let uptimeString = '';
    if (d > 0) uptimeString += `${d}d `;
    if (h > 0) uptimeString += `${h}h `;
    if (m > 0) uptimeString += `${m}m `;
    if (s > 0 || uptimeString === '') uptimeString += `${s}s`; // Mostrar segundos si es menos de 1m o si es lo único
    return uptimeString.trim();
}


module.exports = {
    name: 'ping',
    aliases: ['ping', 'pong', 'speed', 'estado'], // Añadir más alias si quieres
    description: 'Comprueba la latencia del bot y muestra información del sistema.',
    category: 'Utilidad',
            async execute(client, message, args) {
        const chatId = message.from;
        const startTime = Date.now();
        console.log(`[Ping] Comando recibido. Tiempo inicial: ${startTime}`);

        // Enviar respuesta inicial simple
        await message.reply('🏓 Pong!'); // Respuesta rápida inicial

        // Calcular latencia local hasta este punto
        const initialResponseTime = Date.now();
        const latency = initialResponseTime - startTime;
        console.log(`[Ping] Latencia (hasta respuesta inicial): ${latency} ms`);

        // Obtener Info Sistema
        const platform = os.platform();
        const arch = os.arch();
        const uptimeSeconds = os.uptime();
        const formattedUptime = formatUptime(uptimeSeconds);

        // Construir Mensaje Final
        const finalReplyMsg =
            `*⏱️ Estado del Bot:* \n\n` + // Título diferente para el segundo mensaje
            `*Latencia (Respuesta Inicial):* ${latency} ms\n` +
            `*Sistema Operativo:* ${platform}\n` +
            `*Arquitectura:* ${arch}\n` +
            `*Tiempo Activo (OS):* ${formattedUptime}`;

        // Enviar Info como un segundo mensaje
        try {
            await client.sendMessage(chatId, finalReplyMsg); // Usar client.sendMessage para no citar de nuevo
            console.log("[Ping] Mensaje de estado final enviado.");
        } catch (error) {
            console.error("[Ping] Error enviando mensaje de estado final:", error);
            // No hacer nada más si falla el segundo mensaje
        }
    }
}