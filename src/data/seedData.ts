/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Organisation,
  Policy,
  Worker,
  ShiftRequirement,
  Assignment,
  Proposal,
  AuditEvent,
  IndustryType,
  AttendanceSession,
  PaidAdjustment,
  CaseReport,
} from '../domain/types.ts';
import { INDUSTRY_CONFIGS } from './industries.ts';
import { calculateShiftPay } from '../domain/pay.ts';

export interface SandboxDataset {
  organisation: Organisation;
  policy: Policy;
  workers: Worker[];
  shifts: ShiftRequirement[];
  assignments: Assignment[];
  proposals: Proposal[];
  auditEvents: AuditEvent[];
  attendanceSessions: AttendanceSession[];
  paidAdjustments: PaidAdjustment[];
  cases: CaseReport[];
}

export function generateSeedData(industry: IndustryType): SandboxDataset {
  const config = INDUSTRY_CONFIGS[industry];
  const orgId = `org-sandbox-${industry}`;

  const organisation: Organisation = {
    id: orgId,
    industry,
    name: industry === 'construction'
      ? 'Kaveri Infrastructure Logistics'
      : industry === 'college_facilities'
      ? 'Madras Tech Campus Services'
      : industry === 'hospital_support'
      ? 'Apollo Support Logistics (Non-Clinical)'
      : 'Thiruvallur Precision Assembly',
    timezone: 'Asia/Kolkata',
    policyVersion: '1.2.0',
    currentRosterVersion: 1,
    createdAtUtc: '2026-10-01T00:00:00Z',
  };

  const policy: Policy = { ...config.defaultPolicy };

  // Common anchor dates for demo display: 2026-10-27 and 2026-10-28
  // In Asia/Kolkata (UTC+5:30):
  // Shift 1: 06:00 IST to 14:30 IST (8.5h gross, 30m break) -> UTC: 00:30Z to 09:00Z
  // Shift 2: 14:00 IST to 22:30 IST (8.5h gross, 30m break) -> UTC: 08:30Z to 17:00Z
  // Shift 3: 22:00 IST to 06:30 IST next day -> UTC: 16:30Z to 01:00Z next day
  const dateStr1 = '2026-10-27';
  const dateStr2 = '2026-10-28';

  // Workers with realistic profiles
  const workers: Worker[] = [
    {
      id: `w-${industry}-1`,
      organisationId: orgId,
      displayName: 'Murugan Pillai',
      eligibleRoles: [config.roles[0].id, config.roles[1].id],
      trainingTags: config.trainingTags.map(t => t.id), // fully qualified
      availabilityIntervals: [
        { startUtc: `${dateStr1}T00:00:00Z`, endUtc: `${dateStr1}T18:00:00Z` },
        { startUtc: `${dateStr2}T00:00:00Z`, endUtc: `${dateStr2}T18:00:00Z` },
      ],
      preferredIntervals: [
        { startUtc: `${dateStr1}T00:00:00Z`, endUtc: `${dateStr1}T10:00:00Z` },
      ],
      baseHourlyRatePaise: config.roles[0].defaultRatePaisePerHour,
      phone: '+91 98401 22341',
    },
    {
      id: `w-${industry}-2`,
      organisationId: orgId,
      displayName: 'Selvi Sundaram',
      eligibleRoles: [config.roles[0].id, config.roles[1].id],
      trainingTags: [config.trainingTags[0].id, config.trainingTags[1]?.id || config.trainingTags[0].id],
      availabilityIntervals: [
        { startUtc: `${dateStr1}T08:00:00Z`, endUtc: `${dateStr1}T22:00:00Z` },
        { startUtc: `${dateStr2}T08:00:00Z`, endUtc: `${dateStr2}T22:00:00Z` },
      ],
      preferredIntervals: [
        { startUtc: `${dateStr1}T08:00:00Z`, endUtc: `${dateStr1}T17:30:00Z` },
      ],
      baseHourlyRatePaise: config.roles[0].defaultRatePaisePerHour,
      phone: '+91 94440 88712',
    },
    {
      id: `w-${industry}-3`,
      organisationId: orgId,
      displayName: 'Annamalai Raman',
      eligibleRoles: [config.roles[1]?.id || config.roles[0].id, config.roles[2]?.id || config.roles[0].id],
      trainingTags: config.trainingTags.slice(0, 3).map(t => t.id),
      availabilityIntervals: [
        { startUtc: `${dateStr1}T00:00:00Z`, endUtc: `${dateStr2}T23:59:59Z` },
      ],
      preferredIntervals: [
        { startUtc: `${dateStr1}T16:00:00Z`, endUtc: `${dateStr2}T02:00:00Z` },
      ],
      baseHourlyRatePaise: config.roles[1]?.defaultRatePaisePerHour || config.roles[0].defaultRatePaisePerHour,
      phone: '+91 97890 55123',
    },
    {
      id: `w-${industry}-4`,
      organisationId: orgId,
      displayName: 'Kavitha Rajan',
      eligibleRoles: [config.roles[2]?.id || config.roles[0].id, config.roles[3]?.id || config.roles[0].id],
      trainingTags: config.trainingTags.map(t => t.id),
      availabilityIntervals: [
        { startUtc: `${dateStr1}T00:00:00Z`, endUtc: `${dateStr1}T18:00:00Z` },
        { startUtc: `${dateStr2}T00:00:00Z`, endUtc: `${dateStr2}T18:00:00Z` },
      ],
      preferredIntervals: [
        { startUtc: `${dateStr1}T00:30:00Z`, endUtc: `${dateStr1}T09:30:00Z` },
      ],
      baseHourlyRatePaise: config.roles[2]?.defaultRatePaisePerHour || config.roles[0].defaultRatePaisePerHour,
      phone: '+91 91760 33499',
    },
    {
      id: `w-${industry}-5`,
      organisationId: orgId,
      displayName: 'Prakash Kumar',
      eligibleRoles: [config.roles[0].id, config.roles[1]?.id || config.roles[0].id],
      trainingTags: [config.trainingTags[0].id], // lacks some advanced tags
      availabilityIntervals: [
        { startUtc: `${dateStr1}T06:00:00Z`, endUtc: `${dateStr2}T12:00:00Z` },
      ],
      preferredIntervals: [],
      baseHourlyRatePaise: config.roles[0].defaultRatePaisePerHour,
      phone: '+91 99402 11984',
    },
    {
      id: `w-${industry}-6`,
      organisationId: orgId,
      displayName: 'Meenakshi Natarajan',
      eligibleRoles: config.roles.map(r => r.id),
      trainingTags: config.trainingTags.map(t => t.id),
      availabilityIntervals: [
        { startUtc: `${dateStr1}T00:00:00Z`, endUtc: `${dateStr2}T23:59:59Z` },
      ],
      preferredIntervals: [
        { startUtc: `${dateStr1}T08:30:00Z`, endUtc: `${dateStr1}T17:00:00Z` },
      ],
      baseHourlyRatePaise: config.roles[0].defaultRatePaisePerHour,
      phone: '+91 96000 95412',
    },
  ];

  // Shift requirements across morning, afternoon, night
  const shifts: ShiftRequirement[] = [
    {
      id: `s-${industry}-1`,
      organisationId: orgId,
      role: config.roles[0].id,
      title: 'Morning Shift A',
      startUtc: `${dateStr1}T00:30:00Z`, // 06:00 IST
      endUtc: `${dateStr1}T09:00:00Z`,   // 14:30 IST (8.5h gross, 30m unpaid break = 8.0h billable)
      unpaidBreakMinutes: 30,
      requiredTrainingTags: config.roles[0].requiredTrainingTags,
      headcount: 2,
    },
    {
      id: `s-${industry}-2`,
      organisationId: orgId,
      role: config.roles[1]?.id || config.roles[0].id,
      title: 'Afternoon Logistics B',
      startUtc: `${dateStr1}T08:30:00Z`, // 14:00 IST
      endUtc: `${dateStr1}T17:00:00Z`,   // 22:30 IST
      unpaidBreakMinutes: 30,
      requiredTrainingTags: config.roles[1]?.requiredTrainingTags || config.roles[0].requiredTrainingTags,
      headcount: 2,
    },
    {
      id: `s-${industry}-3`,
      organisationId: orgId,
      role: config.roles[2]?.id || config.roles[0].id,
      title: 'Night Operation C',
      startUtc: `${dateStr1}T16:30:00Z`, // 22:00 IST
      endUtc: `${dateStr2}T01:00:00Z`,   // 06:30 IST next day
      unpaidBreakMinutes: 30,
      requiredTrainingTags: config.roles[2]?.requiredTrainingTags || config.roles[0].requiredTrainingTags,
      headcount: 1,
    },
    {
      id: `s-${industry}-4`,
      organisationId: orgId,
      role: config.roles[0].id,
      title: 'Next-Day Morning Shift D',
      startUtc: `${dateStr2}T00:30:00Z`, // 06:00 IST
      endUtc: `${dateStr2}T09:00:00Z`,   // 14:30 IST
      unpaidBreakMinutes: 30,
      requiredTrainingTags: config.roles[0].requiredTrainingTags,
      headcount: 2,
    },
  ];

  // Base assignments with deliberate realistic trade-off scenario:
  // Selvi is assigned to s-2 (ends 17:00Z / 22:30 IST) AND s-4 (starts 00:30Z / 06:00 IST next day)
  // Gap is only 7.5 hours (450 mins), violating policy minimum rest of 11h (660 mins)!
  // Also s-1 has only 1 worker assigned (headcount is 2, leaving 1 slot unfilled).
  const payS1W1 = calculateShiftPay(shifts[0], workers[0].baseHourlyRatePaise, policy);
  const payS2W2 = calculateShiftPay(shifts[1], workers[1].baseHourlyRatePaise, policy);
  const payS2W3 = calculateShiftPay(shifts[1], workers[2].baseHourlyRatePaise, policy);
  const payS3W4 = calculateShiftPay(shifts[2], workers[3].baseHourlyRatePaise, policy);
  const payS4W2 = calculateShiftPay(shifts[3], workers[1].baseHourlyRatePaise, policy);

  const assignments: Assignment[] = [
    {
      id: `as-${industry}-1`,
      workerId: workers[0].id,
      shiftRequirementId: shifts[0].id,
      status: 'confirmed',
      version: 1,
      expectedPayPaise: payS1W1.totalPayPaise,
      createdAtUtc: `${dateStr1}T00:00:00Z`,
    },
    {
      id: `as-${industry}-2`,
      workerId: workers[1].id,
      shiftRequirementId: shifts[1].id,
      status: 'confirmed',
      version: 1,
      expectedPayPaise: payS2W2.totalPayPaise,
      createdAtUtc: `${dateStr1}T00:00:00Z`,
    },
    {
      id: `as-${industry}-3`,
      workerId: workers[2].id,
      shiftRequirementId: shifts[1].id,
      status: 'confirmed',
      version: 1,
      expectedPayPaise: payS2W3.totalPayPaise,
      createdAtUtc: `${dateStr1}T00:00:00Z`,
    },
    {
      id: `as-${industry}-4`,
      workerId: workers[3].id,
      shiftRequirementId: shifts[2].id,
      status: 'confirmed',
      version: 1,
      expectedPayPaise: payS3W4.totalPayPaise,
      createdAtUtc: `${dateStr1}T00:00:00Z`,
    },
    {
      id: `as-${industry}-5`,
      workerId: workers[1].id, // Selvi assigned again next morning! Rest conflict!
      shiftRequirementId: shifts[3].id,
      status: 'confirmed',
      version: 1,
      expectedPayPaise: payS4W2.totalPayPaise,
      createdAtUtc: `${dateStr1}T00:00:00Z`,
    },
  ];

  const proposals: Proposal[] = [];

  const auditEvents: AuditEvent[] = [
    {
      id: `audit-init-${industry}-1`,
      organisationId: orgId,
      actorId: 'system-initialiser',
      action: 'ORGANISATION_INITIALISED',
      entityId: orgId,
      timestamp: '2026-10-26T12:00:00Z',
      reason: `Initialised sandbox baseline schedule for ${config.labelEn}`,
    },
    {
      id: `audit-init-${industry}-2`,
      organisationId: orgId,
      actorId: 'manager-demo',
      action: 'SHIFT_REQUIREMENT_PUBLISHED',
      entityId: shifts[0].id,
      timestamp: '2026-10-26T14:30:00Z',
      reason: 'Published 4 demand requirements for weekly rotation',
    },
  ];

  const attendanceSessions: AttendanceSession[] = [];
  const paidAdjustments: PaidAdjustment[] = [];

  const cases: CaseReport[] = [
    {
      id: `case-init-${industry}-1`,
      organisationId: orgId,
      workerId: workers[1].id,
      workerDisplayName: workers[1].displayName,
      isIdentityHidden: false,
      shiftRequirementId: shifts[3].id,
      category: 'SCHEDULING',
      status: 'ACKNOWLEDGED',
      originalText: 'Night shift followed by early morning shift gives only 7 hours rest instead of 11 hours.',
      originalLanguage: 'en',
      translatedText: 'இரவுப் பணியைத் தொடர்ந்து அதிகாலைப் பணி வருவதால் 11 மணிநேரத்திற்குப் பதிலாக 7 மணிநேரம் மட்டுமே ஓய்வு கிடைக்கிறது.',
      translatedLanguage: 'ta',
      suggestedUrgency: 'HIGH',
      history: [
        {
          status: 'SUBMITTED',
          actorRole: 'worker',
          actorId: workers[1].id,
          timestampUtc: '2026-10-26T15:00:00Z',
          note: 'Worker flagged consecutive night-to-morning turnaround.',
        },
        {
          status: 'ACKNOWLEDGED',
          actorRole: 'employer',
          actorId: 'manager-demo',
          timestampUtc: '2026-10-26T15:30:00Z',
          note: 'Roster supervisor acknowledged rest interval concern. Preparing shift re-allocation.',
        },
      ],
      createdAtUtc: '2026-10-26T15:00:00Z',
      updatedAtUtc: '2026-10-26T15:30:00Z',
    },
  ];

  return {
    organisation,
    policy,
    workers,
    shifts,
    assignments,
    proposals,
    auditEvents,
    attendanceSessions,
    paidAdjustments,
    cases,
  };
}
