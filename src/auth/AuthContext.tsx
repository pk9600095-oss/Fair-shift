/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, testFirestoreConnection } from '../firebase/config.ts';
import { UserRole, IndustryType, UserProfile } from '../domain/types.ts';
import { SandboxDataset } from '../data/seedData.ts';

interface AuthContextType {
  // Real Firebase state
  currentUser: User | null;
  authLoading: boolean;
  firestoreConnected: boolean;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Demo Sandbox state
  isDemoSession: boolean;
  enterDemo: (role?: UserRole) => void;
  exitDemo: () => void;
  sandboxRole: UserRole;
  setSandboxRole: (role: UserRole) => void;
  selectedIndustry: IndustryType;
  setSelectedIndustry: (ind: IndustryType) => void;
  activeSandboxWorkerId: string;
  setActiveSandboxWorkerId: (id: string) => void;
  sessionId: string;

  // Active workspace state
  isAuthenticated: boolean;
  effectiveRole: UserRole;
  effectiveDisplayName: string;
  effectiveOrgName: string;
  sandboxData: SandboxDataset | null;
  refreshSandboxData: () => Promise<void>;
  updateSandboxData: (updater: (prev: SandboxDataset) => SandboxDataset) => void;
  resetSandboxData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Demo Sandbox state (starts false so user lands on login page first)
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [sandboxRole, setSandboxRole] = useState<UserRole>('employer');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('construction');
  const [sessionId] = useState(() => `judge-session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
  const [sandboxData, setSandboxData] = useState<SandboxDataset | null>(null);
  const [activeSandboxWorkerId, setActiveSandboxWorkerId] = useState<string>('');

  // Initialise Firebase auth state listener & firestore connection test
  useEffect(() => {
    testFirestoreConnection().then(setFirestoreConnected);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Authenticated user: resolve role and organisation authoritatively on the server
        try {
          const idToken = await user.getIdToken();
          const res = await fetch('/api/auth/resolve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setUserProfile({
              id: user.uid,
              organisationId: data.organisationId || 'org-production-1',
              role: (data.role as UserRole) || 'employer',
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || '',
            });
          }
        } catch (err) {
          console.error('Server token verification error:', err);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch or refresh sandbox data for active industry & session
  const refreshSandboxData = async () => {
    try {
      const res = await fetch(`/api/sandbox/state?sessionId=${sessionId}&industry=${selectedIndustry}`);
      if (res.ok) {
        const json = await res.json();
        setSandboxData(json.data);
        if (json.data.workers?.length > 0 && !activeSandboxWorkerId) {
          setActiveSandboxWorkerId(json.data.workers[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sandbox dataset:', err);
    }
  };

  useEffect(() => {
    if (isDemoSession || currentUser) {
      refreshSandboxData();
    }
  }, [selectedIndustry, sessionId, isDemoSession, currentUser]);

  useEffect(() => {
    if (sandboxData?.workers && sandboxData.workers.length > 0) {
      const workerExists = sandboxData.workers.some(w => w.id === activeSandboxWorkerId);
      if (!workerExists) {
        setActiveSandboxWorkerId(sandboxData.workers[0].id);
      }
    }
  }, [sandboxData, activeSandboxWorkerId]);

  const updateSandboxData = (updater: (prev: SandboxDataset) => SandboxDataset) => {
    setSandboxData(prev => (prev ? updater(prev) : prev));
  };

  const resetSandboxData = async () => {
    try {
      await fetch('/api/sandbox/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, industry: selectedIndustry }),
      });
      await refreshSandboxData();
    } catch (err) {
      console.error('Failed to reset sandbox data:', err);
    }
  };

  const handleSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setIsDemoSession(false);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setUserProfile(null);
    setIsDemoSession(false);
    setSandboxRole('employer');
  };

  const enterDemo = (role: UserRole = 'employer') => {
    setSandboxRole(role);
    setIsDemoSession(true);
  };

  const exitDemo = () => {
    setIsDemoSession(false);
  };

  const isAuthenticated = Boolean(currentUser) || isDemoSession;

  // Resolve effective role: if authenticated with Firebase, use server-resolved userProfile.role;
  // If in demo sandbox, use simulated sandboxRole
  const effectiveRole: UserRole = currentUser && userProfile
    ? userProfile.role
    : sandboxRole;

  // Active simulated or real worker
  const activeWorker = sandboxData?.workers.find(w => w.id === activeSandboxWorkerId);

  const effectiveDisplayName: string = currentUser
    ? userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Member'
    : effectiveRole === 'worker'
    ? activeWorker?.displayName || 'Worker'
    : 'Staffing Manager';

  const effectiveOrgName: string = sandboxData?.organisation.name || 'FairShift Organization';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authLoading,
        firestoreConnected,
        userProfile,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        isDemoSession,
        enterDemo,
        exitDemo,
        sandboxRole,
        setSandboxRole,
        selectedIndustry,
        setSelectedIndustry,
        activeSandboxWorkerId,
        setActiveSandboxWorkerId,
        sessionId,
        isAuthenticated,
        effectiveRole,
        effectiveDisplayName,
        effectiveOrgName,
        sandboxData,
        refreshSandboxData,
        updateSandboxData,
        resetSandboxData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
