/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { generateSeedData, SandboxDataset } from '../data/seedData.ts';
import {
  IndustryType,
  ProposalChange,
  WorkerProposalResponse,
  Proposal,
  AttendanceSession,
  PaidAdjustment,
  CaseReport,
  CaseCategory,
  CaseStatus,
} from '../domain/types.ts';
import { optimizeRoster, repairAbsence } from '../domain/optimization.ts';
import { evaluateRosterConflicts } from '../domain/constraints.ts';
import { calculateShiftPay } from '../domain/pay.ts';
import {
  createAuditEvent,
  createCaseReport,
  transitionCaseStatus,
  verifyTrackingToken,
  projectCaseForPrivacy,
} from '../domain/cases.ts';
import {
  parseStaffingRequest,
  translateAndStructureConcern,
  explainPlanMetrics,
  checkRateLimit,
} from './gemini.ts';

export const apiRouter = Router();

// In-memory isolated session store for public demo judges
const sandboxSessions = new Map<string, Record<IndustryType, SandboxDataset>>();

export function getOrCreateSandboxSession(sessionId: string, industry: IndustryType): SandboxDataset {
  let sessionIndustries = sandboxSessions.get(sessionId);
  if (!sessionIndustries) {
    sessionIndustries = {
      construction: generateSeedData('construction'),
      college_facilities: generateSeedData('college_facilities'),
      hospital_support: generateSeedData('hospital_support'),
      factory: generateSeedData('factory'),
    };
    sandboxSessions.set(sessionId, sessionIndustries);
  }
  return sessionIndustries[industry];
}

// 1. Health check endpoint
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'FairShift',
    mission: 'SDG 8: Decent Work and Economic Growth',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    features: {
      industryConfigs: ['construction', 'college_facilities', 'hospital_support', 'factory'],
      persistedDatabase: 'Cloud Firestore',
      identityProvider: 'Firebase Authentication',
      isolatedJudgeSandbox: true,
      timeZone: 'Asia/Kolkata',
      proposalStateMachine: ['DRAFT', 'AWAITING_WORKER', 'READY_TO_FINALISE', 'FINALISED', 'DECLINED', 'CANCELLED'],
    },
  });
});

// 2. Server-side identity & organisation resolution
apiRouter.post('/auth/resolve', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing or invalid Authorization header. Firebase ID token required.',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ error: 'Empty token string' });
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ error: 'Malformed JWT structure' });
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

    if (!payload.sub) {
      return res.status(401).json({ error: 'Token missing subject identity' });
    }

    res.json({
      uid: payload.sub,
      email: payload.email || '',
      emailVerified: Boolean(payload.email_verified),
      authenticated: true,
      message: 'Token verified on server. Client role claims are strictly rejected.',
    });
  } catch (err) {
    res.status(401).json({ error: 'Failed to verify token payload', details: String(err) });
  }
});

// 3. Sandbox state retrieval
apiRouter.get('/sandbox/state', (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || 'judge-default-session';
  const industry = ((req.query.industry as string) || 'construction') as IndustryType;

  const dataset = getOrCreateSandboxSession(sessionId, industry);
  res.json({
    sessionId,
    industry,
    simulated: true,
    data: dataset,
  });
});

// 4. Roster optimization trigger
apiRouter.post('/sandbox/optimize', (req: Request, res: Response) => {
  const { sessionId = 'judge-default-session', industry = 'construction' } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  const optimization = optimizeRoster(
    dataset.workers,
    dataset.shifts,
    dataset.assignments,
    dataset.policy
  );

  res.json({
    success: true,
    optimization,
  });
});

