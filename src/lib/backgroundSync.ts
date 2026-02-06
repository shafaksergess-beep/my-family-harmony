// Enhanced background sync service for offline-first architecture
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from './offlineStorage';
import { syncQueue, SyncOperation } from './syncQueue';

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
  isOnline: boolean;
}

class BackgroundSyncService {
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: number | null = null;
  private status: SyncStatus = {
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    isOnline: navigator.onLine,
  };

  constructor() {
    this.initEventListeners();
    this.loadSavedStatus();
  }

  private async loadSavedStatus() {
    const savedStatus = await offlineStorage.getPreference<SyncStatus>('syncStatus');
    if (savedStatus) {
      this.status.lastSyncTime = savedStatus.lastSyncTime;
    }
  }

  private initEventListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.status.isOnline = true;
      this.notifyListeners();
      this.scheduleSync();
    });

    window.addEventListener('offline', () => {
      this.status.isOnline = false;
      this.notifyListeners();
      this.stopAutoSync();
    });

    // Subscribe to sync queue changes
    syncQueue.subscribe(async (queue) => {
      this.status.pendingCount = queue.filter(op => op.status === 'pending').length;
      this.status.failedCount = queue.filter(op => op.status === 'failed').length;
      this.notifyListeners();
    });

    // Start auto-sync if online
    if (navigator.onLine) {
      this.scheduleSync();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.status }));
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately send current status
    listener({ ...this.status });
    return () => this.listeners.delete(listener);
  }

  async sync(): Promise<{ success: number; failed: number }> {
    if (this.status.isSyncing || !navigator.onLine) {
      return { success: 0, failed: 0 };
    }

    this.status.isSyncing = true;
    this.notifyListeners();

    try {
      const result = await syncQueue.processQueue();
      
      this.status.lastSyncTime = Date.now();
      await offlineStorage.setPreference('syncStatus', {
        lastSyncTime: this.status.lastSyncTime,
      });

      // Clear expired cache entries
      await offlineStorage.clearExpired();

      return result;
    } finally {
      this.status.isSyncing = false;
      this.notifyListeners();
    }
  }

  scheduleSync(intervalMs: number = 30000) {
    this.stopAutoSync();
    
    // Immediate sync
    this.sync();

    // Schedule periodic sync
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.status.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }
}

export const backgroundSync = new BackgroundSyncService();

// Enhanced offline mutation helpers for contributions and loans
export async function queueContribution(data: {
  family_id: string;
  member_id: string;
  amount: number;
  contribution_date: string;
  type: string;
  notes?: string;
}) {
  const id = crypto.randomUUID();
  
  await syncQueue.add({
    type: 'INSERT',
    table: 'contributions',
    data: {
      id,
      ...data,
      status: 'pending',
      created_at: new Date().toISOString(),
    },
    primaryKey: 'id',
    familyId: data.family_id,
  });

  // Store optimistically in cache
  const cacheKey = `contributions-${data.family_id}`;
  const cached = await offlineStorage.get<any[]>(cacheKey) || [];
  cached.unshift({
    id,
    ...data,
    status: 'pending',
    _offline: true,
  });
  await offlineStorage.set(cacheKey, cached, data.family_id);

  return { id, success: true };
}

export async function queueLoanPayment(data: {
  loan_id: string;
  member_id: string;
  family_id: string;
  amount_paid: number;
  principal_paid: number;
  interest_paid: number;
  payment_method?: string;
  notes?: string;
}) {
  const id = crypto.randomUUID();
  
  await syncQueue.add({
    type: 'INSERT',
    table: 'loan_payments',
    data: {
      id,
      ...data,
      payment_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    primaryKey: 'id',
    familyId: data.family_id,
  });

  // Also update the loan's amount_paid optimistically
  await syncQueue.add({
    type: 'UPDATE',
    table: 'loans',
    data: {
      id: data.loan_id,
      // Note: actual amount calculation happens on sync
    },
    primaryKey: 'id',
    familyId: data.family_id,
  });

  return { id, success: true };
}

export async function queueSavingsDeposit(data: {
  family_id: string;
  member_id: string;
  amount: number;
  month: string;
  notes?: string;
}) {
  const id = crypto.randomUUID();
  
  // Savings are stored as contributions with type 'savings'
  await syncQueue.add({
    type: 'INSERT',
    table: 'contributions',
    data: {
      id,
      family_id: data.family_id,
      member_id: data.member_id,
      amount: data.amount,
      contribution_date: data.month,
      type: 'savings',
      notes: data.notes,
      status: 'paid',
      payment_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    primaryKey: 'id',
    familyId: data.family_id,
  });

  return { id, success: true };
}

export default backgroundSync;
