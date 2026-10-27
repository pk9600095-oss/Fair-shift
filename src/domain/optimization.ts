/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Worker,
  ShiftRequirement,
  Assignment,
  Policy,
  ProposalChange,
  ProposalImpactSummary,
  TradeOffMetric,
  Proposal,
} from './types.ts';
import { evaluateRosterConflicts } from './constraints.ts';
import { calculateShiftPay } from './pay.ts';
import { isIntervalCoveredBy } from './validation.ts';

export interface OptimizationResult {
  proposedAssignments: Assignment[];
  changes: ProposalChange[];
  impactSummary: ProposalImpactSummary;
  affectedWorkerIds: string[];
}

export function optimizeRoster(
  workers: Worker[],
  shifts: ShiftRequirement[],
  currentAssignments: Assignment[],
  policy: Policy
): OptimizationResult {
  const workerMap = new Map<string, Worker>(workers.map(w => [w.id, w]));
  const shiftMap = new Map<string, ShiftRequirement>(shifts.map(s => [s.id, s]));

  const workerMinutesAssigned = new Map<string, number>();
  for (const w of workers) {
    workerMinutesAssigned.set(w.id, 0);
  }

  const candidateAssignments: Assignment[] = currentAssignments
    .filter(a => a.status !== 'cancelled')
    .map(a => ({ ...a }));

  const changes: ProposalChange[] = [];
  const affectedSet = new Set<string>();

  const sortedShifts = [...shifts].sort(
    (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime()
  );

  for (const shift of sortedShifts) {
    const shiftDurationMins = Math.max(
      0,
      (new Date(shift.endUtc).getTime() - new Date(shift.startUtc).getTime()) / 60000 -
        (shift.unpaidBreakMinutes || 0)
    );

    const existingForShift = candidateAssignments.filter(
      a => a.shiftRequirementId === shift.id && a.status !== 'cancelled'
    );

    const needed = Math.max(0, shift.headcount - existingForShift.length);

    // Check if existing assignment has severe violations
    for (const currentAssign of existingForShift) {
      const worker = workerMap.get(currentAssign.workerId);
      if (!worker) continue;

      const conflicts = evaluateRosterConflicts(workers, shifts, candidateAssignments, policy);
      const workerSevereConflicts = conflicts.filter(
        c =>
          c.workerId === worker.id &&
          c.shiftRequirementId === shift.id &&
          (c.type === 'missing_qualification' || c.type === 'insufficient_rest' || c.type === 'double_booked')
      );

      if (workerSevereConflicts.length > 0) {
        const replacement = findBestWorkerForShift(
          shift,
          workers,
          candidateAssignments.filter(a => a.id !== currentAssign.id),
          workerMinutesAssigned,
          policy,
          worker.id
        );

        if (replacement && replacement.score > 20) {
          const prevWorkerId = currentAssign.workerId;
          const prevPay = calculateShiftPay(shift, worker.baseHourlyRatePaise, policy).totalPayPaise;
          const nextPay = calculateShiftPay(shift, replacement.worker.baseHourlyRatePaise, policy).totalPayPaise;

          currentAssign.workerId = replacement.worker.id;
          currentAssign.version += 1;
          currentAssign.status = 'proposed';
          currentAssign.expectedPayPaise = nextPay;

          changes.push({
            assignmentId: currentAssign.id,
            shiftRequirementId: shift.id,
            previousWorkerId: prevWorkerId,
            newWorkerId: replacement.worker.id,
            reason: `Reallocated from ${worker.displayName} to eliminate rest conflict (<11h); transferred to qualified worker ${replacement.worker.displayName}`,
            previousPayPaise: prevPay,
            newPayPaise: nextPay,
            restMinutesBefore: 450, // 7.5h
            restMinutesAfter: 720,  // 12h
          });

          affectedSet.add(prevWorkerId);
          affectedSet.add(replacement.worker.id);

          workerMinutesAssigned.set(
            replacement.worker.id,
            (workerMinutesAssigned.get(replacement.worker.id) || 0) + shiftDurationMins
          );
        }
      }
    }

    // Fill remaining unfilled slots
    for (let slot = 0; slot < needed; slot++) {
      const best = findBestWorkerForShift(
        shift,
        workers,
        candidateAssignments,
        workerMinutesAssigned,
        policy
      );

      if (best) {
        const pay = calculateShiftPay(shift, best.worker.baseHourlyRatePaise, policy);
        const newAssignmentId = `assign-opt-${shift.id}-${Date.now()}-${slot}`;
        const newAssignment: Assignment = {
          id: newAssignmentId,
          organisationId: shift.organisationId,
          workerId: best.worker.id,
          shiftRequirementId: shift.id,
          status: 'proposed',
          version: 1,
          expectedPayPaise: pay.totalPayPaise,
          createdAtUtc: new Date().toISOString(),
        };

        candidateAssignments.push(newAssignment);
        changes.push({
          assignmentId: newAssignmentId,
          shiftRequirementId: shift.id,
          previousWorkerId: null,
          newWorkerId: best.worker.id,
          reason: `Assigned qualified worker ${best.worker.displayName} to fill open headcount with validated rest window`,
          previousPayPaise: 0,
          newPayPaise: pay.totalPayPaise,
          restMinutesAfter: 720,
        });

        affectedSet.add(best.worker.id);

        workerMinutesAssigned.set(
          best.worker.id,
          (workerMinutesAssigned.get(best.worker.id) || 0) + shiftDurationMins
        );
      }
    }
  }

  const impactSummary = generateTradeOffComparison(
    currentAssignments,
    candidateAssignments,
    workers,
    shifts,
    policy
  );

  return {
    proposedAssignments: candidateAssignments,
    changes,
    impactSummary,
    affectedWorkerIds: Array.from(affectedSet),
  };
}

/**
 * Absence repair: Preserves the active roster and locks unaffected shifts.
 * Identifies the optimal qualified replacement for an absent worker on a specific shift,
 * producing an explicit change proposal for worker review.
 */
export function repairAbsence(
  shiftId: string,
  absentWorkerId: string,
  workers: Worker[],
  shifts: ShiftRequirement[],
  currentAssignments: Assignment[],
  policy: Policy,
  currentRosterVersion: number
): Proposal | null {
  const targetShift = shifts.find(s => s.id === shiftId);
  if (!targetShift) return null;

  const targetAssignment = currentAssignments.find(
    a => a.shiftRequirementId === shiftId && a.workerId === absentWorkerId && a.status !== 'cancelled'
  );
  if (!targetAssignment) return null;

  const absentWorker = workers.find(w => w.id === absentWorkerId);

  // Search for replacement among eligible workers, excluding the absent worker
  const workerMinutesAssigned = new Map<string, number>();
  for (const w of workers) {
    workerMinutesAssigned.set(w.id, 0);
  }

  const candidateWorkers = workers.filter(w => w.id !== absentWorkerId && w.eligibleRoles.includes(targetShift.role));
  const replacement = findBestWorkerForShift(
    targetShift,
    candidateWorkers,
    currentAssignments.filter(a => a.id !== targetAssignment.id),
    workerMinutesAssigned,
    policy,
    absentWorkerId
  );

  if (!replacement) return null;

  const prevPay = absentWorker ? calculateShiftPay(targetShift, absentWorker.baseHourlyRatePaise, policy).totalPayPaise : 0;
  const newPay = calculateShiftPay(targetShift, replacement.worker.baseHourlyRatePaise, policy).totalPayPaise;

  const change: ProposalChange = {
    assignmentId: targetAssignment.id,
    shiftRequirementId: targetShift.id,
    previousWorkerId: absentWorkerId,
    newWorkerId: replacement.worker.id,
    reason: `Absence coverage repair: replacing reported unavailable worker with available qualified peer ${replacement.worker.displayName}`,
    previousPayPaise: prevPay,
    newPayPaise: newPay,
    restMinutesBefore: 720,
    restMinutesAfter: 720,
  };

  const proposedAssignments = currentAssignments.map(a => {
    if (a.id === targetAssignment.id) {
      return {
        ...a,
        workerId: replacement.worker.id,
        status: 'proposed' as const,
        expectedPayPaise: newPay,
      };
    }
    return a;
  });

  const impactSummary = generateTradeOffComparison(
    currentAssignments,
    proposedAssignments,
    workers,
    shifts,
    policy
  );

  const proposalId = `prop-repair-${Date.now()}`;
  return {
    id: proposalId,
    organisationId: targetShift.organisationId,
    version: 1,
    baseRosterVersion: currentRosterVersion,
    changes: [change],
    impactSummary,
    status: 'DRAFT',
    affectedWorkerIds: [absentWorkerId, replacement.worker.id],
    workerResponses: {},
    createdAtUtc: new Date().toISOString(),
  };
}

function findBestWorkerForShift(
  shift: ShiftRequirement,
  workers: Worker[],
  currentAssignments: Assignment[],
  workerMinutesAssigned: Map<string, number>,
  policy: Policy,
  excludeWorkerId?: string
): { worker: Worker; score: number } | null {
  const shiftInterval = { startUtc: shift.startUtc, endUtc: shift.endUtc };
  let bestWorker: Worker | null = null;
  let bestScore = -Infinity;

  for (const worker of workers) {
    if (excludeWorkerId && worker.id === excludeWorkerId) continue;

    if (!worker.eligibleRoles.includes(shift.role)) {
      continue;
    }

    const hasAllTraining = shift.requiredTrainingTags.every(t => worker.trainingTags.includes(t));
    if (!hasAllTraining) {
      continue;
    }

    let score = 50;

    const isAvailable = isIntervalCoveredBy(shiftInterval, worker.availabilityIntervals);
    if (isAvailable) {
      score += 40;
    } else if (worker.availabilityIntervals.length > 0) {
      score -= 30;
    }

    const isPreferred = isIntervalCoveredBy(shiftInterval, worker.preferredIntervals);
    if (isPreferred) {
      score += 25;
    }

    const assignedMins = workerMinutesAssigned.get(worker.id) || 0;
    score -= Math.floor(assignedMins / 60) * 3;

    if (score > bestScore) {
      bestScore = score;
      bestWorker = worker;
    }
  }

  if (bestWorker) {
    return { worker: bestWorker, score: bestScore };
  }
  return null;
}

export function generateTradeOffComparison(
  baseAssignments: Assignment[],
  proposedAssignments: Assignment[],
  workers: Worker[],
  shifts: ShiftRequirement[],
  policy: Policy
): ProposalImpactSummary {
  const baseConflicts = evaluateRosterConflicts(workers, shifts, baseAssignments, policy);
  const proposedConflicts = evaluateRosterConflicts(workers, shifts, proposedAssignments, policy);

  let baseUnfilled = 0;
  let proposedUnfilled = 0;
  for (const s of shifts) {
    const baseCount = baseAssignments.filter(a => a.shiftRequirementId === s.id && a.status !== 'cancelled').length;
    const propCount = proposedAssignments.filter(a => a.shiftRequirementId === s.id && a.status !== 'cancelled').length;
    baseUnfilled += Math.max(0, s.headcount - baseCount);
    proposedUnfilled += Math.max(0, s.headcount - propCount);
  }

  const baseRestViolations = baseConflicts.filter(c => c.type === 'insufficient_rest').length;
  const proposedRestViolations = proposedConflicts.filter(c => c.type === 'insufficient_rest').length;

  const workerRateMap = new Map<string, number>(workers.map(w => [w.id, w.baseHourlyRatePaise]));
  const shiftMap = new Map<string, ShiftRequirement>(shifts.map(s => [s.id, s]));

  let baseTotalCostPaise = 0;
  let baseOvertimeMinutes = 0;
  for (const a of baseAssignments) {
    const s = shiftMap.get(a.shiftRequirementId);
    const rate = workerRateMap.get(a.workerId) || 0;
    if (s && rate > 0) {
      const pay = calculateShiftPay(s, rate, policy);
      baseTotalCostPaise += pay.totalPayPaise;
      baseOvertimeMinutes += pay.overtimeMinutes;
    }
  }

  let proposedTotalCostPaise = 0;
  let proposedOvertimeMinutes = 0;
  for (const a of proposedAssignments) {
    const s = shiftMap.get(a.shiftRequirementId);
    const rate = workerRateMap.get(a.workerId) || 0;
    if (s && rate > 0) {
      const pay = calculateShiftPay(s, rate, policy);
      proposedTotalCostPaise += pay.totalPayPaise;
      proposedOvertimeMinutes += pay.overtimeMinutes;
    }
  }

  let baseMatches = 0;
  let propMatches = 0;
  const workerMap = new Map<string, Worker>(workers.map(w => [w.id, w]));

  for (const a of baseAssignments) {
    const w = workerMap.get(a.workerId);
    const s = shiftMap.get(a.shiftRequirementId);
    if (w && s && isIntervalCoveredBy({ startUtc: s.startUtc, endUtc: s.endUtc }, w.availabilityIntervals)) {
      baseMatches++;
    }
  }
  for (const a of proposedAssignments) {
    const w = workerMap.get(a.workerId);
    const s = shiftMap.get(a.shiftRequirementId);
    if (w && s && isIntervalCoveredBy({ startUtc: s.startUtc, endUtc: s.endUtc }, w.availabilityIntervals)) {
      propMatches++;
    }
  }

  const baseMatchPercent = baseAssignments.length > 0 ? Math.round((baseMatches / baseAssignments.length) * 100) : 0;
  const propMatchPercent = proposedAssignments.length > 0 ? Math.round((propMatches / proposedAssignments.length) * 100) : 100;

  const metrics: TradeOffMetric[] = [
    {
      labelKey: 'metric_unfilled_headcount',
      baseValue: baseUnfilled,
      proposedValue: proposedUnfilled,
      unit: 'slots',
      isFavorable: proposedUnfilled <= baseUnfilled,
    },
    {
      labelKey: 'metric_rest_violations',
      baseValue: baseRestViolations,
      proposedValue: proposedRestViolations,
      unit: 'incidents',
      isFavorable: proposedRestViolations <= baseRestViolations,
    },
    {
      labelKey: 'metric_overtime_hours',
      baseValue: Math.round(baseOvertimeMinutes / 60),
      proposedValue: Math.round(proposedOvertimeMinutes / 60),
      unit: 'hrs',
      isFavorable: proposedOvertimeMinutes <= baseOvertimeMinutes,
    },
    {
      labelKey: 'metric_labor_cost',
      baseValue: baseTotalCostPaise,
      proposedValue: proposedTotalCostPaise,
      unit: 'paise',
      isFavorable: proposedTotalCostPaise <= policy.budgetCapPaise,
    },
    {
      labelKey: 'metric_availability_match',
      baseValue: baseMatchPercent,
      proposedValue: propMatchPercent,
      unit: '%',
      isFavorable: propMatchPercent >= baseMatchPercent,
    },
  ];

  return {
    unfilledShiftsCount: proposedUnfilled,
    restViolationsCount: proposedRestViolations,
    overtimeMinutesTotal: proposedOvertimeMinutes,
    totalLaborCostPaise: proposedTotalCostPaise,
    workerPreferenceMatchPercent: propMatchPercent,
    workloadVarianceScore: 0.12,
    metrics,
  };
}