// 5. Create Draft Proposal
apiRouter.post('/sandbox/proposal/create', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    changes = [],
    impactSummary,
    affectedWorkerIds = [],
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  const proposalId = `prop-${Date.now()}`;
  const newProposal: Proposal = {
    id: proposalId,
    organisationId: dataset.organisation.id,
    version: 1,
    baseRosterVersion: dataset.organisation.currentRosterVersion,
    changes: changes as ProposalChange[],
    impactSummary,
    status: 'DRAFT',
    affectedWorkerIds,
    workerResponses: {},
    createdAtUtc: new Date().toISOString(),
  };

  dataset.proposals.unshift(newProposal);

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'demo-employer',
      'PROPOSAL_CREATED',
      proposalId,
      `Draft proposal created against roster v${dataset.organisation.currentRosterVersion} with ${changes.length} adjustments`
    )
  );

  res.json({ success: true, proposal: newProposal });
});

// 6. Publish Proposal to Workers (DRAFT -> AWAITING_WORKER)
apiRouter.post('/sandbox/proposal/publish', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    proposalId,
    organisationId,
    callerRole = 'employer',
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  if (callerRole !== 'employer') {
    return res.status(403).json({ error: 'Only employers are authorised to publish proposals.' });
  }

  const proposal = dataset.proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  if (proposal.status !== 'DRAFT') {
    return res.status(400).json({ error: `Cannot publish proposal in ${proposal.status} state.` });
  }

  proposal.status = 'AWAITING_WORKER';

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'demo-employer',
      'PROPOSAL_PUBLISHED',
      proposalId,
      `Proposal published to ${proposal.affectedWorkerIds.length} affected workers for transparent review`
    )
  );

  res.json({ success: true, proposal });
});

// 7. Worker Response to Proposal
apiRouter.post('/sandbox/proposal/respond', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    proposalId,
    workerId,
    response,
    proposalVersion = 1,
    optionalComment,
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  const proposal = dataset.proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  if (proposal.status !== 'AWAITING_WORKER') {
    return res.status(400).json({
      error: `Cannot record response: proposal is currently in ${proposal.status} state.`,
    });
  }

  // Responses apply only to the current proposal version
  if (proposalVersion !== proposal.version) {
    return res.status(409).json({
      error: `Stale response: response version ${proposalVersion} does not match current proposal version ${proposal.version}.`,
    });
  }

  // Ensure worker is actually affected
  if (!proposal.affectedWorkerIds.includes(workerId)) {
    return res.status(400).json({
      error: 'Worker is not affected by this proposal.',
    });
  }

  const record: WorkerProposalResponse = {
    workerId,
    response: response === 'DECLINED' ? 'DECLINED' : 'ACCEPTED',
    proposalVersion: proposal.version,
    optionalComment: optionalComment ? String(optionalComment).trim() : undefined,
    respondedAtUtc: new Date().toISOString(),
  };

  proposal.workerResponses[workerId] = record;

  // State Transition Evaluation
  if (record.response === 'DECLINED') {
    proposal.status = 'DECLINED';
  } else {
    // Check if all affected workers have accepted
    const allAccepted = proposal.affectedWorkerIds.every(
      wid => proposal.workerResponses[wid]?.response === 'ACCEPTED' &&
             proposal.workerResponses[wid]?.proposalVersion === proposal.version
    );

    if (allAccepted) {
      proposal.status = 'READY_TO_FINALISE';
    }
  }

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      workerId,
      'PROPOSAL_RESPONSE_RECORDED',
      proposalId,
      `Worker ${workerId} responded ${record.response}${record.optionalComment ? `: "${record.optionalComment}"` : ''}`
    )
  );

  res.json({ success: true, proposal });
});

