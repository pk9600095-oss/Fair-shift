/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useI18n, formatDateTime } from '../../i18n/translations.tsx';
import { useAuth } from '../../auth/AuthContext.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { CaseReport, CaseStatus } from '../../domain/types.ts';

interface EmployerCaseManagerProps {
  cases: CaseReport[];
  onCaseUpdated: (updatedCase: CaseReport) => void;
}

export const EmployerCaseManager: React.FC<EmployerCaseManagerProps> = ({
  cases,
  onCaseUpdated,
}) => {
  const { t, language } = useI18n();
  const { selectedIndustry } = useAuth();

  const [selectedCase, setSelectedCase] = useState<CaseReport | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTransition = async (nextStatus: CaseStatus) => {
    if (!selectedCase) return;

    if ((nextStatus === 'RESOLUTION_PROPOSED' || nextStatus === 'CLOSED') && !actionNote.trim()) {
      setErrorMessage(t('actionNoteRequired'));
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/cases/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: selectedIndustry,
          caseId: selectedCase.id,
          nextStatus,
          actionNote: actionNote.trim(),
          actorRole: 'employer',
          actorId: 'manager-demo',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update case');
      }

      onCaseUpdated(data.caseReport);
      setSelectedCase(data.caseReport);
      setActionNote('');
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D3CEBE] pb-2">
        <div>
          <h3 className="text-sm font-bold text-[#1D2926]">
            {t('navConcerns')} ({cases.length})
          </h3>
          <p className="text-xs text-[#525950]">
            Review worker concerns, safety alerts, and rest infringement reports. Action notes required for resolution.
          </p>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#525950] border border-[#D3CEBE] rounded-xs bg-[#FAF8F5]">
          No worker concerns or reports currently submitted.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Case List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {cases.map((c) => {
              const isSelected = selectedCase?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCase(c);
                    setErrorMessage(null);
                    setActionNote('');
                  }}
                  className={`p-3 border rounded-xs cursor-pointer transition-none ${
                    isSelected
                      ? 'border-[#00796B] bg-[#F0F5F3]'
                      : 'border-[#D3CEBE] bg-[#FFFFFF] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#1D2926]">
                      {c.category}
                    </span>
                    <Badge
                      variant={
                        c.status === 'CLOSED'
                          ? 'neutral'
                          : c.status === 'RESOLUTION_PROPOSED'
                          ? 'teal'
                          : c.status === 'ACTION_UNDERWAY'
                          ? 'blue'
                          : 'yellow'
                      }
                    >
                      {c.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#1D2926] mt-1.5 line-clamp-2">
                    {c.originalText}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#EAE6DC] text-[11px] text-[#525950]">
                    <span>
                      {c.isIdentityHidden
                        ? '🔒 Identity Hidden'
                        : `👤 ${c.workerDisplayName || 'Worker'}`}
                    </span>
                    <span>{formatDateTime(c.createdAtUtc, language, { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Case Details & Action Workflow */}
          <div className="border border-[#D3CEBE] bg-[#FFFFFF] p-4 rounded-xs space-y-4">
            {selectedCase ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#D3CEBE] pb-2">
                  <div>
                    <h4 className="text-xs font-bold text-[#1D2926]">
                      Report {selectedCase.id}
                    </h4>
                    <span className="text-[11px] text-[#525950]">
                      Submitted: {formatDateTime(selectedCase.createdAtUtc, language)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      selectedCase.status === 'CLOSED'
                        ? 'neutral'
                        : selectedCase.status === 'RESOLUTION_PROPOSED'
                        ? 'teal'
                        : 'yellow'
                    }
                  >
                    {selectedCase.status}
                  </Badge>
                </div>

                {/* Identity & Scope Notice */}
                <div className="text-xs text-[#525950] p-2 bg-[#FAF8F5] border border-[#D3CEBE] rounded-xs">
                  {selectedCase.isIdentityHidden ? (
                    <span className="text-[#00796B] font-semibold">
                      🔒 Confidential Report: Reporter identity is hidden. Private tracking token used.
                    </span>
                  ) : (
                    <span>
                      Identified Reporter: <strong>{selectedCase.workerDisplayName || 'Worker'}</strong>
                    </span>
                  )}
                </div>

                {/* Report Content */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#525950]">Original Worker Statement:</span>
                    <p className="p-2.5 bg-[#FAF8F5] border border-[#D3CEBE] rounded-xs mt-1 text-[#1D2926]">
                      {selectedCase.originalText}
                    </p>
                  </div>
                  {selectedCase.translatedText && (
                    <div>
                      <span className="font-semibold text-[#525950]">English / Tamil Translation:</span>
                      <p className="p-2.5 bg-[#FAF8F5] border border-[#D3CEBE] rounded-xs mt-1 text-[#1D2926]">
                        {selectedCase.translatedText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Existing Action Note */}
                {selectedCase.actionNote && (
                  <div className="p-2.5 border border-[#00796B] bg-[#E2ECE9] rounded-xs text-xs space-y-1">
                    <span className="font-bold text-[#00796B]">Current Resolution / Action Note:</span>
                    <p className="text-[#1D2926]">{selectedCase.actionNote}</p>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-2 border border-[#A63D24] bg-[#FDF3F1] text-xs text-[#A63D24] rounded-xs">
                    {errorMessage}
                  </div>
                )}

                {/* Action Note Input */}
                <div className="space-y-1.5 pt-2 border-t border-[#D3CEBE]">
                  <label htmlFor="action-note" className="text-xs font-semibold text-[#1D2926] block">
                    {t('actionNoteLabel')}:
                  </label>
                  <textarea
                    id="action-note"
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    rows={3}
                    placeholder={t('actionNotePlaceholder')}
                    className="w-full text-xs p-2 border border-[#D3CEBE] rounded-xs bg-[#FAF8F5] text-[#1D2926]"
                  />
                </div>

                {/* Transition Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {selectedCase.status === 'SUBMITTED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTransition('ACKNOWLEDGED')}
                      disabled={isUpdating}
                    >
                      ✓ {t('statusAcknowledged')}
                    </Button>
                  )}

                  {(selectedCase.status === 'SUBMITTED' || selectedCase.status === 'ACKNOWLEDGED') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTransition('ACTION_UNDERWAY')}
                      disabled={isUpdating}
                    >
                      ▶ {t('statusActionUnderway')}
                    </Button>
                  )}

                  {selectedCase.status === 'ACTION_UNDERWAY' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTransition('RESOLUTION_PROPOSED')}
                      disabled={isUpdating || !actionNote.trim()}
                    >
                      ⚖️ {t('statusResolutionProposed')}
                    </Button>
                  )}

                  {selectedCase.status === 'RESOLUTION_PROPOSED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleTransition('CLOSED')}
                      disabled={isUpdating || !actionNote.trim()}
                    >
                      ✓ {t('statusClosed')}
                    </Button>
                  )}
                </div>

                {/* History Log */}
                {selectedCase.history && selectedCase.history.length > 0 && (
                  <div className="space-y-1.5 border-t border-[#D3CEBE] pt-3">
                    <span className="text-xs font-bold text-[#1D2926]">
                      {t('caseHistoryTitle')}:
                    </span>
                    <div className="space-y-1 text-[11px]">
                      {selectedCase.history.map((h, i) => (
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
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#525950]">
                Select a concern from the left to view details and advance actions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
