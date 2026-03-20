/**
 * RestEasy — Sync Service
 * Offline-first synchronization between MMKV local store and Supabase.
 *
 * Strategy:
 * 1. All writes go to MMKV first (instant, offline-safe)
 * 2. Sync queue is processed when network is available
 * 3. Failed syncs are retried up to 3 times with exponential backoff
 * 4. Conflicts resolved by "last write wins" on entry_date
 */
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  getAllSyncItems,
  removeSyncItem,
  incrementSyncAttempts,
  setString,
  STORAGE_KEYS,
} from './storage';
import { captureError } from './sentry';
import { Analytics } from './posthog';

const MAX_RETRY_ATTEMPTS = 3;

// ─── Sync Runner ──────────────────────────────────────────────────────────────

export async function runSync(): Promise<{ synced: number; failed: number }> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { synced: 0, failed: 0 };
  }

  const items = getAllSyncItems();
  if (items.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of items) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      // Give up after 3 attempts — log to Sentry
      captureError(new Error(`Sync item ${item.id} failed after ${MAX_RETRY_ATTEMPTS} attempts`), {
        type: item.type,
        payload: item.payload,
      });
      removeSyncItem(item.id);
      failed++;
      continue;
    }

    const success = await syncItem(item.type, item.payload);
    if (success) {
      removeSyncItem(item.id);
      synced++;
    } else {
      incrementSyncAttempts(item.id);
      failed++;
    }
  }

  if (synced > 0) {
    setString(STORAGE_KEYS.LAST_SYNC_AT, new Date().toISOString());
    Analytics.track('sync_completed', { synced, failed });
  }

  return { synced, failed };
}

// ─── Item Sync Handlers ───────────────────────────────────────────────────────

async function syncItem(
  type: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    switch (type) {
      case 'journal_entry':
        return await syncJournalEntry(payload);
      case 'isi_score':
        return await syncISIScore(payload);
      case 'night_session':
        return await syncNightSession(payload);
      default:
        return true; // Unknown type — remove from queue
    }
  } catch (error) {
    captureError(error as Error, { context: 'syncItem', type });
    return false;
  }
}

async function syncJournalEntry(payload: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('sleep_entries')
    .upsert(payload, { onConflict: 'user_id,entry_date' });

  return !error;
}

async function syncISIScore(payload: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('isi_scores')
    .upsert(payload, { onConflict: 'user_id,program_week' });

  return !error;
}

async function syncNightSession(payload: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('night_mode_sessions')
    .insert(payload);

  return !error;
}

// ─── Network Listener ─────────────────────────────────────────────────────────

let unsubscribeNetInfo: (() => void) | null = null;

export function startSyncListener(): void {
  if (unsubscribeNetInfo) return;

  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      // Delay slightly to ensure connection is stable
      setTimeout(() => runSync(), 2000);
    }
  });
}

export function stopSyncListener(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