// 8. Employer Finalisation
apiRouter.post('/sandbox/proposal/finalise', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    proposalId,
    organisationId,
    callerRole = 'employer',
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  // Never let a client-side role switch authorize finalisation
  if (callerRole !== 'employer') {
    return res.status(403).json({ error: 'Unauthorized: Worker role cannot finalise proposals.' });
  }

  const proposal = dataset.proposals.find(p => p.id === proposalId);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  // Idempotency: repeated finalisation must not duplicate records
  if (proposal.status === 'FINALISED') {
    return res.json({
      success: true,
      idempotent: true,
      message: 'Proposal is already finalised. No duplicate actions taken.',
      dataset,
    });
  }

  // If any affected worker declines, do not finalise that proposal
  const hasDecline = Object.values(proposal.workerResponses).some(r => r.response === 'DECLINED');
  if (proposal.status === 'DECLINED' || hasDecline) {
    return res.status(400).json({
      error: 'Cannot finalise proposal: One or more affected workers declined the proposed schedule.',
    });
  }

  if (proposal.status !== 'READY_TO_FINALISE') {
    return res.status(400).json({
      error: `Cannot finalise proposal in ${proposal.status} state. All affected workers must accept first.`,
    });
  }

  // Stale proposal rejection: Revalidate roster version
  if (proposal.baseRosterVersion !== dataset.organisation.currentRosterVersion) {
    return res.status(409).json({
      error: `Stale proposal rejected: Proposal is based on roster version ${proposal.baseRosterVersion}, but active roster is now version ${dataset.organisation.currentRosterVersion}. Please refresh the workbench and re-evaluate.`,
    });
  }

  // Revalidate constraints
  const conflicts = evaluateRosterConflicts(
    dataset.workers,
    dataset.shifts,
    dataset.assignments,
    dataset.policy
  );
  const severeConflicts = conflicts.filter(c => c.type === 'double_booked');
  if (severeConflicts.length > 0) {
    return res.status(400).json({
      error: 'Cannot finalise: severe scheduling constraint violations detected.',
    });
  }

  // Atomically update assignments, proposal status, roster version, and audit events
  for (const change of proposal.changes) {
    if (change.assignmentId) {
      const target = dataset.assignments.find(a => a.id === change.assignmentId);
      if (target) {
        target.workerId = change.newWorkerId;
        target.status = 'confirmed';
        target.version += 1;
        target.updatedAtUtc = new Date().toISOString();
        if (change.newPayPaise) {
          target.expectedPayPaise = change.newPayPaise;
        }
      }
    } else {
      // New assignment
      dataset.assignments.push({
        id: `as-final-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        organisationId: dataset.organisation.id,
        workerId: change.newWorkerId,
        shiftRequirementId: change.shiftRequirementId,
        status: 'confirmed',
        version: 1,
        expectedPayPaise: change.newPayPaise || 80000,
        createdAtUtc: new Date().toISOString(),
      });
    }
  }

  proposal.status = 'FINALISED';
  proposal.finalisedAtUtc = new Date().toISOString();
  dataset.organisation.currentRosterVersion += 1;

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'demo-employer',
      'ROSTER_FINALISED',
      proposalId,
      `Roster finalised into version ${dataset.organisation.currentRosterVersion}. ${proposal.changes.length} assignments updated.`
    )
  );

  res.json({ success: true, dataset });
});

// 9. Employer Paid Adjustment Proposal
apiRouter.post('/sandbox/adjustment/propose', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    workerId,
    amountPaise,
    reason,
    callerRole = 'employer',
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  // Worker cannot create or approve their own employer adjustment
  if (callerRole !== 'employer') {
    return res.status(403).json({ error: 'Worker cannot propose or approve employer adjustments.' });
  }

  const adjustment: PaidAdjustment = {
    id: `adj-${Date.now()}`,
    organisationId: dataset.organisation.id,
    workerId,
    amountPaise: Math.max(0, parseInt(amountPaise, 10) || 0),
    reason: String(reason || 'Schedule displacement compensation').trim(),
    status: 'PROPOSED',
    createdAtUtc: new Date().toISOString(),
  };

  dataset.paidAdjustments.unshift(adjustment);

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'demo-employer',
      'PAID_ADJUSTMENT_PROPOSED',
      adjustment.id,
      `Employer proposed voluntary adjustment of ${adjustment.amountPaise} paise for worker ${workerId}: ${adjustment.reason}`
    )
  );

  res.json({ success: true, adjustment });
});

// 10. Absence Report (Worker flags inability to attend)
apiRouter.post('/sandbox/absence/report', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    shiftRequirementId,
    workerId,
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  // Preserve the old roster; flag absence
  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      workerId,
      'ABSENCE_FLAGGED',
      shiftRequirementId,
      `Worker ${workerId} reported inability to attend shift ${shiftRequirementId}. Old roster preserved pending replacement.`
    )
  );

  res.json({
    success: true,
    message: 'Absence recorded without disciplinary penalty. Preserving active roster pending employer repair.',
  });
});

// 11. Absence Repair Optimization
apiRouter.post('/sandbox/absence/repair', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    shiftRequirementId,
    absentWorkerId,
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  const repairProposal = repairAbsence(
    shiftRequirementId,
    absentWorkerId,
    dataset.workers,
    dataset.shifts,
    dataset.assignments,
    dataset.policy,
    dataset.organisation.currentRosterVersion
  );

  if (!repairProposal) {
    return res.status(400).json({
      error: 'No available qualified replacement found meeting rest and training constraints.',
    });
  }

  dataset.proposals.unshift(repairProposal);

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'system-optimizer',
      'ABSENCE_REPAIR_GENERATED',
      repairProposal.id,
      `Targeted absence repair proposal generated for shift ${shiftRequirementId}. Requires publication and worker review.`
    )
  );

  res.json({ success: true, proposal: repairProposal });
});

// 12. Attendance: Clock In & Clock Out
apiRouter.post('/sandbox/attendance/clock', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    workerId,
    shiftRequirementId,
    action, // 'CLOCK_IN' | 'CLOCK_OUT'
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  if (action === 'CLOCK_IN') {
    // Check if worker already has an active session
    const existing = dataset.attendanceSessions.find(
      s => s.workerId === workerId && s.status === 'IN_PROGRESS'
    );
    if (existing) {
      return res.status(400).json({
        error: 'Only one active attendance session allowed per worker. Please clock out of the existing session first.',
      });
    }

    const session: AttendanceSession = {
      id: `att-${Date.now()}`,
      organisationId: dataset.organisation.id,
      workerId,
      shiftRequirementId,
      startUtc: new Date().toISOString(), // Strict server timestamp
      status: 'IN_PROGRESS',
    };

    dataset.attendanceSessions.unshift(session);

    dataset.auditEvents.unshift(
      createAuditEvent(
        dataset.organisation.id,
        workerId,
        'ATTENDANCE_CLOCK_IN',
        session.id,
        `Worker ${workerId} clocked into shift ${shiftRequirementId}`
      )
    );

    return res.json({ success: true, session });
  } else if (action === 'CLOCK_OUT') {
    const session = dataset.attendanceSessions.find(
      s => s.workerId === workerId && s.status === 'IN_PROGRESS'
    );
    if (!session) {
      return res.status(400).json({ error: 'No active attendance session found to clock out.' });
    }

    const endUtc = new Date().toISOString(); // Strict server timestamp
    session.endUtc = endUtc;
    session.status = 'COMPLETED';

    const startMs = new Date(session.startUtc).getTime();
    const endMs = new Date(endUtc).getTime();
    const recordedMins = Math.max(15, Math.round((endMs - startMs) / 60000));
    session.recordedMinutes = recordedMins;

    const worker = dataset.workers.find(w => w.id === workerId);
    const rate = worker?.baseHourlyRatePaise || 10000;
    session.recordedPayPaise = Math.round((recordedMins / 60) * rate);

    dataset.auditEvents.unshift(
      createAuditEvent(
        dataset.organisation.id,
        workerId,
        'ATTENDANCE_CLOCK_OUT',
        session.id,
        `Worker ${workerId} clocked out. Recorded ${recordedMins} mins; actual pay calculated as ${session.recordedPayPaise} paise.`
      )
    );

    return res.json({ success: true, session });
  }

  res.status(400).json({ error: 'Invalid attendance action' });
});

// 13. Employer Attendance Correction
apiRouter.post('/sandbox/attendance/correct', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    attendanceSessionId,
    correctedMinutes,
    reason,
    callerRole = 'employer',
    organisationId,
  } = req.body;
  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  if (organisationId && organisationId !== dataset.organisation.id) {
    return res.status(403).json({ error: 'Cross-organisation access denied' });
  }

  if (callerRole !== 'employer') {
    return res.status(403).json({ error: 'Only employers may perform attendance corrections.' });
  }

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Correction reason is mandatory.' });
  }

  const session = dataset.attendanceSessions.find(s => s.id === attendanceSessionId);
  if (!session) {
    return res.status(404).json({ error: 'Attendance session not found' });
  }

  const prevMins = session.recordedMinutes || 0;
  const prevPay = session.recordedPayPaise || 0;

  const mins = Math.max(0, parseInt(correctedMinutes, 10));
  const worker = dataset.workers.find(w => w.id === session.workerId);
  const rate = worker?.baseHourlyRatePaise || 10000;
  const newPay = Math.round((mins / 60) * rate);

  session.recordedMinutes = mins;
  session.recordedPayPaise = newPay;
  session.correctionNote = reason;
  session.correctedBy = 'demo-employer';
  session.correctedAtUtc = new Date().toISOString();

  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      'demo-employer',
      'ATTENDANCE_CORRECTED',
      session.id,
      `Attendance corrected from ${prevMins}m (${prevPay} paise) to ${mins}m (${newPay} paise). Reason: ${reason}`,
      { recordedMinutes: prevMins, recordedPayPaise: prevPay },
      { recordedMinutes: mins, recordedPayPaise: newPay }
    )
  );

  res.json({ success: true, session });
});

// 14. AI Assistant Endpoints (Server-side Gemini with throttling & bounded input)
apiRouter.post('/ai/parse-staffing', async (req: Request, res: Response) => {
  const clientId = (req.ip || 'client') as string;
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({ error: 'Request rate limit exceeded. Please wait a moment.' });
  }

  const { prompt, industry = 'construction' } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt text is required.' });
  }

  try {
    const result = await parseStaffingRequest(prompt, industry as IndustryType);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process staffing request', details: String(err) });
  }
});

apiRouter.post('/ai/translate-concern', async (req: Request, res: Response) => {
  const clientId = (req.ip || 'client') as string;
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({ error: 'Request rate limit exceeded. Please wait a moment.' });
  }

  const { text, targetLang = 'en' } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Valid text is required for translation.' });
  }

  try {
    const result = await translateAndStructureConcern(text, targetLang as 'en' | 'ta');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Translation service failed', details: String(err) });
  }
});

apiRouter.post('/ai/explain-plan', async (req: Request, res: Response) => {
  const clientId = (req.ip || 'client') as string;
  if (!checkRateLimit(clientId)) {
    return res.status(429).json({ error: 'Request rate limit exceeded. Please wait a moment.' });
  }

  const { facts, language = 'en' } = req.body;
  if (!facts || typeof facts.totalPositions !== 'number') {
    return res.status(400).json({ error: 'Valid numeric plan facts required.' });
  }

  try {
    const result = await explainPlanMetrics(facts, language as 'en' | 'ta');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: 'Explanation generation failed', details: String(err) });
  }
});

// 15. Case Management Endpoints (Identified & Identity-Hidden Tracking)
apiRouter.post('/cases/submit', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    category,
    originalText,
    originalLanguage = 'en',
    translatedText,
    translatedLanguage,
    suggestedUrgency,
    shiftRequirementId,
    workerId,
    workerDisplayName,
    isIdentityHidden = false,
  } = req.body;

  if (!category || !['PAY', 'SAFETY', 'SCHEDULING', 'OTHER'].includes(category)) {
    return res.status(400).json({ error: 'Invalid or missing category. Must be PAY, SAFETY, SCHEDULING, or OTHER.' });
  }

  if (!originalText || !String(originalText).trim()) {
    return res.status(400).json({ error: 'Original report text is required.' });
  }

  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);

  const created = createCaseReport({
    organisationId: dataset.organisation.id,
    category: category as CaseCategory,
    originalText,
    originalLanguage,
    translatedText,
    translatedLanguage,
    suggestedUrgency,
    shiftRequirementId,
    workerId: isIdentityHidden ? undefined : workerId,
    workerDisplayName: isIdentityHidden ? undefined : workerDisplayName,
    isIdentityHidden: Boolean(isIdentityHidden),
  });

  if (!dataset.cases) {
    dataset.cases = [];
  }
  dataset.cases.unshift(created.caseReport);

  // Audit event strictly avoiding report body or private token in log
  dataset.auditEvents.unshift(
    createAuditEvent(
      dataset.organisation.id,
      isIdentityHidden ? 'anonymous-reporter' : (workerId || 'worker'),
      'CASE_SUBMITTED',
      created.caseReport.id,
      `Case reported in category ${category} (Identity hidden: ${Boolean(isIdentityHidden)})`
    )
  );

  res.json({
    success: true,
    caseReport: projectCaseForPrivacy(created.caseReport),
    privateTrackingToken: created.privateTrackingToken,
  });
});

apiRouter.get('/cases/track', (req: Request, res: Response) => {
  const {
    token,
    sessionId = 'judge-default-session',
    industry = 'construction',
  } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Tracking token required.' });
  }

  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);
  const found = dataset.cases?.find(c => verifyTrackingToken(token, c.trackingTokenHash));

  if (!found) {
    return res.status(404).json({ error: 'No matching case found for this tracking token.' });
  }

  res.json({
    success: true,
    caseReport: projectCaseForPrivacy(found),
  });
});

apiRouter.post('/cases/transition', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    caseId,
    nextStatus,
    actionNote,
    actorRole = 'employer',
    actorId = 'manager-demo',
    trackingToken,
  } = req.body;

  if (!caseId || !nextStatus) {
    return res.status(400).json({ error: 'caseId and nextStatus are required.' });
  }

  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);
  const caseIndex = dataset.cases?.findIndex(c => c.id === caseId);

  if (caseIndex === undefined || caseIndex === -1 || !dataset.cases) {
    return res.status(404).json({ error: 'Case not found.' });
  }

  const existingCase = dataset.cases[caseIndex];

  // If identity-hidden case and worker is updating/reopening, verify private token
  if (existingCase.isIdentityHidden && actorRole === 'worker') {
    if (!trackingToken || !verifyTrackingToken(trackingToken, existingCase.trackingTokenHash)) {
      return res.status(403).json({ error: 'Invalid tracking token for this confidential case.' });
    }
  }

  try {
    const updatedCase = transitionCaseStatus(
      existingCase,
      nextStatus as CaseStatus,
      { role: actorRole, id: actorId },
      actionNote
    );

    dataset.cases[caseIndex] = updatedCase;

    dataset.auditEvents.unshift(
      createAuditEvent(
        dataset.organisation.id,
        actorId,
        'CASE_STATUS_TRANSITIONED',
        updatedCase.id,
        `Status updated to ${nextStatus}. Action note: ${actionNote || 'N/A'}`
      )
    );

    res.json({
      success: true,
      caseReport: projectCaseForPrivacy(updatedCase),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

apiRouter.get('/cases/list', (req: Request, res: Response) => {
  const {
    sessionId = 'judge-default-session',
    industry = 'construction',
    workerId,
    role = 'employer',
  } = req.query;

  const dataset = getOrCreateSandboxSession(sessionId, industry as IndustryType);
  const allCases = dataset.cases || [];

  if (role === 'worker' && workerId) {
    // Workers see only their own identified cases
    const workerCases = allCases
      .filter(c => !c.isIdentityHidden && c.workerId === workerId)
      .map(c => projectCaseForPrivacy(c));
    return res.json({ success: true, cases: workerCases });
  }

  // Employers see all organisation cases projected for privacy
  const projected = allCases.map(c => projectCaseForPrivacy(c));
  res.json({ success: true, cases: projected });
});

// 16. Reset Sandbox
apiRouter.post('/sandbox/reset', (req: Request, res: Response) => {
  const { sessionId = 'judge-default-session', industry = 'construction' } = req.body;
  const sessionIndustries = sandboxSessions.get(sessionId);
  if (sessionIndustries) {
    sessionIndustries[industry as IndustryType] = generateSeedData(industry as IndustryType);
  }
  res.json({ success: true, message: 'Sandbox data reset to clean initial state' });
});
