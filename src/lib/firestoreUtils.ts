import {
  setDoc,
  DocumentReference,
  SetOptions,
  WriteBatch,
} from 'firebase/firestore';
import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively sanitizes data before writing to Firestore by removing all keys with `undefined` values.
 * Firestore throws a runtime FirebaseError if any field or nested array item contains `undefined`.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === null || val === undefined) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean as T;
  }
  return val;
}

/**
 * Safe wrapper around setDoc that automatically purges `undefined` properties
 * preventing FirebaseError "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export async function safeSetDoc(
  docRef: DocumentReference,
  data: any,
  options?: SetOptions
) {
  const sanitized = sanitizeForFirestore(data);
  try {
    if (options) {
      return await setDoc(docRef, sanitized, options);
    }
    return await setDoc(docRef, sanitized);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, docRef.path);
    }
    throw err;
  }
}

/**
 * Safe wrapper around batch.set that purges `undefined` values.
 */
export function safeBatchSet(
  batch: WriteBatch,
  docRef: DocumentReference,
  data: any,
  options?: SetOptions
) {
  const sanitized = sanitizeForFirestore(data);
  if (options) {
    batch.set(docRef, sanitized, options);
  } else {
    batch.set(docRef, sanitized);
  }
}
