/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, testFirestoreConnection } from '../firebase/config.ts';
import {
  UserRole,
  IndustryType,
  UserProfile,
} from '../domain/types.ts';
import { SandboxDataset } from '../data/seedData.ts';

interface AuthContextType {
  currentUser: User | null;
  authLoading: boolean;
  firestoreConnected: boolean;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

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

  isAuthenticated: boolean;
  effectiveRole: UserRole;
  effectiveDisplayName: string;
  effectiveOrgName: string;
  sandboxData: SandboxDataset | null;
  refreshSandboxData: () => Promise<void>;
  updateSandboxData: (
    updater: (prev: SandboxDataset) => SandboxDataset
  ) => void;
  resetSandboxData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchJson(
  url: string,
  options: RequestInit = {},
  timeoutMs = 12000
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `${url.split('?')[0]} returned HTTP ${response.status}. ` +
          'Check that the backend route is deployed and accessible.'
      );
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (
      !contentType.toLowerCase().includes('application/json')
    ) {
      throw new Error(
        `${url.split('?')[0]} returned a non-JSON response. ` +
          'The request may be reaching the frontend instead of the backend.'
      );
    }

    return await response.json();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      throw new Error(
        `${url.split('?')[0]} timed out after ${timeoutMs / 1000} seconds.`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentUser, setCurrentUser] =
    useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] =
    useState(false);
  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);

  const [isDemoSession, setIsDemoSession] = useState(false);
  const [sandboxRole, setSandboxRole] =
    useState<UserRole>('employer');
  const [selectedIndustry, setSelectedIndustry] =
    useState<IndustryType>('construction');

  const [sessionId] = useState(
    () =>
      `judge-session-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`
  );

  const [sandboxData, setSandboxData] =
    useState<SandboxDataset | null>(null);
  const [activeSandboxWorkerId, setActiveSandboxWorkerId] =
    useState('');

  const [workspaceError, setWorkspaceError] =
    useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] =
    useState(false);
  const [profileError, setProfileError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let authRevision = 0;

    Promise.resolve()
      .then(() => testFirestoreConnection())
      .then((connected) => {
        if (active) {
          setFirestoreConnected(connected);
        }
      })
      .catch((error: unknown) => {
        console.error('Firestore connection check failed:', error);

        if (active) {
          setFirestoreConnected(false);
        }
      });

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        const revision = ++authRevision;

        if (!active) return;

        setCurrentUser(user);
        setUserProfile(null);
        setProfileError(null);

        if (!user) {
          setAuthLoading(false);
          return;
        }

        setAuthLoading(true);

        try {
          const idToken = await user.getIdToken();

          if (!active || revision !== authRevision) return;

          const data = await fetchJson('/api/auth/resolve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (
            !data ||
            typeof data.organisationId !== 'string' ||
            !data.organisationId.trim() ||
            (data.role !== 'worker' &&
              data.role !== 'employer')
          ) {
            throw new Error(
              'The server did not return a valid workplace and role. ' +
                'Access has not been granted.'
            );
          }

          if (!active || revision !== authRevision) return;

          setUserProfile({
            id: user.uid,
            organisationId: data.organisationId,
            role: data.role as UserRole,
            email: user.email || '',
            displayName:
              user.displayName ||
              user.email?.split('@')[0] ||
              'Member',
          });
        } catch (error: unknown) {
          console.error('Server profile resolution failed:', error);

          if (active && revision === authRevision) {
            setUserProfile(null);
            setProfileError(getErrorMessage(error));
          }
        } finally {
          if (active && revision === authRevision) {
            setAuthLoading(false);
          }
        }
      },
      (error) => {
        console.error('Firebase authentication failed:', error);

        if (active) {
          setCurrentUser(null);
          setUserProfile(null);
          setProfileError(getErrorMessage(error));
          setAuthLoading(false);
        }
      }
    );

    return () => {
      active = false;
      authRevision += 1;
      unsubscribe();
    };
  }, []);

  const refreshSandboxData = useCallback(async () => {
    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const query = new URLSearchParams({
        sessionId,
        industry: selectedIndustry,
      });

      const json = await fetchJson(
        `/api/sandbox/state?${query.toString()}`
      );

      const dataset = json?.data;

      if (
        !dataset ||
        !Array.isArray(dataset.workers) ||
        !dataset.organisation ||
        typeof dataset.organisation.name !== 'string'
      ) {
        throw new Error(
          'The workspace API returned an unexpected dataset. ' +
            'Expected data.workers and data.organisation.'
        );
      }

      setSandboxData(dataset as SandboxDataset);

      setActiveSandboxWorkerId((previousId) =>
        dataset.workers.some(
          (worker: { id: string }) =>
            worker.id === previousId
        )
          ? previousId
          : dataset.workers[0]?.id || ''
      );
    } catch (error: unknown) {
      console.error('Workspace loading failed:', error);
      setWorkspaceError(getErrorMessage(error));
    } finally {
      setWorkspaceLoading(false);
    }
  }, [sessionId, selectedIndustry]);

  useEffect(() => {
    if (isDemoSession || (currentUser && userProfile)) {
      setSandboxData(null);
      setActiveSandboxWorkerId('');
      void refreshSandboxData();
    }
  }, [
    isDemoSession,
    currentUser,
    userProfile,
    refreshSandboxData,
  ]);

  useEffect(() => {
    if (!sandboxData?.workers.length) return;

    const workerExists = sandboxData.workers.some(
      (worker) => worker.id === activeSandboxWorkerId
    );

    if (!workerExists) {
      setActiveSandboxWorkerId(sandboxData.workers[0].id);
    }
  }, [sandboxData, activeSandboxWorkerId]);

  const updateSandboxData = (
    updater: (prev: SandboxDataset) => SandboxDataset
  ) => {
    setSandboxData((previous) =>
      previous ? updater(previous) : previous
    );
  };

  const resetSandboxData = async () => {
    setWorkspaceError(null);
    setWorkspaceLoading(true);

    try {
      const response = await fetch('/api/sandbox/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          industry: selectedIndustry,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        throw new Error(
          `Sandbox reset returned HTTP ${response.status}.`
        );
      }

      await refreshSandboxData();
    } catch (error: unknown) {
      console.error('Sandbox reset failed:', error);
      setWorkspaceError(getErrorMessage(error));
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    setProfileError(null);
    setWorkspaceError(null);

    try {
      await signInWithPopup(auth, provider);
      setIsDemoSession(false);
    } catch (error: unknown) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: unknown) {
      console.error('Firebase sign-out failed:', error);
      setProfileError(
        'Sign-out failed. Please try again before leaving this device.'
      );
      return;
    }

    setCurrentUser(null);
    setUserProfile(null);
    setIsDemoSession(false);
    setSandboxRole('employer');
    setSandboxData(null);
    setActiveSandboxWorkerId('');
    setWorkspaceError(null);
    setProfileError(null);
  };

  const enterDemo = (role: UserRole = 'employer') => {
    setSandboxRole(role);
    setWorkspaceError(null);
    setProfileError(null);
    setSandboxData(null);
    setActiveSandboxWorkerId('');
    setIsDemoSession(true);
  };

  const exitDemo = () => {
    setIsDemoSession(false);
    setSandboxData(null);
    setActiveSandboxWorkerId('');
    setWorkspaceError(null);
  };

  const isAuthenticated =
    isDemoSession || Boolean(currentUser && userProfile);

  // Demo perspective is used only inside the demo workspace.
  // Real authenticated access requires a server-resolved profile.
  const effectiveRole: UserRole = isDemoSession
    ? sandboxRole
    : userProfile?.role || 'worker';

  const activeWorker = sandboxData?.workers.find(
    (worker) => worker.id === activeSandboxWorkerId
  );

  const effectiveDisplayName = isDemoSession
    ? effectiveRole === 'worker'
      ? activeWorker?.displayName || 'Worker'
      : 'Staffing Manager'
    : userProfile?.displayName ||
      currentUser?.displayName ||
      currentUser?.email?.split('@')[0] ||
      'Member';

  const effectiveOrgName =
    sandboxData?.organisation.name || 'FairShift Organisation';

  const visibleError =
    workspaceError || (!isDemoSession ? profileError : null);

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
      {visibleError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 9999,
            maxWidth: 720,
            margin: '0 auto',
            padding: 16,
            background: '#FFF5EB',
            border: '2px solid #A63D24',
            borderRadius: 4,
            color: '#652A19',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            maxHeight: '45vh',
            overflowY: 'auto',
            overflowWrap: 'anywhere',
          }}
        >
          <strong>FairShift could not finish loading.</strong>

          <p style={{ margin: '8px 0 12px' }}>
            {visibleError}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {workspaceError && (
              <button
                type="button"
                disabled={workspaceLoading}
                onClick={() => void refreshSandboxData()}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #652A19',
                  borderRadius: 3,
                  background: '#FFFDF5',
                  color: '#652A19',
                  cursor: workspaceLoading
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                {workspaceLoading ? 'Retrying...' : 'Retry'}
              </button>
            )}

            {isDemoSession && (
              <button
                type="button"
                onClick={exitDemo}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #652A19',
                  borderRadius: 3,
                  background: '#FFFDF5',
                  color: '#652A19',
                  cursor: 'pointer',
                }}
              >
                Exit demo
              </button>
            )}

            {!isDemoSession && (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                style={{
                  padding: '8px 14px',
                  border: '1px solid #652A19',
                  borderRadius: 3,
                  background: '#FFFDF5',
                  color: '#652A19',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      {children}
    </AuthContext.Provider>
  );
};