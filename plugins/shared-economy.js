// plugins/shared-economy.js
const fs = require('fs').promises;
const path = require('path');

// console.log(`[Shared Economy CORE] Módulo shared-economy.js EJECUTÁNDOSE - Timestamp: ${Date.now()}`);

const userDataPath = path.join(__dirname, '..', 'userData.json');
let userData = {};

async function loadUserData() {
    try {
        const fileContent = await fs.readFile(userDataPath, 'utf8');
        const loadedFromFile = JSON.parse(fileContent);
        console.log('[Shared Economy] Datos de usuario cargados desde userData.json');

        let needsSaveAfterMigration = false;
        for (const userId in loadedFromFile) {
            const userEntry = loadedFromFile[userId];

            if (userEntry.hasOwnProperty('stars') && !userEntry.hasOwnProperty('money')) {
                userEntry.money = userEntry.stars;
                delete userEntry.stars;
                needsSaveAfterMigration = true;
            }

            const fieldsToInitialize = {
                exp: 0, money: 0, bank: 0,
                lastwork: 0, laststeal: 0, lastcrime: 0, lastslut: 0,
                lastroulette: 0, lastslots: 0, lastdaily: 0, dailystreak: 0
            };

            for (const field in fieldsToInitialize) {
                if (!userEntry.hasOwnProperty(field) || typeof userEntry[field] !== 'number' || isNaN(userEntry[field])) {
                    userEntry[field] = fieldsToInitialize[field];
                    needsSaveAfterMigration = true;
                }
            }
            
            if (!userEntry.hasOwnProperty('pushname')) {
                userEntry.pushname = null;
                needsSaveAfterMigration = true;
            }
            if (!userEntry.hasOwnProperty('bank')) userEntry.bank = 0;
            if (typeof userEntry.bank !== 'number' || isNaN(userEntry.bank)) userEntry.bank = 0;

            if (!userEntry.hasOwnProperty('lastwork')) userEntry.lastwork = 0;
            if (typeof userEntry.lastwork !== 'number') userEntry.lastwork = 0;

            if (!userEntry.hasOwnProperty('laststeal')) userEntry.laststeal = 0;
            if (typeof userEntry.laststeal !== 'number') userEntry.laststeal = 0;
            
            if (!userEntry.hasOwnProperty('lastcrime')) userEntry.lastcrime = 0;
            if (typeof userEntry.lastcrime !== 'number') userEntry.lastcrime = 0;

            if (!userEntry.hasOwnProperty('lastslut')) userEntry.lastslut = 0;
            if (typeof userEntry.lastslut !== 'number') userEntry.lastslut = 0;
            
            if (!userEntry.hasOwnProperty('lastroulette')) userEntry.lastroulette = 0; // Para el plugin de ruleta
            if (typeof userEntry.lastroulette !== 'number') userEntry.lastroulette = 0;

            if (!userEntry.hasOwnProperty('lastslots')) userEntry.lastslots = 0; // Para el plugin de slots
            if (typeof userEntry.lastslots !== 'number') userEntry.lastslots = 0;
            
            if (!userEntry.hasOwnProperty('exp')) userEntry.exp = 0; // Asegurar que exp exista y sea numérico
            if (typeof userEntry.exp !== 'number' || isNaN(userEntry.exp)) userEntry.exp = 0;
            if (!userEntry.hasOwnProperty('lastdaily')) userEntry.lastdaily = 0;
            if (typeof userEntry.lastdaily !== 'number' || isNaN(userEntry.lastdaily)) userEntry.lastdaily = 0;

            if (!userEntry.hasOwnProperty('dailystreak')) userEntry.dailystreak = 0;
            if (typeof userEntry.dailystreak !== 'number' || isNaN(userEntry.dailystreak)) userEntry.dailystreak = 0;
        }

        userData = loadedFromFile;

        if (needsSaveAfterMigration) {
            console.log('[Shared Economy] Migraciones/inicializaciones aplicadas durante la carga. Guardando datos actualizados...');
            await saveUserData();
        }

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[Shared Economy] userData.json no encontrado. Se creará uno nuevo cuando se guarden datos.');
            userData = {};
        } else {
            console.error('[Shared Economy] Error crítico cargando userData.json:', error);
            userData = {};
        }
    }
}

