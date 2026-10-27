/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShiftRequirement, Policy, PayBreakdown } from './types.ts';

/**
 * Calculates itemised shift pay strictly in integer paise.
 * Note: Calculations reflect employer-configured policy only and do not constitute
 * statutory wage advice or legal-compliance certifications.
 */
export function calculateShiftPay(
  shift: ShiftRequirement,
  baseHourlyRatePaise: number,
  policy: Policy
): PayBreakdown {
  const start = new Date(shift.startUtc).getTime();
  const end = new Date(shift.endUtc).getTime();
  const grossMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));
  const unpaidBreak = Math.max(0, shift.unpaidBreakMinutes || 0);
  const billableMinutes = Math.max(0, grossMinutes - unpaidBreak);

  const threshold = policy.overtimeThresholdMinutesPerShift;
  const regularMinutes = Math.min(billableMinutes, threshold);
  const overtimeMinutes = Math.max(0, billableMinutes - threshold);

  // Calculate regular pay in integer paise
  const regularPayPaise = Math.round((regularMinutes / 60) * baseHourlyRatePaise);

  // Overtime multiplier: e.g. 150 / 100 for 1.5x
  const otMultiplier = policy.overtimeMultiplierNumerator / Math.max(1, policy.overtimeMultiplierDenominator);
  const overtimeRatePaise = Math.round(baseHourlyRatePaise * otMultiplier);
  const overtimePayPaise = Math.round((overtimeMinutes / 60) * overtimeRatePaise);

  const totalPayPaise = regularPayPaise + overtimePayPaise;

  return {
    shiftRequirementId: shift.id,
    role: shift.role,
    grossMinutes,
    unpaidBreakMinutes: unpaidBreak,
    billableMinutes,
    regularMinutes,
    overtimeMinutes,
    baseHourlyRatePaise,
    regularPayPaise,
    overtimePayPaise,
    totalPayPaise,
  };
}

/**
 * Formats integer paise to INR standard currency string (e.g. ₹750.00).
 * Monetary amounts must remain numeric and untranslated across all locales.
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
