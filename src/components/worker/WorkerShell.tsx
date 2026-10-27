/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { useI18n } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import { calculateShiftPay, formatPaise, formatMinutesToHours } from '../../domain/pay.ts';
import { ShiftRequirement, CaseReport, Proposal } from '../../domain/types.ts';
import { createCaseReport, createAuditEvent } from '../../domain/cases.ts';
import { WorkerConcernReporting } from './WorkerConcernReporting.tsx';
import { VoiceSpeechAssistant } from '../voice/VoiceSpeechAssistant.tsx';

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

interface WorkerShellProps {
  activeSection: string;
  setActiveSection: (sec: string) => void;
}

export const WorkerShell: React.FC<WorkerShellProps> = ({
  activeSection,
  setActiveSection,
}) => {
  const {
    sandboxData,
    activeSandboxWorkerId,
    updateSandboxData,
    selectedIndustry,
    sessionId,
    effectiveDisplayName,
    effectiveOrgName,
  } = useAuth();
  const { t } = useI18n();

  const [optionalComments, setOptionalComments] = useState<Record<string, string>>({});
  const [submittingProposalId, setSubmittingProposalId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<string | null>(null);

  // Case filing
  const [caseCategory, setCaseCategory] = useState<CaseReport['category']>('rest_infringement');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseShiftId, setCaseShiftId] = useState<string>('');

  if (!sandboxData) {
    return (
      <div className="p-12 text-center text-xs text-[#6E7C77]">
        {t('loading')}
      </div>
    );
  }

  const worker =
    sandboxData.workers.find((w) => w.id === activeSandboxWorkerId) ||
    sandboxData.workers[0];

  if (!worker) {
    return (
      <EmptyState
        title="No Worker Selected"
        description="Select a worker in the header to view assignments and earnings."
      />
    );
  }

  const workerAssignments = sandboxData.assignments.filter(
    (a) => a.workerId === worker.id && a.status !== 'cancelled'
  );

  const shiftMap = new Map<string, ShiftRequirement>(
    sandboxData.shifts.map((s) => [s.id, s])
  );

  // Sort upcoming shifts chronologically
  const sortedWorkerShifts = workerAssignments
    .map((a) => ({ assignment: a, shift: shiftMap.get(a.shiftRequirementId) }))
    .filter((item): item is { assignment: typeof item.assignment; shift: ShiftRequirement } => Boolean(item.shift))
    .sort((a, b) => new Date(a.shift.startUtc).getTime() - new Date(b.shift.startUtc).getTime());

  const nextShiftItem = sortedWorkerShifts[0] || null;

  // Pending change proposals
  const pendingProposals = sandboxData.proposals.filter(
    (p) =>
      (p.status === 'AWAITING_WORKER' || p.status === 'READY_TO_FINALISE' || p.status === 'DECLINED') &&
      p.affectedWorkerIds.includes(worker.id)
  );

  // Attendance sessions
  const activeAttendance = sandboxData.attendanceSessions.find(
    (s) => s.workerId === worker.id && s.status === 'IN_PROGRESS'
  );
  const completedAttendance = sandboxData.attendanceSessions.filter(
    (s) => s.workerId === worker.id && s.status === 'COMPLETED'
  );

  // Paid adjustments
  const myAdjustments = (sandboxData.paidAdjustments || []).filter(
    (a) => a.workerId === worker.id
  );

  // Earnings calculation
  let totalProjectedPayPaise = 0;
  for (const a of workerAssignments) {
    const s = shiftMap.get(a.shiftRequirementId);
    if (s) {
      const pay = calculateShiftPay(s, worker.baseHourlyRatePaise, sandboxData.policy);
      totalProjectedPayPaise += pay.totalPayPaise;
    }
  }

  let totalRecordedAttendancePayPaise = 0;
  for (const sess of completedAttendance) {
    totalRecordedAttendancePayPaise += sess.recordedPayPaise || 0;
  }

  let totalAdjustmentsPaise = 0;
  for (const adj of myAdjustments) {
    totalAdjustmentsPaise += adj.amountPaise;
  }

  // Handle Worker Proposal Response
  const handleProposalResponse = async (
    proposal: Proposal,
    response: 'ACCEPTED' | 'DECLINED'
  ) => {
    setSubmittingProposalId(proposal.id);
    const comment = optionalComments[proposal.id] || '';

    try {
      const res = await fetch('/api/sandbox/proposal/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          proposalId: proposal.id,
          workerId: worker.id,
          response,
          proposalVersion: proposal.version,
          optionalComment: comment,
          organisationId: sandboxData.organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        updateSandboxData((prev) => {
          const next = { ...prev };
          const pIndex = next.proposals.findIndex((p) => p.id === proposal.id);
          if (pIndex >= 0) {
            next.proposals[pIndex] = json.proposal;
          }
          return next;
        });

        setActionNotice(
          response === 'ACCEPTED'
            ? 'Response recorded: Proposal ACCEPTED.'
            : 'Response recorded: Proposal DECLINED without disciplinary penalty.'
        );
        setTimeout(() => setActionNotice(null), 4500);
      } else {
        setActionNotice(`Error: ${json.error}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      console.error('Failed to respond:', err);
    } finally {
      setSubmittingProposalId(null);
    }
  };

  // Flag inability to attend
  const handleFlagAbsence = async (shiftId: string) => {
    try {
      const res = await fetch('/api/sandbox/absence/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          shiftRequirementId: shiftId,
          workerId: worker.id,
          organisationId: sandboxData.organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setActionNotice(t('flagAbsenceSuccess'));
        setTimeout(() => setActionNotice(null), 6000);
      }
    } catch (err) {
      console.error('Absence flag error:', err);
    }
  };

  // Attendance Clock In / Out
  const handleClockAction = async (action: 'CLOCK_IN' | 'CLOCK_OUT', shiftId?: string) => {
    try {
      const res = await fetch('/api/sandbox/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
          workerId: worker.id,
          shiftRequirementId: shiftId || activeAttendance?.shiftRequirementId,
          action,
          organisationId: sandboxData.organisation.id,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        if (action === 'CLOCK_IN') {
          updateSandboxData((prev) => ({
            ...prev,
            attendanceSessions: [json.session, ...prev.attendanceSessions],
          }));
          setActionNotice(t('clockInSuccess'));
        } else {
          updateSandboxData((prev) => {
            const nextSessions = prev.attendanceSessions.map((s) =>
              s.id === json.session.id ? json.session : s
            );
            return { ...prev, attendanceSessions: nextSessions };
          });
          setActionNotice(t('clockOutSuccess'));
        }
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        setActionNotice(`Clock error: ${json.error}`);
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      console.error('Clock error:', err);
    }
  };

  // Case submission
  const handleCaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseDescription.trim()) return;

    const newCase = createCaseReport(
      sandboxData.organisation.id,
      worker.id,
      caseCategory,
      caseDescription,
      caseShiftId || undefined
    );

    const audit = createAuditEvent(
      sandboxData.organisation.id,
      worker.id,
      'CASE_REPORT_FILED',
      newCase.id,
      `Worker filed ${caseCategory}: ${caseDescription.substring(0, 80)}`
    );

    updateSandboxData((prev) => ({
      ...prev,
      auditEvents: [audit, ...prev.auditEvents],
    }));

    setCaseDescription('');
    setCaseShiftId('');
    setActionNotice(t('caseSubmitted'));
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Action Notification */}
      {actionNotice && (
        <div role="status" className="p-3.5 bg-[#E0F2F1] border border-[#00796B] text-[#006357] text-xs font-semibold rounded-[2px]">
          {actionNotice}
        </div>
      )}

      {/* SECTION 1: WORKER HOME (Welcoming, simple, 5 sections in strict order) */}
      {activeSection === 'home' && (
        <div className="space-y-10">
          {/* Top: Welcome */}
          <div className="space-y-1 border-b border-[#E2DDD1] pb-5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1D2926]">
              Welcome, {worker.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5652]">
              {nextShiftItem
                ? `Your next scheduled shift begins on ${formatKolkataTime(nextShiftItem.shift.startUtc)}.`
                : 'You have no shifts scheduled for today. Check availability or pending proposals.'}
            </p>
          </div>

          {/* 1. Next Shift Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1D2926]">
                1. Next Shift
              </h2>
              {nextShiftItem && (
                <button
                  type="button"
                  onClick={() => setActiveSection('shifts')}
                  className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
                >
                  View all shifts ({sortedWorkerShifts.length}) →
                </button>
              )}
            </div>

            {nextShiftItem ? (
              <div className="bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DDD1] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#1D2926]">
                        {nextShiftItem.shift.title || nextShiftItem.shift.role}
                      </h3>
                      <Badge variant="teal">{nextShiftItem.assignment.status.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-[#4A5652] mt-0.5">
                      Role: {nextShiftItem.shift.role} • Workplace: {effectiveOrgName}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-[#6E7C77] block">Expected Pay</span>
                    <span className="text-base font-bold text-[#00796B] font-mono">
                      {formatPaise(
                        calculateShiftPay(nextShiftItem.shift, worker.baseHourlyRatePaise, sandboxData.policy).totalPayPaise
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[#6E7C77] block">Time Window (Asia/Kolkata):</span>
                    <span className="font-semibold text-[#1D2926] font-mono text-sm">
                      {formatKolkataTime(nextShiftItem.shift.startUtc)} — {formatKolkataTime(nextShiftItem.shift.endUtc)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeAttendance ? (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleClockAction('CLOCK_OUT')}
                      >
                        Clock Out Now
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleClockAction('CLOCK_IN', nextShiftItem.shift.id)}
                      >
                        Clock In
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedShiftForDetail(nextShiftItem.shift.id)}
                    >
                      {t('viewDetails')}
                    </Button>

                    <VoiceSpeechAssistant
                      onApplyTranscript={() => {}}
                      textToReadAloud={`${nextShiftItem.shift.title || nextShiftItem.shift.role} shift at ${effectiveOrgName} from ${formatKolkataTime(nextShiftItem.shift.startUtc)} to ${formatKolkataTime(nextShiftItem.shift.endUtc)}. Expected pay: ${formatPaise(calculateShiftPay(nextShiftItem.shift, worker.baseHourlyRatePaise, sandboxData.policy).totalPayPaise)}.`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6E7C77] italic p-4 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]">
                No upcoming shift assigned. You may update your declared availability.
              </p>
            )}
          </div>

          {/* 2. Pending Change Request (Only if one exists) */}
          {pendingProposals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1D2926] flex items-center gap-2">
                  <span>2. Pending Schedule Change Requests</span>
                  <Badge variant="rust">Action Needed</Badge>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveSection('proposals')}
                  className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
                >
                  Review proposal →
                </button>
              </div>

              <div className="bg-[#FAF8F3] border-2 border-[#00796B] p-5 rounded-[2px] space-y-3">
                <p className="text-xs text-[#4A5652]">
                  Your employer has published a schedule modification proposal affecting your shifts. You may review the changes, pay impact, and accept or decline without disciplinary penalty.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveSection('proposals')}
                >
                  Inspect & Respond to Proposal
                </Button>
              </div>
            </div>
          )}

          {/* 3. Current-Period Projected Earnings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1D2926]">
                3. Current-Period Projected Earnings
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('earnings')}
                className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
              >
                View calculation breakdown →
              </button>
            </div>

            <div className="p-4 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[#6E7C77] block">Total Projected Shift Earnings (Active Period):</span>
                <span className="text-2xl font-bold font-mono text-[#00796B] mt-0.5 block">
                  {formatPaise(totalProjectedPayPaise)}
                </span>
                <span className="text-[11px] text-[#4A5652]">
                  Calculated based on {workerAssignments.length} assigned shifts at {formatPaise(worker.baseHourlyRatePaise)}/hr
                </span>
              </div>

              {totalAdjustmentsPaise > 0 && (
                <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-[#E2DDD1] sm:pl-4 pt-2 sm:pt-0">
                  <span className="text-xs text-[#6E7C77] block">Employer Paid Adjustment:</span>
                  <span className="text-base font-bold font-mono text-[#1D2926]">
                    +{formatPaise(totalAdjustmentsPaise)}
                  </span>
                  <span className="text-[10px] text-[#6E7C77] block">Recorded voluntary compensation</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. Report a Concern and Track a Report */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1D2926]">
                4. Report a Concern & Grievance
              </h2>
              <button
                type="button"
                onClick={() => setActiveSection('concerns')}
                className="text-xs font-semibold text-[#2457C5] hover:underline cursor-pointer"
              >
                Track previous reports →
              </button>
            </div>

            <div className="p-4 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-[#4A5652] max-w-lg">
                Notice an issue with rest intervals between consecutive shifts, short-notice modifications, or recorded clocking hours? Submit a direct grievance.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveSection('concerns')}
              >
                Report a Concern
              </Button>
            </div>
          </div>

          {/* 5. Recent Updates */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1D2926]">
              5. Recent Updates
            </h2>
            <div className="divide-y divide-[#E2DDD1] border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px]">
              {sandboxData.auditEvents.slice(0, 3).map((evt) => (
                <div key={evt.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-semibold text-[#1D2926] mr-2">[{evt.action}]</span>
                    <span className="text-[#4A5652]">{evt.reason}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#6E7C77]">
                    {formatKolkataTime(evt.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MY SHIFTS */}
      {activeSection === 'shifts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
                My Assigned Shifts
              </h1>
              <p className="text-xs text-[#4A5652] mt-0.5">
                Inspect your schedule in Asia/Kolkata (IST), billable hours, and flag absence if unable to attend.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#1D2926]">
              {workerAssignments.length} Shifts Scheduled
            </span>
          </div>

          {sortedWorkerShifts.length === 0 ? (
            <EmptyState
              title="No Shifts Scheduled"
              description="You have no assigned shifts in the current period."
            />
          ) : (
            <div className="space-y-4">
              {sortedWorkerShifts.map(({ assignment, shift }) => {
                const pay = calculateShiftPay(shift, worker.baseHourlyRatePaise, sandboxData.policy);

                return (
                  <div key={assignment.id} className="bg-[#FAF8F3] border border-[#E2DDD1] p-5 rounded-[2px] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DDD1] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#1D2926]">{shift.title || shift.role}</h3>
                          <Badge variant="teal">{assignment.status.toUpperCase()}</Badge>
                        </div>
                        <p className="text-xs text-[#6E7C77] mt-0.5 font-mono">
                          {shift.role} • Shift ID: {shift.id}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFlagAbsence(shift.id)}
                        >
                          Report Inability to Attend
                        </Button>
                        <div className="text-right">
                          <span className="text-[11px] text-[#6E7C77] block">Projected Pay</span>
                          <span className="text-sm font-bold text-[#00796B] font-mono">
                            {formatPaise(pay.totalPayPaise)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[#6E7C77] block">Start (Asia/Kolkata):</span>
                        <span className="font-semibold text-[#1D2926] font-mono">{formatKolkataTime(shift.startUtc)}</span>
                      </div>
                      <div>
                        <span className="text-[#6E7C77] block">End (Asia/Kolkata):</span>
                        <span className="font-semibold text-[#1D2926] font-mono">{formatKolkataTime(shift.endUtc)}</span>
                      </div>
                      <div>
                        <span className="text-[#6E7C77] block">Billable Duration:</span>
                        <span className="font-semibold text-[#1D2926]">{formatMinutesToHours(pay.billableMinutes)} ({shift.unpaidBreakMinutes}m break)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: CHANGE REQUESTS (Proposals) */}
      {activeSection === 'proposals' && (
        <div className="space-y-6">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              Schedule Change Proposals
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Review proposed reallocations with explicit pay deltas and rest intervals. Declining does not impact your standing.
            </p>
          </div>

          {pendingProposals.length === 0 ? (
            <EmptyState
              title="No Pending Proposals"
              description="No schedule modifications are currently awaiting your response."
            />
          ) : (
            pendingProposals.map((prop) => {
              const myChanges = prop.changes.filter(
                (c) => c.newWorkerId === worker.id || c.previousWorkerId === worker.id
              );
              const myResponse = prop.workerResponses[worker.id];

              return (
                <div key={prop.id} className="bg-[#FAF8F3] border-2 border-[#00796B] p-5 rounded-[2px] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DDD1] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1D2926]">
                          Proposal ID: {prop.id}
                        </h3>
                        <Badge variant="teal">{prop.status}</Badge>
                      </div>
                      <p className="text-xs text-[#6E7C77] mt-0.5">
                        Base Roster v{prop.baseRosterVersion} • Version {prop.version}
                      </p>
                    </div>

                    {myResponse ? (
                      <Badge variant={myResponse.response === 'ACCEPTED' ? 'teal' : 'rust'}>
                        Your Decision: {myResponse.response}
                      </Badge>
                    ) : (
                      <Badge variant="rust">Action Needed</Badge>
                    )}
                  </div>

                  {/* Changes List */}
                  <div className="space-y-3">
                    {myChanges.map((change, idx) => {
                      const shift = shiftMap.get(change.shiftRequirementId);
                      const isAssigned = change.newWorkerId === worker.id;
                      const payDiff = isAssigned
                        ? (change.newPayPaise || 0) - (change.previousPayPaise || 0)
                        : -(change.previousPayPaise || 0);

                      return (
                        <div key={idx} className="p-3 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1D2926]">
                              {shift?.title || shift?.role || change.shiftRequirementId}
                            </span>
                            <Badge variant={isAssigned ? 'teal' : 'rust'}>
                              {isAssigned ? 'PROPOSED ASSIGNMENT' : 'REALLOCATED AWAY'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-[#6E7C77] block">Window (Asia/Kolkata):</span>
                              <span className="font-semibold font-mono">{shift ? formatKolkataTime(shift.startUtc) : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[#6E7C77] block">Projected Pay Impact:</span>
                              <span className={`font-mono font-bold ${payDiff >= 0 ? 'text-[#00796B]' : 'text-[#A63D24]'}`}>
                                {payDiff >= 0 ? `+${formatPaise(payDiff)}` : `-${formatPaise(Math.abs(payDiff))}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#6E7C77] block">Rest Interval:</span>
                              <span className="font-mono font-bold text-[#00796B]">
                                {change.restMinutesAfter ? `${Math.floor(change.restMinutesAfter / 60)}h rest cleared` : 'Compliant'}
                              </span>
                            </div>
                          </div>

                          <p className="text-[#4A5652]">
                            <span className="font-semibold text-[#1D2926]">Reason:</span> {change.reason}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Accept or Decline buttons */}
                  {!myResponse && prop.status === 'AWAITING_WORKER' && (
                    <div className="pt-3 border-t border-[#E2DDD1] space-y-3">
                      <div>
                        <label htmlFor={`w-comment-${prop.id}`} className="text-xs font-semibold text-[#1D2926] block mb-1">
                          Optional Comment (No personal reason required):
                        </label>
                        <input
                          id={`w-comment-${prop.id}`}
                          type="text"
                          value={optionalComments[prop.id] || ''}
                          onChange={(e) => setOptionalComments({ ...optionalComments, [prop.id]: e.target.value })}
                          placeholder="Leave blank or enter work availability notes..."
                          className="w-full text-xs p-2 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="md"
                          disabled={submittingProposalId === prop.id}
                          onClick={() => handleProposalResponse(prop, 'ACCEPTED')}
                        >
                          Accept Proposal
                        </Button>
                        <Button
                          variant="warning"
                          size="md"
                          disabled={submittingProposalId === prop.id}
                          onClick={() => handleProposalResponse(prop, 'DECLINED')}
                        >
                          Decline Proposal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SECTION 4: MY EARNINGS BREAKDOWN */}
      {activeSection === 'earnings' && (
        <div className="space-y-6">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              Earnings Transparency Breakdown
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Itemised view showing worked-hours projected earnings, clocked attendance pay, and voluntary paid adjustments.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]">
              <span className="text-xs text-[#6E7C77] block">Projected Scheduled Earnings:</span>
              <span className="text-xl font-bold text-[#1D2926] font-mono mt-1 block">
                {formatPaise(totalProjectedPayPaise)}
              </span>
              <span className="text-[11px] text-[#4A5652]">from {workerAssignments.length} assigned shifts</span>
            </div>

            <div className="p-4 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px]">
              <span className="text-xs text-[#6E7C77] block">Recorded Clocked Attendance Pay:</span>
              <span className="text-xl font-bold text-[#00796B] font-mono mt-1 block">
                {formatPaise(totalRecordedAttendancePayPaise)}
              </span>
              <span className="text-[11px] text-[#00796B]">from {completedAttendance.length} completed sessions</span>
            </div>

            <div className="p-4 bg-[#E0F2F1] border border-[#00796B] rounded-[2px]">
              <span className="text-xs text-[#006357] font-semibold block">Employer Paid Adjustments:</span>
              <span className="text-xl font-bold text-[#006357] font-mono mt-1 block">
                {formatPaise(totalAdjustmentsPaise)}
              </span>
              <span className="text-[11px] text-[#006357]">{myAdjustments.length} adjustment recorded</span>
            </div>
          </div>

          <p className="text-[11px] text-[#6E7C77] italic">
            * Calculations reflect employer policy in integer paise and do not constitute statutory wage advice or legal certifications. Voluntary paid adjustments are recorded for transparency and are shown separately from worked-hours earnings.
          </p>
        </div>
      )}

      {/* SECTION 5: CONCERNS & GRIEVANCE FILING */}
      {activeSection === 'concerns' && (
        <div className="space-y-6">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              {t('reportCaseTitle')}
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Submit identified or identity-hidden reports with optional AI translation between Tamil and English.
            </p>
          </div>

          <WorkerConcernReporting
            onCaseSubmitted={(c) => {
              updateSandboxData((prev) => ({
                ...prev,
                cases: [c, ...(prev.cases || [])],
              }));
              setActionNotice(t('caseSubmitted'));
              setTimeout(() => setActionNotice(null), 4000);
            }}
          />
        </div>
      )}

      {/* SECTION 6: AVAILABILITY & REST INTERVALS */}
      {activeSection === 'availability' && (
        <div className="space-y-6">
          <div className="border-b border-[#E2DDD1] pb-4">
            <h1 className="text-2xl font-bold tracking-tight text-[#1D2926]">
              Declared Availability & Rest Windows
            </h1>
            <p className="text-xs text-[#4A5652] mt-0.5">
              Specify when you are available to work. Roster optimisation strictly honours your declared intervals.
            </p>
          </div>

          <div className="space-y-3">
            {worker.availabilityIntervals.map((interval, idx) => (
              <div key={idx} className="p-3.5 bg-[#FAF8F3] border border-[#E2DDD1] rounded-[2px] flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-[#1D2926]">Declared Window {idx + 1}:</span>{' '}
                  <span className="font-mono">{formatKolkataTime(interval.startUtc)}</span> to{' '}
                  <span className="font-mono">{formatKolkataTime(interval.endUtc)}</span>
                </div>
                <Badge variant="teal">Active</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
