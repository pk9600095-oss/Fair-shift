/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta';

export const TRANSLATIONS = {
  en: {
    // Brand & Mission
    appName: 'FairShift',
    appTagline: 'Equitable workforce staffing & transparent rest scheduling',
    sdgGoal: 'SDG 8: Decent Work & Economic Growth',
    sdgSubtext: 'Promote sustained, inclusive economic growth, full and productive employment, and decent work for all.',

    // Sandbox & Judge notices
    sandboxBadge: 'JUDGES SANDBOX DEMO',
    sandboxNotice: 'This is an isolated synthetic sandbox designed for evaluation. Roles and assignments are simulated. No access is granted to real database records.',
    simulatedRole: 'Simulated Role',
    switchToWorker: 'Switch to Worker View',
    switchToEmployer: 'Switch to Employer Workbench',
    viewingAsWorker: 'Viewing as Worker',
    viewingAsEmployer: 'Viewing as Employer Staffing Manager',
    industrySelector: 'Select Industry',
    resetSandbox: 'Reset Sandbox Data',
    demoWorkspaceLabel: 'Demo Workspace',

    // Navigation & Primary Tabs
    navOverview: 'Overview',
    navStaffing: 'Staffing Workbench',
    navProposals: 'Proposals',
    navAttendancePay: 'Attendance & Pay',
    navConcerns: 'Concerns & Cases',
    navReports: 'Reports',
    navHome: 'Home',
    navMyShifts: 'My Shifts',
    navChangeRequests: 'Change Requests',
    navMyEarnings: 'My Earnings',
    navAvailability: 'Availability & Rest',
    signOut: 'Sign Out',
    signInWithGoogle: 'Sign in with Google',
    exploreDemo: 'Explore demo workspace',

    // Worker View
    workerTitle: 'Worker Task Hub',
    upcomingAssignments: 'Upcoming Assigned Shifts',
    noUpcomingAssignments: 'No shift assignments scheduled currently.',
    nextShiftTitle: 'Your Next Upcoming Shift',
    viewDetails: 'View details',
    shiftDuration: 'Duration',
    unpaidBreak: 'Unpaid Break',
    shiftSupervisor: 'Site Supervisor',
    shiftLocation: 'Location',
    hoursShort: 'hrs',
    minsShort: 'mins',
    availabilityTitle: 'Declared Availability & Preferences',
    availabilityDesc: 'Specify intervals when you are ready to work, and your preferred hours. Roster optimization respects your rest intervals.',
    addInterval: 'Add Availability Interval',
    addPreferredInterval: 'Add Preferred Interval',
    saveAvailability: 'Save Availability',
    availabilitySaved: 'Availability intervals updated successfully.',
    earningsBreakdown: 'Estimated Earnings Breakdown',
    earningsDisclaimer: 'Calculations reflect employer policy and do not constitute statutory wage advice or legal certifications.',
    hourlyRate: 'Base Hourly Rate',
    billableHours: 'Billable Hours',
    breakDeduction: 'Unpaid Break',
    regularPay: 'Regular Pay',
    overtimePay: 'Overtime Pay',
    totalPay: 'Total Expected Pay',
    workedHoursEarnings: 'Worked-Hours Projected Earnings',
    approvedAdjustments: 'Approved Employer Adjustments',
    totalProjectedIncome: 'Total Projected Income',
    proposalResponseTitle: 'Review Schedule Changes',
    noPendingProposals: 'No schedule change proposals currently awaiting your review.',
    acceptSchedule: 'Accept Proposal',
    requestAdjustment: 'Request Adjustment',
    declineSchedule: 'Decline Proposal',
    declineNotice: 'Declining a proposed schedule modification does not impact your standing or create disciplinary penalties.',
    optionalCommentLabel: 'Optional Comment (No personal reason required)',
    optionalCommentPlaceholder: 'Enter any work scheduling notes or leave blank...',
    proposalChangeOld: 'Original Assignment',
    proposalChangeNew: 'Proposed Assignment',
    proposalPayDelta: 'Projected Pay Difference',
    proposalRestInterval: 'Rest Interval Before Shift',
    proposalReason: 'Plain-Language Reason',

    // Absence Flagging
    flagAbsenceTitle: 'Report Inability to Attend',
    flagAbsenceDesc: 'Flag an upcoming shift you cannot work. The existing roster is preserved while your employer prepares an absence repair.',
    flagAbsenceBtn: 'Report Absence for Shift',
    flagAbsenceSuccess: 'Absence recorded without disciplinary penalty. Active roster preserved pending employer repair.',

    // Attendance Clocking
    attendanceTitle: 'Shift Clocking & Recorded Hours',
    attendanceDesc: 'Clock in when commencing work and clock out upon shift completion. System uses secure server timestamps.',
    clockInBtn: 'Clock In to Shift',
    clockOutBtn: 'Clock Out from Shift',
    clockInSuccess: 'Clock-in recorded successfully at server time.',
    clockOutSuccess: 'Clock-out recorded. Verified duration and actual pay computed.',
    inProgressSession: 'Active Shift in Progress',
    completedSessions: 'Recorded Shift Attendance History',
    projectedVsActualPay: 'Projected vs Recorded Actual Pay',
    projectedPayLabel: 'Projected Worked-Hours Pay',
    recordedPayLabel: 'Recorded Clocked Pay',
    paidAdjustmentLabel: 'Employer Paid Adjustment',
    adjustmentDisclaimer: 'Proposed paid adjustments are voluntary employer commitments recorded for transparency. Not marked as paid or guaranteed statutory compensation.',
    raiseDiscrepancy: 'Raise Attendance Discrepancy',
    attendanceCorrectionTitle: 'Correct Shift Attendance Record',
    correctionReasonLabel: 'Correction Reason (Required)',
    saveCorrectionBtn: 'Save Verified Hours',

    // Employer Workbench & Overview
    employerTitle: 'Employer Staffing Workbench',
    welcomeEmployer: 'Staffing & Rostering Overview',
    rosterMatrixTitle: 'Weekly Shift Demand & Staffing Matrix',
    headcountFilled: 'Headcount Filled',
    conflictsTitle: 'Active Constraint & Rest Violations',
    noConflicts: 'All assignments strictly satisfy minimum rest, qualification, and window constraints.',
    optimizeButton: 'Run FairShift Optimizer',
    optimizing: 'Evaluating rest windows and balancing hours...',
    tradeOffTitle: 'Trade-Off Comparison (Current vs Proposed)',
    baseRosterCol: 'Current Roster',
    proposedRosterCol: 'FairShift Proposed Roster',
    varianceCol: 'Outcome Delta',
    createProposalBtn: 'Formulate & Create Proposal Plan',
    publishToWorkers: 'Publish Proposal to Workers',
    proposalPublished: 'Proposal published to affected workers for review.',
    finaliseRoster: 'Finalise & Commit Roster',
    rosterFinalised: 'Roster committed. Audit record created.',
    staleProposalError: 'Proposal is based on an older roster version. Please refresh the workbench.',
    declineBlockNotice: 'Cannot finalise: One or more affected workers declined the proposal.',
    unfilledShifts: 'Unfilled Positions',
    assignedPositions: 'Assigned Positions',
    requiredPositions: 'Required Positions',
    proposalsAwaitingResponse: 'Proposals Awaiting Response',
    restViolations: 'Rest Window Violations',
    totalLaborCost: 'Total Labor Cost',
    budgetCap: 'Employer Budget Cap',
    preferenceMatchRate: 'Availability Match Rate',
    overtimeHoursTotal: 'Overtime Hours',
    absenceRepairTitle: 'Absence Repair Workbench',
    repairShiftBtn: 'Generate Absence Repair',
    proposeAdjustmentBtn: 'Propose Paid Adjustment',
    needsAttentionTitle: 'Items Requiring Attention',
    noPendingItems: 'No urgent scheduling or worker response items require action.',
    coverageChartTitle: 'Staffing Coverage Analysis',
    earningsChartTitle: 'Projected Earnings Comparison (Baseline vs Proposed)',
    nightDutyChartTitle: 'Night-Duty Distribution (22:00 - 06:30 IST)',
    caseStatusChartTitle: 'Worker Concern Case Breakdown',

    // Proposal Status Badges
    statusDraft: 'DRAFT',
    statusAwaitingWorker: 'AWAITING WORKER',
    statusReadyToFinalise: 'READY TO FINALISE',
    statusFinalised: 'FINALISED',
    statusDeclined: 'DECLINED',
    statusCancelled: 'CANCELLED',
    statusConfirmed: 'CONFIRMED',
    statusOpen: 'OPEN',
    statusUnderReview: 'UNDER REVIEW',
    statusResolved: 'RESOLVED',

    // Cases & Worker Concerns
    reportCaseTitle: 'Report Worker Concern or Infringement',
    caseCategory: 'Issue Category',
    caseDescription: 'Description of Concern',
    submitCase: 'Submit Concern',
    caseSubmitted: 'Concern submitted and logged to audit trail.',
    categoryPay: 'Pay & Rates Discrepancy',
    categorySafety: 'Workplace Safety & Conditions',
    categoryScheduling: 'Scheduling & Rest Infringement',
    categoryOther: 'General Workplace Query',
    reportIdentified: 'Submit as Identified Worker',
    reportIdentityHidden: 'Submit with Identity Hidden (Private Tracking Token)',
    identityHiddenNotice: 'No worker identity or account ID will be linked. You will receive a private tracking token. Content and shift metadata may still reveal identity. We do not claim guaranteed anonymity.',
    trackingTokenLabel: 'Your Private Tracking Token',
    trackingTokenHelp: 'Save this token safely. We store only a cryptographic SHA-256 hash. You will need this token to track progress or reopen this report.',
    copyTokenBtn: 'Copy Token to Clipboard',
    tokenCopied: 'Token copied!',
    trackExistingCase: 'Track Existing Confidential Report',
    enterTrackingToken: 'Enter 32-character Private Tracking Token...',
    findCaseBtn: 'Retrieve Report',
    noMatchingCase: 'No report found matching this tracking token.',
    reopenCaseBtn: 'Reopen Report',
    reopenReasonPrompt: 'Reason for reopening this resolution...',
    caseStatusLabel: 'Current Status',
    caseHistoryTitle: 'Case Action History',
    statusSubmitted: 'SUBMITTED',
    statusAcknowledged: 'ACKNOWLEDGED',
    statusActionUnderway: 'ACTION UNDERWAY',
    statusResolutionProposed: 'RESOLUTION PROPOSED',
    statusClosed: 'CLOSED',
    actionNoteLabel: 'Action Note (Required for resolution)',
    actionNotePlaceholder: 'Detail steps taken to investigate, remediate, or adjust...',
    actionNoteRequired: 'An action note is mandatory before proposing resolution or closing a case.',
    emergencyHelpNotice: 'For immediate physical danger, medical emergencies, or urgent safety hazards, immediately notify onsite security or dial emergency services (112).',
    aiUrgencySuggested: 'AI urgency suggestion only — not an emergency guarantee.',

    // Voice & Speech Features
    voiceInputTitle: 'Voice Speech Input',
    voiceLanguageSelect: 'Recognition Language',
    voiceStart: 'Start Voice Input',
    voiceStop: 'Stop Recording',
    voiceListening: 'Listening... speak clearly into your microphone.',
    voiceDenied: 'Microphone access denied. Please grant microphone permission in your browser.',
    voiceUnsupported: 'Browser speech recognition is not supported in this browser. Please use keyboard text input.',
    voiceEditableTranscript: 'Recognized Voice Transcript (Editable):',
    voiceApplyTranscript: 'Apply Voice Transcript',
    voiceCloudNotice: 'Browser speech recognition utilizes device and cloud-assisted speech services. Speech recognition does not run fully offline.',
    readAloud: 'Read Aloud (Voice Synthesizer)',
    stopReading: 'Stop Reading',
    readingInProgress: 'Reading aloud...',
    voiceUnavailableNotice: 'Appropriate device voice not found for the selected language. Available system voices do not include native voice.',

    // AI Assistant Features
    aiAssistantTitle: 'FairShift Multilingual Assistant',
    aiNaturalStaffingTitle: 'Natural-Language Staffing Parser',
    aiStaffingPromptPlaceholder: 'e.g., We need 4 site porters tomorrow from 8am to 4:30pm and 2 supervisors from 2pm to 10:30pm at Main Yard...',
    aiParseBtn: 'Parse into Shift Requirements',
    aiParsing: 'Analyzing natural language staffing request...',
    aiReviewParsed: 'Review Parsed Shift Requirements (Confirm before adding):',
    aiConfirmShifts: 'Confirm & Add to Demand Matrix',
    aiMissingFields: 'Unspecified fields to set manually',
    aiTranslateConcernTitle: 'Bilingual Translation & Structuring',
    aiTranslateBtn: 'Translate & Structure Concern',
    aiTranslating: 'Translating and structuring concern...',
    aiOriginalText: 'Original Worker Statement',
    aiTranslatedText: 'Translated Statement (Editable)',
    aiTranslationUnavailable: 'AI translation service unavailable. Submitting original text directly.',
    aiExplainPlanBtn: 'Explain Plan Metrics & Rest Trade-offs',
    aiExplainingPlan: 'Generating plain-language fairness & budget explanation...',
    aiPlanExplanationTitle: 'FairShift Plain-Language Plan Summary',
    aiRestAnalysis: 'Rest Window Compliance',
    aiBudgetAnalysis: 'Budget & Cost Impact',
    aiFairnessNote: 'Worker Equity & Distribution',

    // Violations
    violation_insufficient_rest: 'Insufficient Rest Between Consecutive Shifts (<11h)',
    violation_window_excess: 'Work Window Hours Cap Exceeded',
    violation_missing_qualification: 'Worker Missing Required Training Tag',
    violation_double_booked: 'Double-Booked Overlapping Shift',
    warning_unavailability_clash: 'Scheduled Outside Declared Available Interval',

    // Metrics
    metric_unfilled_headcount: 'Unfilled Headcount Slots',
    metric_rest_violations: 'Rest Window Violations (<11h)',
    metric_overtime_hours: 'Overtime Hours Total',
    metric_labor_cost: 'Total Labor Cost (Paise)',
    metric_availability_match: 'Worker Preference Match %',

    // Privacy & Terms
    privacyTitle: 'Privacy Notice',
    termsTitle: 'Terms of Use & Prototype Notice',
    privacyStoredDataTitle: 'Stored Data & Firestore Architecture',
    privacyStoredDataBody: 'FairShift stores organisation configuration, shift requirements, assignments, verified attendance clocking timestamps, and integer paise earnings. Data is scoped strictly to verified organisation tenancy.',
    privacyAiTitle: 'AI & Speech Processing Transparency',
    privacyAiBody: 'AI assistance uses a secure, server-side Gemini integration. No API keys are in browser code. Roster explanations receive strictly aggregated numeric facts with zero worker names or personal identifiers. Speech recognition uses device and browser cloud-assisted APIs. Speech does not run fully offline.',
    privacyDemoTitle: 'Synthetic Demo Sandbox Isolation',
    privacyDemoBody: 'The public demo operates in an isolated synthetic sandbox with simulated workers and shifts. Demo mutations do not affect persistent database records.',
    privacyRetentionTitle: 'Retention & Non-Statutory Disclaimer',
    privacyRetentionBody: 'FairShift is an SDG 8 hackathon prototype. Policy calculations, overtime multipliers, and earnings representations are non-statutory and do not constitute formal wage certifications or legal compliance guarantees.',
    closeBtn: 'Close',

    // Common
    loading: 'Loading...',
    retry: 'Retry',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    errorTitle: 'Operation Error',
    timeDisplayNotice: 'All timestamps displayed in Asia/Kolkata (IST); stored in UTC.',
    languageToggle: 'தமிழ் (Tamil)',
  },

  ta: {
    // Brand & Mission
    appName: 'FairShift',
    appTagline: 'நியாயமான பணியாளர் சுழற்சி & வெளிப்படையான ஓய்வு அட்டவணை',
    sdgGoal: 'SDG 8: கண்ணியமான வேலை & பொருளாதார வளர்ச்சி',
    sdgSubtext: 'நிலையான, உள்ளடக்கிய பொருளாதார வளர்ச்சி, முழுமையான உற்பத்தித் திறன் வாய்ந்த வேலைவாய்ப்பு மற்றும் அனைவருக்கும் கண்ணியமான வேலையை ஊக்குவித்தல்.',

    // Sandbox & Judge notices
    sandboxBadge: 'நடுவர் மாதிரி பரிசோதனை முறைமை',
    sandboxNotice: 'இது மதிப்பீட்டிற்காக உருவாக்கப்பட்ட மாதிரி தளம். பணிகள் மற்றும் பாத்திரங்கள் உருவகப்படுத்தப்பட்டவை. நேரடி தரவுகளுக்கு அணுகல் இல்லை.',
    simulatedRole: 'மாதிரி பங்கு',
    switchToWorker: 'பணியாளர் பார்வைக்கு மாறவும்',
    switchToEmployer: 'நிர்வாகப் பார்வைக்கு மாறவும்',
    viewingAsWorker: 'பணியாளராகப் பார்க்கிறீர்கள்',
    viewingAsEmployer: 'நிர்வாகியாகப் பார்க்கிறீர்கள்',
    industrySelector: 'தொழில் துறையைத் தேர்ந்தெடுக்கவும்',
    resetSandbox: 'மாதிரித் தரவை மீட்டமைக்கவும்',
    demoWorkspaceLabel: 'மாதிரி பணித்தளம்',

    // Navigation & Primary Tabs
    navOverview: 'கண்ணோட்டம்',
    navStaffing: 'பணியாளர் பணிமேடை',
    navProposals: 'முன்மொழிவுகள்',
    navAttendancePay: 'வருகை & ஊதியம்',
    navConcerns: 'சிக்கல்கள் & புகார்கள்',
    navReports: 'அறிக்கைகள்',
    navHome: 'முகப்பு',
    navMyShifts: 'எனது பணிகள்',
    navChangeRequests: 'மாற்றக் கோரிக்கைகள்',
    navMyEarnings: 'எனது வருவாய்',
    navAvailability: 'ஓய்வு & கிடைக்கும் நேரம்',
    signOut: 'வெளியேறு',
    signInWithGoogle: 'கூகுள் மூலம் உள்நுழைக',
    exploreDemo: 'மாதிரி தளத்தைப் பார்க்கவும்',

    // Worker View
    workerTitle: 'பணியாளர் பணி மையம்',
    upcomingAssignments: 'வரவிருக்கும் ஒதுக்கப்பட்ட பணிகள்',
    noUpcomingAssignments: 'தற்போது எந்தப் பணிகளும் ஒதுக்கப்படவில்லை.',
    nextShiftTitle: 'உங்கள் அடுத்த வரவிருக்கும் பணி',
    viewDetails: 'விவரங்களைப் பார்க்கவும்',
    shiftDuration: 'பணி நேரம்',
    unpaidBreak: 'ஊதியமில்லா இடைவேளை',
    shiftSupervisor: 'தள மேற்பார்வையாளர்',
    shiftLocation: 'இடம்',
    hoursShort: 'மணி',
    minsShort: 'நிமிடம்',
    availabilityTitle: 'கிடைக்கும் நேரம் & விருப்பங்கள்',
    availabilityDesc: 'நீங்கள் பணிபுரியத் தயாராக இருக்கும் நேரங்களையும் விருப்பங்களையும் குறிப்பிடவும். உங்கள் குறைந்தபட்ச ஓய்வு நேரம் மதிக்கப்படும்.',
    addInterval: 'கிடைக்கும் நேரத்தைச் சேர்க்கவும்',
    addPreferredInterval: 'விருப்பமான நேரத்தைச் சேர்க்கவும்',
    saveAvailability: 'நேரத்தைச் சேமிக்கவும்',
    availabilitySaved: 'கிடைக்கும் நேரம் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டது.',
    earningsBreakdown: 'மதிப்பிடப்பட்ட ஊதியப் பகுப்பாய்வு',
    earningsDisclaimer: 'கணக்கீடுகள் நிறுவனக் கொள்கையை மட்டுமே பிரதிபலிக்கின்றன, இவை சட்டபூர்வ ஊதிய ஆலோசனையாகக் கருதப்படாது.',
    hourlyRate: 'அடிப்படை மணிநேரக் கட்டணம்',
    billableHours: 'ஊதியத்திற்குரிய மணிநேரம்',
    breakDeduction: 'இடைவேளை கழிவு',
    regularPay: 'வழக்கமான ஊதியம்',
    overtimePay: 'கூடுதல் நேர ஊதியம் (OT)',
    totalPay: 'மொத்த எதிர்பார்க்கப்படும் ஊதியம்',
    workedHoursEarnings: 'வேலை செய்த மணிநேர ஊதியம்',
    approvedAdjustments: 'நிறுவனத்தால் அங்கீகரிக்கப்பட்ட சரிசெய்தல்',
    totalProjectedIncome: 'மொத்த எதிர்பார்க்கப்படும் வருமானம்',
    proposalResponseTitle: 'அட்டவணை மாற்றங்களை மறுபரிசீலனை செய்க',
    noPendingProposals: 'தற்போது உங்கள் மதிப்பாய்விற்காக எந்த அட்டவணை மாற்றங்களும் இல்லை.',
    acceptSchedule: 'முன்மொழிவை ஏற்கவும்',
    requestAdjustment: 'சரிசெய்தல் கோரிக்கை',
    declineSchedule: 'முன்மொழிவை நிராகரிக்கவும்',
    declineNotice: 'மாற்றத்தை நிராகரிப்பது உங்கள் நற்பெயரையோ ஒழுங்கு நடவடிக்கைகளையோ எந்த வகையிலும் பாதிக்காது.',
    optionalCommentLabel: 'விருப்பமான கருத்து (தனிப்பட்ட காரணங்கள் தேவையில்லை)',
    optionalCommentPlaceholder: 'பணி தொடர்பான குறிப்புகளை உள்ளிடவும் அல்லது காலியாக விடவும்...',
    proposalChangeOld: 'முந்தைய பணி ஒதுக்கீடு',
    proposalChangeNew: 'முன்மொழியப்பட்ட புதிய பணி',
    proposalPayDelta: 'ஊதிய வேறுபாடு',
    proposalRestInterval: 'பணிக்கு முந்தைய ஓய்வு நேரம்',
    proposalReason: 'தெளிவான விளக்கம்',

    // Absence Flagging
    flagAbsenceTitle: 'பணிக்கு வர இயலாமையைத் தெரிவிக்கவும்',
    flagAbsenceDesc: 'வரவிருக்கும் பணியில் கலந்து கொள்ள இயலாவிட்டால் முன்னரே தெரிவிக்கவும். நிர்வாகம் மாற்று ஏற்பாட்டை மேற்கொள்ளும் வரை அட்டவணை பாதுகாக்கப்படும்.',
    flagAbsenceBtn: 'விடுப்பைத் தெரிவிக்கவும்',
    flagAbsenceSuccess: 'எந்தவித அபராதமும் இன்றி விடுப்பு பதிவு செய்யப்பட்டது. நிர்வாகம் மாற்று அட்டவணையைத் தயாரிக்கும்.',

    // Attendance Clocking
    attendanceTitle: 'பணி வருகை & பதிவு செய்யப்பட்ட நேரம்',
    attendanceDesc: 'பணியைத் தொடங்கும்போது உள்நுழையவும் மற்றும் முடிக்கும்போது வெளியேறவும். சர்வர் நேரம் துல்லியமாகப் பயன்படுத்தப்படுகிறது.',
    clockInBtn: 'பணியைத் தொடங்குக (Clock In)',
    clockOutBtn: 'பணியை முடிக்கவும் (Clock Out)',
    clockInSuccess: 'பணி தொடக்கம் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது.',
    clockOutSuccess: 'பணி முடிவு பதிவு செய்யப்பட்டு ஊதியம் கணக்கிடப்பட்டது.',
    inProgressSession: 'தற்போது நடைபெறும் பணி',
    completedSessions: 'பதிவு செய்யப்பட்ட பணி வரலாறு',
    projectedVsActualPay: 'எதிர்பார்க்கப்பட்ட vs உண்மையான ஊதியம்',
    projectedPayLabel: 'திட்டமிடப்பட்ட வேலை ஊதியம்',
    recordedPayLabel: 'பதிவு செய்யப்பட்ட நேர ஊதியம்',
    paidAdjustmentLabel: 'நிறுவன ஊதியச் சரிசெய்தல்',
    adjustmentDisclaimer: 'ஊதியச் சரிசெய்தல் என்பது வெளிப்படைத்தன்மைக்காக நிறுவனத்தால் வழங்கப்படும் தன்னார்வச் சரிசெய்தல் ஆகும்.',
    raiseDiscrepancy: 'வருகைப் பதிவில் முரண்பாட்டைத் தெரிவிக்கவும்',
    attendanceCorrectionTitle: 'பணி நேரப் பதிவைத் திருத்தவும்',
    correctionReasonLabel: 'திருத்தத்திற்கான காரணம் (கட்டாயம்)',
    saveCorrectionBtn: 'சரிபார்க்கப்பட்ட நேரத்தைச் சேமிக்கவும்',

    // Employer Workbench & Overview
    employerTitle: 'நிர்வாகப் பணியாளர் பணிமேடை',
    welcomeEmployer: 'பணியாளர் மேலாண்மை மற்றும் சுழற்சி கண்ணோட்டம்',
    rosterMatrixTitle: 'வாராந்திர பணித் தேவை மற்றும் ஒதுக்கீடு அட்டவணை',
    headcountFilled: 'நிரப்பப்பட்ட பணியிடங்கள்',
    conflictsTitle: 'விதிமீறல்கள் மற்றும் ஓய்வு இடைவெளிச் சிக்கல்கள்',
    noConflicts: 'அனைத்து ஒதுக்கீடுகளும் குறைந்தபட்ச ஓய்வு மற்றும் தகுதி விதிகளுக்கு உட்பட்டுள்ளன.',
    optimizeButton: 'FairShift உகப்பாக்கலை இயக்கவும்',
    optimizing: 'ஓய்வு இடைவெளிகளை மதிப்பீடு செய்து பணிகள் சமன் செய்யப்படுகின்றன...',
    tradeOffTitle: 'விளைவுகள் ஒப்பீடு (தற்போதைய vs முன்மொழியப்பட்ட)',
    baseRosterCol: 'தற்போதைய அட்டவணை',
    proposedRosterCol: 'FairShift முன்மொழியப்பட்ட அட்டவணை',
    varianceCol: 'விளைவு வேறுபாடு',
    createProposalBtn: 'முன்மொழிவுத் திட்டத்தை உருவாக்கு',
    publishToWorkers: 'பணியாளர்களின் ஒப்புதலுக்கு அனுப்புக',
    proposalPublished: 'முன்மொழிவு சம்பந்தப்பட்ட பணியாளர்களுக்கு அனுப்பப்பட்டது.',
    finaliseRoster: 'அட்டவணையை இறுதி செய்க',
    rosterFinalised: 'அட்டவணை இறுதி செய்யப்பட்டு தணிக்கைப் பதிவில் சேர்க்கப்பட்டது.',
    staleProposalError: 'இந்த முன்மொழிவு பழைய அட்டவணையை அடிப்படையாகக் கொண்டது. பணிமேடையைப் புதுப்பிக்கவும்.',
    declineBlockNotice: 'இறுதி செய்ய முடியாது: ஒன்று அல்லது அதற்கு மேற்பட்ட பணியாளர்கள் முன்மொழிவை நிராகரித்துள்ளனர்.',
    unfilledShifts: 'நிரப்பப்படாத பணியிடங்கள்',
    assignedPositions: 'ஒதுக்கப்பட்ட பணியிடங்கள்',
    requiredPositions: 'தேவையான பணியிடங்கள்',
    proposalsAwaitingResponse: 'பதிலுக்காகக் காத்திருக்கும் முன்மொழிவுகள்',
    restViolations: 'ஓய்வு இடைவெளி மீறல்கள்',
    totalLaborCost: 'மொத்த தொழிலாளர் ஊதியச் செலவு',
    budgetCap: 'நிறுவன வரவுசெலவு வரம்பு',
    preferenceMatchRate: 'விருப்பப் பொருத்தம்',
    overtimeHoursTotal: 'கூடுதல் பணி நேரம் (OT)',
    absenceRepairTitle: 'விடுப்பு மாற்றுப் பணிமேடை',
    repairShiftBtn: 'மாற்று அட்டவணையை உருவாக்கு',
    proposeAdjustmentBtn: 'ஊதியச் சரிசெய்தலை முன்மொழிக',
    needsAttentionTitle: 'கவனிக்கப்பட வேண்டியவை',
    noPendingItems: 'அவசர நடவடிக்கை தேவைப்படும் எந்தச் சிக்கல்களும் இல்லை.',
    coverageChartTitle: 'பணியாளர் ஒதுக்கீடு பகுப்பாய்வு',
    earningsChartTitle: 'மதிப்பிடப்பட்ட ஊதிய ஒப்பீடு (அடிப்படை vs முன்மொழிவு)',
    nightDutyChartTitle: 'இரவுப் பணிப் பகிர்வு (22:00 - 06:30 IST)',
    caseStatusChartTitle: 'பணியாளர் புகார்கள் நிலை விவரம்',

    // Proposal Status Badges
    statusDraft: 'வரைவு (DRAFT)',
    statusAwaitingWorker: 'பணியாளர் ஒப்புதலுக்கு (AWAITING WORKER)',
    statusReadyToFinalise: 'இறுதி செய்யத் தயார் (READY TO FINALISE)',
    statusFinalised: 'இறுதி செய்யப்பட்டது (FINALISED)',
    statusDeclined: 'நிராகரிக்கப்பட்டது (DECLINED)',
    statusCancelled: 'ரத்து செய்யப்பட்டது (CANCELLED)',
    statusConfirmed: 'உறுதி செய்யப்பட்டது (CONFIRMED)',
    statusOpen: 'திறக்கப்பட்டது (OPEN)',
    statusUnderReview: 'பரிசீலனையில் (UNDER REVIEW)',
    statusResolved: 'தீர்க்கப்பட்டது (RESOLVED)',

    // Cases & Worker Concerns
    reportCaseTitle: 'பணியாளர் புகார் அல்லது உரிமை மீறல் அறிக்கை',
    caseCategory: 'சிக்கலின் வகை',
    caseDescription: 'புகார் விளக்கம்',
    submitCase: 'புகாரைச் சமர்ப்பிக்கவும்',
    caseSubmitted: 'புகார் பதிவு செய்யப்பட்டு தணிக்கை வரலாற்றில் சேர்க்கப்பட்டது.',
    categoryPay: 'ஊதியம் & கட்டண முரண்பாடுகள்',
    categorySafety: 'பணிதளப் பாதுகாப்பு & சூழல்',
    categoryScheduling: 'பணி நேரம் & ஓய்வு இடைவெளி மீறல்',
    categoryOther: 'பொதுவான பணியிடக் கேள்வி',
    reportIdentified: 'அடையாளத்துடன் சமர்ப்பிக்கவும்',
    reportIdentityHidden: 'அடையாளத்தை மறைத்து சமர்ப்பிக்கவும் (தனிப்பட்ட டோக்கன்)',
    identityHiddenNotice: 'உங்கள் பயனர் கணக்கு அல்லது பெயர் இணைக்கப்படாது. உங்களுக்கு ஒரு தனிப்பட்ட டோக்கன் வழங்கப்படும். ஆனால் உள்ளடக்க விவரங்கள் அடையாளத்தைக் குறிக்கக்கூடும். முழுமையான பெயர் தெரியாமைக்கு உத்தரவாதம் இல்லை.',
    trackingTokenLabel: 'உங்கள் தனிப்பட்ட கண்காணிப்பு டோக்கன்',
    trackingTokenHelp: 'இந்த டோக்கனைப் பாதுகாப்பாகச் சேமிக்கவும். நிலையை அறிய அல்லது வழக்கை மீண்டும் திறக்க இது கட்டாயம் தேவை. இதன் மறைமுக SHA-256 குறியீடு மட்டுமே சேமிக்கப்படுகிறது.',
    copyTokenBtn: 'டோக்கனை நகலெடுக்கவும்',
    tokenCopied: 'டோக்கன் நகலெடுக்கப்பட்டது!',
    trackExistingCase: 'ரகசியப் புகாரைக் கண்காணிக்கவும்',
    enterTrackingToken: '32-எழுத்து ரகசிய டோக்கனை உள்ளிடவும்...',
    findCaseBtn: 'புகாரைத் தேடவும்',
    noMatchingCase: 'இந்த டோக்கனுக்குரிய புகார் எதுவும் கிடைக்கவில்லை.',
    reopenCaseBtn: 'வழக்கை மீண்டும் திறக்கவும்',
    reopenReasonPrompt: 'வழக்கை மீண்டும் திறப்பதற்கான காரணம்...',
    caseStatusLabel: 'தற்போதைய நிலை',
    caseHistoryTitle: 'வழக்கு நடவடிக்கை வரலாறு',
    statusSubmitted: 'சமர்ப்பிக்கப்பட்டது (SUBMITTED)',
    statusAcknowledged: 'ஏற்கப்பட்டது (ACKNOWLEDGED)',
    statusActionUnderway: 'நடவடிக்கை தொடங்கப்பட்டது (ACTION UNDERWAY)',
    statusResolutionProposed: 'தீர்வு முன்மொழியப்பட்டது (RESOLUTION PROPOSED)',
    statusClosed: 'முடிக்கப்பட்டது (CLOSED)',
    actionNoteLabel: 'நடவடிக்கைக் குறிப்பு (தீர்வுக்குக் கட்டாயம்)',
    actionNotePlaceholder: 'விசாரணை மற்றும் தீர்வு நடவடிக்கைகளை விவரிக்கவும்...',
    actionNoteRequired: 'வழக்கைத் தீர்க்க அல்லது முடிக்க நடவடிக்கை விளக்கம் கட்டாயம் தேவை.',
    emergencyHelpNotice: 'உடனடி உடல் ஆபத்து அல்லது அவசரப் பாதுகாப்புச் சூழல் ஏற்பட்டால், உடனடியாக தளப் பாதுகாப்பு அதிகாரிகளை அணுகவும் அல்லது அவசர உதவிக்கு 112-ஐ அழைக்கவும்.',
    aiUrgencySuggested: 'செயற்கை நுண்ணறிவு அவசர பரிந்துரை மட்டுமே — அவசரக்கால உத்தரவாதம் அல்ல.',

    // Voice & Speech Features
    voiceInputTitle: 'குரல் வழி உள்ளீடு (Voice Input)',
    voiceLanguageSelect: 'குரல் மொழி',
    voiceStart: 'பேசத் தொடங்குங்கள்',
    voiceStop: 'பதிவை நிறுத்துங்கள்',
    voiceListening: 'கேட்கிறது... மைக்ரோஃபோனில் தெளிவாகப் பேசுங்கள்.',
    voiceDenied: 'மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. உலாவியில் மைக்ரோஃபோன் அனுமதியை வழங்கவும்.',
    voiceUnsupported: 'இந்த உலாவியில் குரல் உள்ளீட்டு வசதி ஆதரிக்கப்படவில்லை. விசைப்பலகையைப் பயன்படுத்தவும்.',
    voiceEditableTranscript: 'பதிவு செய்யப்பட்ட உரை (திருத்தக்கூடியது):',
    voiceApplyTranscript: 'இந்த உரையைப் பயன்படுத்தவும்',
    voiceCloudNotice: 'குரல் அறிதல் சேவை சாதனம் மற்றும் கிளவுட் சேவைகளைப் பயன்படுத்துகிறது. இது முழுமையாக ஆஃப்லைனில் இயங்காது.',
    readAloud: 'உரையை வாசிக்கவும் (Read Aloud)',
    stopReading: 'வாசிப்பை நிறுத்தவும்',
    readingInProgress: 'வாசிக்கப்படுகிறது...',
    voiceUnavailableNotice: 'தேர்ந்தெடுக்கப்பட்ட மொழிக்கான குரல் இந்த சாதனத்தில் கிடைக்கவில்லை. சாதனத்தின் குரல் அமைப்பில் தமிழ் கிடைக்கவில்லை.',

    // AI Assistant Features
    aiAssistantTitle: 'FairShift பன்மொழி உதவியாளர்',
    aiNaturalStaffingTitle: 'இயல்பு மொழி பணியாளர் தேவை பகுப்பாய்வு',
    aiStaffingPromptPlaceholder: 'எ.கா., நாளை காலை 8 மணி முதல் மாலை 4:30 வரை 4 துப்புரவுப் பணியாளர்களும், மதியம் 2 மணி முதல் 2 மேற்பார்வையாளர்களும் தேவை...',
    aiParseBtn: 'பணித் தேவைகளாகப் பிரிக்கவும்',
    aiParsing: 'பணியாளர் தேவைகள் பகுப்பாய்வு செய்யப்படுகின்றன...',
    aiReviewParsed: 'பிரித்தெடுக்கப்பட்ட தேவைகளைச் சரிபார்க்கவும்:',
    aiConfirmShifts: 'உறுதி செய்து பட்டியலில் சேர்க்கவும்',
    aiMissingFields: 'கைமுறையாக உள்ளிட வேண்டிய புலங்கள்',
    aiTranslateConcernTitle: 'இருமொழி மொழிபெயர்ப்பு & பகுப்பாய்வு',
    aiTranslateBtn: 'மொழிபெயர்த்துப் பகுப்பாய்வு செய்க',
    aiTranslating: 'மொழிபெயர்க்கப்படுகிறது...',
    aiOriginalText: 'பணியாளரின் அசல் உரை',
    aiTranslatedText: 'மொழிபெயர்க்கப்பட்ட உரை (திருத்தக்கூடியது)',
    aiTranslationUnavailable: 'செயற்கை நுண்ணறிவு சேவை தற்காலிகமாக இல்லை. அசல் உரை நேரடியாகச் சமர்ப்பிக்கப்படுகிறது.',
    aiExplainPlanBtn: 'திட்ட விளைவுகள் மற்றும் ஓய்வு சமநிலையை விளக்குக',
    aiExplainingPlan: 'விளக்கம் தயாரிக்கப்படுகிறது...',
    aiPlanExplanationTitle: 'FairShift எளிய மொழி திட்ட விளக்கம்',
    aiRestAnalysis: 'ஓய்வு இடைவெளி இணக்கம்',
    aiBudgetAnalysis: 'ஊதிய வரவுசெலவு தாக்கம்',
    aiFairnessNote: 'பணியாளர் சமநிலை மற்றும் பகிர்வு',

    // Violations
    violation_insufficient_rest: 'தொடர்ச்சியான பணிகளுக்கு இடையே போதுமான ஓய்வு இல்லை (<11 மணி)',
    violation_window_excess: 'பணி நேர வரம்பு தாண்டப்பட்டது',
    violation_missing_qualification: 'தேவையான பயிற்சிச் சான்றிதழ் இல்லை',
    violation_double_booked: 'ஒரே நேரத்தில் இரண்டு பணிகள் ஒதுக்கப்பட்டுள்ளன',
    warning_unavailability_clash: 'பணியாளர் இல்லாத நேரத்தில் பணி ஒதுக்கப்பட்டுள்ளது',

    // Metrics
    metric_unfilled_headcount: 'நிரப்பப்படாத பணியிடங்கள்',
    metric_rest_violations: 'ஓய்வு இடைவெளி மீறல்கள் (<11 மணி)',
    metric_overtime_hours: 'கூடுதல் பணி நேரம் (OT)',
    metric_labor_cost: 'மொத்த தொழிலாளர் ஊதியச் செலவு (பைசா)',
    metric_availability_match: 'விருப்பப் பொருத்தம் %',

    // Privacy & Terms
    privacyTitle: 'தனியுரிமைக் கொள்கை',
    termsTitle: 'பயன்பாட்டு விதிமுறைகள் & மாதிரி தள அறிவிப்பு',
    privacyStoredDataTitle: 'சேமிக்கப்படும் தரவு மற்றும் கட்டமைப்பு',
    privacyStoredDataBody: 'FairShift நிறுவனத்தின் கட்டமைப்பு, பணித் தேவைகள், ஒதுக்கீடுகள், சரிபார்க்கப்பட்ட வருகை நேரங்கள் மற்றும் முழு பைசா ஊதியக் கணக்குகளைச் சேமிக்கிறது. தரவு கடுமையான நிறுவன வரம்புகளுக்குள் பாதுகாக்கப்படுகிறது.',
    privacyAiTitle: 'AI மற்றும் குரல் செயலாக்க வெளிப்படைத்தன்மை',
    privacyAiBody: 'AI உதவியாளர் பாதுகாப்பான சர்வர் வழியாக மட்டுமே இயங்குகிறது. உலாவி குறியீட்டில் எந்த ரகசிய சாவிகளும் இல்லை. அட்டவணை விளக்கங்களுக்குத் தொழிலாளர்களின் தனிப்பட்ட பெயர்கள் எதுவும் அனுப்பப்படாமல், கூட்டு எண்கள் மட்டுமே அனுப்பப்படுகின்றன. குரல் உள்ளீடு சாதனத்தின் உலாவி சேவைகளைப் பயன்படுத்துகிறது.',
    privacyDemoTitle: 'மாதிரி தளம் மற்றும் தனிமைப்படுத்தல்',
    privacyDemoBody: 'பொது மாதிரி தளம் மாதிரிப் பணியாளர்கள் மற்றும் பணிகளுடன் தனிமைப்படுத்தப்பட்ட நினைவகத்தில் இயங்குகிறது. இதில் செய்யப்படும் மாற்றங்கள் உண்மையான தரவுத்தளத்தைப் பாதிக்காது.',
    privacyRetentionTitle: 'தரவுத் தக்கவைப்பு மற்றும் சட்டப்பூர்வ மறுப்பு',
    privacyRetentionBody: 'FairShift என்பது SDG 8 நோக்கத்திற்காக உருவாக்கப்பட்ட ஒரு மாதிரி மென்பொருள் ஆகும். இதில் உள்ள ஊதியக் கணக்கீடுகள் சட்டப்பூர்வ சான்றிதழ்கள் அல்லது உறுதிமொழிகளாகக் கருதப்படாது.',
    closeBtn: 'மூடு',

    // Common
    loading: 'ஏற்றுகிறது...',
    retry: 'மீண்டும் முயல்க',
    cancel: 'ரத்து செய்க',
    save: 'சேமி',
    edit: 'திருத்து',
    delete: 'நீக்கு',
    errorTitle: 'செயல்பாட்டுப் பிழை',
    timeDisplayNotice: 'அனைத்து நேரங்களும் ஆசிய/கொல்கத்தா (IST) நேரப்படி காட்டப்படுகின்றன; UTC-ல் சேமிக்கப்படுகின்றன.',
    languageToggle: 'English (ஆங்கிலம்)',
  },
};

