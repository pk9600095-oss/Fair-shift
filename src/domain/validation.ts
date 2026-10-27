/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeInterval } from './types.ts';

export function isValidIsoUtc(isoString: string): boolean {
  if (!isoString || typeof isoString !== 'string') return false;
  const d = new Date(isoString);
  return !isNaN(d.getTime()) && (isoString.endsWith('Z') || isoString.includes('+00:00'));
}

export function isValidInterval(interval: TimeInterval): { valid: boolean; reason?: string } {
  if (!isValidIsoUtc(interval.startUtc)) {
    return { valid: false, reason: 'Invalid startUtc timestamp' };
  }
  if (!isValidIsoUtc(interval.endUtc)) {
    return { valid: false, reason: 'Invalid endUtc timestamp' };
  }
  const start = new Date(interval.startUtc).getTime();
  const end = new Date(interval.endUtc).getTime();
  if (end <= start) {
    return { valid: false, reason: 'endUtc must be strictly after startUtc' };
  }
  const durationMinutes = (end - start) / (1000 * 60);
  if (durationMinutes < 15) {
    return { valid: false, reason: 'Interval must be at least 15 minutes' };
  }
  if (durationMinutes > 24 * 60) {
    return { valid: false, reason: 'Interval cannot exceed 24 hours' };
  }
  return { valid: true };
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  const aStart = new Date(a.startUtc).getTime();
  const aEnd = new Date(a.endUtc).getTime();
  const bStart = new Date(b.startUtc).getTime();
  const bEnd = new Date(b.endUtc).getTime();
  return aStart < bEnd && bStart < aEnd;
}

export function isIntervalCoveredBy(needle: TimeInterval, haystacks: TimeInterval[]): boolean {
  const nStart = new Date(needle.startUtc).getTime();
  const nEnd = new Date(needle.endUtc).getTime();
  return haystacks.some(h => {
    const hStart = new Date(h.startUtc).getTime();
    const hEnd = new Date(h.endUtc).getTime();
    return hStart <= nStart && hEnd >= nEnd;
  });
}

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

export function isValidPaise(amount: number): boolean {
  return typeof amount === 'number' && Number.isInteger(amount) && amount >= 0;
}
