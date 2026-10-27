/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { useI18n, Language } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';
import { PrivacyAndTermsModal } from '../legal/PrivacyAndTermsModal.tsx';

export const SignInPage: React.FC = () => {
  const { signInWithGoogle, enterDemo, authLoading } = useAuth();
  const { t, language, setLanguage } = useI18n();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | null>(null);

  const handleLanguageToggle = (lang: Language) => {
    setLanguage(lang);
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Sign-in cancelled. Please complete authentication in the Google window.');
      } else {
        setAuthError('Authentication failed. Please verify your connection or use the Demo Workspace.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#1D2926] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="border-b border-[#E2DDD1] bg-[#F7F4EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#00796B]">
              FairShift
            </span>
            <span className="text-[11px] font-mono border border-[#00796B] text-[#00796B] px-1.5 py-0.5 rounded-[2px] font-medium">
              SDG 8
            </span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="lang-select" className="text-xs text-[#4A5652] font-medium sr-only">
              Language
            </label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => handleLanguageToggle(e.target.value as Language)}
              className="bg-[#FAF8F3] border border-[#E2DDD1] text-xs font-medium px-2.5 py-1.5 rounded-[2px] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-[#00796B]"
            >
              <option value="en">English (India)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Editorial Entrance */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20 w-full grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Editorial Value Proposition */}
        <section aria-labelledby="editorial-heading" className="md:col-span-7 space-y-6">
          <div className="space-y-4">
            <h1 id="editorial-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1D2926] leading-[1.15]">
              Better shifts. Clearer pay. A fairer working day.
            </h1>
            <p className="text-base sm:text-lg text-[#4A5652] leading-relaxed max-w-xl">
              FairShift aligns employer staffing requirements with transparent worker rest intervals, upfront earnings calculations, and consensual schedule proposals.
            </p>
          </div>

          <div className="pt-2 border-t border-[#E2DDD1] text-xs text-[#6E7C77] space-y-2">
            <p className="font-semibold text-[#1D2926]">Configured for time-sensitive, shift-based industries:</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] text-[#1D2926]">
                Construction & Civil Works
              </span>
              <span className="px-2 py-1 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] text-[#1D2926]">
                Hospital Support & Housekeeping
              </span>
              <span className="px-2 py-1 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] text-[#1D2926]">
                College Facilities & Campus
              </span>
              <span className="px-2 py-1 bg-[#EFECE3] border border-[#E2DDD1] rounded-[2px] text-[#1D2926]">
                Factory & Manufacturing Floor
              </span>
            </div>
          </div>
        </section>

        {/* Clean Integrated Sign-In Area */}
        <section aria-labelledby="signin-heading" className="md:col-span-5 bg-[#FAF8F3] border border-[#E2DDD1] p-6 sm:p-8 rounded-[2px] space-y-6">
          <div>
            <h2 id="signin-heading" className="text-xl font-bold text-[#1D2926]">
              Sign in to your workplace
            </h2>
            <p className="text-xs text-[#4A5652] mt-1">
              Authenticate with your Google Workspace identity. Organisation role is server-verified.
            </p>
          </div>

          {authError && (
            <div role="alert" className="p-3 bg-[#FBECE8] border border-[#A63D24] text-[#A63D24] text-xs rounded-[2px]">
              <span className="font-bold">Error:</span> {authError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full justify-center text-sm font-semibold py-2.5"
              disabled={isSigningIn || authLoading}
              onClick={handleGoogleLogin}
            >
              {isSigningIn ? 'Connecting to Google Auth...' : 'Continue with Google'}
            </Button>

            <div className="relative py-2 flex items-center justify-center">
              <div className="border-t border-[#E2DDD1] w-full absolute" />
              <span className="bg-[#FAF8F3] px-3 text-[11px] uppercase tracking-wider text-[#6E7C77] relative">
                or evaluation access
              </span>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-center text-sm font-medium py-2.5"
              onClick={() => enterDemo('employer')}
            >
              Explore demo workspace
            </Button>

            <p className="text-[11px] text-[#6E7C77] text-center leading-normal pt-1">
              Demo workspace provides full simulated functionality with synthetic datasets for hackathon evaluation without requiring Google sign-in.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2DDD1] bg-[#F7F4EC] py-6 text-xs text-[#6E7C77]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-[#1D2926]">FairShift</span> — Supporting UN Sustainable Development Goal 8 (Decent Work & Economic Growth)
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowLegalModal('privacy')}
              className="hover:underline text-[#4A5652] cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowLegalModal('terms')}
              className="hover:underline text-[#4A5652] cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      {/* Comprehensive Accessible Legal & Prototype Transparency Modal */}
      {showLegalModal && (
        <PrivacyAndTermsModal
          initialTab={showLegalModal}
          onClose={() => setShowLegalModal(null)}
        />
      )}
    </div>
  );
};
