/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './config.ts';
import { handleFirestoreError, OperationType } from './errors.ts';
import {
  Organisation,
  Worker,
  ShiftRequirement,
  Assignment,
  Proposal,
  AuditEvent,
  UserProfile,
} from '../domain/types.ts';

// User Profile
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.id}`;
  try {
    await setDoc(doc(db, 'users', profile.id), profile);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Organisation
export async function getOrganisation(orgId: string): Promise<Organisation | null> {
  const path = `organisations/${orgId}`;
  try {
    const snap = await getDoc(doc(db, 'organisations', orgId));
    return snap.exists() ? (snap.data() as Organisation) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Workers
export async function getOrgWorkers(orgId: string): Promise<Worker[]> {
  const path = `organisations/${orgId}/workers`;
  try {
    const snap = await getDocs(collection(db, 'organisations', orgId, 'workers'));
    return snap.docs.map(d => d.data() as Worker);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function updateWorkerAvailability(
  orgId: string,
  workerId: string,
  availability: Worker['availabilityIntervals'],
  preferred: Worker['preferredIntervals']
): Promise<void> {
  const path = `organisations/${orgId}/workers/${workerId}`;
  try {
    await updateDoc(doc(db, 'organisations', orgId, 'workers', workerId), {
      availabilityIntervals: availability,
      preferredIntervals: preferred,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Shifts
export async function getOrgShifts(orgId: string): Promise<ShiftRequirement[]> {
  const path = `organisations/${orgId}/shiftRequirements`;
  try {
    const snap = await getDocs(collection(db, 'organisations', orgId, 'shiftRequirements'));
    return snap.docs.map(d => d.data() as ShiftRequirement);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Assignments
export async function getOrgAssignments(orgId: string): Promise<Assignment[]> {
  const path = `organisations/${orgId}/assignments`;
  try {
    const snap = await getDocs(collection(db, 'organisations', orgId, 'assignments'));
    return snap.docs.map(d => d.data() as Assignment);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getWorkerAssignments(orgId: string, workerId: string): Promise<Assignment[]> {
  const path = `organisations/${orgId}/assignments`;
  try {
    const q = query(
      collection(db, 'organisations', orgId, 'assignments'),
      where('workerId', '==', workerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Assignment);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Proposals
export async function getOrgProposals(orgId: string): Promise<Proposal[]> {
  const path = `organisations/${orgId}/proposals`;
  try {
    const snap = await getDocs(collection(db, 'organisations', orgId, 'proposals'));
    return snap.docs.map(d => d.data() as Proposal);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveProposal(orgId: string, proposal: Proposal): Promise<void> {
  const path = `organisations/${orgId}/proposals/${proposal.id}`;
  try {
    await setDoc(doc(db, 'organisations', orgId, 'proposals', proposal.id), proposal);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Audit
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const path = `organisations/${event.organisationId}/auditEvents/${event.id}`;
  try {
    await setDoc(
      doc(db, 'organisations', event.organisationId, 'auditEvents', event.id),
      event
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getOrgAuditEvents(orgId: string): Promise<AuditEvent[]> {
  const path = `organisations/${orgId}/auditEvents`;
  try {
    const snap = await getDocs(collection(db, 'organisations', orgId, 'auditEvents'));
    return snap.docs.map(d => d.data() as AuditEvent);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
