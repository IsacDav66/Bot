// plugins/shared-economy.js
// Manejo de datos de economía usando SQLite como backend principal,
// incluyendo campos para contraseña y estado de registro.

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs'); // Para hashear contraseñas

const JSON_BACKUP_PATH = path.join(__dirname, '..', 'userData.json');
const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite');

// Campos por defecto para un nuevo usuario o para migración, incluyendo los nuevos
const DEFAULT_USER_FIELDS = {
    exp: 0, money: 0, bank: 0,
    lastwork: 0, laststeal: 0, lastcrime: 0, lastslut: 0,
    lastroulette: 0, lastslots: 0, lastdaily: 0, dailystreak: 0,
    pushname: null,
    password: null,
    registration_state: null,
    phoneNumber: null // <--- NUEVO CAMPO
};

// El orden importa para las sentencias SQL
const ALL_USER_FIELDS_ORDERED = [
    'userId', 'exp', 'money', 'bank',
    'lastwork', 'laststeal', 'lastcrime', 'lastslut',
    'lastroulette', 'lastslots', 'lastdaily', 'dailystreak',
    'pushname', 'password', 'registration_state', 'phoneNumber' // <--- NUEVO CAMPO
];

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("[SQLite] Error al conectar/crear la base de datos:", err.message);
    } else {
        console.log("[SQLite] Conectado exitosamente a la base de datos SQLite:", DB_PATH);
        initializeDatabase();
    }
});

