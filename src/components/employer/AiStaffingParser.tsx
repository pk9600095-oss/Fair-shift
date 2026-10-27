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
import { ParsedStaffingRequirement, ShiftRequirement } from '../../domain/types.ts';

interface AiStaffingParserProps {
  onConfirmShifts: (newShifts: ShiftRequirement[]) => void;
  onCancel: () => void;
}

export const AiStaffingParser: React.FC<AiStaffingParserProps> = ({
  onConfirmShifts,
  onCancel,
}) => {
  const { t, language } = useI18n();
  const { selectedIndustry, sandboxData } = useAuth();

  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [parsedList, setParsedList] = useState<ParsedStaffingRequirement[] | null>(null);
  const [isAiUnavailable, setIsAiUnavailable] = useState<boolean>(false);

  // Editable form state for parsed shifts
  const [editableShifts, setEditableShifts] = useState<ParsedStaffingRequirement[]>([]);

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setErrorNotice(null);

    try {
      const res = await fetch('/api/ai/parse-staffing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          industry: selectedIndustry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse staffing request');
      }

      setParsedList(data.data || []);
      setEditableShifts(data.data || []);
      setIsAiUnavailable(Boolean(data.isAiUnavailable));
    } catch (err) {
      setErrorNotice(
        'AI parsing service unavailable. You can manually enter shift requirements or retry.'
      );
      setIsAiUnavailable(true);
      // Fallback manual skeleton
      const fallback: ParsedStaffingRequirement[] = [
        {
          role: 'General Staff',
          headcount: 2,
          startIso: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T08:00:00Z',
          endIso: new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T16:30:00Z',
          unpaidBreakMinutes: 30,
          location: 'Site Location',
          notes: prompt,
          unspecifiedFields: ['hourlyRate', 'trainingTags'],
        },
      ];
      setParsedList(fallback);
      setEditableShifts(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateShift = (index: number, field: keyof ParsedStaffingRequirement, value: any) => {
    setEditableShifts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleConfirm = () => {
    const orgId = sandboxData?.organisation.id || 'org-current';
    const convertedShifts: ShiftRequirement[] = editableShifts.map((ps, idx) => ({
      id: `shift-parsed-${Date.now()}-${idx}`,
      organisationId: orgId,
      role: ps.role || 'General Staff',
      headcount: Math.max(1, ps.headcount || 1),
      startUtc: ps.startIso,
      endUtc: ps.endIso,
      unpaidBreakMinutes: ps.unpaidBreakMinutes || 30,
      requiredTrainingTags: [], // NEVER invented: requires explicit assignment
      location: ps.location,
    }));

    onConfirmShifts(convertedShifts);
  };

  return (
    <div className="border border-[#00796B] bg-[#FAF8F5] p-4 rounded-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D3CEBE] pb-2">
        <div>
          <h3 className="text-sm font-bold text-[#00796B]">
            {t('aiNaturalStaffingTitle')}
          </h3>
          <p className="text-xs text-[#525950]">
            Describe shifts in natural English or Tamil, or use speech input. Shifts will be structured into an editable form for confirmation.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#525950] hover:text-[#1D2926] cursor-pointer"
        >
          ✕ {t('cancel')}
        </button>
      </div>

      {/* Input Prompt Area with Speech Recognition */}
      <div className="space-y-2">
        <label htmlFor="staffing-prompt" className="text-xs font-semibold text-[#1D2926]">
          Staffing Request Description (Text or Voice):
        </label>
        <textarea
          id="staffing-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder={t('aiStaffingPromptPlaceholder')}
          className="w-full text-xs p-2.5 border border-[#D3CEBE] rounded-xs bg-[#FFFFFF] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-[#00796B]"
        />

        {/* Voice Speech Assistant */}
        <VoiceSpeechAssistant
          onApplyTranscript={(text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text))}
          textToReadAloud={prompt}
        />

        {/* Parse Button */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-[#727A6F]">
            Strict rule: Rates and qualification tags will never be invented.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleParse}
            disabled={!prompt.trim() || isLoading}
          >
            {isLoading ? t('aiParsing') : t('aiParseBtn')}
          </Button>
        </div>
      </div>

      {/* AI Fallback Notice */}
      {isAiUnavailable && (
        <div className="p-2 border border-[#F4CF57] bg-[#FFFBF0] text-xs text-[#5C4500] rounded-xs">
          <strong>AI parsing service unavailable.</strong> A manual template has been created below for your direct entry.
        </div>
      )}

      {/* Parsed & Editable Shift Requirements */}
      {parsedList && editableShifts.length > 0 && (
        <div className="border-t border-[#D3CEBE] pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1D2926]">
              {t('aiReviewParsed')}
            </h4>
            <span className="text-[11px] text-[#525950]">
              {editableShifts.length} shift demand(s) extracted
            </span>
          </div>

          <div className="space-y-2.5">
            {editableShifts.map((shift, idx) => (
              <div
                key={idx}
                className="border border-[#D3CEBE] bg-[#FFFFFF] p-3 rounded-xs space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#525950] block">
                      Role Name:
                    </label>
                    <input
                      type="text"
                      value={shift.role}
                      onChange={(e) => handleUpdateShift(idx, 'role', e.target.value)}
                      className="w-full text-xs p-1.5 border border-[#D3CEBE] rounded-xs bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#525950] block">
                      Required Headcount:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={shift.headcount}
                      onChange={(e) =>
                        handleUpdateShift(idx, 'headcount', parseInt(e.target.value, 10) || 1)
                      }
                      className="w-full text-xs p-1.5 border border-[#D3CEBE] rounded-xs bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#525950] block">
                      Unpaid Break (mins):
                    </label>
                    <input
                      type="number"
                      step={15}
                      value={shift.unpaidBreakMinutes}
                      onChange={(e) =>
                        handleUpdateShift(
                          idx,
                          'unpaidBreakMinutes',
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-full text-xs p-1.5 border border-[#D3CEBE] rounded-xs bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-[#525950] block">
                      Start Time (UTC / ISO):
                    </label>
                    <input
                      type="text"
                      value={shift.startIso}
                      onChange={(e) => handleUpdateShift(idx, 'startIso', e.target.value)}
                      className="w-full text-xs p-1.5 border border-[#D3CEBE] rounded-xs font-mono bg-[#FAF8F5]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#525950] block">
                      End Time (UTC / ISO):
                    </label>
                    <input
                      type="text"
                      value={shift.endIso}
                      onChange={(e) => handleUpdateShift(idx, 'endIso', e.target.value)}
                      className="w-full text-xs p-1.5 border border-[#D3CEBE] rounded-xs font-mono bg-[#FAF8F5]"
                    />
                  </div>
                </div>

                {shift.unspecifiedFields && shift.unspecifiedFields.length > 0 && (
                  <div className="text-[11px] bg-[#FFFBF0] p-1.5 border border-[#F4CF57] rounded-xs text-[#5C4500] flex items-center gap-1.5">
                    <span className="font-semibold">{t('aiMissingFields')}:</span>
                    <span>{shift.unspecifiedFields.join(', ')} (set upon worker assignment)</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D3CEBE]">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>
              ✓ {t('aiConfirmShifts')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
