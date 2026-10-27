/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IndustryType =
  | 'construction'
  | 'college_facilities'
  | 'hospital_support'
  | 'factory';

export type UserRole = 'employer' | 'worker';

export type AssignmentStatus =
  | 'draft'
  | 'proposed'
  | 'confirmed'
  | 'disputed'
  | 'cancelled';

export type ProposalStatus =
  | 'DRAFT'
  | 'AWAITING_WORKER'
  | 'READY_TO_FINALISE'
  | 'FINALISED'
  | 'DECLINED'
  | 'CANCELLED';

export type BudgetMode = 'strict' | 'flexible' | 'warning';

export type PaidAdjustmentStatus = 'PROPOSED' | 'APPROVED' | 'RECORDED';

export interface TimeInterval {
  startUtc: string; // ISO 8601 UTC
  endUtc: string;   // ISO 8601 UTC
}

export interface Organisation {
  id: string;
  industry: IndustryType;
  name: string;
  timezone: string; // 'Asia/Kolkata'
  policyVersion: string;
  currentRosterVersion: number;
  createdAtUtc?: string;
}

export interface Policy {
  minimumRestMinutes: number; // e.g. 660 mins = 11 hours
  maximumWorkMinutesInWindow: number; // e.g. 2880 mins in 7 days = 48 hours
  windowStart?: string;
  windowEnd?: string;
  overtimeThresholdMinutesPerShift: number; // e.g. 480 mins = 8 hours
  overtimeMultiplierNumerator: number; // e.g. 150
  overtimeMultiplierDenominator: number; // e.g. 100 (1.5x)
  budgetMode: BudgetMode;
  budgetCapPaise: number; // Integer paise
}

export interface Worker {
  id: string;
  organisationId: string;
  displayName: string;
  eligibleRoles: string[];
  trainingTags: string[];
  availabilityIntervals: TimeInterval[];
  preferredIntervals: TimeInterval[];
  baseHourlyRatePaise: number; // integer paise per hour
  phone?: string;
}

export interface ShiftRequirement {
  id: string;
  organisationId: string;
  role: string;
  startUtc: string; // ISO UTC
  endUtc: string;   // ISO UTC
  unpaidBreakMinutes: number;
  requiredTrainingTags: string[];
  headcount: number;
  title?: string;
}

export interface Assignment {
  id: string;
  organisationId?: string;
  workerId: string;
  shiftRequirementId: string;
  status: AssignmentStatus;
  version: number;
  expectedPayPaise: number; // integer paise
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface WorkerProposalResponse {
  workerId: string;
  response: 'ACCEPTED' | 'DECLINED';
  proposalVersion: number;
  optionalComment?: string;
  respondedAtUtc: string;
}

export interface TradeOffMetric {
  baseValue: number;
  proposedValue: number;
  unit: string;
  isFavorable: boolean;
  labelKey: string;
}

export interface ProposalImpactSummary {
  unfilledShiftsCount: number;
  restViolationsCount: number;
  overtimeMinutesTotal: number;
  totalLaborCostPaise: number;
  workerPreferenceMatchPercent: number;
  workloadVarianceScore: number;
  metrics: TradeOffMetric[];
}

export interface ProposalChange {
  assignmentId?: string;
  shiftRequirementId: string;
  previousWorkerId: string | null;
  newWorkerId: string;
  reason: string;
  previousPayPaise?: number;
  newPayPaise?: number;
  restMinutesBefore?: number;
  restMinutesAfter?: number;
}

export interface PaidAdjustment {
  id: string;
  organisationId: string;
  workerId: string;
  amountPaise: number; // Integer paise
  reason: string;
  status: PaidAdjustmentStatus;
  createdAtUtc: string;
  approvedAtUtc?: string;
}

export interface Proposal {
  id: string;
  organisationId: string;
  version: number;
  baseRosterVersion: number;
  changes: ProposalChange[];
  impactSummary: ProposalImpactSummary;
  status: ProposalStatus;
  affectedWorkerIds: string[];
  workerResponses: Record<string, WorkerProposalResponse>;
  paidAdjustments?: PaidAdjustment[];
  createdAtUtc: string;
  finalisedAtUtc?: string;
  rejectionReason?: string;
}

export interface AuditEvent {
  id: string;
  organisationId: string;
  actorId: string;
  action: string;
  entityId: string;
  timestamp: string; // ISO UTC
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason: string;
}

export interface UserProfile {
  id: string;
  organisationId: string;
  role: UserRole;
  workerId?: string;
  email: string;
  displayName: string;
}

export type CaseCategory = 'PAY' | 'SAFETY' | 'SCHEDULING' | 'OTHER';
export type CaseStatus = 'SUBMITTED' | 'ACKNOWLEDGED' | 'ACTION_UNDERWAY' | 'RESOLUTION_PROPOSED' | 'CLOSED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CaseHistoryEntry {
  status: CaseStatus;
  actorRole: 'worker' | 'employer' | 'system';
  actorId?: string;
  note?: string;
  timestampUtc: string;
}

