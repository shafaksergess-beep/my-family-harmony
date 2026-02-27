import { supabase } from '../lib/supabase';
import * as Database from './database';
import { Database as DatabaseType } from '../types/database.types';

type TableName = keyof DatabaseType['public']['Tables'];

export const syncPull = async (tables: TableName[]) => {
    try {
        console.log('Starting sync pull for tables:', tables);
        for (const table of tables) {
            // Get last synced timestamp if exists
            const lastSynced = await Database.getItem<number>(`last_synced_${table}`) || 0;
            
            const query = supabase.from(table).select('*');
            
            // If we have a last synced, we could technically just pull updates
            // but for simplicity in this phase, we do full pulls for core data
            const { data, error } = await query;

            if (error) {
                console.error(`Error syncing ${table}:`, error);
                continue;
            }

            if (data) {
                await Database.setItem(`cache_${table}`, data);
                await Database.setItem(`last_synced_${table}`, Date.now());
                console.log(`Synced ${data.length} records for ${table}`);
            }
        }
    } catch (error) {
        console.error('Sync pull failed:', error);
    }
};

export const syncAll = async () => {
    const coreTables: TableName[] = ['families', 'family_members', 'meetings', 'contributions'];
    await syncPull(coreTables);
    await syncPush();
};

export const syncPush = async () => {
    try {
        const queue = await Database.getSyncQueue();

        for (const item of queue) {
            const { id, table_name, action, data } = item as { id: number, table_name: TableName, action: string, data: string };
            const payload = JSON.parse(data);

            let error;

            if (action === 'INSERT') {
                ({ error } = await supabase.from(table_name).insert(payload));
            } else if (action === 'UPDATE') {
                // Assuming payload has id
                const { id: recordId, ...updates } = payload;
                ({ error } = await supabase.from(table_name).update(updates).eq('id', recordId));
            } else if (action === 'DELETE') {
                ({ error } = await supabase.from(table_name).delete().eq('id', payload.id));
            }

            if (!error) {
                await Database.clearSyncQueueItem(id);
            } else {
                console.error(`Failed to sync item ${id}:`, error);
            }
        }
    } catch (error) {
        console.error('Sync push failed:', error);
    }
};
