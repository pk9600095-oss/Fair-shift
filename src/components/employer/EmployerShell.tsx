/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { useI18n } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { Card } from '../common/Card.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import { evaluateRosterConflicts } from '../../domain/constraints.ts';
import { optimizeRoster, OptimizationResult, repairAbsence } from '../../domain/optimization.ts';
import { calculateShiftPay, formatPaise, formatMinutesToHours } from '../../domain/pay.ts';
import { ShiftRequirement, Proposal, Worker, CaseReport } from '../../domain/types.ts';
import { CoverageDonutChart, EarningsComparisonChart, NightDutyDistributionChart, CaseStatusChart } from './EmployerCharts.tsx';
import { AiStaffingParser } from './AiStaffingParser.tsx';
import { AiPlanExplanation } from './AiPlanExplanation.tsx';
import { EmployerCaseManager } from './EmployerCaseManager.tsx';

function formatKolkataTime(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d) + ' IST';
  } catch {
    return isoUtc;
  }
}

interface EmployerShellProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export const EmployerShell: React.FC<EmployerShellProps> = ({
  activeSection,
  setActiveSection,
}) => {
  const {
    sandboxData,
    updateSandboxData,
    selectedIndustry,
    sessionId,
    effectiveDisplayName,
    effectiveOrgName,
  } = useAuth();
  const { t } = useI18n();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeOptimization, setActiveOptimization] = useState<OptimizationResult | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Paid Adjustment Form State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjWorkerId, setAdjWorkerId] = useState('');
  const [adjAmountRupees, setAdjAmountRupees] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Attendance Correction Form State
  const [correctionSessionId, setCorrectionSessionId] = useState<string | null>(null);
  const [correctedMins, setCorrectedMins] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState('');

  // AI Staffing Assistant State
  const [showAiStaffingModal, setShowAiStaffingModal] = useState<boolean>(false);

  const handleConfirmParsedShifts = (newShifts: ShiftRequirement[]) => {
    updateSandboxData((prev) => ({
      ...prev,
      shifts: [...newShifts, ...prev.shifts],
    }));
    setShowAiStaffingModal(false);
    setActionNotice(`Added ${newShifts.length} parsed shift requirements to demand matrix.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCaseUpdated = (updatedCase: CaseReport) => {
    updateSandboxData((prev) => {
      const nextCases = [...(prev.cases || [])];
      const idx = nextCases.findIndex((c) => c.id === updatedCase.id);
      if (idx >= 0) {
        nextCases[idx] = updatedCase;
      } else {
        nextCases.unshift(updatedCase);
      }
      return { ...prev, cases: nextCases };
    });
    setActionNotice(`Case ${updatedCase.id} updated to status ${updatedCase.status}.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (!sandboxData) {
    return (
      <div className="p-12 text-center text-xs text-[#6E7C77]">
        {t('loading')}
      </div>
    );
  }

  const { organisation, policy, workers, shifts, assignments, proposals, auditEvents, attendanceSessions } = sandboxData;

  const activeConflicts = evaluateRosterConflicts(workers, shifts, assignments, policy);
  const workerMap = new Map<string, Worker>(workers.map((w) => [w.id, w]));
  const shiftMap = new Map<string, ShiftRequirement>(shifts.map((s) => [s.id, s]));

  // Calculate unboxed summary strip metrics:
  // 1. Required staffing positions = sum of headcount across shifts
  const totalRequiredPositions = shifts.reduce((sum, s) => sum + s.headcount, 0);

  // 2. Assigned positions
  const shiftIdSet = new Set(shifts.map((s) => s.id));
  const activeAssignments = assignments.filter(
    (a) => a.status !== 'cancelled' && shiftIdSet.has(a.shiftRequirementId)
  );
  const totalAssignedPositions = Math.min(totalRequiredPositions, activeAssignments.length);

  // 3. Unfilled positions
  const totalUnfilledPositions = Math.max(0, totalRequiredPositions - totalAssignedPositions);

  // 4. Proposals awaiting responses
  const awaitingProposals = proposals.filter((p) => p.status === 'AWAITING_WORKER');

  // Selected Proposal for Earnings Chart (latest pending or first proposal)
  const selectedProposalForChart = proposals[0] || null;

  // Run Optimizer to formulate staffing plan
  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/sandbox/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, industry: selectedIndustry }),
      });

      if (res.ok) {
        const json = await res.json();
        setActiveOptimization(json.optimization);
      } else {
        const localOpt = optimizeRoster(workers, shifts, assignments, policy);
        setActiveOptimization(localOpt);
      }
    } catch {
      const localOpt = optimizeRoster(workers, shifts, assignments, policy);
      setActiveOptimization(localOpt);
    } finally {
      setIsOptimizing(false);
      if (activeSection !== 'staffing') {
        setActiveSection('staffing');
      }
    }
  };

  // Create Proposal Plan
  const handleCreateProposalPlan = async () => {
    if (!activeOptimization) return;

    try {
      const res = await fetch('/api/sandbox/proposal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          changes: activeOptimization.changes,
          impactSummary: activeOptimization.impactSummary,
          affectedWorkerIds: activeOptimization.affectedWorkerIds,
          organisationId: organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => ({
          ...prev,
          proposals: [json.proposal, ...prev.proposals],
        }));
        setActiveOptimization(null);
        setActiveSection('proposals');
        setActionNotice(`Draft Proposal ${json.proposal.id} created with ${json.proposal.affectedWorkerIds.length} affected workers.`);
        setTimeout(() => setActionNotice(null), 4500);
      }
    } catch (err) {
      console.error('Failed to create proposal plan:', err);
    }
  };

  // Publish Proposal to Workers
  const handlePublishProposal = async (proposalId: string) => {
    try {
      const res = await fetch('/api/sandbox/proposal/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          proposalId,
          organisationId: organisation.id,
          callerRole: 'employer',
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => {
          const next = { ...prev };
          const p = next.proposals.find((item) => item.id === proposalId);
          if (p) p.status = 'AWAITING_WORKER';
          return next;
        });
        setActionNotice(t('proposalPublished'));
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        setActionNotice(`Error: ${json.error}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      console.error('Failed to publish proposal:', err);
    }
  };

  // Finalise Proposal
  const handleFinaliseProposal = async (proposalId: string) => {
    try {
      const res = await fetch('/api/sandbox/proposal/finalise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          proposalId,
          organisationId: organisation.id,
          callerRole: 'employer',
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData(() => json.dataset);
        setActionNotice(t('rosterFinalised'));
        setTimeout(() => setActionNotice(null), 4500);
      } else {
        setActionNotice(`Cannot Finalise: ${json.error}`);
        setTimeout(() => setActionNotice(null), 6000);
      }
    } catch (err) {
      console.error('Failed to finalise proposal:', err);
    }
  };

  // Absence Repair Trigger
  const handleGenerateAbsenceRepair = async (shiftId: string, absentWorkerId: string) => {
    try {
      const res = await fetch('/api/sandbox/absence/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          shiftRequirementId: shiftId,
          absentWorkerId,
          organisationId: organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => ({
          ...prev,
          proposals: [json.proposal, ...prev.proposals],
        }));
        setActiveSection('proposals');
        setActionNotice(`Absence repair plan ${json.proposal.id} created for worker review.`);
        setTimeout(() => setActionNotice(null), 4500);
      }
    } catch (err) {
      console.error('Absence repair error:', err);
    }
  };

  // Correct Attendance
  const handleCorrectAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionSessionId || !correctionReason.trim()) return;

    try {
      const res = await fetch('/api/sandbox/attendance/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          attendanceSessionId: correctionSessionId,
          correctedMinutes: correctedMins,
          reason: correctionReason,
          callerRole: 'employer',
          organisationId: organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => {
          const next = { ...prev };
          const sIdx = next.attendanceSessions.findIndex((s) => s.id === correctionSessionId);
          if (sIdx >= 0) next.attendanceSessions[sIdx] = json.session;
          return next;
        });
        setCorrectionSessionId(null);
        setCorrectionReason('');
        setActionNotice('Attendance correction logged with audit reason.');
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Correction failed:', err);
    }
  };

  // Submit Paid Adjustment
  const handleProposeAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWorkerId || !adjAmountRupees) return;

    const amountPaise = Math.round(parseFloat(adjAmountRupees) * 100);
    try {
      const res = await fetch('/api/sandbox/adjustment/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          workerId: adjWorkerId,
          amountPaise,
          reason: adjReason,
          organisationId: organisation.id,
          callerRole: 'employer',
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => ({
          ...prev,
          paidAdjustments: [json.adjustment, ...(prev.paidAdjustments || [])],
        }));
        setShowAdjustmentModal(false);
        setAdjAmountRupees('');
        setAdjReason('');
        setActionNotice(`Voluntary adjustment of ${formatPaise(amountPaise)} recorded.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to propose adjustment:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Action Notification */}
      {actionNotice && (
        <div role="status" className="p-3 bg-[#E0F2F1] border border-[#00796B] text-[#006357] text-xs font-semibold rounded-[2px]">
          {actionNotice}
        </div>
      )}

      {/* SECTION 1: OVERVIEW (Welcome, Then Action, Unboxed Summary Strip, Charts) */}
      {activeSection === 'overview' && (
        <div className="space-y-10">
          {/* Top Section: Welcome & Operational Summary */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DDD1] pb-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D2926]">
                Welcome, {effectiveDisplayName || 'FairShift Manager'}
              </h1>
              <p className="text-xs sm:text-sm text-[#4A5652] max-w-2xl leading-relaxed">
                {effectiveOrgName} • Planning window 27–28 Oct 2026 (Asia/Kolkata). Active rest policy requires {Math.floor(policy.minimumRestMinutes / 60)} hours minimum gap between consecutive shifts.
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleRunOptimizer}
                disabled={isOptimizing}
                className="font-semibold px-5 py-2.5"
              >
                {isOptimizing ? 'Evaluating rest & hours...' : 'Create staffing plan'}
              </Button>
            </div>
          </div>

          {/* Unboxed Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2 border-b border-[#E2DDD1]">
            <div>
              <span className="text-xs font-medium text-[#6E7C77] block">Required Staffing Positions</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1D2926] font-mono mt-0.5 block">
                {totalRequiredPositions}
              </span>
              <span className="text-[11px] text-[#4A5652]">slots across {shifts.length} operational shifts</span>
            </div>

            <div>
              <span className="text-xs font-medium text-[#6E7C77] block">Assigned Positions</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#00796B] font-mono mt-0.5 block">
                {totalAssignedPositions}
              </span>
              <span className="text-[11px] text-[#00796B]">
                {Math.round((totalAssignedPositions / Math.max(1, totalRequiredPositions)) * 100)}% coverage
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-[#6E7C77] block">Unfilled Positions</span>
              <span className={`text-2xl sm:text-3xl font-bold font-mono mt-0.5 block ${totalUnfilledPositions > 0 ? 'text-[#A63D24]' : 'text-[#1D2926]'}`}>
                {totalUnfilledPositions}
              </span>
              <span className="text-[11px] text-[#A63D24]">
                {totalUnfilledPositions > 0 ? 'headcount gap to resolve' : 'full coverage achieved'}
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-[#6E7C77] block">Proposals Awaiting Responses</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#1D2926] font-mono mt-0.5 block">
                {awaitingProposals.length}
              </span>
              <span className="text-[11px] text-[#4A5652]">under review by workers</span>
            </div>
          </div>

          {/* Needs Attention: Linked Actionable List */}
          {activeConflicts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1D2926] flex items-center gap-2">
                  <span>Needs Attention</span>
                  <Badge variant="rust">{activeConflicts.length} item{activeConflicts.length === 1 ? '' : 's'}</Badge>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('staffing')}
                  className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
                >
                  Inspect in Staffing Workbench →
                </button>
              </div>

              <div className="divide-y divide-[#E2DDD1] border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px]">
                {activeConflicts.map((c) => (
                  <div key={c.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="rust">{c.type.replace('_', ' ')}</Badge>
                        <span className="font-semibold text-[#1D2926]">{c.details}</span>
                      </div>
                      <p className="text-[#6E7C77] text-[11px]">
                        Shift ID: {c.shiftRequirementId} • Worker ID: {c.workerId}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGenerateAbsenceRepair(c.shiftRequirementId, c.workerId)}
                      >
                        Repair Assignment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Analytics Section: Coverage Donut & Projected Earnings Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Chart A: Coverage Donut */}
            <div className="lg:col-span-5 space-y-3 bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px]">
              <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-2">
                <h3 className="text-sm font-bold text-[#1D2926]">
                  Staffing Position Coverage
                </h3>
                <span className="text-[11px] font-mono text-[#6E7C77]">
                  Target: {totalRequiredPositions} slots
                </span>
              </div>
              <CoverageDonutChart shifts={shifts} assignments={assignments} />
            </div>

            {/* Chart B: Projected Earnings Comparison */}
            <div className="lg:col-span-7 space-y-3 bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px]">
              <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-2">
                <h3 className="text-sm font-bold text-[#1D2926]">
                  Projected Earnings Comparison (Proposal Data)
                </h3>
                <span className="text-[11px] font-mono text-[#6E7C77]">
                  Same-window baseline vs proposed
                </span>
              </div>
              <EarningsComparisonChart
                proposal={selectedProposalForChart}
                workers={workers}
                onSelectProposalsTab={() => setActiveSection('proposals')}
              />
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1D2926]">
                Recent Operational Activity
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('concerns')}
                className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
              >
                View full audit log →
              </button>
            </div>

            <div className="divide-y divide-[#E2DDD1] border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px]">
              {auditEvents.slice(0, 4).map((evt) => (
                <div key={evt.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-[#1D2926] mr-2">[{evt.action}]</span>
                    <span className="text-[#4A5652]">{evt.reason}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6E7C77] whitespace-nowrap">
                    {formatKolkataTime(evt.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: STAFFING WORKBENCH (Requirements -> Generate Plans -> Compare -> Send Proposal) */}
      {activeSection === 'staffing' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DDD1] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
                Staffing Workbench
              </h1>
              <p className="text-xs text-[#4A5652] mt-0.5">
                Manage shift requirements, run constraint-directed heuristic optimisation, and compare candidate plans.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowAiStaffingModal((prev) => !prev)}
              >
                🎙️ Natural-Language Staffing (AI/Voice)
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleRunOptimizer}
                disabled={isOptimizing}
              >
                {isOptimizing ? 'Generating plan...' : 'Generate optimal plan'}
              </Button>
            </div>
          </div>

          {/* AI Staffing Parser Drawer / Panel */}
          {showAiStaffingModal && (
            <AiStaffingParser
              onConfirmShifts={handleConfirmParsedShifts}
              onCancel={() => setShowAiStaffingModal(false)}
            />
          )}

          {/* Active Plan Comparison Table (If optimizer ran) */}
          {activeOptimization && (
            <div className="space-y-4 bg-[#FAF8F3] border-2 border-[#00796B] p-5 rounded-[2px]">
              {/* AI Plain-Language Metrics Explanation (zero PII passed) */}
              <AiPlanExplanation
                facts={{
                  totalPositions: totalRequiredPositions,
                  assignedPositions: Math.max(0, totalRequiredPositions - (activeOptimization.impactSummary.unfilledShiftsCount || 0)),
                  unfilledPositions: activeOptimization.impactSummary.unfilledShiftsCount || 0,
                  overtimeMinutes: activeOptimization.impactSummary.overtimeMinutesTotal || 0,
                  restViolationsCount: activeOptimization.impactSummary.restViolationsCount || 0,
                  totalLaborCostPaise: activeOptimization.impactSummary.totalLaborCostPaise || 0,
                  baselineLaborCostPaise: assignments.reduce((acc, a) => acc + a.expectedPayPaise, 0),
                }}
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DDD1] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#00796B]">
                      Plan Comparison (Current Roster vs Candidate Plan)
                    </h2>
                    <Badge variant="teal">SOLVER STATUS: FEASIBLE_LIMIT</Badge>
                  </div>
                  <p className="text-xs text-[#6E7C77] mt-0.5">
                    Heuristic search satisfies hard rest and training constraints within feasible limits.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCreateProposalPlan}
                >
                  Create & Save Proposal Plan
                </Button>
              </div>

              {/* Readable Comparison Table */}
              <div className="overflow-x-auto border border-[#E2DDD1] bg-[#FAF8F3]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#EFECE3] border-b border-[#E2DDD1] font-semibold text-[#1D2926]">
                    <tr>
                      <th className="py-2.5 px-3">Evaluation Metric</th>
                      <th className="py-2.5 px-3">Current Roster</th>
                      <th className="py-2.5 px-3">Candidate Plan</th>
                      <th className="py-2.5 px-3">Delta / Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD1]">
                    {activeOptimization.impactSummary.metrics.map((m, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-[#1D2926]">{t(m.labelKey as any)}</td>
                        <td className="py-2 px-3 font-mono">{m.unit === 'paise' ? formatPaise(m.baseValue) : `${m.baseValue} ${m.unit}`}</td>
                        <td className="py-2 px-3 font-mono font-bold text-[#00796B]">{m.unit === 'paise' ? formatPaise(m.proposedValue) : `${m.proposedValue} ${m.unit}`}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {m.isFavorable ? (
                            <span className="text-[#00796B] font-semibold">[IMPROVED]</span>
                          ) : (
                            <span className="text-[#A63D24] font-semibold">[TRADE-OFF]</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assignment Changes List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4A5652]">
                  Proposed Reallocations ({activeOptimization.changes.length} adjustments):
                </span>
                <div className="space-y-1.5">
                  {activeOptimization.changes.map((change, cIdx) => (
                    <div key={cIdx} className="p-2.5 bg-[#EFECE3] border border-[#E2DDD1] text-xs flex items-center justify-between rounded-[2px]">
                      <div>
                        <span className="font-semibold text-[#1D2926] mr-2">{change.shiftRequirementId}:</span>
                        <span className="text-[#4A5652]">{change.reason}</span>
                      </div>
                      <Badge variant="teal">Assigned: {change.newWorkerId}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shift Requirements and Roster Matrix */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1D2926]">
              Operational Shift Requirements & Active Assignments
            </h2>

            <div className="border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px] overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EFECE3] border-b border-[#E2DDD1] font-semibold text-[#1D2926]">
                  <tr>
                    <th className="py-2.5 px-3">Role & Title</th>
                    <th className="py-2.5 px-3">Shift Window (Asia/Kolkata)</th>
                    <th className="py-2.5 px-3">Required Tags</th>
                    <th className="py-2.5 px-3">Headcount</th>
                    <th className="py-2.5 px-3">Assigned Workers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DDD1]">
                  {shifts.map((s) => {
                    const assignedForShift = assignments.filter(
                      (a) => a.shiftRequirementId === s.id && a.status !== 'cancelled'
                    );
                    const isUnderstaffed = assignedForShift.length < s.headcount;

                    return (
                      <tr key={s.id}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#1D2926]">{s.title || s.role}</div>
                          <div className="text-[11px] font-mono text-[#6E7C77]">{s.role}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div>{formatKolkataTime(s.startUtc)}</div>
                          <div className="text-[#6E7C77]">to {formatKolkataTime(s.endUtc)}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {s.requiredTrainingTags.map((tag) => (
                              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] font-mono">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={isUnderstaffed ? 'rust' : 'teal'}>
                            {assignedForShift.length} / {s.headcount}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            {assignedForShift.map((a) => {
                              const w = workerMap.get(a.workerId);
                              return (
                                <div key={a.id} className="flex items-center gap-1.5">
                                  <span className="font-semibold text-[#1D2926]">{w?.displayName || a.workerId}</span>
                                  <Badge variant="subtle" className="text-[10px]">{a.status}</Badge>
                                </div>
                              );
                            })}
                            {isUnderstaffed && (
                              <div className="text-[#A63D24] font-semibold text-[11px]">
                                [UNFILLED: {s.headcount - assignedForShift.length} needed]
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: PROPOSALS WORKFLOW */}
      {activeSection === 'proposals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
                Schedule Proposals & Worker Review
              </h1>
              <p className="text-xs text-[#4A5652] mt-0.5">
                Transparent consent lifecycle: DRAFT → AWAITING_WORKER → READY_TO_FINALISE → FINALISED.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#1D2926]">
              Active Roster v{organisation.currentRosterVersion}
            </span>
          </div>

          {proposals.length === 0 ? (
            <EmptyState
              title="No Proposals Active"
              description="Open the Staffing Workbench tab and click 'Create staffing plan' to formulate a plan and publish it to workers."
            />
          ) : (
            proposals.map((prop) => {
              const responses = Object.values(prop.workerResponses || {});
              const acceptedCount = responses.filter((r) => r.response === 'ACCEPTED').length;
              const declinedCount = responses.filter((r) => r.response === 'DECLINED').length;
              const totalAffected = prop.affectedWorkerIds.length;
              const isStale = prop.baseRosterVersion !== organisation.currentRosterVersion;
              const hasDecline = declinedCount > 0;

              return (
                <div key={prop.id} className="bg-[#FAF8F3] border-2 border-[#00796B] p-5 rounded-[2px] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DDD1] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1D2926]">
                          Proposal {prop.id} (v{prop.version})
                        </h3>
                        <Badge
                          variant={
                            prop.status === 'FINALISED'
                              ? 'teal'
                              : prop.status === 'DECLINED'
                              ? 'rust'
                              : prop.status === 'READY_TO_FINALISE'
                              ? 'teal'
                              : 'neutral'
                          }
                        >
                          {prop.status}
                        </Badge>
                        {isStale && (
                          <Badge variant="rust">
                            STALE (Base v{prop.baseRosterVersion} vs Active v{organisation.currentRosterVersion})
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#6E7C77] mt-0.5">
                        Formulated {formatKolkataTime(prop.createdAtUtc)} • {totalAffected} Affected Workers
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {prop.status === 'DRAFT' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePublishProposal(prop.id)}
                        >
                          {t('publishToWorkers')}
                        </Button>
                      )}

                      {prop.status === 'READY_TO_FINALISE' && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={isStale || hasDecline}
                          onClick={() => handleFinaliseProposal(prop.id)}
                        >
                          {t('finaliseRoster')}
                        </Button>
                      )}

                      {prop.status === 'FINALISED' && (
                        <span className="text-xs font-semibold text-[#00796B] font-mono">
                          COMMITTED AT {formatKolkataTime(prop.finalisedAtUtc || '')}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasDecline && (
                    <div className="p-3 bg-[#FBECE8] border border-[#A63D24] text-[#A63D24] text-xs font-semibold rounded-[2px]">
                      {t('declineBlockNotice')}
                    </div>
                  )}

                  {isStale && prop.status !== 'FINALISED' && (
                    <div className="p-3 bg-[#FBECE8] border border-[#A63D24] text-[#A63D24] text-xs font-semibold rounded-[2px]">
                      {t('staleProposalError')}
                    </div>
                  )}

                  {/* Status Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-2.5 bg-[#E0F2F1] border border-[#00796B] rounded-[2px] text-[#006357]">
                      <span className="font-medium block">Worker Acceptance:</span>
                      <span className="text-base font-bold font-mono">
                        {acceptedCount} / {totalAffected} Accepted
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] text-[#1D2926]">
                      <span className="font-medium block">Pending Decisions:</span>
                      <span className="text-base font-bold font-mono">
                        {Math.max(0, totalAffected - acceptedCount - declinedCount)} Pending
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#FBECE8] border border-[#A63D24] rounded-[2px] text-[#A63D24]">
                      <span className="font-medium block">Worker Declines:</span>
                      <span className="text-base font-bold font-mono">
                        {declinedCount} Declined
                      </span>
                    </div>
                  </div>

                  {/* Worker feedback list */}
                  {responses.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[#E2DDD1]">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#6E7C77]">
                        Recorded Responses:
                      </h4>
                      {responses.map((resp) => {
                        const w = workerMap.get(resp.workerId);
                        return (
                          <div key={resp.workerId} className="p-2 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] text-xs flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-[#1D2926]">{w?.displayName || resp.workerId}:</span>{' '}
                              <Badge variant={resp.response === 'ACCEPTED' ? 'teal' : 'rust'}>{resp.response}</Badge>
                              {resp.optionalComment && (
                                <span className="ml-2 text-[#4A5652] italic">&quot;{resp.optionalComment}&quot;</span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-[#6E7C77]">{formatKolkataTime(resp.respondedAtUtc)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SECTION 4: ATTENDANCE & PAY */}
      {activeSection === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DDD1] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
                Attendance & Pay Management
              </h1>
              <p className="text-xs text-[#4A5652] mt-0.5">
                Inspect clocked hours, apply verified attendance corrections with mandatory audit reasons, and propose voluntary paid adjustments.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowAdjustmentModal(true)}
            >
              Propose Paid Adjustment
            </Button>
          </div>

          {/* Clocked Attendance Table */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1D2926]">
              Clocked Attendance Sessions ({attendanceSessions?.length || 0})
            </h2>

            {(!attendanceSessions || attendanceSessions.length === 0) ? (
              <p className="text-xs text-[#6E7C77] italic">No attendance records logged yet.</p>
            ) : (
              <div className="border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px] overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#EFECE3] border-b border-[#E2DDD1] font-semibold text-[#1D2926]">
                    <tr>
                      <th className="py-2.5 px-3">Worker</th>
                      <th className="py-2.5 px-3">Shift ID</th>
                      <th className="py-2.5 px-3">Start (Server Time)</th>
                      <th className="py-2.5 px-3">End (Server Time)</th>
                      <th className="py-2.5 px-3">Recorded Duration</th>
                      <th className="py-2.5 px-3">Actual Pay</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD1]">
                    {attendanceSessions.map((sess) => {
                      const w = workerMap.get(sess.workerId);
                      return (
                        <tr key={sess.id}>
                          <td className="py-2 px-3 font-semibold text-[#1D2926]">{w?.displayName || sess.workerId}</td>
                          <td className="py-2 px-3 font-mono">{sess.shiftRequirementId}</td>
                          <td className="py-2 px-3 font-mono">{formatKolkataTime(sess.startUtc)}</td>
                          <td className="py-2 px-3 font-mono">
                            {sess.endUtc ? formatKolkataTime(sess.endUtc) : <Badge variant="teal">IN PROGRESS</Badge>}
                          </td>
                          <td className="py-2 px-3 font-mono">{sess.recordedMinutes || 0} mins</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#00796B]">{formatPaise(sess.recordedPayPaise || 0)}</td>
                          <td className="py-2 px-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setCorrectionSessionId(sess.id);
                                setCorrectedMins(sess.recordedMinutes || 0);
                              }}
                            >
                              Correct Hours
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Attendance Correction Drawer / Form */}
          {correctionSessionId && (
            <div className="p-5 bg-[#FAF8F3] border-2 border-[#A63D24] rounded-[2px] space-y-4">
              <h3 className="text-sm font-bold text-[#1D2926]">
                Apply Verified Attendance Correction (Session {correctionSessionId})
              </h3>
              <form onSubmit={handleCorrectAttendance} className="space-y-3">
                <div>
                  <label htmlFor="corr-mins" className="text-xs font-semibold text-[#1D2926] block mb-1">
                    Corrected Billable Minutes
                  </label>
                  <input
                    id="corr-mins"
                    type="number"
                    min="0"
                    value={correctedMins}
                    onChange={(e) => setCorrectedMins(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                  />
                </div>
                <div>
                  <label htmlFor="corr-reason" className="text-xs font-semibold text-[#1D2926] block mb-1">
                    Mandatory Reason for Correction (Logged to Audit History)
                  </label>
                  <input
                    id="corr-reason"
                    type="text"
                    required
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Verified 30 mins overtime due to equipment delay"
                    className="w-full text-xs p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" size="sm">
                    Submit Correction & Recalculate
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCorrectionSessionId(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: CONCERNS & AUDIT */}
      {activeSection === 'concerns' && (
        <div className="space-y-6">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              Worker Concerns & Immutable Audit Log
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Review grievances, investigate conditions, and track append-only audit events for all roster adjustments.
            </p>
          </div>

          {/* Employer Case Manager Component */}
          <EmployerCaseManager
            cases={sandboxData.cases || []}
            onCaseUpdated={handleCaseUpdated}
          />

          <div className="space-y-2 pt-4 border-t border-[#E2DDD1]">
            <h3 className="text-sm font-bold text-[#1D2926]">
              System Audit Event Trail
            </h3>
            {auditEvents.map((evt) => (
              <div key={evt.id} className="p-3.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] text-xs space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="teal">{evt.action}</Badge>
                    <span className="font-semibold text-[#1D2926] font-mono">Actor: {evt.actorId}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#6E7C77]">{formatKolkataTime(evt.timestamp)}</span>
                </div>
                <p className="text-[#4A5652] pt-1">
                  <span className="font-medium text-[#1D2926]">Reason:</span> {evt.reason}
                </p>
                <p className="text-[11px] font-mono text-[#6E7C77]">
                  Entity: {evt.entityId} • Log ID: {evt.id}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: REPORTS & ADVANCED ANALYTICS */}
      {activeSection === 'reports' && (
        <div className="space-y-8">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              Operational Reports & Distribution Analytics
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Inspect night-duty rotation equity, case resolution metrics, and hours distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart C: Night-Duty Distribution */}
            <div className="space-y-3 bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px]">
              <div className="border-b border-[#E2DDD1] pb-2">
                <h2 className="text-sm font-bold text-[#1D2926]">
                  Night-Duty Distribution
                </h2>
                <span className="text-[11px] text-[#6E7C77]">
                  Shifts active between 22:00 and 06:30 IST
                </span>
              </div>
              <NightDutyDistributionChart shifts={shifts} assignments={assignments} workers={workers} />
            </div>

            {/* Chart D: Case Status Overview */}
            <div className="space-y-3 bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px]">
              <div className="border-b border-[#E2DDD1] pb-2">
                <h2 className="text-sm font-bold text-[#1D2926]">
                  Grievance & Case Status
                </h2>
                <span className="text-[11px] text-[#6E7C77]">
                  Filed by workers in active period
                </span>
              </div>
              <CaseStatusChart cases={sandboxData.cases || []} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Propose Paid Adjustment */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FAF8F3] border-2 border-[#00796B] rounded-[2px] p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-[#00796B]">
              Propose Voluntary Paid Adjustment
            </h3>
            <p className="text-xs text-[#4A5652]">
              Compensate a worker for cancelled or shortened shifts. Adjustments are displayed separately from worked-hours earnings.
            </p>

            <form onSubmit={handleProposeAdjustment} className="space-y-3">
              <div>
                <label htmlFor="adj-worker-picker" className="text-xs font-semibold text-[#1D2926] block mb-1">
                  Select Worker
                </label>
                <select
                  id="adj-worker-picker"
                  required
                  value={adjWorkerId}
                  onChange={(e) => setAdjWorkerId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                >
                  <option value="">Choose worker...</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.displayName} ({w.eligibleRoles[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="adj-rupees" className="text-xs font-semibold text-[#1D2926] block mb-1">
                  Adjustment Amount (₹ INR)
                </label>
                <input
                  id="adj-rupees"
                  type="number"
                  step="0.01"
                  required
                  value={adjAmountRupees}
                  onChange={(e) => setAdjAmountRupees(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full text-xs p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                />
              </div>

              <div>
                <label htmlFor="adj-reason-txt" className="text-xs font-semibold text-[#1D2926] block mb-1">
                  Reason for Adjustment
                </label>
                <input
                  id="adj-reason-txt"
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Shift shortened by employer due to weather conditions"
                  className="w-full text-xs p-2.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdjustmentModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Record Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