async function saveUserData() {
    try {
        await fs.writeFile(userDataPath, JSON.stringify(userData, null, 2));
        // console.log('[Shared Economy] Datos de usuario guardados en userData.json.');
    } catch (error) {
        console.error('[Shared Economy] Error guardando userData.json:', error);
    }
}

loadUserData();

async function getUserData(userId, source = null) {
    let userEntry = userData[userId];
    let isNewUser = false;
    let pushnameUpdatedThisCall = false; // Para rastrear si el pushname se actualizó en ESTA llamada

    if (!userEntry) {
        isNewUser = true;
        userEntry = {
            exp: 0, money: 0, bank: 0,
            lastwork: 0, laststeal: 0, lastcrime: 0, lastslut: 0,
            lastroulette: 0, lastslots: 0, lastdaily: 0, dailystreak: 0,
            pushname: null
        };
        userData[userId] = userEntry;
    }

    const fieldsToValidate = ['exp', 'money', 'bank', 'lastwork', 'laststeal', 'lastcrime', 'lastslut', 'lastroulette', 'lastslots', 'lastdaily', 'dailystreak'];
    fieldsToValidate.forEach(field => {
        if (typeof userEntry[field] !== 'number' || isNaN(userEntry[field])) {
            userEntry[field] = 0;
        }
    });

    if (source) {
        let contactToUse = null;
        try {
            if (typeof source.getContact === 'function') { // Si 'source' es un objeto 'message'
                contactToUse = await source.getContact();
            } else if (source.id && (source.pushname !== undefined || source.name !== undefined || source.number !== undefined)) { // Si 'source' es un objeto 'contactInfo'
                contactToUse = source;
            }

            if (contactToUse) {
                let currentName = null;
                if (contactToUse.pushname) {
                    currentName = contactToUse.pushname;
                } else if (contactToUse.name) {
                    currentName = contactToUse.name;
                } else if (contactToUse.number) { // Usar número como último recurso si no hay otro nombre
                    currentName = contactToUse.number;
                }

                if (currentName && userEntry.pushname !== currentName) {
                    userEntry.pushname = currentName;
                    pushnameUpdatedThisCall = true;
                    console.log(`[Shared Economy] Pushname para ${userId} actualizado/guardado a: ${userEntry.pushname}`);
                } else if (currentName && !userEntry.pushname) { // Si no había pushname y ahora sí
                    userEntry.pushname = currentName;
                    pushnameUpdatedThisCall = true;
                    console.log(`[Shared Economy] Pushname para ${userId} guardado por primera vez: ${userEntry.pushname}`);
                }
            }
        } catch (error) {
            console.error(`[Shared Economy] Error obteniendo/usando contacto desde 'source' para ${userId}:`, error.message);
        }
    }
    
    // Opcional: Guardar inmediatamente si el pushname fue actualizado EN ESTA LLAMADA.
    // Esto es más específico que guardarlo siempre.
    // if (pushnameUpdatedThisCall) {
    //     console.log(`[Shared Economy] Pushname fue actualizado para ${userId}, guardando datos...`);
    //     await saveUserData();
    // }

    return userEntry;
}

function getAllUserData() {
    return userData;
}

function msToTime(duration) {
    if (duration < 0) duration = 0;
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    let timeString = "";
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    timeString += `${seconds}s`;
    return timeString.trim() || "0s";
}

function pickRandom(list) {
    return list[Math.floor(list.length * Math.random())];
}

module.exports = {
    getUserData,
    saveUserData,
    msToTime,
    pickRandom,
    getAllUserData,
};