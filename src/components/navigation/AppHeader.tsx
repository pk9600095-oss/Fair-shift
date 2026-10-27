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
import { IndustryType, UserRole } from '../../domain/types.ts';

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

  // Close dropdown on Escape key or outside click
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

  // Navigation Items by Role
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
  const currentNavLabel = currentNavItems.find(i => i.id === activeSection)?.label || 'Workspace';

  return (
    <header className="bg-[#FAF8F3] border-b border-[#E2DDD1]">
      {/* Top Bar: Brand, Org, Language, Demo indicator & Account */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand & Organisation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-[#00796B]">
              FairShift
            </span>
            <span className="text-[10px] font-mono border border-[#00796B] text-[#00796B] px-1.5 py-0.2 rounded-[2px] font-medium hidden sm:inline-block">
              SDG 8
            </span>
          </div>

          <span className="text-[#C9C2B3] hidden sm:inline">|</span>

          <span className="text-xs font-semibold text-[#1D2926] truncate max-w-[160px] sm:max-w-[240px]">
            {effectiveOrgName}
          </span>
        </div>

        {/* Center / Right: Demo Badge, Language, Account */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isDemoSession && (
            <div className="flex items-center gap-1.5">
              <Badge variant="yellow" prefix="[DEMO]">
                Demo workspace
              </Badge>

              {/* Perspective Switcher (Only in Demo) */}
              <div className="hidden lg:inline-flex border border-[#E2DDD1] rounded-[2px] bg-[#EFECE3] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSandboxRole('employer')}
                  className={`px-2 py-0.5 rounded-[2px] font-medium transition-none cursor-pointer ${
                    sandboxRole === 'employer'
                      ? 'bg-[#00796B] text-white'
                      : 'text-[#1D2926] hover:bg-[#FAF8F3]'
                  }`}
                >
                  Employer
                </button>
                <button
                  type="button"
                  onClick={() => setSandboxRole('worker')}
                  className={`px-2 py-0.5 rounded-[2px] font-medium transition-none cursor-pointer ${
                    sandboxRole === 'worker'
                      ? 'bg-[#00796B] text-white'
                      : 'text-[#1D2926] hover:bg-[#FAF8F3]'
                  }`}
                >
                  Worker
                </button>
              </div>

              {/* Industry Selector in Demo */}
              <select
                aria-label="Select demo industry"
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value as IndustryType)}
                className="hidden xl:inline-block bg-[#FAF8F3] border border-[#E2DDD1] text-xs font-medium px-2 py-1 rounded-[2px] text-[#1D2926]"
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

          {/* Compact Language Dropdown */}
          <select
            aria-label="Select language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-[#FAF8F3] border border-[#E2DDD1] text-xs font-medium px-2 py-1 rounded-[2px] text-[#1D2926] focus-visible:outline-2 focus-visible:outline-[#00796B]"
          >
            <option value="en">EN</option>
            <option value="ta">தமிழ்</option>
          </select>

          {/* Account Dropdown */}
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              id="account-menu-button"
              aria-haspopup="true"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px] text-[#1D2926] hover:bg-[#EFECE3] cursor-pointer"
            >
              <span className="font-semibold truncate max-w-[100px] sm:max-w-[140px]">
                {effectiveDisplayName}
              </span>
              <span className="text-[10px] text-[#6E7C77]">▼</span>
            </button>

            {isAccountMenuOpen && (
              <div
                role="menu"
                aria-labelledby="account-menu-button"
                className="absolute right-0 mt-1 w-56 bg-[#FAF8F3] border border-[#C9C2B3] rounded-[2px] p-2 space-y-2 z-50 text-xs"
              >
                <div className="px-2 py-1.5 border-b border-[#E2DDD1]">
                  <p className="font-bold text-[#1D2926] truncate">{effectiveDisplayName}</p>
                  <p className="text-[#6E7C77] text-[11px] uppercase tracking-wider font-mono">
                    Role: {effectiveRole} {isDemoSession && '(Simulated)'}
                  </p>
                </div>

                {isDemoSession && (
                  <div className="px-2 py-1 text-[11px] text-[#6E7C77] bg-[#EFECE3] rounded-[2px]">
                    <p className="font-semibold text-[#1D2926]">Demo Session</p>
                    <button
                      type="button"
                      onClick={() => {
                        resetSandboxData();
                        setIsAccountMenuOpen(false);
                      }}
                      className="text-[#2457C5] hover:underline mt-0.5 block text-left"
                    >
                      Reset demo data
                    </button>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-[#A63D24]"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      signOut();
                    }}
                  >
                    {t('signOut')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="px-2.5 py-1 text-xs font-semibold border border-[#E2DDD1] bg-[#FAF8F3] rounded-[2px] text-[#1D2926] cursor-pointer"
            >
              Menu
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Horizontal Navigation Bar */}
      <nav aria-label="Primary workplace navigation" className="hidden md:block border-t border-[#E2DDD1] bg-[#FAF8F3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-6 overflow-x-auto">
          {currentNavItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`py-2.5 text-xs font-semibold border-b-2 transition-none cursor-pointer whitespace-nowrap ${
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

      {/* Mobile Page Title Strip */}
      <div className="md:hidden border-t border-[#E2DDD1] bg-[#EFECE3] px-4 py-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#1D2926]">
          {currentNavLabel}
        </span>
        <span className="text-[11px] text-[#6E7C77] uppercase font-mono">
          {effectiveRole}
        </span>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="md:hidden fixed inset-0 bg-black/40 z-50 flex"
        >
          <div className="bg-[#FAF8F3] w-72 h-full p-4 flex flex-col justify-between border-r border-[#1D2926]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2DDD1] pb-3">
                <span className="text-base font-bold text-[#00796B]">FairShift</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-semibold p-1 text-[#4A5652] cursor-pointer"
                >
                  Close [×]
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E7C77] px-2 mb-1">
                  {effectiveRole === 'employer' ? 'Employer Navigation' : 'Worker Navigation'}
                </p>
                {currentNavItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-[2px] cursor-pointer ${
                      activeSection === item.id
                        ? 'bg-[#00796B] text-white'
                        : 'text-[#1D2926] hover:bg-[#EFECE3]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Mobile Demo Controls */}
              {isDemoSession && (
                <div className="border-t border-[#E2DDD1] pt-3 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6E7C77] px-2">
                    Demo Perspective
                  </p>
                  <div className="grid grid-cols-2 gap-1 px-1">
                    <button
                      type="button"
                      onClick={() => setSandboxRole('employer')}
                      className={`px-2 py-1.5 text-xs font-medium rounded-[2px] ${
                        sandboxRole === 'employer' ? 'bg-[#00796B] text-white' : 'border border-[#E2DDD1]'
                      }`}
                    >
                      Employer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxRole('worker')}
                      className={`px-2 py-1.5 text-xs font-medium rounded-[2px] ${
                        sandboxRole === 'worker' ? 'bg-[#00796B] text-white' : 'border border-[#E2DDD1]'
                      }`}
                    >
                      Worker
                    </button>
                  </div>

                  {sandboxRole === 'worker' && sandboxData?.workers && (
                    <div className="px-2 space-y-1">
                      <label htmlFor="mobile-worker-picker" className="text-[11px] text-[#4A5652] font-medium block">
                        Select Simulated Worker:
                      </label>
                      <select
                        id="mobile-worker-picker"
                        value={activeSandboxWorkerId}
                        onChange={(e) => setActiveSandboxWorkerId(e.target.value)}
                        className="w-full bg-[#FAF8F3] border border-[#E2DDD1] text-xs p-1.5 rounded-[2px]"
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

            <div className="border-t border-[#E2DDD1] pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-xs text-[#A63D24]"
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
