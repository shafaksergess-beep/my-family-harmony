import { useState, useEffect, useCallback } from 'react';
import * as Database from '../services/database';
import { supabase } from '../lib/supabase';
import { Database as DatabaseType } from '../types/database.types';

type TableName = keyof DatabaseType['public']['Tables'];

export function useOfflineData<T>(table: TableName, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Try to load from local SQLite first
      const cached = await Database.getItem<T[]>(`cache_${table}`);
      if (cached) {
        setData(cached);
        setLoading(false); // Show cached data immediately
      }

      // 2. Fetch fresh data from Supabase
      const { data: freshData, error: supabaseError } = await supabase
        .from(table)
        .select('*');

      if (supabaseError) throw supabaseError;

      if (freshData) {
        setData(freshData as unknown as T[]);
        // Update cache
        await Database.setItem(`cache_${table}`, freshData);
      }
    } catch (err) {
      console.error(`Error loading data for ${table}:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: loadData };
}
