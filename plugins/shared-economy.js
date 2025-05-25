// plugins/shared-economy.js
// Manejo de datos de economía usando SQLite como backend principal.

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Asegúrate de haber hecho 'npm install sqlite3'

const JSON_BACKUP_PATH = path.join(__dirname, '..', 'userData.json'); // Para backup/importación inicial
const DB_PATH = path.join(__dirname, '..', 'bot_database.sqlite'); // Ruta a tu archivo de base de datos SQLite

// Campos por defecto para un nuevo usuario o para migración
const DEFAULT_USER_FIELDS = {
    exp: 0, money: 0, bank: 0,
    lastwork: 0, laststeal: 0, lastcrime: 0, lastslut: 0,
    lastroulette: 0, lastslots: 0, lastdaily: 0, dailystreak: 0,
    pushname: null
};
const ALL_USER_FIELDS_ORDERED = [ // El orden importa para las sentencias SQL
    'userId', 'exp', 'money', 'bank',
    'lastwork', 'laststeal', 'lastcrime', 'lastslut',
    'lastroulette', 'lastslots', 'lastdaily', 'dailystreak',
    'pushname'
];


// Conectar a la base de datos (o crearla si no existe)
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("[SQLite] Error al conectar/crear la base de datos:", err.message);
        // Considerar terminar el proceso si la BD es crítica y no se puede abrir
        // process.exit(1); 
    } else {
        console.log("[SQLite] Conectado exitosamente a la base de datos SQLite:", DB_PATH);
        initializeDatabase(); // Crear tabla y migrar si es necesario
    }
});

// Función para inicializar la tabla y migrar desde JSON si es necesario
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
            pushname TEXT
        );`;

    db.run(createTableSQL, async (err) => {
        if (err) {
            return console.error("[SQLite] Error creando tabla 'users':", err.message);
        }
        console.log("[SQLite] Tabla 'users' asegurada/creada.");

        // Verificar si la tabla está vacía para posible importación desde JSON
        db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
            if (err) {
                return console.error("[SQLite] Error contando usuarios en la BD:", err.message);
            }

            if (row.count === 0) {
                console.log("[SQLite] Tabla 'users' está vacía. Intentando importar desde:", JSON_BACKUP_PATH);
                try {
                    await fs.access(JSON_BACKUP_PATH); // Verifica si el archivo existe
                    const fileContent = await fs.readFile(JSON_BACKUP_PATH, 'utf8');
                    const jsonData = JSON.parse(fileContent);
                    
                    if (Object.keys(jsonData).length > 0) {
                        const stmt = db.prepare(`
                            INSERT OR IGNORE INTO users 
                            (userId, exp, money, bank, lastwork, laststeal, lastcrime, lastslut, lastroulette, lastslots, lastdaily, dailystreak, pushname) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        let importedCount = 0;
                        db.serialize(() => { // Usar serialize para asegurar orden en transacciones
                            db.run("BEGIN TRANSACTION;");
                            for (const userId in jsonData) {
                                const jsonEntry = jsonData[userId];
                                // Combinar con defaults para asegurar todos los campos, priorizando los del JSON
                                const userEntry = { ...DEFAULT_USER_FIELDS, ...jsonEntry }; 
                                stmt.run(
                                    userId, userEntry.exp, userEntry.money, userEntry.bank,
                                    userEntry.lastwork, userEntry.laststeal, userEntry.lastcrime, userEntry.lastslut,
                                    userEntry.lastroulette, userEntry.lastslots, userEntry.lastdaily, userEntry.dailystreak,
                                    userEntry.pushname
                                );
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

// getUserData ahora lee de SQLite
async function getUserData(userId, source = null) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE userId = ?", [userId], async (err, row) => {
            if (err) {
                console.error(`[SQLite GetUser] Error obteniendo usuario ${userId}:`, err.message);
                return reject(err); // Rechazar la promesa en caso de error de BD
            }

            let userEntry;
            let isNewInDb = false; // Para saber si debemos insertar o actualizar en saveUserData

            if (row) {
                userEntry = { ...DEFAULT_USER_FIELDS, ...row }; // Combinar con defaults para asegurar todos los campos
            } else {
                isNewInDb = true;
                userEntry = { userId, ...DEFAULT_USER_FIELDS };
            }

            let pushnameWasUpdated = false;
            if (source) {
                let contactToUse = null;
                try {
                    if (typeof source.getContact === 'function') {
                        contactToUse = await source.getContact();
                    } else if (source.id && (source.pushname !== undefined || source.name !== undefined || source.number !== undefined)) {
                        contactToUse = source;
                    }

                    if (contactToUse) {
                        let currentName = contactToUse.pushname || contactToUse.name || contactToUse.number;
                        if (currentName && userEntry.pushname !== currentName) {
                            userEntry.pushname = currentName;
                            pushnameWasUpdated = true; // Marcar para posible guardado inmediato
                            console.log(`[SQLite GetUser] Pushname para ${userId} será actualizado a: ${userEntry.pushname}`);
                        }
                    }
                } catch (contactError) {
                    console.error(`[SQLite GetUser] Error obteniendo info de contacto para ${userId} desde source:`, contactError.message);
                }
            }
            
            // Si es un usuario completamente nuevo para la BD o su pushname se actualizó,
            // y queremos persistir este cambio inmediatamente (antes de una operación económica).
            if (isNewInDb || pushnameWasUpdated) {
                 // console.log(`[SQLite GetUser] Usuario ${userId} es nuevo o pushname actualizado. Guardando entrada inicial/actualizada...`);
                 // await saveUserData(userId, userEntry); // Podría causar un guardado extra si el plugin también llama a saveUserData
                 // Es mejor que el plugin que modifica datos sea el responsable de llamar a saveUserData.
                 // La entrada se creará/actualizará en la BD cuando saveUserData sea llamado por el plugin.
            }
            resolve(userEntry);
        });
    });
}

// saveUserData ahora escribe/actualiza en SQLite
async function saveUserData(userId, userObject) {
    return new Promise((resolve, reject) => {
        const dataToSave = { userId, ...DEFAULT_USER_FIELDS, ...userObject }; // Incluir userId y asegurar todos los campos

        const fieldsForSQL = ALL_USER_FIELDS_ORDERED.join(', ');
        const placeholders = ALL_USER_FIELDS_ORDERED.map(() => '?').join(', ');
        const values = ALL_USER_FIELDS_ORDERED.map(field => dataToSave[field]);

        const stmtSQL = `INSERT OR REPLACE INTO users (${fieldsForSQL}) VALUES (${placeholders})`;
        
        db.run(stmtSQL, values, function(err) {
            if (err) {
                console.error(`[SQLite SaveUser] Error guardando datos para ${userId}:`, err.message);
                return reject(err);
            }
            // console.log(`[SQLite SaveUser] Datos guardados para ${userId}. Filas afectadas: ${this.changes}`);
            resolve();
        });
    });
}

// getAllUserData ahora lee de SQLite
async function getAllUserData() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM users", [], (err, rows) => {
            if (err) {
                console.error("[SQLite GetAllUsers] Error obteniendo todos los usuarios:", err.message);
                return reject(err); // Rechazar la promesa
            }
            const allUsersObject = {};
            rows.forEach(row => {
                allUsersObject[row.userId] = { ...DEFAULT_USER_FIELDS, ...row }; // Combinar con defaults
            });
            resolve(allUsersObject);
        });
    });
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
    getAllUserData,
    msToTime,
    pickRandom,
};