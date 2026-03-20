/**
 * RestEasy — Streak & Badge System Tests
 */
import { isInFreeTrial, getFreeTrialDaysRemaining } from '../../lib/revenuecat';

describe('Free Trial Logic', () => {
  test('user is in free trial on day 1', () => {
    const installDate = new Date();
    expect(isInFreeTrial(installDate)).toBe(true);
  });

  test('user is in free trial on day 7', () => {
    const installDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    expect(isInFreeTrial(installDate)).toBe(true);
  });

  test('user is NOT in free trial on day 8', () => {
    const installDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    expect(isInFreeTrial(installDate)).toBe(false);
  });

  test('returns correct days remaining on day 3', () => {
    const installDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const remaining = getFreeTrialDaysRemaining(installDate);
    expect(remaining).toBe(5);
  });

  test('returns 0 days remaining after trial', () => {
    const installDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const remaining = getFreeTrialDaysRemaining(installDate);
    expect(remaining).toBe(0);
  });
});

describe('Streak Calculation (unit)', () => {
  // Pure function version for unit testing
  function calcStreak(dates: string[]): { current: number; longest: number } {
    if (dates.length === 0) return { current: 0, longest: 0 };

    const sorted = [...dates].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let current = 0;
    const isActive = sorted[0] === today || sorted[0] === yesterday;

    if (isActive) {
      current = 1;
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i-1]).getTime() - new Date(sorted[i]).getTime()) / 86400000;
        if (diff === 1) current++;
        else break;
      }
    }

    let longest = current;
    let temp = 1;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i-1]).getTime() - new Date(sorted[i]).getTime()) / 86400000;
      if (diff === 1) { temp++; longest = Math.max(longest, temp); }
      else temp = 1;
    }

    return { current, longest };
  }

  test('single entry today = streak of 1', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = calcStreak([today]);
    expect(result.current).toBe(1);
  });

  test('3 consecutive days = streak of 3', () => {
    const dates = [0, 1, 2].map(d =>
      new Date(Date.now() - d * 86400000).toISOString().split('T')[0]
    );
    const result = calcStreak(dates);
    expect(result.current).toBe(3);
  });

  test('gap in entries breaks streak', () => {
    const today = new Date().toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
    const result = calcStreak([today, threeDaysAgo]);
    expect(result.current).toBe(1);
  });

  test('empty entries = streak of 0', () => {
    const result = calcStreak([]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });
});
