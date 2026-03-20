/**
 * RestEasy — Apple Health & Google Fit Integration
 *
 * iOS: HealthKit via react-native-health
 * Android: Health Connect via react-native-health-connect
 *
 * Data read:
 * - Sleep analysis (in bed, asleep, awake)
 * - Heart rate during sleep
 * - Respiratory rate
 *
 * Data written:
 * - Sleep analysis (user's sleep window)
 * - Mindful sessions (breathing exercises)
 *
 * Privacy: User must explicitly grant permission.
 * Data stays on device; never sent to Supabase.
 */
import { Platform } from 'react-native';
import { Analytics } from './posthog';
import { captureError } from './sentry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SleepSample {
  startDate: Date;
  endDate: Date;
  value: 'INBED' | 'ASLEEP' | 'AWAKE';
  source: string;
}

export interface HealthSleepData {
  bedtime: string;        // "23:30"
  wake_time: string;      // "06:15"
  total_sleep_minutes: number;
  awake_minutes: number;
  source: 'apple_health' | 'google_fit' | 'manual';
}

// ─── iOS — HealthKit ──────────────────────────────────────────────────────────

let AppleHealthKit: any = null;

async function loadHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    AppleHealthKit = require('react-native-health').default;
    return true;
  } catch {
    return false;
  }
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  const loaded = await loadHealthKit();
  if (!loaded || !AppleHealthKit) return false;

  return new Promise(resolve => {
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRate,
          AppleHealthKit.Constants.Permissions.RespiratoryRate,
        ],
        write: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.MindfulSession,
        ],
      },
    };

    AppleHealthKit.initHealthKit(permissions, (error: Error) => {
      if (error) {
        captureError(error, { context: 'requestHealthKitPermissions' });
        resolve(false);
      } else {
        Analytics.track('health_kit_permissions_granted', { platform: 'ios' });
        resolve(true);
      }
    });
  });
}

export async function getLastNightSleepFromHealthKit(): Promise<HealthSleepData | null> {
  const loaded = await loadHealthKit();
  if (!loaded || !AppleHealthKit) return null;

  return new Promise(resolve => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);

    const options = {
      startDate: yesterday.toISOString(),
      endDate: new Date().toISOString(),
      ascending: true,
      limit: 100,
    };

    AppleHealthKit.getSleepSamples(options, (error: Error, results: SleepSample[]) => {
      if (error || !results || results.length === 0) {
        resolve(null);
        return;
      }

      // Find the main sleep session
      const inBedSamples = results.filter(s => s.value === 'INBED');
      const asleepSamples = results.filter(s => s.value === 'ASLEEP');
      const awakeSamples = results.filter(s => s.value === 'AWAKE');

      if (inBedSamples.length === 0 && asleepSamples.length === 0) {
        resolve(null);
        return;
      }

      const samples = asleepSamples.length > 0 ? asleepSamples : inBedSamples;
      const earliest = new Date(Math.min(...samples.map(s => new Date(s.startDate).getTime())));
      const latest = new Date(Math.max(...samples.map(s => new Date(s.endDate).getTime())));

      const totalSleepMinutes = asleepSamples.reduce((sum, s) => {
        return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
      }, 0);

      const awakeMinutes = awakeSamples.reduce((sum, s) => {
        return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
      }, 0);

      const formatTime = (date: Date) =>
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

      resolve({
        bedtime: formatTime(earliest),
        wake_time: formatTime(latest),
        total_sleep_minutes: Math.round(totalSleepMinutes),
        awake_minutes: Math.round(awakeMinutes),
        source: 'apple_health',
      });
    });
  });
}

export async function saveMindfulSessionToHealthKit(durationMinutes: number): Promise<void> {
  const loaded = await loadHealthKit();
  if (!loaded || !AppleHealthKit) return;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - durationMinutes * 60000);

  AppleHealthKit.saveMindfulSession(
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    (error: Error) => {
      if (error) captureError(error, { context: 'saveMindfulSession' });
    }
  );
}

// ─── Android — Health Connect ─────────────────────────────────────────────────

let HealthConnect: any = null;

async function loadHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    HealthConnect = require('react-native-health-connect');
    return true;
  } catch {
    return false;
  }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  const loaded = await loadHealthConnect();
  if (!loaded || !HealthConnect) return false;

  try {
    const isAvailable = await HealthConnect.getSdkStatus();
    if (isAvailable !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return false;
    }

    const granted = await HealthConnect.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'write', recordType: 'SleepSession' },
    ]);

    if (granted) {
      Analytics.track('health_kit_permissions_granted', { platform: 'android' });
    }

    return granted;
  } catch (error) {
    captureError(error as Error, { context: 'requestHealthConnectPermissions' });
    return false;
  }
}

export async function getLastNightSleepFromHealthConnect(): Promise<HealthSleepData | null> {
  const loaded = await loadHealthConnect();
  if (!loaded || !HealthConnect) return null;

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0);

    const records = await HealthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (!records || records.length === 0) return null;

    const session = records[0];
    const startDate = new Date(session.startTime);
    const endDate = new Date(session.endTime);

    const formatTime = (date: Date) =>
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const awakeStages = (session.stages ?? []).filter((s: any) => s.stage === 1); // AWAKE
    const awakeMinutes = awakeStages.reduce((sum: number, s: any) => {
      return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
    }, 0);

    const totalMinutes = (endDate.getTime() - startDate.getTime()) / 60000;

    return {
      bedtime: formatTime(startDate),
      wake_time: formatTime(endDate),
      total_sleep_minutes: Math.round(totalMinutes - awakeMinutes),
      awake_minutes: Math.round(awakeMinutes),
      source: 'google_fit',
    };
  } catch (error) {
    captureError(error as Error, { context: 'getLastNightSleepFromHealthConnect' });
    return null;
  }
}

// ─── Unified API ──────────────────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') return requestHealthKitPermissions();
  if (Platform.OS === 'android') return requestHealthConnectPermissions();
  return false;
}

export async function getLastNightSleep(): Promise<HealthSleepData | null> {
  if (Platform.OS === 'ios') return getLastNightSleepFromHealthKit();
  if (Platform.OS === 'android') return getLastNightSleepFromHealthConnect();
  return null;
}

export async function isHealthIntegrationAvailable(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const loaded = await loadHealthKit();
    return loaded;
  }
  if (Platform.OS === 'android') {
    const loaded = await loadHealthConnect();
    if (!loaded || !HealthConnect) return false;
    try {
      const status = await HealthConnect.getSdkStatus();
      return status === HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }
  return false;
}
