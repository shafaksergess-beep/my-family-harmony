import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('family_together.db');

export const initDatabase = async () => {
    try {
        await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

export const setItem = async (key: string, value: any) => {
    const jsonValue = JSON.stringify(value);
    const timestamp = Date.now();
    await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)',
        key,
        jsonValue,
        timestamp
    );
};

export const getItem = async <T>(key: string): Promise<T | null> => {
    const result = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM kv_store WHERE key = ?',
        key
    );
    return result ? JSON.parse(result.value) : null;
};

export const removeItem = async (key: string) => {
    await db.runAsync('DELETE FROM kv_store WHERE key = ?', key);
};

export const addToSyncQueue = async (tableName: string, action: 'INSERT' | 'UPDATE' | 'DELETE', data: any) => {
    const jsonData = JSON.stringify(data);
    await db.runAsync(
        'INSERT INTO sync_queue (table_name, action, data) VALUES (?, ?, ?)',
        tableName,
        action,
        jsonData
    );
};

export const getSyncQueue = async () => {
    return await db.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at ASC');
};

export const clearSyncQueueItem = async (id: number) => {
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', id);
};
