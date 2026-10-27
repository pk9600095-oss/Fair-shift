/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { useI18n, Language } from '../../i18n/translations.tsx';
import { Button } from '../common/Button.tsx';
import { Badge } from '../common/Badge.tsx';
import { INDUSTRY_CONFIGS } from '../../data/industries.ts';
import { IndustryType } from '../../domain/types.ts';

interface AppHeaderProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeSection,
  setActiveSection,
}) => {
  const {
    signOut,
    isDemoSession,
    effectiveRole,
    effectiveDisplayName,
    effectiveOrgName,
    selectedIndustry,
    setSelectedIndustry,
    sandboxRole,
    setSandboxRole,
    sandboxData,
    activeSandboxWorkerId,
    setActiveSandboxWorkerId,
    resetSandboxData,
  } = useAuth();

  const { t, language, setLanguage } = useI18n();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const employerNavItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'staffing', label: 'Staffing' },
    { id: 'proposals', label: 'Proposals' },
    { id: 'attendance', label: 'Attendance & Pay' },
    { id: 'concerns', label: 'Concerns' },
    { id: 'reports', label: 'Reports' },
  ];

  const workerNavItems = [
    { id: 'home', label: 'Home' },
    { id: 'shifts', label: 'My Shifts' },
    { id: 'proposals', label: 'Change Requests' },
    { id: 'earnings', label: 'My Earnings' },
    { id: 'concerns', label: 'Concerns' },
    { id: 'availability', label: 'Availability' },
  ];

  const currentNavItems = effectiveRole === 'employer' ? employerNavItems : workerNavItems;
  const currentNavLabel = currentNavItems.find((i) => i.id === activeSection)?.label || 'Workspace';

  const focusRing =
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00796B]';

  return (
    <header className="bg-[#F7F4EC] border-b border-[#E2DDD1]">
      {/* Top bar: brand, organisation, language, account */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="text-xl font-bold tracking-tight text-[#00796B]">FairShift</span>
          <span className="text-sm font-medium text-[#4A5652] truncate max-w-[130px] sm:max-w-[300px]">
            {effectiveOrgName}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isDemoSession && (
            <div className="flex items-center gap-2">
              <Badge variant="yellow" prefix="[DEMO]">
                Demo workspace
              </Badge>

              <div className="hidden lg:inline-flex border border-[#C9C2B3] rounded-[2px] text-sm">
                <button
                  type="button"
                  onClick={() => setSandboxRole('employer')}
                  aria-pressed={sandboxRole === 'employer'}
                  className={`px-3 py-1.5 font-medium cursor-pointer ${focusRing} ${
                    sandboxRole === 'employer'
                      ? 'bg-[#00796B] text-white'
                      : 'text-[#1D2926] hover:bg-[#EFECE3]'
                  }`}
                >
                  Employer
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxRole('worker')}
                  aria-pressed={sandboxRole === 'worker'}
                  className={`px-3 py-1.5 font-medium cursor-pointer ${focusRing} ${
                    sandboxRole === 'worker'
                      ? 'bg-[#00796B] text-white'
                      : 'text-[#1D2926] hover:bg-[#EFECE3]'
                  }`}
                >
                  Worker
                </button>
              </div>

              <select
                aria-label="Select demo industry"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value as IndustryType)}
                className={`hidden xl:inline-block bg-[#F7F4EC] border border-[#C9C2B3] text-sm font-medium px-2 py-1.5 rounded-[2px] text-[#1D2926] ${focusRing}`}
              >
                {(Object.keys(INDUSTRY_CONFIGS) as IndustryType[]).map((indKey) => {
                  const conf = INDUSTRY_CONFIGS[indKey];
                  return (
                    <option key={indKey} value={indKey}>
                      {language === 'ta' ? conf.labelTa : conf.labelEn}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <select
            aria-label="Select language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className={`bg-[#F7F4EC] border border-[#C9C2B3] text-sm font-medium px-2 py-1.5 rounded-[2px] text-[#1D2926] ${focusRing}`}
          >
            <option value="en">EN</option>
            <option value="ta">தமிழ்</option>
          </select>

          {/* Account dropdown */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              id="account-menu-button"
              aria-haspopup="true"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#C9C2B3] rounded-[2px] text-[#1D2926] hover:bg-[#EFECE3] cursor-pointer ${focusRing}`}
            >
              <span className="font-semibold truncate max-w-[80px] sm:max-w-[150px]">
                {effectiveDisplayName}
              </span>
              <span aria-hidden="true" className="text-[10px] text-[#6E7C77]">▼</span>
            </button>

            {isAccountMenuOpen && (
              <div
                role="menu"
                aria-labelledby="account-menu-button"
                className="absolute right-0 mt-1 w-60 bg-[#FAF8F3] border border-[#C9C2B3] rounded-[2px] p-3 space-y-3 z-50 text-sm"
              >
                <div className="pb-2 border-b border-[#E2DDD1]">
                  <p className="font-bold text-[#1D2926] truncate">{effectiveDisplayName}</p>
                  <p className="text-[#6E7C77] text-xs capitalize">
                    {effectiveRole}
                    {isDemoSession ? ' (demo)' : ''}
                  </p>
                </div>

                {isDemoSession && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      resetSandboxData();
                      setIsAccountMenuOpen(false);
                    }}
                    className={`text-[#2457C5] underline underline-offset-2 text-left ${focusRing}`}
                  >
                    Reset demo data
                  </button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm text-[#A63D24]"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    signOut();
                  }}
                >
                  {t('signOut')}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`px-3 py-1.5 text-sm font-semibold border border-[#00796B] text-[#00796B] rounded-[2px] cursor-pointer ${focusRing}`}
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav aria-label="Primary navigation" className="hidden md:block border-t border-[#E2DDD1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-8 overflow-x-auto">
          {currentNavItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveSection(item.id)}
                className={`py-3 text-sm font-semibold border-b-[3px] cursor-pointer whitespace-nowrap ${focusRing} ${
                  isActive
                    ? 'border-[#00796B] text-[#00796B]'
                    : 'border-transparent text-[#4A5652] hover:text-[#1D2926]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile current-page strip */}
      <div className="md:hidden border-t border-[#E2DDD1] px-4 py-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-[#1D2926]">{currentNavLabel}</span>
        <span className="text-xs text-[#6E7C77] capitalize">{effectiveRole}</span>
      </div>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="md:hidden fixed inset-0 bg-black/40 z-50 flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
          }}
        >
          <div className="bg-[#F7F4EC] w-72 max-w-[85%] h-full p-4 flex flex-col justify-between border-r border-[#1D2926] overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-3">
                <span className="text-lg font-bold text-[#00796B]">FairShift</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-sm font-semibold px-2 py-1 text-[#1D2926] cursor-pointer ${focusRing}`}
                >
                  Close
                </button>
              </div>

              <nav aria-label="Mobile navigation" className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6E7C77] px-2 mb-1">
                  {effectiveRole === 'employer' ? 'Employer' : 'Worker'}
                </p>
                {currentNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-3 text-base font-semibold rounded-[2px] cursor-pointer ${focusRing} ${
                      activeSection === item.id
                        ? 'bg-[#00796B] text-white'
                        : 'text-[#1D2926] hover:bg-[#EFECE3]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {isDemoSession && (
                <div className="border-t border-[#E2DDD1] pt-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6E7C77] px-2">
                    Demo perspective
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSandboxRole('employer')}
                      aria-pressed={sandboxRole === 'employer'}
                      className={`px-2 py-2 text-sm font-medium rounded-[2px] ${focusRing} ${
                        sandboxRole === 'employer'
                          ? 'bg-[#00796B] text-white'
                          : 'border border-[#C9C2B3]'
                      }`}
                    >
                      Employer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxRole('worker')}
                      aria-pressed={sandboxRole === 'worker'}
                      className={`px-2 py-2 text-sm font-medium rounded-[2px] ${focusRing} ${
                        sandboxRole === 'worker'
                          ? 'bg-[#00796B] text-white'
                          : 'border border-[#C9C2B3]'
                      }`}
                    >
                      Worker
                    </button>
                  </div>

                  {sandboxRole === 'worker' && sandboxData?.workers && (
                    <div className="space-y-1">
                      <label
                        htmlFor="mobile-worker-picker"
                        className="text-xs text-[#4A5652] font-medium block"
                      >
                        Simulated worker
                      </label>
                      <select
                        id="mobile-worker-picker"
                        value={activeSandboxWorkerId}
                        onChange={(e) => setActiveSandboxWorkerId(e.target.value)}
                        className={`w-full bg-[#F7F4EC] border border-[#C9C2B3] text-sm p-2 rounded-[2px] ${focusRing}`}
                      >
                        {sandboxData.workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-[#E2DDD1] pt-3 mt-6">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-sm text-[#A63D24]"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut();
                }}
              >
                {t('signOut')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};