/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useI18n } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';
import { VoiceSpeechAssistant } from '../voice/VoiceSpeechAssistant.tsx';
import { PlanMetricsFacts, PlanExplanationResult } from '../../domain/types.ts';

interface AiPlanExplanationProps {
  facts: PlanMetricsFacts;
}

export const AiPlanExplanation: React.FC<AiPlanExplanationProps> = ({ facts }) => {
  const { t, language } = useI18n();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<PlanExplanationResult | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleGenerateExplanation = async () => {
    setIsLoading(true);
    setErrorNotice(null);

    try {
      const res = await fetch('/api/ai/explain-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facts,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate explanation');
      }

      setExplanation(data);
    } catch (err) {
      // Deterministic client-side fallback
      setErrorNotice('AI explanation temporarily offline. Deterministic metrics summary provided.');
      setExplanation({
        summary: `Plan assigns ${facts.assignedPositions} of ${facts.totalPositions} positions with ${facts.unfilledPositions} unfilled.`,
        restAnalysis: facts.restViolationsCount === 0
          ? 'All assigned workers receive over 11 hours of rest between consecutive shifts.'
          : `${facts.restViolationsCount} rest violation warnings detected. Review worker schedules before publishing.`,
        budgetAnalysis: `Projected labor cost is ₹${(facts.totalLaborCostPaise / 100).toLocaleString('en-IN')}. Overtime totals ${facts.overtimeMinutes} minutes.`,
        fairnessNote: 'Worker preference matches and rest intervals prioritized across the schedule.',
        isAiGenerated: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fullTextToRead = explanation
    ? `${explanation.summary} ${explanation.restAnalysis} ${explanation.budgetAnalysis} ${explanation.fairnessNote}`
    : '';

  return (
    <div className="border border-[#D3CEBE] bg-[#FAF8F5] p-4 rounded-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-[#1D2926]">
            {t('aiPlanExplanationTitle')}
          </h4>
          <p className="text-[11px] text-[#525950]">
            AI translates numeric solver trade-offs into plain-language summaries without sending any personal worker identifiers.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateExplanation}
          disabled={isLoading}
        >
          {isLoading ? t('aiExplainingPlan') : t('aiExplainPlanBtn')}
        </Button>
      </div>

      {errorNotice && (
        <div className="p-2 border border-[#F4CF57] bg-[#FFFBF0] text-xs text-[#5C4500] rounded-xs">
          {errorNotice}
        </div>
      )}

      {explanation && (
        <div className="border border-[#D3CEBE] bg-[#FFFFFF] p-3 rounded-xs space-y-2.5 text-xs text-[#1D2926]">
          <div className="flex items-center justify-between border-b border-[#EAE6DC] pb-1.5">
            <span className="font-semibold text-[#00796B]">
              {explanation.isAiGenerated ? '✨ AI-Generated Analysis' : '📋 Deterministic Metric Analysis'}
            </span>
            <VoiceSpeechAssistant
              onApplyTranscript={() => {}}
              textToReadAloud={fullTextToRead}
            />
          </div>

          <p className="leading-relaxed">
            {explanation.summary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#EAE6DC] text-[11px]">
            <div className="p-2 bg-[#FAF8F5] rounded-xs border border-[#EAE6DC]">
              <span className="font-bold text-[#00796B] block">
                {t('aiRestAnalysis')}:
              </span>
              <p className="mt-0.5 text-[#525950]">{explanation.restAnalysis}</p>
            </div>
            <div className="p-2 bg-[#FAF8F5] rounded-xs border border-[#EAE6DC]">
              <span className="font-bold text-[#2457C5] block">
                {t('aiBudgetAnalysis')}:
              </span>
              <p className="mt-0.5 text-[#525950]">{explanation.budgetAnalysis}</p>
            </div>
            <div className="p-2 bg-[#FAF8F5] rounded-xs border border-[#EAE6DC]">
              <span className="font-bold text-[#1D2926] block">
                {t('aiFairnessNote')}:
              </span>
              <p className="mt-0.5 text-[#525950]">{explanation.fairnessNote}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
