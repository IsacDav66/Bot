// plugins/google_ai_modules/utils.js
const color = {
    reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m",
    yellow: "\x1b[33m", blue: "\x1b[34m", cyan: "\x1b[36m",
    brightMagenta: "\x1b[95m",
};

function getCurrentTimeFormatted() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

module.exports = {
    color,
    getCurrentTimeFormatted,
};