/**
 * RestEasy — Local Storage (MMKV)
 * Fast key-value store for offline-first data persistence.
 * Used as the primary data layer; Supabase is the sync target.
 *
 * Data stored locally:
 * - Sleep journal entries (pending sync queue)
 * - User profile & sleep window
 * - Program state (current week, progression)
 * - ISI scores
 * - Streak data
 * - Settings & preferences
 */
import { MMKV } from 'react-native-mmkv';

// ─── MMKV Instances ───────────────────────────────────────────────────────────

// Main storage — general app data
export const storage = new MMKV({ id: 'resteasy-main' });

// Encrypted storage — sensitive sleep data
export const secureStorage = new MMKV({
  id: 'resteasy-secure',
  encryptionKey: 'resteasy-aes-key-v1', // Rotated on first launch from Keychain
});

// Sync queue — entries pending upload to Supabase
export const syncQueue = new MMKV({ id: 'resteasy-sync-queue' });

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // User
  USER_ID: 'user_id',
  USER_NAME: 'user_name',
  INSTALL_DATE: 'install_date',
  LOCALE: 'locale',
  PUSH_TOKEN: 'push_token',

  // Program
  PROGRAM_WEEK: 'program_week',
  SLEEP_WINDOW: 'sleep_window',
  ONBOARDING_COMPLETE: 'onboarding_complete',

  // Journal
  JOURNAL_ENTRIES: 'journal_entries',
  LAST_JOURNAL_DATE: 'last_journal_date',

  // Streak
  CURRENT_STREAK: 'current_streak',
  LONGEST_STREAK: 'longest_streak',
  LAST_ENTRY_DATE: 'last_entry_date',

  // ISI
  ISI_SCORES: 'isi_scores',

  // Settings
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  AUDIO_ENABLED: 'audio_enabled',
  THEME: 'theme',

  // Sync
  LAST_SYNC_AT: 'last_sync_at',
  SYNC_QUEUE_COUNT: 'sync_queue_count',
} as const;

// ─── Typed Getters/Setters ────────────────────────────────────────────────────

export function getString(key: string): string | undefined {
  return storage.getString(key);
}

export function setString(key: string, value: string): void {
  storage.set(key, value);
}

export function getNumber(key: string): number | undefined {
  return storage.getNumber(key);
}

export function setNumber(key: string, value: number): void {
  storage.set(key, value);
}

export function getBoolean(key: string): boolean | undefined {
  return storage.getBoolean(key);
}

export function setBoolean(key: string, value: boolean): void {
  storage.set(key, value);
}

export function getObject<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setObject<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function deleteKey(key: string): void {
  storage.delete(key);
}

// ─── Sleep Window ─────────────────────────────────────────────────────────────

export interface SleepWindow {
  start_time: string;  // "23:30"
  end_time: string;    // "06:00"
  duration_hours: number;
}

export function getSleepWindow(): SleepWindow | null {
  return getObject<SleepWindow>(STORAGE_KEYS.SLEEP_WINDOW);
}

export function setSleepWindow(window: SleepWindow): void {
  setObject(STORAGE_KEYS.SLEEP_WINDOW, window);
}

// ─── Journal Entry Cache ──────────────────────────────────────────────────────

export interface LocalJournalEntry {
  id: string;
  entry_date: string;
  bedtime: string;
  wake_time: string;
  out_of_bed_time: string;
  sleep_onset_minutes: number;
  wake_count: number;
  program_week: number;
  synced: boolean;
  created_at: string;
}

export function getLocalEntries(): LocalJournalEntry[] {
  return getObject<LocalJournalEntry[]>(STORAGE_KEYS.JOURNAL_ENTRIES) ?? [];
}

export function saveLocalEntry(entry: LocalJournalEntry): void {
  const entries = getLocalEntries();
  const existingIndex = entries.findIndex(e => e.entry_date === entry.entry_date);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }
  setObject(STORAGE_KEYS.JOURNAL_ENTRIES, entries);
}

export function markEntrySynced(entryDate: string): void {
  const entries = getLocalEntries();
  const entry = entries.find(e => e.entry_date === entryDate);
  if (entry) {
    entry.synced = true;
    setObject(STORAGE_KEYS.JOURNAL_ENTRIES, entries);
  }
}

export function getPendingEntries(): LocalJournalEntry[] {
  return getLocalEntries().filter(e => !e.synced);
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export interface SyncQueueItem {
  id: string;
  type: 'journal_entry' | 'isi_score' | 'night_session';
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
}

export function enqueueSyncItem(item: Omit<SyncQueueItem, 'attempts'>): void {
  const key = `sync_${item.id}`;
  syncQueue.set(key, JSON.stringify({ ...item, attempts: 0 }));
}

export function getAllSyncItems(): SyncQueueItem[] {
  const keys = syncQueue.getAllKeys();
  return keys
    .map(k => {
      const raw = syncQueue.getString(k);
      if (!raw) return null;
      try { return JSON.parse(raw) as SyncQueueItem; } catch { return null; }
    })
    .filter(Boolean) as SyncQueueItem[];
}

export function removeSyncItem(id: string): void {
  syncQueue.delete(`sync_${id}`);
}

export function incrementSyncAttempts(id: string): void {
  const key = `sync_${id}`;
  const raw = syncQueue.getString(key);
  if (!raw) return;
  try {
    const item = JSON.parse(raw) as SyncQueueItem;
    item.attempts += 1;
    syncQueue.set(key, JSON.stringify(item));
  } catch {
    // Ignore
  }
}