async function initializeDatabase() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            exp INTEGER DEFAULT 0,
            money INTEGER DEFAULT 0,
            bank INTEGER DEFAULT 0,
            lastwork INTEGER DEFAULT 0,
            laststeal INTEGER DEFAULT 0,
            lastcrime INTEGER DEFAULT 0,
            lastslut INTEGER DEFAULT 0,
            lastroulette INTEGER DEFAULT 0,
            lastslots INTEGER DEFAULT 0,
            lastdaily INTEGER DEFAULT 0,
            dailystreak INTEGER DEFAULT 0,
            pushname TEXT,
            password TEXT,
            registration_state TEXT,
            phoneNumber TEXT  -- NUEVA COLUMNA
        );`;

    db.run(createTableSQL, async (err) => {
        if (err) {
            return console.error("[SQLite] Error creando tabla 'users':", err.message);
        }
        console.log("[SQLite] Tabla 'users' asegurada/creada con nuevos campos.");

        db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
            if (err) { /* ... */ }
            if (row.count === 0) {
                console.log("[SQLite] Tabla 'users' vacía. Intentando importar desde:", JSON_BACKUP_PATH);
                try {
                    await fs.access(JSON_BACKUP_PATH);
                    const fileContent = await fs.readFile(JSON_BACKUP_PATH, 'utf8');
                    const jsonData = JSON.parse(fileContent);
                    
                    if (Object.keys(jsonData).length > 0) {
                        const placeholders = ALL_USER_FIELDS_ORDERED.map(() => '?').join(', ');
                        const stmt = db.prepare(`
                            INSERT OR IGNORE INTO users (${ALL_USER_FIELDS_ORDERED.join(', ')}) 
                            VALUES (${placeholders})
                        `);
                        
                        let importedCount = 0;
                        db.serialize(() => {
                            db.run("BEGIN TRANSACTION;");
                            for (const userId in jsonData) {
                                const jsonEntry = jsonData[userId];
                                const userEntry = { userId, ...DEFAULT_USER_FIELDS, ...jsonEntry };
                                const valuesToInsert = ALL_USER_FIELDS_ORDERED.map(field => userEntry[field]);
                                stmt.run(valuesToInsert);
                                importedCount++;
                            }
                            stmt.finalize((finalizeErr) => {
                                if (finalizeErr) {
                                    console.error("[SQLite] Error finalizando statement de importación:", finalizeErr.message);
                                    db.run("ROLLBACK;");
                                } else {
                                    db.run("COMMIT;", (commitErr) => {
                                        if (commitErr) {
                                            console.error("[SQLite] Error haciendo COMMIT de la importación:", commitErr.message);
                                        } else {
                                            console.log(`[SQLite] ${importedCount} usuarios importados desde userData.json y commiteados.`);
                                        }
                                    });
                                }
                            });
                        });
                    } else {
                        console.log("[SQLite] userData.json está vacío. No se importaron datos.");
                    }
                } catch (e) {
                    if (e.code === 'ENOENT') {
                        console.log("[SQLite] userData.json no encontrado para importación inicial. Se comenzará con base de datos vacía.");
                    } else {
                        console.error("[SQLite] Error leyendo, parseando o importando desde userData.json:", e.message);
                    }
                }
            } else {
                console.log(`[SQLite] Tabla 'users' ya contiene ${row.count} usuarios. No se importará desde JSON.`);
            }
        });
    });
}

// --- Funciones de Hash de Contraseña ---
const SALT_ROUNDS = 10; // Costo del hasheo

async function hashPassword(password) {
    if (!password || typeof password !== 'string' || password.length === 0) {
        // console.warn("[Shared Economy] Intento de hashear contraseña vacía o inválida.");
        return null;
    }
    try {
        return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (error) {
        console.error("[Shared Economy] Error hasheando contraseña:", error);
        return null;
    }
}

async function verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) return false;
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error("[Shared Economy] Error verificando contraseña:", error);
        return false;
    }
}
// --- Fin Funciones de Hash ---

async function getUserData(userId, source = null) { // source puede ser 'message' o 'contactInfo'
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE userId = ?", [userId], async (err, row) => {
            if (err) {
                console.error(`[SQLite GetUser] Error obteniendo usuario ${userId}:`, err.message);
                return reject(err); // Rechazar la promesa en caso de error de BD
            }

            let userEntry;
            // let isNewInDb = false; // Ya no es crucial para la lógica de guardado inmediato aquí

            if (row) { // Usuario encontrado en la BD
                // Combinar con defaults para asegurar todos los campos, especialmente los nuevos
                userEntry = { ...DEFAULT_USER_FIELDS, ...row };
            } else { // Usuario no encontrado, crear nueva entrada en memoria
                // isNewInDb = true;
                userEntry = { userId, ...DEFAULT_USER_FIELDS };
            }

            // Lógica para obtener y actualizar pushname
            let pushnameWasActuallyUpdatedThisCall = false;
            if (source) {
                let contactToUse = null;
                try {
                    if (typeof source.getContact === 'function') { // Si 'source' es un objeto 'message'
                        contactToUse = await source.getContact();
                    } else if (source.id && (source.pushname !== undefined || source.name !== undefined || source.number !== undefined)) { // Si 'source' es un objeto 'contactInfo'
                        contactToUse = source;
                    }

                    if (contactToUse) {
                        let currentPushname = contactToUse.pushname || contactToUse.name;
                        // Si después de pushname y name, no hay nada, podrías considerar contactToUse.number
                        // pero solo si tienes una buena forma de validarlo como nombre y no como ID.
                        // Para pushname, es mejor quedarse con pushname o name.

                        if (currentPushname && userEntry.pushname !== currentPushname) {
                            userEntry.pushname = currentPushname;
                            pushnameWasActuallyUpdatedThisCall = true; // Marcar que se actualizó el pushname
                            console.log(`[SQLite GetUser] Pushname para ${userId} será establecido/actualizado a: ${userEntry.pushname}`);
                        }

                        // IMPORTANTE: NO actualizamos userEntry.phoneNumber aquí automáticamente desde contactToUse.number.
                        // El flujo con el comando .mifono será el responsable de pedir y guardar explícitamente
                        // el número de teléfono del usuario.
                        // Esto evita guardar accidentalmente el ID numérico de WhatsApp como un número de teléfono.
                        // Si 'contactToUse.number' fuera un número de teléfono *verificado y formateado*,
                        // podrías considerar guardarlo aquí, pero es más seguro que el usuario lo ingrese.
                        // let potentialPhoneNumber = contactToUse.number;
                        // if (potentialPhoneNumber && userEntry.phoneNumber !== potentialPhoneNumber && isValidPhoneNumberFormat(potentialPhoneNumber)) {
                        //     userEntry.phoneNumber = potentialPhoneNumber;
                        //     pushnameWasActuallyUpdatedThisCall = true; // También indicaría un cambio para guardar
                        //     console.log(`[SQLite GetUser] PhoneNumber para ${userId} podría ser establecido/actualizado a: ${userEntry.phoneNumber}`);
                        // }
                    }
                } catch (contactError) {
                    console.error(`[SQLite GetUser] Error obteniendo info de contacto para ${userId} desde source:`, contactError.message);
                }
            }
            
            // Si el pushname se actualizó y quisieras guardarlo inmediatamente (opcional):
            // if (pushnameWasActuallyUpdatedThisCall) {
            //     try {
            //         // Si es un usuario que no estaba en la BD (row era null), se insertará.
            //         // Si ya existía, se actualizará solo el pushname (y otros campos que userEntry ya tenía).
            //         console.log(`[SQLite GetUser] Pushname actualizado para ${userId}, guardando entrada...`);
            //         await saveUserData(userId, userEntry); 
            //     } catch (saveError) {
            //         console.error(`[SQLite GetUser] Error guardando pushname actualizado para ${userId}:`, saveError);
            //     }
            // }

            resolve(userEntry); // Devuelve el objeto userEntry (actualizado en memoria)
        });
    });
}


async function saveUserData(userId, userObject) {
    return new Promise((resolve, reject) => {
        // Asegurar que el objeto a guardar tenga todos los campos, usando defaults si faltan
        // y priorizando los valores de userObject. userId se maneja por separado para la key.
        const dataToSave = { ...DEFAULT_USER_FIELDS, ...userObject };
        
        // Construir los valores en el orden de ALL_USER_FIELDS_ORDERED
        const values = ALL_USER_FIELDS_ORDERED.map(field => {
            if (field === 'userId') return userId; // El primer valor es el userId para la PRIMARY KEY
            return dataToSave.hasOwnProperty(field) ? dataToSave[field] : DEFAULT_USER_FIELDS[field];
        });

        const fieldsForSQL = ALL_USER_FIELDS_ORDERED.join(', ');
        const placeholders = ALL_USER_FIELDS_ORDERED.map(() => '?').join(', ');
        const stmtSQL = `INSERT OR REPLACE INTO users (${fieldsForSQL}) VALUES (${placeholders})`;
        
        db.run(stmtSQL, values, function(err) {
            if (err) {
                console.error(`[SQLite SaveUser] Error guardando datos para ${userId}:`, err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

async function getAllUserData() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM users", [], (err, rows) => {
            if (err) { /* ... */ return reject(err); }
            const allUsersObject = {};
            rows.forEach(row => {
                allUsersObject[row.userId] = { ...DEFAULT_USER_FIELDS, ...row };
            });
            resolve(allUsersObject);
        });
    });
}

// --- Nuevas Funciones para el Estado de Registro de Contraseña ---
async function setUserRegistrationState(userId, state) {
    try {
        const user = await getUserData(userId); // Obtener datos actuales para no perder otra info
        if (user) {
            user.registration_state = state;
            await saveUserData(userId, user);
            console.log(`[Shared Economy] Estado de registro para ${userId} cambiado a: ${state}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`[Shared Economy] Error en setUserRegistrationState para ${userId}:`, error);
        return false;
    }
}

async function clearUserRegistrationState(userId) {
    return setUserRegistrationState(userId, null); // Reutilizar la función anterior
}
// --- Fin Funciones de Estado ---


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

// Nueva función para encontrar un usuario por phoneNumber y estado
async function findUserByPhoneNumberAndState(phoneNumberWithoutPlus, expectedState) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE phoneNumber = ? AND registration_state = ?";
        db.get(sql, [phoneNumberWithoutPlus, expectedState], (err, row) => {
            if (err) {
                console.error(`[SQLite FindUserByPhoneState] Error buscando usuario por tel ${phoneNumberWithoutPlus} y estado ${expectedState}:`, err.message);
                return reject(err);
            }
            if (row) {
                resolve({ ...DEFAULT_USER_FIELDS, ...row }); // Devuelve el objeto usuario completo
            } else {
                resolve(null); // No encontrado
            }
        });
    });
}

module.exports = {
    getUserData, saveUserData, getAllUserData, msToTime, pickRandom,
    hashPassword, verifyPassword,
    setUserRegistrationState, clearUserRegistrationState, findUserByPhoneNumberAndState 
};