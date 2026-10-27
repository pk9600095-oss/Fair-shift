/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { I18nProvider } from './i18n/translations.tsx';
import { AuthProvider, useAuth } from './auth/AuthContext.tsx';
import { SignInPage } from './components/auth/SignInPage.tsx';
import { AppHeader } from './components/navigation/AppHeader.tsx';
import { WorkerShell } from './components/worker/WorkerShell.tsx';
import { EmployerShell } from './components/employer/EmployerShell.tsx';
import { PrivacyAndTermsModal } from './components/legal/PrivacyAndTermsModal.tsx';

function MainApp() {
  const { isAuthenticated, effectiveRole, isDemoSession, sandboxRole } = useAuth();

  // Active section state for navigation
  const [activeSection, setActiveSection] = useState<string>(() => {
    return effectiveRole === 'employer' ? 'overview' : 'home';
  });
  const [showLegalModal, setShowLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // When role changes (e.g. perspective toggle in demo or sign-in resolution), switch default section
  useEffect(() => {
    if (effectiveRole === 'employer') {
      setActiveSection('overview');
    } else {
      setActiveSection('home');
    }
  }, [effectiveRole, sandboxRole, isDemoSession]);

  // 1. Entrance: Login First
  // The default unauthenticated route must be a proper sign-in page.
  if (!isAuthenticated) {
    return <SignInPage />;
  }

  // 2. Authenticated Workspace (Real or Demo)
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EC] text-[#1D2926]">
      {/* Shared Header & Responsive Navigation */}
      <AppHeader
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {effectiveRole === 'worker' ? (
          <WorkerShell
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        ) : (
          <EmployerShell
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
        )}
      </main>

      {/* Clean, Restrained Footer */}
      <footer className="border-t border-[#E2DDD1] bg-[#F7F4EC] py-5 px-4 sm:px-6 text-xs text-[#6E7C77]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-[#1D2926]">FairShift</span> —{' '}
            <span>UN Sustainable Development Goal 8 (Decent Work & Economic Growth)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLegalModal('privacy')}
              className="hover:underline text-[#4A5652] cursor-pointer"
            >
              Privacy Notice
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowLegalModal('terms')}
              className="hover:underline text-[#4A5652] cursor-pointer"
            >
              Terms of Use
            </button>
          </div>
        </div>
      </footer>

      {/* Legal & Prototype Transparency Modal */}
      {showLegalModal && (
        <PrivacyAndTermsModal
          initialTab={showLegalModal}
          onClose={() => setShowLegalModal(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </I18nProvider>
  );
}