export interface CaseReport {
  id: string;
  organisationId: string;
  workerId: string | null; // null for identity-hidden reports
  workerDisplayName?: string; // omitted for identity-hidden
  isIdentityHidden: boolean;
  trackingTokenHash?: string; // sha256 of private token for identity-hidden lookup
  shiftRequirementId?: string;
  category: CaseCategory;
  status: CaseStatus;
  originalText: string;
  originalLanguage: 'en' | 'ta' | 'other';
  translatedText?: string;
  translatedLanguage?: 'en' | 'ta';
  suggestedUrgency?: UrgencyLevel;
  actionNote?: string;
  history: CaseHistoryEntry[];
  createdAtUtc: string;
  updatedAtUtc?: string;
  resolvedAtUtc?: string;
}

export interface ParsedStaffingRequirement {
  role: string;
  headcount: number;
  startIso: string;
  endIso: string;
  unpaidBreakMinutes: number;
  location?: string;
  notes?: string;
  unspecifiedFields: string[]; // e.g. ["hourlyRate", "requiredQualifications"]
}

export interface PlanMetricsFacts {
  totalPositions: number;
  assignedPositions: number;
  unfilledPositions: number;
  overtimeMinutes: number;
  restViolationsCount: number;
  totalLaborCostPaise: number;
  baselineLaborCostPaise: number;
}

export interface PlanExplanationResult {
  summary: string;
  restAnalysis: string;
  budgetAnalysis: string;
  fairnessNote: string;
  isAiGenerated: boolean;
}

export interface ConflictViolation {
  id: string;
  severity: 'violation' | 'warning';
  type: 'insufficient_rest' | 'window_excess' | 'missing_qualification' | 'unavailability_clash' | 'double_booked';
  workerId: string;
  shiftRequirementId: string;
  conflictingShiftRequirementId?: string;
  descriptionKey: string;
  details: string;
}

export interface PayBreakdown {
  shiftRequirementId: string;
  role: string;
  grossMinutes: number;
  unpaidBreakMinutes: number;
  billableMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  baseHourlyRatePaise: number;
  regularPayPaise: number;
  overtimePayPaise: number;
  totalPayPaise: number;
}

export interface AttendanceSession {
  id: string;
  organisationId: string;
  workerId: string;
  shiftRequirementId: string;
  startUtc: string;
  endUtc?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  recordedMinutes?: number;
  recordedPayPaise?: number;
  correctionNote?: string;
  correctedBy?: string;
  correctedAtUtc?: string;
}

export interface WorkerEarningsWindow {
  workerId: string;
  baselinePayPaise: number;
  projectedPayPaise: number;
  lossPaise: number;
  proposedAdjustmentPaise: number;
  recordedAttendancePayPaise: number;
}

export interface AbsenceReport {
  id: string;
  organisationId: string;
  workerId: string;
  shiftRequirementId: string;
  reportedAtUtc: string;
  status: 'PENDING_REPAIR' | 'REPAIRED' | 'ACKNOWLEDGED';
}
