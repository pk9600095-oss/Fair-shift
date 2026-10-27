/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Worker, ShiftRequirement, Assignment, Policy, ConflictViolation } from './types.ts';
import { intervalsOverlap, isIntervalCoveredBy } from './validation.ts';

export function evaluateRosterConflicts(
  workers: Worker[],
  shifts: ShiftRequirement[],
  assignments: Assignment[],
  policy: Policy
): ConflictViolation[] {
  const violations: ConflictViolation[] = [];
  const workerMap = new Map<string, Worker>(workers.map(w => [w.id, w]));
  const shiftMap = new Map<string, ShiftRequirement>(shifts.map(s => [s.id, s]));

  // Group active assignments by worker
  const activeAssignments = assignments.filter(
    a => a.status !== 'cancelled' && a.status !== 'disputed'
  );
  const byWorker = new Map<string, Assignment[]>();

  for (const assign of activeAssignments) {
    const list = byWorker.get(assign.workerId) || [];
    list.push(assign);
    byWorker.set(assign.workerId, list);
  }

  // Check each worker's assignments
  for (const [workerId, workerAssignments] of byWorker.entries()) {
    const worker = workerMap.get(workerId);
    if (!worker) continue;

    // Resolve shift objects for this worker
    const workerShifts: { assign: Assignment; shift: ShiftRequirement }[] = [];
    for (const a of workerAssignments) {
      const s = shiftMap.get(a.shiftRequirementId);
      if (s) {
        workerShifts.push({ assign: a, shift: s });
      }
    }

    // Sort shifts chronologically by startUtc
    workerShifts.sort((a, b) => new Date(a.shift.startUtc).getTime() - new Date(b.shift.startUtc).getTime());

    let totalWorkMinutesInWindow = 0;

    for (let i = 0; i < workerShifts.length; i++) {
      const curr = workerShifts[i];
      const currStart = new Date(curr.shift.startUtc).getTime();
      const currEnd = new Date(curr.shift.endUtc).getTime();
      const durationMins = Math.max(0, (currEnd - currStart) / 60000 - (curr.shift.unpaidBreakMinutes || 0));
      totalWorkMinutesInWindow += durationMins;

      // 1. Qualification Tag Check
      const missingTags = curr.shift.requiredTrainingTags.filter(
        tag => !worker.trainingTags.includes(tag)
      );
      if (missingTags.length > 0) {
        violations.push({
          id: `qual-${curr.assign.id}`,
          severity: 'violation',
          type: 'missing_qualification',
          workerId: worker.id,
          shiftRequirementId: curr.shift.id,
          descriptionKey: 'violation_missing_qualification',
          details: `Worker ${worker.displayName} lacks required training: ${missingTags.join(', ')}`,
        });
      }

      // 2. Availability Interval Check
      const isCovered = isIntervalCoveredBy(
        { startUtc: curr.shift.startUtc, endUtc: curr.shift.endUtc },
        worker.availabilityIntervals
      );
      if (!isCovered && worker.availabilityIntervals.length > 0) {
        violations.push({
          id: `avail-${curr.assign.id}`,
          severity: 'warning',
          type: 'unavailability_clash',
          workerId: worker.id,
          shiftRequirementId: curr.shift.id,
          descriptionKey: 'warning_unavailability_clash',
          details: `Shift falls outside ${worker.displayName}'s declared available intervals`,
        });
      }

      // 3. Consecutive shifts checks (Double-booking and Rest period)
      if (i > 0) {
        const prev = workerShifts[i - 1];
        const prevEnd = new Date(prev.shift.endUtc).getTime();

        // Check for double booking (overlap)
        if (intervalsOverlap(
          { startUtc: prev.shift.startUtc, endUtc: prev.shift.endUtc },
          { startUtc: curr.shift.startUtc, endUtc: curr.shift.endUtc }
        )) {
          violations.push({
            id: `overlap-${prev.assign.id}-${curr.assign.id}`,
            severity: 'violation',
            type: 'double_booked',
            workerId: worker.id,
            shiftRequirementId: curr.shift.id,
            conflictingShiftRequirementId: prev.shift.id,
            descriptionKey: 'violation_double_booked',
            details: `Worker assigned to overlapping shifts ${prev.shift.role} and ${curr.shift.role}`,
          });
        } else {
          // Check rest between consecutive shifts
          const restMinutes = Math.round((currStart - prevEnd) / 60000);
          if (restMinutes >= 0 && restMinutes < policy.minimumRestMinutes) {
            violations.push({
              id: `rest-${prev.assign.id}-${curr.assign.id}`,
              severity: 'violation',
              type: 'insufficient_rest',
              workerId: worker.id,
              shiftRequirementId: curr.shift.id,
              conflictingShiftRequirementId: prev.shift.id,
              descriptionKey: 'violation_insufficient_rest',
              details: `Rest between shifts is ${Math.floor(restMinutes / 60)}h ${restMinutes % 60}m, below policy threshold of ${Math.floor(policy.minimumRestMinutes / 60)}h`,
            });
          }
        }
      }
    }

    // 4. Maximum work window check
    if (totalWorkMinutesInWindow > policy.maximumWorkMinutesInWindow) {
      violations.push({
        id: `window-${worker.id}`,
        severity: 'violation',
        type: 'window_excess',
        workerId: worker.id,
        shiftRequirementId: workerShifts[0]?.shift.id || '',
        descriptionKey: 'violation_window_excess',
        details: `Total work of ${Math.floor(totalWorkMinutesInWindow / 60)}h exceeds window cap of ${Math.floor(policy.maximumWorkMinutesInWindow / 60)}h`,
      });
    }
  }

  return violations;
}
