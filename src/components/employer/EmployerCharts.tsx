/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShiftRequirement, Assignment, Worker, Proposal, CaseReport } from '../../domain/types.ts';
import { formatPaise } from '../../domain/pay.ts';

// CHART A: Staffing Coverage Donut (Pure SVG, accessible, no third-party bloat)
export const CoverageDonutChart: React.FC<{
  shifts: ShiftRequirement[];
  assignments: Assignment[];
}> = ({ shifts, assignments }) => {
  const [showTableAlt, setShowTableAlt] = useState(false);

  // Total required staffing positions: sum of headcount across all shifts
  const totalRequiredPositions = shifts.reduce((sum, s) => sum + s.headcount, 0);

  // Total assigned positions: active assignments linked to these shifts
  const shiftIdSet = new Set(shifts.map((s) => s.id));
  const activeAssignments = assignments.filter(
    (a) => a.status !== 'cancelled' && shiftIdSet.has(a.shiftRequirementId)
  );
  const totalAssignedPositions = Math.min(totalRequiredPositions, activeAssignments.length);
  const totalUnfilledPositions = Math.max(0, totalRequiredPositions - totalAssignedPositions);

  if (totalRequiredPositions === 0) {
    return (
      <div className="p-6 text-center text-xs text-[#6E7C77] bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]">
        No staffing requirements yet.
      </div>
    );
  }

  const assignedPercent = Math.round((totalAssignedPositions / totalRequiredPositions) * 100);
  const unfilledPercent = 100 - assignedPercent;

  // SVG Donut calculation
  const radius = 60;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (assignedPercent / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* SVG Circle */}
        <div className="relative flex items-center justify-center w-44 h-44 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160" role="img" aria-label={`Coverage chart: ${totalAssignedPositions} of ${totalRequiredPositions} positions assigned`}>
            {/* Background unfilled circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#EFECE3"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Foreground assigned circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#00796B"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              fill="transparent"
            />
          </svg>

          {/* Center Text Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
            <span className="text-xl font-bold text-[#1D2926] leading-none">
              {assignedPercent}%
            </span>
            <span className="text-[10px] text-[#4A5652] mt-1 font-medium leading-tight">
              {totalAssignedPositions} of {totalRequiredPositions}<br />assigned
            </span>
          </div>
        </div>

        {/* Outside Legend & Values */}
        <div className="space-y-3 w-full max-w-xs text-xs">
          <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00796B] rounded-[2px]" aria-hidden="true" />
              <span className="font-semibold text-[#1D2926]">Assigned Positions:</span>
            </div>
            <span className="font-mono font-bold text-[#00796B]">
              {totalAssignedPositions} ({assignedPercent}%)
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#EFECE3] border border-[#C9C2B3] rounded-[2px]" aria-hidden="true" />
              <span className="font-semibold text-[#1D2926]">Unfilled Positions:</span>
            </div>
            <span className="font-mono font-bold text-[#A63D24]">
              {totalUnfilledPositions} ({unfilledPercent}%)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowTableAlt(!showTableAlt)}
            className="text-[11px] text-[#2457C5] hover:underline cursor-pointer pt-1"
          >
            {showTableAlt ? 'Hide text table' : 'View accessible table breakdown'}
          </button>
        </div>
      </div>

      {showTableAlt && (
        <table className="w-full text-xs text-left border border-[#E2DDD1] bg-[#FAF8F3]">
          <caption className="sr-only">Position coverage breakdown</caption>
          <thead className="bg-[#EFECE3] border-b border-[#E2DDD1] font-semibold text-[#1D2926]">
            <tr>
              <th className="py-1.5 px-3">Position Status</th>
              <th className="py-1.5 px-3">Staffing Count</th>
              <th className="py-1.5 px-3 text-right">Percentage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD1]">
            <tr>
              <td className="py-1.5 px-3 font-medium text-[#00796B]">Assigned Staffing Positions</td>
              <td className="py-1.5 px-3 font-mono">{totalAssignedPositions}</td>
              <td className="py-1.5 px-3 text-right font-mono">{assignedPercent}%</td>
            </tr>
            <tr>
              <td className="py-1.5 px-3 font-medium text-[#A63D24]">Unfilled Staffing Positions</td>
              <td className="py-1.5 px-3 font-mono">{totalUnfilledPositions}</td>
              <td className="py-1.5 px-3 text-right font-mono">{unfilledPercent}%</td>
            </tr>
            <tr className="bg-[#EFECE3] font-bold">
              <td className="py-1.5 px-3">Total Required Positions</td>
              <td className="py-1.5 px-3 font-mono">{totalRequiredPositions}</td>
              <td className="py-1.5 px-3 text-right font-mono">100%</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

// CHART B: Earnings Comparison (Baseline vs Proposed Projected Pay for Affected Workers)
export const EarningsComparisonChart: React.FC<{
  proposal: Proposal | null;
  workers: Worker[];
  onSelectProposalsTab?: () => void;
}> = ({ proposal, workers, onSelectProposalsTab }) => {
  if (!proposal || proposal.changes.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-[#6E7C77] bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] space-y-2">
        <p>No proposal currently selected for projected earnings comparison.</p>
        {onSelectProposalsTab && (
          <button
            type="button"
            onClick={onSelectProposalsTab}
            className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
          >
            Go to Proposals workbench to formulate or select a plan
          </button>
        )}
      </div>
    );
  }

  const workerMap = new Map(workers.map((w) => [w.id, w]));

  // Aggregate projected earnings before and after for each affected worker
  const workerDeltas = new Map<string, { prev: number; prop: number }>();
  for (const wid of proposal.affectedWorkerIds) {
    workerDeltas.set(wid, { prev: 0, prop: 0 });
  }

  for (const change of proposal.changes) {
    if (change.previousWorkerId && workerDeltas.has(change.previousWorkerId)) {
      const cur = workerDeltas.get(change.previousWorkerId)!;
      cur.prev += change.previousPayPaise || 0;
    }
    if (change.newWorkerId && workerDeltas.has(change.newWorkerId)) {
      const cur = workerDeltas.get(change.newWorkerId)!;
      cur.prop += change.newPayPaise || 0;
    }
  }

  const workerList = Array.from(workerDeltas.entries()).map(([wid, data]) => ({
    worker: workerMap.get(wid),
    baselinePaise: data.prev,
    proposedPaise: data.prop,
    diffPaise: data.prop - data.prev,
  }));

  const maxVal = Math.max(
    1,
    ...workerList.flatMap((w) => [w.baselinePaise, w.proposedPaise])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6E7C77]">
          Showing same-window projected earnings for Proposal {proposal.id} (v{proposal.version})
        </p>
        <span className="text-[11px] font-mono text-[#6E7C77]">
          * Clearly labeled: Projected earnings (not paid salary)
        </span>
      </div>

      <div className="space-y-4">
        {workerList.map((item, idx) => {
          const name = item.worker?.displayName || 'Worker';
          const baseWidthPercent = Math.max(4, Math.round((item.baselinePaise / maxVal) * 100));
          const propWidthPercent = Math.max(4, Math.round((item.proposedPaise / maxVal) * 100));

          return (
            <div key={idx} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#1D2926]">
                <span>{name}</span>
                <span className={`font-mono text-[11px] ${item.diffPaise >= 0 ? 'text-[#00796B]' : 'text-[#A63D24]'}`}>
                  Delta: {item.diffPaise >= 0 ? `+${formatPaise(item.diffPaise)}` : `-${formatPaise(Math.abs(item.diffPaise))}`}
                </span>
              </div>

              {/* Baseline Bar */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-[#6E7C77]">Baseline:</span>
                <div className="flex-1 bg-[#EFECE3] h-4 rounded-[2px] overflow-hidden flex items-center">
                  <div
                    className="bg-[#6E7C77] h-full"
                    style={{ width: `${baseWidthPercent}%` }}
                  />
                </div>
                <span className="w-20 text-right font-mono text-[11px] text-[#4A5652]">
                  {formatPaise(item.baselinePaise)}
                </span>
              </div>

              {/* Proposed Bar */}
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-[#00796B] font-semibold">Proposed:</span>
                <div className="flex-1 bg-[#EFECE3] h-4 rounded-[2px] overflow-hidden flex items-center">
                  <div
                    className="bg-[#00796B] h-full"
                    style={{ width: `${propWidthPercent}%` }}
                  />
                </div>
                <span className="w-20 text-right font-mono text-[11px] font-bold text-[#00796B]">
                  {formatPaise(item.proposedPaise)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// CHART C: Night-Duty Distribution (Under Reports)
export const NightDutyDistributionChart: React.FC<{
  shifts: ShiftRequirement[];
  assignments: Assignment[];
  workers: Worker[];
}> = ({ shifts, assignments, workers }) => {
  // Define night shift strictly from configured window:
  // Shifts crossing 22:00 IST to 06:00 IST next morning
  const isNightShift = (shift: ShiftRequirement): boolean => {
    try {
      const d = new Date(shift.startUtc);
      // In Asia/Kolkata: UTC+5:30. If startUtc hour >= 16:00 UTC (21:30 IST) or endUtc <= 02:00 UTC next day
      const startHourUtc = d.getUTCHours();
      return startHourUtc >= 16 || startHourUtc <= 1 || (shift.title?.toLowerCase().includes('night') ?? false);
    } catch {
      return false;
    }
  };

  const nightShiftIds = new Set(shifts.filter(isNightShift).map((s) => s.id));

  // Count night assignments per worker
  const counts = new Map<string, number>();
  for (const w of workers) {
    counts.set(w.id, 0);
  }

  for (const a of assignments) {
    if (a.status !== 'cancelled' && nightShiftIds.has(a.shiftRequirementId)) {
      counts.set(a.workerId, (counts.get(a.workerId) || 0) + 1);
    }
  }

  const maxNightCount = Math.max(1, ...Array.from(counts.values()));

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#6E7C77]">
        Assigned night-duty shifts (22:00 to 06:30 IST) per worker to verify fair rotation.
      </p>

      <div className="space-y-2.5">
        {workers.map((worker) => {
          const count = counts.get(worker.id) || 0;
          const barWidthPercent = Math.max(2, Math.round((count / maxNightCount) * 100));

          return (
            <div key={worker.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-medium text-[#1D2926]">
                <span>{worker.displayName}</span>
                <span className="font-mono text-[#4A5652]">
                  {count} {count === 1 ? 'night shift' : 'night shifts'}
                </span>
              </div>
              <div className="bg-[#EFECE3] h-3.5 rounded-[2px] overflow-hidden flex items-center">
                <div
                  className="bg-[#2457C5] h-full"
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// CHART D: Case Status Overview (Under Reports)
export const CaseStatusChart: React.FC<{
  cases: CaseReport[];
}> = ({ cases }) => {
  const statuses = [
    { key: 'open', label: 'Open', color: '#A63D24' },
    { key: 'under_review', label: 'Under Review', color: '#F4CF57' },
    { key: 'resolved', label: 'Resolved', color: '#00796B' },
    { key: 'dismissed', label: 'Dismissed', color: '#6E7C77' },
  ];

  const counts: Record<string, number> = {
    open: cases.filter((c) => c.status === 'open').length,
    under_review: cases.filter((c) => c.status === 'under_review').length,
    resolved: cases.filter((c) => c.status === 'resolved').length,
    dismissed: cases.filter((c) => c.status === 'dismissed').length,
  };

  const totalCases = cases.length;
  const maxCount = Math.max(1, ...Object.values(counts));

  if (totalCases === 0) {
    return (
      <div className="p-4 text-xs text-[#6E7C77] italic bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]">
        No cases or grievance reports filed for this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#6E7C77]">
        Breakdown of filed scheduling and rest discrepancy cases ({totalCases} total).
      </p>

      <div className="space-y-3">
        {statuses.map((st) => {
          const count = counts[st.key] || 0;
          const barWidthPercent = Math.max(2, Math.round((count / maxCount) * 100));

          return (
            <div key={st.key} className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-[#1D2926]">
                <span>{st.label}</span>
                <span className="font-mono">{count} cases</span>
              </div>
              <div className="bg-[#EFECE3] h-4 rounded-[2px] overflow-hidden flex items-center">
                <div
                  className="h-full"
                  style={{
                    width: `${barWidthPercent}%`,
                    backgroundColor: st.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
