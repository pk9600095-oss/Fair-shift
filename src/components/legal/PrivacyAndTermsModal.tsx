/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useI18n } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';

interface PrivacyAndTermsModalProps {
  initialTab?: 'privacy' | 'terms';
  onClose: () => void;
}

export const PrivacyAndTermsModal: React.FC<PrivacyAndTermsModalProps> = ({
  initialTab = 'privacy',
  onClose,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 bg-[#1D2926]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAF8F5] border border-[#D3CEBE] max-w-2xl w-full rounded-xs p-6 shadow-none space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between border-b border-[#D3CEBE] pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="legal-modal-title"
              onClick={() => setActiveTab('privacy')}
              className={`text-sm font-bold pb-1 cursor-pointer border-b-2 ${
                activeTab === 'privacy'
                  ? 'border-[#00796B] text-[#00796B]'
                  : 'border-transparent text-[#525950] hover:text-[#1D2926]'
              }`}
            >
              {t('privacyTitle')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`text-sm font-bold pb-1 cursor-pointer border-b-2 ${
                activeTab === 'terms'
                  ? 'border-[#00796B] text-[#00796B]'
                  : 'border-transparent text-[#525950] hover:text-[#1D2926]'
              }`}
            >
              {t('termsTitle')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#525950] hover:text-[#1D2926] cursor-pointer"
          >
            ✕ {t('closeBtn')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'privacy' ? (
          <div className="space-y-4 text-xs text-[#1D2926] leading-relaxed">
            <div>
              <h4 className="font-bold text-[#00796B]">
                {t('privacyStoredDataTitle')}
              </h4>
              <p className="mt-1 text-[#525950]">
                {t('privacyStoredDataBody')}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">
                {t('privacyAiTitle')}
              </h4>
              <p className="mt-1 text-[#525950]">
                {t('privacyAiBody')}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">
                {t('privacyDemoTitle')}
              </h4>
              <p className="mt-1 text-[#525950]">
                {t('privacyDemoBody')}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">
                {t('privacyRetentionTitle')}
              </h4>
              <p className="mt-1 text-[#525950]">
                {t('privacyRetentionBody')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-[#1D2926] leading-relaxed">
            <div>
              <h4 className="font-bold text-[#00796B]">1. Prototype & Evaluation Scope</h4>
              <p className="mt-1 text-[#525950]">
                FairShift is developed as a hackathon submission advancing United Nations Sustainable Development Goal 8 (Decent Work and Economic Growth). It is provided for evaluation and demonstration purposes.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">2. Non-Statutory Wage & Roster Representation</h4>
              <p className="mt-1 text-[#525950]">
                Pay calculations are expressed in integer paise based on voluntary employer policy parameters (e.g. 1.5x overtime multiplier, 11-hour rest window target). These calculations do NOT constitute statutory payroll advice, tax computation, or government labor compliance certifications.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">3. Absence & Concern Reporting</h4>
              <p className="mt-1 text-[#525950]">
                Workers reporting inability to attend or lodging concerns are protected by software safeguards that avoid automatic disciplinary penalties. For confidential reports, private tracking tokens are hashed with SHA-256; however, shift times and incident specifics may still be recognizable by coworkers or supervisors. Guaranteed anonymity is not claimed.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#00796B]">4. Emergency Situations</h4>
              <p className="mt-1 text-[#525950]">
                FairShift is not an emergency response dispatch system. For immediate physical safety hazards, workplace violence, or medical emergencies, users must directly contact onsite emergency personnel or local public emergency services (112).
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-[#D3CEBE]">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t('closeBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
};
