/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaseReport, CaseCategory, CaseStatus, UrgencyLevel, AuditEvent, CaseHistoryEntry } from './types.ts';
import { sha256, generatePrivateTrackingToken } from './hash.ts';

export interface CaseCreationParams {
  organisationId: string;
  category: CaseCategory;
  originalText: string;
  originalLanguage: 'en' | 'ta' | 'other';
  translatedText?: string;
  translatedLanguage?: 'en' | 'ta';
  suggestedUrgency?: UrgencyLevel;
  shiftRequirementId?: string;
  workerId?: string;
  workerDisplayName?: string;
  isIdentityHidden: boolean;
}

export interface CreatedCaseResult {
  caseReport: CaseReport;
  privateTrackingToken?: string; // Provided ONCE if identity is hidden
}

/**
 * Creates an identified or identity-hidden case report.
 * For identity-hidden reports:
 * - workerId is explicitly null
 * - workerDisplayName is omitted
 * - High-entropy private token is returned ONCE to the reporter; only sha256(token) is persisted
 */
export function createCaseReport(params: CaseCreationParams): CreatedCaseResult {
  const caseId = `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowUtc = new Date().toISOString();

  let privateTrackingToken: string | undefined;
  let trackingTokenHash: string | undefined;

  if (params.isIdentityHidden) {
    privateTrackingToken = generatePrivateTrackingToken();
    trackingTokenHash = sha256(privateTrackingToken);
  }

  const initialHistory: CaseHistoryEntry = {
    status: 'SUBMITTED',
    actorRole: 'worker',
    actorId: params.isIdentityHidden ? undefined : params.workerId,
    timestampUtc: nowUtc,
    note: 'Initial case submitted by worker',
  };

  const caseReport: CaseReport = {
    id: caseId,
    organisationId: params.organisationId,
    workerId: params.isIdentityHidden ? null : (params.workerId || null),
    workerDisplayName: params.isIdentityHidden ? undefined : params.workerDisplayName,
    isIdentityHidden: params.isIdentityHidden,
    trackingTokenHash,
    shiftRequirementId: params.shiftRequirementId,
    category: params.category,
    status: 'SUBMITTED',
    originalText: params.originalText.trim(),
    originalLanguage: params.originalLanguage,
    translatedText: params.translatedText?.trim(),
    translatedLanguage: params.translatedLanguage,
    suggestedUrgency: params.suggestedUrgency || 'MEDIUM',
    history: [initialHistory],
    createdAtUtc: nowUtc,
    updatedAtUtc: nowUtc,
  };

  return {
    caseReport,
    privateTrackingToken,
  };
}

/**
 * Transitions case status through the required lifecycle:
 * SUBMITTED -> ACKNOWLEDGED -> ACTION_UNDERWAY -> RESOLUTION_PROPOSED -> CLOSED
 *
 * Validation rules:
 * - RESOLUTION_PROPOSED and CLOSED strictly require an explicit actionNote.
 * - Reporter can reopen a RESOLUTION_PROPOSED or CLOSED case back to ACTION_UNDERWAY.
 */
export function transitionCaseStatus(
  existingCase: CaseReport,
  nextStatus: CaseStatus,
  actor: { role: 'worker' | 'employer' | 'system'; id?: string },
  actionNote?: string
): CaseReport {
  const nowUtc = new Date().toISOString();
  const trimmedNote = actionNote?.trim();

  // Valid forward transitions
  const validTransitions: Record<CaseStatus, CaseStatus[]> = {
    SUBMITTED: ['ACKNOWLEDGED', 'ACTION_UNDERWAY'],
    ACKNOWLEDGED: ['ACTION_UNDERWAY', 'RESOLUTION_PROPOSED'],
    ACTION_UNDERWAY: ['RESOLUTION_PROPOSED', 'CLOSED'],
    RESOLUTION_PROPOSED: ['CLOSED', 'ACTION_UNDERWAY'], // Can close or reporter can reopen
    CLOSED: ['ACTION_UNDERWAY'], // Reporter can reopen
  };

  // Reopening check
  const isReopening = (existingCase.status === 'RESOLUTION_PROPOSED' || existingCase.status === 'CLOSED') &&
                      nextStatus === 'ACTION_UNDERWAY';

  if (!isReopening) {
    const allowed = validTransitions[existingCase.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Invalid case transition from ${existingCase.status} to ${nextStatus}. Allowed: ${allowed.join(', ')}`
      );
    }
  }

  // Mandatory action note for resolution or closing
  if ((nextStatus === 'RESOLUTION_PROPOSED' || nextStatus === 'CLOSED') && !trimmedNote) {
    throw new Error(
      `Transition to ${nextStatus} requires an explicit, non-empty action note explaining the resolution steps.`
    );
  }

  const historyEntry: CaseHistoryEntry = {
    status: nextStatus,
    actorRole: actor.role,
    actorId: actor.id,
    note: trimmedNote || (isReopening ? 'Case reopened by reporter' : `Status changed to ${nextStatus}`),
    timestampUtc: nowUtc,
  };

  return {
    ...existingCase,
    status: nextStatus,
    actionNote: trimmedNote || existingCase.actionNote,
    resolvedAtUtc: (nextStatus === 'CLOSED' || nextStatus === 'RESOLUTION_PROPOSED') ? nowUtc : existingCase.resolvedAtUtc,
    updatedAtUtc: nowUtc,
    history: [...(existingCase.history || []), historyEntry],
  };
}

/**
 * Verifies a private tracking token against the stored sha256 hash.
 */
export function verifyTrackingToken(token: string, storedHash?: string): boolean {
  if (!token || !storedHash) return false;
  const computedHash = sha256(token.trim());
  return computedHash === storedHash;
}

/**
 * Privacy projection:
 * Strictly guarantees that if isIdentityHidden is true, no worker identifiers,
 * account links, or display names are returned.
 */
export function projectCaseForPrivacy(caseReport: CaseReport): CaseReport {
  if (caseReport.isIdentityHidden) {
    return {
      ...caseReport,
      workerId: null,
      workerDisplayName: undefined,
      trackingTokenHash: undefined, // Never expose the hash to public queries
    };
  }
  return {
    ...caseReport,
    trackingTokenHash: undefined,
  };
}

export function createAuditEvent(
  organisationId: string,
  actorId: string,
  action: string,
  entityId: string,
  reason: string,
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null
): AuditEvent {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organisationId,
    actorId,
    action,
    entityId,
    timestamp: new Date().toISOString(),
    before: before || null,
    after: after || null,
    reason: reason.trim(),
  };
}
