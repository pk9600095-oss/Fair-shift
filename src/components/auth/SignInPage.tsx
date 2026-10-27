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
  const { language, setLanguage } = useI18n();
  const ta = language === 'ta';

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | null>(null);

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
        setAuthError('Authentication failed. Please check your connection or explore the demo.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const industries = [
    'Construction',
    'Hospital support',
    'Campus facilities',
    'Manufacturing',
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#1D2926] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[#E2DDD1]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-[#00796B]">FairShift</span>
          <div>
            <label htmlFor="lang-select" className="sr-only">
              Language
            </label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-[#F7F4EC] border border-[#C9C2B3] text-sm font-medium px-3 py-2 rounded-[2px] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00796B]"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>
        </div>
      </header>

      {/* Entrance */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">
        <section aria-labelledby="entrance-heading" className="md:col-span-7">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#2457C5] mb-4">
            {ta ? 'நியாயமான வேலை · SDG 8' : 'Decent work · SDG 8'}
          </p>
          <h1
            id="entrance-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]"
          >
            {ta ? (
              <>
                சிறந்த ஷிப்டுகள்.
                <br />
                <span className="text-[#00796B]">தெளிவான ஊதியம்.</span>
              </>
            ) : (
              <>
                Better shifts.
                <br />
                <span className="text-[#00796B]">Clearer pay.</span>
              </>
            )}
          </h1>
          <p className="mt-6 text-lg text-[#4A5652] leading-relaxed max-w-xl">
            {ta
              ? 'வேலை நேரம், ஊதிய கணக்கீடு மற்றும் ஷிப்ட் மாற்றக் கோரிக்கைகள் அனைத்தும் ஒரே இடத்தில், வெளிப்படையாக.'
              : 'FairShift brings staffing needs, worker rest, upfront earnings and shift change requests into one clear place.'}
          </p>

          <div className="mt-10 pt-6 border-t border-[#E2DDD1]">
            <p className="text-sm text-[#6E7C77]">
              {ta ? 'இந்தத் துறைகளுக்கு அமைக்கப்பட்டது' : 'Set up for shift-based work in'}
            </p>
            <p className="mt-1 text-base font-medium text-[#1D2926]">
              {industries.join('  ·  ')}
            </p>
          </div>
        </section>

        {/* Sign-in column: one dividing line instead of a box */}
        <section
          aria-labelledby="signin-heading"
          className="md:col-span-5 md:border-l md:border-[#E2DDD1] md:pl-12"
        >
          <h2 id="signin-heading" className="text-2xl font-bold">
            {ta ? 'உள்நுழைக' : 'Sign in'}
          </h2>
          <p className="mt-2 text-sm text-[#4A5652]">
            {ta
              ? 'உங்கள் Google கணக்கில் உள்நுழையுங்கள். உங்கள் பங்கு அமைப்பால் சரிபார்க்கப்படும்.'
              : 'Use your Google account. Your role comes from your organisation membership.'}
          </p>

          {authError && (
            <div
              role="alert"
              className="mt-4 p-3 bg-[#FBECE8] border border-[#A63D24] text-[#A63D24] text-sm rounded-[2px]"
            >
              {authError}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full justify-center text-base font-semibold py-3"
            disabled={isSigningIn || authLoading}
            onClick={handleGoogleLogin}
          >
            {isSigningIn
              ? ta ? 'இணைக்கிறது...' : 'Connecting...'
              : ta ? 'Google மூலம் தொடரவும்' : 'Continue with Google'}
          </Button>

          <div className="my-8 border-t border-[#E2DDD1]" />

          <p className="text-sm font-semibold">
            {ta ? 'உள்நுழையாமல் பார்க்க' : 'Just looking?'}
          </p>
          <p className="mt-1 text-sm text-[#4A5652]">
            {ta
              ? 'டெமோ மாதிரித் தரவைப் பயன்படுத்துகிறது. உண்மையான கணக்குகளைத் தொடாது.'
              : 'The demo uses sample data and never touches real accounts.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="lg"
              className="justify-center text-sm font-medium py-2.5"
              onClick={() => enterDemo('employer')}
            >
              {ta ? 'முதலாளி' : 'Explore as employer'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="justify-center text-sm font-medium py-2.5"
              onClick={() => enterDemo('worker')}
            >
              {ta ? 'தொழிலாளி' : 'Explore as worker'}
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2DDD1] py-5 text-sm text-[#6E7C77]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            <span className="font-semibold text-[#1D2926]">FairShift</span> · UN Sustainable
            Development Goal 8
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setShowLegalModal('privacy')}
              className="underline underline-offset-2 text-[#1D2926] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00796B]"
            >
              {ta ? 'தனியுரிமை' : 'Privacy'}
            </button>
            <button
              type="button"
              onClick={() => setShowLegalModal('terms')}
              className="underline underline-offset-2 text-[#1D2926] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00796B]"
            >
              {ta ? 'விதிமுறைகள்' : 'Terms'}
            </button>
          </div>
        </div>
      </footer>

      {showLegalModal && (
        <PrivacyAndTermsModal
          initialTab={showLegalModal}
          onClose={() => setShowLegalModal(null)}
        />
      )}
    </div>
  );
};