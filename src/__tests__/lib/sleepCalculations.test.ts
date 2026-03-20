/**
 * RestEasy — Sleep Efficiency Calculation Tests
 * Tests the core TCC-I algorithm: sleep efficiency, window adjustment,
 * and program progression logic.
 */

// ─── Sleep Efficiency ─────────────────────────────────────────────────────────

interface SleepEntry {
  bedtime: string;          // "23:30"
  wake_time: string;        // "06:00"
  out_of_bed_time: string;  // "06:30"
  sleep_onset_minutes: number;
  wake_count: number;
}

function calculateSleepEfficiency(entry: SleepEntry): number {
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  let bedtimeMin = parseTime(entry.bedtime);
  const outOfBedMin = parseTime(entry.out_of_bed_time);

  // Handle midnight crossing
  let tib = outOfBedMin - bedtimeMin;
  if (tib < 0) tib += 1440;

  const waso = entry.wake_count * 15;
  const tst = tib - entry.sleep_onset_minutes - waso;
  return Math.round((tst / tib) * 100);
}

function adjustSleepWindow(
  currentWindow: { start: string; end: string },
  avgEfficiency: number
): { start: string; end: string; changed: boolean; reason: string } {
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(((minutes % 1440) + 1440) % 1440 / 60);
    const m = ((minutes % 1440) + 1440) % 1440 % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMin = parseTime(currentWindow.start);
  const endMin = parseTime(currentWindow.end);
  const duration = endMin > startMin ? endMin - startMin : endMin + 1440 - startMin;

  if (avgEfficiency >= 90) {
    // Extend by 15 minutes (earlier bedtime)
    return {
      start: formatTime(startMin - 15),
      end: currentWindow.end,
      changed: true,
      reason: 'efficiency_high',
    };
  } else if (avgEfficiency >= 85) {
    // Keep window the same
    return { ...currentWindow, changed: false, reason: 'efficiency_ok' };
  } else {
    // Restrict by 15 minutes (later bedtime), minimum 5h
    if (duration <= 300) {
      return { ...currentWindow, changed: false, reason: 'minimum_reached' };
    }
    return {
      start: formatTime(startMin + 15),
      end: currentWindow.end,
      changed: true,
      reason: 'efficiency_low',
    };
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Sleep Efficiency Calculation', () => {
  test('calculates correct efficiency for a good night', () => {
    const entry: SleepEntry = {
      bedtime: '23:30',
      wake_time: '06:00',
      out_of_bed_time: '06:30',
      sleep_onset_minutes: 15,
      wake_count: 1,
    };
    // TIB = 6h30 = 390 min
    // WASO = 1 * 15 = 15 min
    // TST = 390 - 15 - 15 = 360 min
    // SE = 360/390 = 92.3% → 92
    const se = calculateSleepEfficiency(entry);
    expect(se).toBe(92);
  });

  test('calculates correct efficiency for a poor night', () => {
    const entry: SleepEntry = {
      bedtime: '22:00',
      wake_time: '06:00',
      out_of_bed_time: '07:00',
      sleep_onset_minutes: 60,
      wake_count: 4,
    };
    // TIB = 9h = 540 min
    // WASO = 4 * 15 = 60 min
    // TST = 540 - 60 - 60 = 420 min
    // SE = 420/540 = 77.7% → 78
    const se = calculateSleepEfficiency(entry);
    expect(se).toBe(78);
  });

  test('handles midnight crossing correctly', () => {
    const entry: SleepEntry = {
      bedtime: '23:45',
      wake_time: '06:15',
      out_of_bed_time: '06:30',
      sleep_onset_minutes: 20,
      wake_count: 2,
    };
    // TIB: 23:45 → 06:30 = 405 min
    // WASO = 30 min
    // TST = 405 - 20 - 30 = 355 min
    // SE = 355/405 = 87.6% → 88
    const se = calculateSleepEfficiency(entry);
    expect(se).toBe(88);
  });

  test('returns 100% for perfect night', () => {
    const entry: SleepEntry = {
      bedtime: '23:00',
      wake_time: '07:00',
      out_of_bed_time: '07:00',
      sleep_onset_minutes: 0,
      wake_count: 0,
    };
    expect(calculateSleepEfficiency(entry)).toBe(100);
  });
});

describe('Sleep Window Adjustment Algorithm', () => {
  const baseWindow = { start: '23:30', end: '06:00' };

  test('extends window when efficiency >= 90%', () => {
    const result = adjustSleepWindow(baseWindow, 92);
    expect(result.changed).toBe(true);
    expect(result.reason).toBe('efficiency_high');
    expect(result.start).toBe('23:15'); // 15 min earlier
    expect(result.end).toBe('06:00');   // unchanged
  });

  test('keeps window when efficiency is 85-89%', () => {
    const result = adjustSleepWindow(baseWindow, 87);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('efficiency_ok');
  });

  test('restricts window when efficiency < 85%', () => {
    const result = adjustSleepWindow(baseWindow, 72);
    expect(result.changed).toBe(true);
    expect(result.reason).toBe('efficiency_low');
    expect(result.start).toBe('23:45'); // 15 min later
  });

  test('does not restrict below 5 hours minimum', () => {
    const tightWindow = { start: '01:00', end: '06:00' }; // exactly 5h
    const result = adjustSleepWindow(tightWindow, 60);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('minimum_reached');
  });
});

describe('ISI Score Severity', () => {
  const getSeverity = (score: number): string => {
    if (score <= 7) return 'none';
    if (score <= 14) return 'subthreshold';
    if (score <= 21) return 'moderate';
    return 'severe';
  };

  test.each([
    [0, 'none'],
    [7, 'none'],
    [8, 'subthreshold'],
    [14, 'subthreshold'],
    [15, 'moderate'],
    [21, 'moderate'],
    [22, 'severe'],
    [28, 'severe'],
  ])('score %i → severity %s', (score, expected) => {
    expect(getSeverity(score)).toBe(expected);
  });
});
