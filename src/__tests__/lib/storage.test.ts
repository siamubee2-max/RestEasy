/**
 * RestEasy — Storage Tests
 * Tests local MMKV storage operations and sync queue.
 */

// Mock MMKV
jest.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn((key: string, value: string) => { store[key] = value; }),
      getString: jest.fn((key: string) => store[key]),
      getNumber: jest.fn((key: string) => {
        const v = store[key]; return v ? Number(v) : undefined;
      }),
      getBoolean: jest.fn((key: string) => {
        const v = store[key]; return v ? v === 'true' : undefined;
      }),
      delete: jest.fn((key: string) => { delete store[key]; }),
      getAllKeys: jest.fn(() => Object.keys(store)),
    })),
  };
});

import {
  getObject,
  setObject,
  getSleepWindow,
  setSleepWindow,
  saveLocalEntry,
  getLocalEntries,
  getPendingEntries,
  markEntrySynced,
  type LocalJournalEntry,
  type SleepWindow,
} from '../../lib/storage';

describe('Object Storage', () => {
  test('stores and retrieves objects correctly', () => {
    const obj = { name: 'Sarah', week: 3 };
    setObject('test_key', obj);
    expect(getObject('test_key')).toEqual(obj);
  });

  test('returns null for missing keys', () => {
    expect(getObject('nonexistent_key')).toBeNull();
  });
});

describe('Sleep Window', () => {
  const window: SleepWindow = {
    start_time: '23:30',
    end_time: '06:00',
    duration_hours: 6.5,
  };

  test('saves and retrieves sleep window', () => {
    setSleepWindow(window);
    expect(getSleepWindow()).toEqual(window);
  });
});

describe('Journal Entry Cache', () => {
  const entry: LocalJournalEntry = {
    id: 'test-123',
    entry_date: '2025-03-01',
    bedtime: '23:30',
    wake_time: '06:00',
    out_of_bed_time: '06:30',
    sleep_onset_minutes: 20,
    wake_count: 1,
    program_week: 2,
    synced: false,
    created_at: new Date().toISOString(),
  };

  test('saves and retrieves journal entry', () => {
    saveLocalEntry(entry);
    const entries = getLocalEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].entry_date).toBe('2025-03-01');
  });

  test('pending entries returns only unsynced', () => {
    const pending = getPendingEntries();
    expect(pending.every(e => !e.synced)).toBe(true);
  });

  test('marks entry as synced', () => {
    saveLocalEntry(entry);
    markEntrySynced('2025-03-01');
    const entries = getLocalEntries();
    const updated = entries.find(e => e.entry_date === '2025-03-01');
    expect(updated?.synced).toBe(true);
  });

  test('updates existing entry for same date', () => {
    const updated = { ...entry, sleep_onset_minutes: 35 };
    saveLocalEntry(entry);
    saveLocalEntry(updated);
    const entries = getLocalEntries().filter(e => e.entry_date === '2025-03-01');
    expect(entries.length).toBe(1);
    expect(entries[0].sleep_onset_minutes).toBe(35);
  });
});
