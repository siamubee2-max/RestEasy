import { useState, useEffect, useCallback } from 'react';
import { getSleepEntries, getSleepWindow, insertSleepEntry, SleepEntryInsert } from '../lib/supabase';

export interface SleepEntry {
  id: string;
  entry_date: string;
  bedtime: string;
  sleep_onset_minutes: number;
  wake_count: number;
  waso_minutes: number;
  wake_time: string;
  out_of_bed_time: string;
  time_in_bed_minutes: number;
  total_sleep_minutes: number;
  sleep_efficiency: number;
  program_week: number;
}

export interface SleepWindow {
  prescribed_bedtime: string;   // "23:30"
  prescribed_wake_time: string; // "06:00"
  window_minutes: number;
  avg_sleep_efficiency: number;
}

export function useSleepData(currentWeek: number) {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [sleepWindow, setSleepWindow] = useState<SleepWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesData, windowData] = await Promise.all([
        getSleepEntries(currentWeek),
        getSleepWindow(currentWeek),
      ]);
      setEntries(entriesData as SleepEntry[]);
      if (windowData) setSleepWindow(windowData as SleepWindow);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => { load(); }, [load]);

  const addEntry = useCallback(async (entry: SleepEntryInsert) => {
    const result = await insertSleepEntry(entry);
    await load(); // Refresh
    return result;
  }, [load]);

  // Calculate average efficiency for the week
  const avgEfficiency = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + (e.sleep_efficiency ?? 0), 0) / entries.length)
    : null;

  // Check if journal was already filled today
  const today = new Date().toISOString().split('T')[0];
  const journalDoneToday = entries.some(e => e.entry_date === today);

  return {
    entries,
    sleepWindow,
    loading,
    error,
    addEntry,
    avgEfficiency,
    journalDoneToday,
    refresh: load,
  };
}
