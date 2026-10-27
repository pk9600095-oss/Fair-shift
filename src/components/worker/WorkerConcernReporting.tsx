/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useI18n, formatDateTime } from '../../i18n/translations.tsx';
import { useAuth } from '../../auth/AuthContext.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { VoiceSpeechAssistant } from '../voice/VoiceSpeechAssistant.tsx';
import { CaseReport, CaseCategory, UrgencyLevel, CaseStatus } from '../../domain/types.ts';

interface WorkerConcernReportingProps {
  onCaseSubmitted?: (caseReport: CaseReport) => void;
}

export const WorkerConcernReporting: React.FC<WorkerConcernReportingProps> = ({
  onCaseSubmitted,
}) => {
  const { t, language } = useI18n();
  const { sandboxData, activeSandboxWorker, selectedIndustry } = useAuth();

  // Mode: 'new_report' | 'track_report'
  const [activeTab, setActiveTab] = useState<'new_report' | 'track_report'>('new_report');

  // New report form state
  const [isIdentityHidden, setIsIdentityHidden] = useState<boolean>(false);
  const [category, setCategory] = useState<CaseCategory>('SCHEDULING');
  const [originalText, setOriginalText] = useState<string>('');
  const [inputLang, setInputLang] = useState<'en' | 'ta'>('ta');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [suggestedUrgency, setSuggestedUrgency] = useState<UrgencyLevel>('MEDIUM');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [hasTranslated, setHasTranslated] = useState<boolean>(false);
  const [isAiUnavailable, setIsAiUnavailable] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [receivedToken, setReceivedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState<boolean>(false);

  // Track existing report state
  const [trackingTokenInput, setTrackingTokenInput] = useState<string>('');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [trackedCase, setTrackedCase] = useState<CaseReport | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [reopenNote, setReopenNote] = useState<string>('');
  const [isReopening, setIsReopening] = useState<boolean>(false);

  // AI Translation & Structuring
  const handleTranslateAndStructure = async () => {
    if (!originalText.trim()) return;
    setIsTranslating(true);
    setIsAiUnavailable(false);

    try {
      const targetLang = language === 'ta' ? 'en' : 'ta';
      const res = await fetch('/api/ai/translate-concern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText.trim(),
          targetLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setTranslatedText(data.translatedText || originalText);
      if (data.suggestedCategory) {
        setCategory(data.suggestedCategory);
      }
      if (data.suggestedUrgency) {
        setSuggestedUrgency(data.suggestedUrgency);
      }
      setIsAiUnavailable(Boolean(data.isAiUnavailable));
      setHasTranslated(true);
    } catch (err) {
      setIsAiUnavailable(true);
      setTranslatedText(originalText);
      setHasTranslated(true);
    } finally {
      setIsTranslating(false);
    }
  };

  // Submit report
  const handleSubmitReport = async () => {
    if (!originalText.trim()) return;
    setIsSubmitting(true);
    setSubmitSuccess(null);
    setReceivedToken(null);

    try {
      const payload = {
        sessionId: 'judge-default-session',
        industry: selectedIndustry,
        category,
        originalText: originalText.trim(),
        originalLanguage: inputLang,
        translatedText: translatedText.trim() || undefined,
        translatedLanguage: inputLang === 'en' ? 'ta' : 'en',
        suggestedUrgency,
        workerId: isIdentityHidden ? undefined : activeSandboxWorker?.id,
        workerDisplayName: isIdentityHidden ? undefined : activeSandboxWorker?.displayName,
        isIdentityHidden,
      };

      const res = await fetch('/api/cases/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmitSuccess(t('caseSubmitted'));
      if (data.privateTrackingToken) {
        setReceivedToken(data.privateTrackingToken);
      }

      // Reset form fields
      setOriginalText('');
      setTranslatedText('');
      setHasTranslated(false);

      if (onCaseSubmitted) {
        onCaseSubmitted(data.caseReport);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Track confidential report by token
  const handleTrackByToken = async () => {
    if (!trackingTokenInput.trim()) return;
    setIsTracking(true);
    setTrackError(null);
    setTrackedCase(null);

    try {
      const res = await fetch(
        `/api/cases/track?token=${encodeURIComponent(trackingTokenInput.trim())}&industry=${selectedIndustry}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || t('noMatchingCase'));
      }
      setTrackedCase(data.caseReport);
    } catch (err) {
      setTrackError((err as Error).message);
    } finally {
      setIsTracking(false);
    }
  };

  // Reopen report by reporter
  const handleReopenCase = async () => {
    if (!trackedCase || !reopenNote.trim()) return;
    setIsReopening(true);

    try {
      const res = await fetch('/api/cases/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          caseId: trackedCase.id,
          nextStatus: 'ACTION_UNDERWAY',
          actionNote: reopenNote.trim(),
          actorRole: 'worker',
          actorId: activeSandboxWorker?.id || 'reporter',
          trackingToken: trackingTokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reopen case');
      }

      setTrackedCase(data.caseReport);
      setReopenNote('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsReopening(false);
    }
  };

  const copyTokenToClipboard = () => {
    if (receivedToken) {
      navigator.clipboard.writeText(receivedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Emergency Notice Header */}
      <div className="p-3 border border-[#F4CF57] bg-[#FFFBF0] text-xs text-[#5C4500] rounded-xs flex items-start gap-2">
        <span className="font-bold text-sm">⚠️</span>
        <div className="space-y-0.5">
          <p className="font-semibold">{t('emergencyHelpNotice')}</p>
          <p className="text-[11px] text-[#785E00]">
            {t('aiUrgencySuggested')}
          </p>
        </div>
      </div>

      {/* Tabs: New Concern vs Track Existing */}
      <div className="flex border-b border-[#D3CEBE] text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('new_report')}
          className={`px-4 py-2 border-b-2 cursor-pointer ${
            activeTab === 'new_report'
              ? 'border-[#00796B] text-[#00796B]'
              : 'border-transparent text-[#525950] hover:text-[#1D2926]'
          }`}
        >
          {t('reportCaseTitle')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('track_report')}
          className={`px-4 py-2 border-b-2 cursor-pointer ${
            activeTab === 'track_report'
              ? 'border-[#00796B] text-[#00796B]'
              : 'border-transparent text-[#525950] hover:text-[#1D2926]'
          }`}
        >
          {t('trackExistingCase')}
        </button>
      </div>

      {activeTab === 'new_report' ? (
        <div className="border border-[#D3CEBE] bg-[#FAF8F5] p-4 rounded-xs space-y-4">
          {/* Identity Mode Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#1D2926]">
              Reporting Identity Option:
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="flex items-center gap-2 text-xs p-2.5 border rounded-xs cursor-pointer bg-[#FFFFFF] flex-1">
                <input
                  type="radio"
                  name="identityMode"
                  checked={!isIdentityHidden}
                  onChange={() => setIsIdentityHidden(false)}
                />
                <div>
                  <div className="font-semibold text-[#1D2926]">
                    {t('reportIdentified')}
                  </div>
                  <div className="text-[11px] text-[#525950]">
                    Linked to your profile: {activeSandboxWorker?.displayName || 'Active Worker'}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs p-2.5 border rounded-xs cursor-pointer bg-[#FFFFFF] flex-1">
                <input
                  type="radio"
                  name="identityMode"
                  checked={isIdentityHidden}
                  onChange={() => setIsIdentityHidden(true)}
                />
                <div>
                  <div className="font-semibold text-[#00796B]">
                    {t('reportIdentityHidden')}
                  </div>
                  <div className="text-[11px] text-[#525950]">
                    No account ID linked; private tracking token provided
                  </div>
                </div>
              </label>
            </div>

            {isIdentityHidden && (
              <div className="p-2.5 bg-[#F0F5F3] border border-[#00796B] text-xs text-[#00796B] rounded-xs">
                {t('identityHiddenNotice')}
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <label htmlFor="case-category" className="text-xs font-semibold text-[#1D2926]">
              {t('caseCategory')}:
            </label>
            <select
              id="case-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CaseCategory)}
              className="w-full text-xs p-2 border border-[#D3CEBE] rounded-xs bg-[#FFFFFF] text-[#1D2926]"
            >
              <option value="PAY">{t('categoryPay')}</option>
              <option value="SAFETY">{t('categorySafety')}</option>
              <option value="SCHEDULING">{t('categoryScheduling')}</option>
              <option value="OTHER">{t('categoryOther')}</option>
            </select>
          </div>

          {/* Worker Original Text Input + Voice Assistant */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="concern-text" className="text-xs font-semibold text-[#1D2926]">
                {t('aiOriginalText')} (English or தமிழ்):
              </label>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] text-[#525950]">Input Lang:</span>
                <select
                  value={inputLang}
                  onChange={(e) => setInputLang(e.target.value as 'en' | 'ta')}
                  className="bg-[#FFFFFF] border border-[#D3CEBE] text-[11px] px-1.5 py-0.5 rounded-xs"
                >
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <textarea
              id="concern-text"
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              rows={4}
              placeholder="Describe your concern or issue in detail. You can speak or type in Tamil or English..."
              className="w-full text-xs p-2.5 border border-[#D3CEBE] rounded-xs bg-[#FFFFFF] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-[#00796B]"
            />

            {/* Voice Speech Recognition & Synthesis Component */}
            <VoiceSpeechAssistant
              onApplyTranscript={(text) =>
                setOriginalText((prev) => (prev ? `${prev} ${text}` : text))
              }
              textToReadAloud={originalText}
              defaultLang={inputLang === 'ta' ? 'ta-IN' : 'en-IN'}
            />

            {/* AI Translate & Structure Button */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-[#727A6F]">
                Translate into {language === 'ta' ? 'English' : 'Tamil'} to review both before sending.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTranslateAndStructure}
                disabled={!originalText.trim() || isTranslating}
              >
                {isTranslating ? t('aiTranslating') : t('aiTranslateBtn')}
              </Button>
            </div>
          </div>

          {/* AI Translation Unavailable Notification */}
          {isAiUnavailable && (
            <div className="p-2 border border-[#F4CF57] bg-[#FFFBF0] text-xs text-[#5C4500] rounded-xs">
              {t('aiTranslationUnavailable')}
            </div>
          )}

          {/* Reviewed Translated Text (Editable before submit) */}
          {hasTranslated && (
            <div className="border-t border-[#D3CEBE] pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#00796B]">
                  {t('aiTranslatedText')}:
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-[#525950]">Suggested Urgency:</span>
                  <Badge
                    variant={
                      suggestedUrgency === 'HIGH'
                        ? 'rust'
                        : suggestedUrgency === 'MEDIUM'
                        ? 'yellow'
                        : 'neutral'
                    }
                  >
                    {suggestedUrgency}
                  </Badge>
                </div>
              </div>

              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 border border-[#00796B] rounded-xs bg-[#FFFFFF] text-[#1D2926]"
              />

              <VoiceSpeechAssistant
                onApplyTranscript={(text) =>
                  setTranslatedText((prev) => (prev ? `${prev} ${text}` : text))
                }
                textToReadAloud={translatedText}
              />
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D3CEBE]">
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitReport}
              disabled={!originalText.trim() || isSubmitting}
            >
              {isSubmitting ? t('loading') : t('submitCase')}
            </Button>
          </div>

          {/* Success & Private Tracking Token Presentation */}
          {submitSuccess && (
            <div className="p-3 border border-[#00796B] bg-[#E2ECE9] text-xs text-[#00796B] rounded-xs space-y-2">
              <div className="font-bold">{submitSuccess}</div>

              {receivedToken && (
                <div className="p-3 border border-[#1D2926] bg-[#FFFFFF] text-[#1D2926] rounded-xs space-y-2">
                  <div className="font-bold text-xs text-[#A63D24]">
                    ⚠️ {t('trackingTokenLabel')}
                  </div>
                  <p className="text-[11px] text-[#525950]">
                    {t('trackingTokenHelp')}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={receivedToken}
                      className="font-mono text-xs bg-[#FAF8F5] p-2 border border-[#D3CEBE] rounded-xs flex-1 select-all"
                    />
                    <Button variant="secondary" size="sm" onClick={copyTokenToClipboard}>
                      {tokenCopied ? t('tokenCopied') : t('copyTokenBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Track Existing Confidential Report Tab */
        <div className="border border-[#D3CEBE] bg-[#FAF8F5] p-4 rounded-xs space-y-4">
          <div className="space-y-1">
            <label htmlFor="tracking-token-input" className="text-xs font-semibold text-[#1D2926]">
              {t('trackExistingCase')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tracking-token-input"
                type="text"
                value={trackingTokenInput}
                onChange={(e) => setTrackingTokenInput(e.target.value)}
                placeholder={t('enterTrackingToken')}
                className="text-xs p-2 border border-[#D3CEBE] rounded-xs flex-1 font-mono bg-[#FFFFFF]"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleTrackByToken}
                disabled={!trackingTokenInput.trim() || isTracking}
              >
                {isTracking ? t('loading') : t('findCaseBtn')}
              </Button>
            </div>
          </div>

          {trackError && (
            <div className="p-2 border border-[#A63D24] bg-[#FDF3F1] text-xs text-[#A63D24] rounded-xs">
              {trackError}
            </div>
          )}

          {trackedCase && (
            <div className="border border-[#D3CEBE] bg-[#FFFFFF] p-4 rounded-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D3CEBE] pb-2">
                <div>
                  <span className="text-xs font-bold text-[#1D2926]">
                    Report ID: {trackedCase.id}
                  </span>
                  <div className="text-[11px] text-[#525950]">
                    Category: {trackedCase.category} • Submitted: {formatDateTime(trackedCase.createdAtUtc, language)}
                  </div>
                </div>
                <Badge
                  variant={
                    trackedCase.status === 'CLOSED'
                      ? 'neutral'
                      : trackedCase.status === 'RESOLUTION_PROPOSED'
                      ? 'teal'
                      : 'yellow'
                  }
                >
                  {trackedCase.status}
                </Badge>
              </div>

              {/* Original & Translated text */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-[#525950]">Original Statement:</span>
                  <p className="p-2 bg-[#FAF8F5] border border-[#D3CEBE] rounded-xs mt-0.5">
                    {trackedCase.originalText}
                  </p>
                </div>
                {trackedCase.translatedText && (
                  <div>
                    <span className="font-semibold text-[#525950]">Translation:</span>
                    <p className="p-2 bg-[#FAF8F5] border border-[#D3CEBE] rounded-xs mt-0.5">
                      {trackedCase.translatedText}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Note if Resolution Proposed or Closed */}
              {trackedCase.actionNote && (
                <div className="p-2.5 border border-[#00796B] bg-[#E2ECE9] rounded-xs text-xs space-y-1">
                  <span className="font-bold text-[#00796B]">Employer Action Note:</span>
                  <p className="text-[#1D2926]">{trackedCase.actionNote}</p>
                </div>
              )}

              {/* Case History Timeline */}
              {trackedCase.history && trackedCase.history.length > 0 && (
                <div className="space-y-1 border-t border-[#D3CEBE] pt-2">
                  <span className="text-xs font-semibold text-[#1D2926]">
                    {t('caseHistoryTitle')}:
                  </span>
                  <div className="space-y-1 text-[11px]">
                    {trackedCase.history.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-[#525950]">
                        <span className="font-mono text-[#00796B]">
                          {formatDateTime(h.timestampUtc, language, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          <strong>[{h.status}]</strong> {h.note || ''} ({h.actorRole})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reporter Reopen Option if Resolution Proposed or Closed */}
              {(trackedCase.status === 'RESOLUTION_PROPOSED' || trackedCase.status === 'CLOSED') && (
                <div className="border-t border-[#D3CEBE] pt-3 space-y-2">
                  <span className="text-xs font-bold text-[#A63D24]">
                    Unsatisfied with the outcome? Reopen this report:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={reopenNote}
                      onChange={(e) => setReopenNote(e.target.value)}
                      placeholder={t('reopenReasonPrompt')}
                      className="text-xs p-2 border border-[#D3CEBE] rounded-xs flex-1 bg-[#FAF8F5]"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleReopenCase}
                      disabled={!reopenNote.trim() || isReopening}
                    >
                      {isReopening ? t('loading') : t('reopenCaseBtn')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