// Intl Currency Formatter (integer paise to INR Rupees)
export function formatCurrency(paise: number, lang: Language = 'en'): string {
  const rupees = (paise || 0) / 100;
  const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// Intl Date & Time Formatter in Asia/Kolkata timezone
export function formatDateTime(
  dateOrIso: string | Date,
  lang: Language = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateOrIso) return '';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';
  const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  return new Intl.DateTimeFormat(locale, defaultOpts).format(date);
}

export function formatDate(dateOrIso: string | Date, lang: Language = 'en'): string {
  if (!dateOrIso) return '';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';
  const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(dateOrIso: string | Date, lang: Language = 'en'): string {
  if (!dateOrIso) return '';
  const date = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
  if (isNaN(date.getTime())) return '';
  const locale = lang === 'ta' ? 'ta-IN' : 'en-IN';
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => TRANSLATIONS.en[key] || (key as string),
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('fairshift_lang');
      return saved === 'ta' ? 'ta' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('fairshift_lang', lang);
    } catch {
      // ignore
    }
  };

  // Safe translation function: never displays bare untranslated key if a translated fallback exists
  const t = (key: keyof typeof TRANSLATIONS['en']): string => {
    const dict = TRANSLATIONS[language];
    if (dict && (dict as Record<string, string>)[key]) {
      return (dict as Record<string, string>)[key];
    }
    if (TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  return useContext(I18nContext);
}
