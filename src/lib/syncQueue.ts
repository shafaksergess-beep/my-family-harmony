// Sync queue for offline mutations with conflict resolution

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Use untyped client for dynamic table operations
const untypedSupabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SyncOperation {
  id?: number;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: Record<string, unknown>;
  primaryKey?: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  retryCount: number;
  error?: string;
  familyId?: string;
}

const DB_NAME = 'kinsroot_offline';

class SyncQueue {
  private isProcessing = false;
  private listeners: Set<(queue: SyncOperation[]) => void> = new Set();

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async add(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<number> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const fullOperation: SyncOperation = {
        ...operation,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
      };

      const request = store.add(fullOperation);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const id = request.result as number;
        this.notifyListeners();
        resolve(id);
      };
    });
  }

  async getAll(): Promise<SyncOperation[]> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getPending(): Promise<SyncOperation[]> {
    const all = await this.getAll();
    return all.filter(op => op.status === 'pending' || op.status === 'failed');
  }

  async updateStatus(id: number, status: SyncOperation['status'], error?: string): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const operation = getRequest.result as SyncOperation;
        if (operation) {
          operation.status = status;
          if (error) operation.error = error;
          if (status === 'failed') operation.retryCount++;

          const putRequest = store.put(operation);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => {
            this.notifyListeners();
            resolve();
          };
        } else {
          resolve();
        }
      };
    });
  }

  async remove(id: number): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
    });
  }

  async clearCompleted(): Promise<void> {
    const all = await this.getAll();
    const completed = all.filter(op => op.status === 'completed');
    
    for (const op of completed) {
      if (op.id) await this.remove(op.id);
    }
  }

  async processQueue(): Promise<{ success: number; failed: number }> {
    if (this.isProcessing || !navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.isProcessing = true;
    let success = 0;
    let failed = 0;

    try {
      const pending = await this.getPending();
      
      // Sort by timestamp (oldest first) for conflict resolution
      pending.sort((a, b) => a.timestamp - b.timestamp);

      for (const operation of pending) {
        if (!operation.id) continue;
        
        // Skip operations that have failed too many times
        if (operation.retryCount >= 3) {
          continue;
        }

        await this.updateStatus(operation.id, 'syncing');

        try {
          await this.executeOperation(operation);
          await this.remove(operation.id);
          success++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.updateStatus(operation.id, 'failed', errorMessage);
          failed++;
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return { success, failed };
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    const { type, table, data, primaryKey } = operation;

    switch (type) {
      case 'INSERT': {
        const { error } = await untypedSupabase
          .from(table)
          .insert(data);
        if (error) throw error;
        break;
      }
      case 'UPDATE': {
        if (!primaryKey || !data[primaryKey]) {
          throw new Error('Primary key required for UPDATE');
        }
        const { error } = await untypedSupabase
          .from(table)
          .update(data)
          .eq(primaryKey, data[primaryKey] as string);
        if (error) throw error;
        break;
      }
      case 'DELETE': {
        if (!primaryKey || !data[primaryKey]) {
          throw new Error('Primary key required for DELETE');
        }
        const { error } = await untypedSupabase
          .from(table)
          .delete()
          .eq(primaryKey, data[primaryKey] as string);
        if (error) throw error;
        break;
      }
    }
  }

  subscribe(callback: (queue: SyncOperation[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private async notifyListeners(): Promise<void> {
    const queue = await this.getAll();
    this.listeners.forEach(callback => callback(queue));
  }
}

export const syncQueue = new SyncQueue();

// Auto-process queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue.processQueue();
  });
}

export default syncQueue;
