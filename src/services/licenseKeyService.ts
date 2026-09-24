import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { LicenseKeyRecord } from '../types';

const LOCAL_STORAGE_KEY = 'flowapp_v4_license_keys_cache';

export const PLAN_CONFIGS: Record<
  LicenseKeyRecord['plan'],
  { nameAr: string; nameEn: string; durationDays: number; priceSAR: number }
> = {
  '1M': { nameAr: 'اشتراك شهري (30 يوم)', nameEn: 'Monthly (30 Days)', durationDays: 30, priceSAR: 49 },
  '3M': { nameAr: 'اشتراك ربع سنوي (90 يوم)', nameEn: 'Quarterly (90 Days)', durationDays: 90, priceSAR: 129 },
  '6M': { nameAr: 'اشتراك نصف سنوي (180 يوم)', nameEn: 'Half-Year (180 Days)', durationDays: 180, priceSAR: 229 },
  '1Y': { nameAr: 'اشتراك سنوي (سنة كاملة)', nameEn: 'Annual (365 Days)', durationDays: 365, priceSAR: 399 },
  'LIFE': { nameAr: 'رخصة دائمة مدى الحياة', nameEn: 'Lifetime License', durationDays: 36500, priceSAR: 890 },
};

/**
 * Generates a clean, unambiguous cryptographic license key.
 * Format: FLOW-XXXX-XXXX-XXXX (e.g. FLOW-8K9P-2M4N-7X1Y)
 */
export function generateLicenseCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes confusing 0, O, 1, I
  const segment = (len: number) => {
    let result = '';
    const array = new Uint8Array(len);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < len; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < len; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  };

  return `FLOW-${segment(4)}-${segment(4)}-${segment(4)}`;
}

/**
 * Helper to retrieve locally cached keys
 */
export function getLocalKeysCache(): LicenseKeyRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Helper to update local keys cache
 */
export function saveLocalKeysCache(keys: LicenseKeyRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.warn('Failed to write keys cache to localStorage:', e);
  }
}

/**
 * 1. Admin Function: Generate and save a new unique license key
 */
export async function createLicenseKey(
  plan: LicenseKeyRecord['plan'] = '1Y',
  notes: string = '',
  adminEmail: string = 'admin'
): Promise<{ success: boolean; record?: LicenseKeyRecord; error?: string }> {
  try {
    const code = generateLicenseCode();
    const meta = PLAN_CONFIGS[plan] || PLAN_CONFIGS['1Y'];

    const newRecord: LicenseKeyRecord = {
      id: code,
      key: code,
      is_used: false,
      plan: plan,
      duration_days: meta.durationDays,
      created_at: new Date().toISOString(),
      created_by: adminEmail,
      used_at: null,
      used_by: null,
      user_email: null,
      notes: notes.trim(),
    };

    // 1. Direct Supabase insert: Save new key directly in Supabase table `license_keys`
    try {
      const { data: _sbData, error: sbError } = await supabase
        .from('license_keys')
        .insert([
          {
            key: code,
            is_used: false,
            plan: plan,
            duration_days: meta.durationDays,
            created_at: newRecord.created_at,
            created_by: adminEmail,
            notes: notes.trim() || null,
          },
        ]);

      if (sbError) {
        console.warn('Supabase license key insert notice/error:', sbError);
      } else {
        console.log('License key successfully inserted into Supabase:', code);
      }
    } catch (sbErr) {
      console.warn('Supabase key insert execution error:', sbErr);
    }

    // 2. Save to Firestore collection `license_keys`
    if (db) {
      try {
        const keyRef = doc(db, 'license_keys', code);
        await setDoc(keyRef, newRecord);
      } catch (err: any) {
        console.warn('Firestore key creation deferred/offline:', err);
      }
    }

    // Always update local cache
    const existing = getLocalKeysCache();
    saveLocalKeysCache([newRecord, ...existing.filter((k) => k.key !== code)]);

    return { success: true, record: newRecord };
  } catch (error: any) {
    console.error('Error generating license key:', error);
    return { success: false, error: error.message || 'حدث خطأ أثناء توليد الكود' };
  }
}

/**
 * Admin Function: Batch generate multiple license keys at once
 */
export async function batchCreateLicenseKeys(
  count: number = 5,
  plan: LicenseKeyRecord['plan'] = '1Y',
  notes: string = '',
  adminEmail: string = 'admin'
): Promise<LicenseKeyRecord[]> {
  const generated: LicenseKeyRecord[] = [];
  for (let i = 0; i < count; i++) {
    const res = await createLicenseKey(plan, notes, adminEmail);
    if (res.success && res.record) {
      generated.push(res.record);
    }
  }
  return generated;
}

export const generateBatchLicenseKeys = batchCreateLicenseKeys;

/**
 * Admin Function: Fetch all license keys from Firestore with local cache merge
 */
export async function fetchAllLicenseKeys(): Promise<LicenseKeyRecord[]> {
  const localList = getLocalKeysCache();

  if (!db) {
    return localList;
  }

  try {
    const keysCol = collection(db, 'license_keys');
    const snapshot = await getDocs(keysCol);
    const cloudKeys: LicenseKeyRecord[] = [];

    snapshot.forEach((snap) => {
      const data = snap.data() as LicenseKeyRecord;
      cloudKeys.push({ ...data, id: snap.id, key: data.key || snap.id });
    });

    // Merge cloud and local cache (cloud takes priority)
    const map = new Map<string, LicenseKeyRecord>();
    localList.forEach((k) => map.set(k.key, k));
    cloudKeys.forEach((k) => map.set(k.key, k));

    // Also fetch from Supabase table `license_keys`
    try {
      const { data: sbKeys, error: sbErr } = await supabase
        .from('license_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (!sbErr && Array.isArray(sbKeys) && sbKeys.length > 0) {
        sbKeys.forEach((item: any) => {
          if (item && item.key) {
            map.set(item.key, {
              id: item.id || item.key,
              key: item.key,
              is_used: Boolean(item.is_used),
              plan: item.plan || '1Y',
              duration_days: item.duration_days || 365,
              created_at: item.created_at || new Date().toISOString(),
              created_by: item.created_by || 'admin',
              used_at: item.used_at || null,
              used_by: item.used_by || null,
              user_email: item.user_email || null,
              notes: item.notes || '',
            });
          }
        });
      }
    } catch (e) {
      console.warn('Supabase fetch keys notice:', e);
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    saveLocalKeysCache(merged);
    return merged;
  } catch (error) {
    console.warn('Could not fetch license keys from cloud (using local cache):', error);
    return localList;
  }
}

/**
 * Admin Function: Delete or revoke an unused license key
 */
export async function deleteLicenseKey(keyCode: string): Promise<boolean> {
  const cleanCode = keyCode.trim().toUpperCase();
  try {
    // Delete from Supabase
    try {
      await supabase.from('license_keys').delete().eq('key', cleanCode);
    } catch (sbDelErr) {
      console.warn('Supabase key delete notice:', sbDelErr);
    }

    if (db) {
      try {
        const keyRef = doc(db, 'license_keys', cleanCode);
        await deleteDoc(keyRef);
      } catch (e) {
        console.warn('Firestore key delete error:', e);
      }
    }

    const current = getLocalKeysCache();
    saveLocalKeysCache(current.filter((k) => k.key !== cleanCode));
    return true;
  } catch {
    return false;
  }
}

/**
 * 2. User Activation Function:
 * Verifies code against database, ensures is_used == false, marks as used,
 * and returns full subscription upgrade information.
 */
export async function verifyAndRedeemLicenseKey(
  inputCode: string,
  userId: string,
  userEmail?: string
): Promise<{
  success: boolean;
  message: string;
  planName?: string;
  planCode?: LicenseKeyRecord['plan'];
  durationDays?: number;
  expiresAt?: string | null;
  cleanKey?: string;
}> {
  if (!inputCode || typeof inputCode !== 'string') {
    return { success: false, message: 'يرجى كتابة كود التفعيل أولاً.' };
  }

  const cleanKey = inputCode.trim().toUpperCase().replace(/\s+/g, '');

  // 1. Check in Cloud Firestore first
  let keyRecord: LicenseKeyRecord | null = null;

  if (db) {
    try {
      const keyRef = doc(db, 'license_keys', cleanKey);
      const snap = await getDoc(keyRef);
      if (snap.exists()) {
        keyRecord = snap.data() as LicenseKeyRecord;
      }
    } catch (cloudErr) {
      console.warn('Cloud lookup error, checking local registry:', cloudErr);
    }
  }

  // Also check in Supabase if not found in Firestore
  if (!keyRecord) {
    try {
      const { data: sbRow, error: sbLookupErr } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key', cleanKey)
        .maybeSingle();

      if (!sbLookupErr && sbRow && sbRow.key) {
        keyRecord = {
          id: sbRow.id || sbRow.key,
          key: sbRow.key,
          is_used: Boolean(sbRow.is_used),
          plan: sbRow.plan || '1Y',
          duration_days: sbRow.duration_days || 365,
          created_at: sbRow.created_at || new Date().toISOString(),
          created_by: sbRow.created_by || 'admin',
          used_at: sbRow.used_at || null,
          used_by: sbRow.used_by || null,
          user_email: sbRow.user_email || null,
          notes: sbRow.notes || '',
        };
      }
    } catch (e) {
      console.warn('Supabase key lookup notice:', e);
    }
  }

  // 2. Check in local cache if not found yet
  if (!keyRecord) {
    const localList = getLocalKeysCache();
    const found = localList.find((k) => k.key.toUpperCase() === cleanKey);
    if (found) {
      keyRecord = found;
    }
  }

  // If still not found, check if it matches the legacy algorithmic offline pattern
  // (e.g. FLOW-PRO-1Y-XXXX-XXXX) for backwards compatibility with previously distributed cards
  if (!keyRecord) {
    if (cleanKey.startsWith('FLOW-PRO-')) {
      const parts = cleanKey.split('-');
      if (parts.length >= 4) {
        const planCode = (parts[2] as LicenseKeyRecord['plan']) || '1Y';
        const meta = PLAN_CONFIGS[planCode] || PLAN_CONFIGS['1Y'];
        const isLifetime = planCode === 'LIFE';
        const now = new Date();
        const expiresAt = isLifetime
          ? null
          : new Date(now.getTime() + meta.durationDays * 24 * 60 * 60 * 1000).toISOString();

        return {
          success: true,
          message: `تم التحقق وتفعيل ${meta.nameAr} بنجاح!`,
          planName: meta.nameAr,
          planCode: planCode,
          durationDays: meta.durationDays,
          expiresAt: expiresAt,
          cleanKey: cleanKey,
        };
      }
    }

    return {
      success: false,
      message: 'كود التفعيل غير صالح أو غير مسجل في قاعدة البيانات. تأكد من إدخال الكود بصيغة FLOW-XXXX-XXXX-XXXX.',
    };
  }

  // 3. Check if key has already been used
  if (keyRecord.is_used) {
    const usedDateStr = keyRecord.used_at
      ? new Date(keyRecord.used_at).toLocaleDateString('ar-SA', { dateStyle: 'medium' })
      : '';
    return {
      success: false,
      message: `عذراً، هذا الكود تم استخدامه وتفعيله مسبقاً ${
        usedDateStr ? `بتاريخ (${usedDateStr})` : ''
      }. لا يمكن إعادة استخدام نفس الكرت أكثر من مرة.`,
    };
  }

  // 4. Update the key state to is_used = true with user_id
  const now = new Date();
  const planMeta = PLAN_CONFIGS[keyRecord.plan] || PLAN_CONFIGS['1Y'];
  const isLifetime = keyRecord.plan === 'LIFE';
  const expiresAt = isLifetime
    ? null
    : new Date(now.getTime() + planMeta.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const updatedRecord: LicenseKeyRecord = {
    ...keyRecord,
    is_used: true,
    used_at: now.toISOString(),
    used_by: userId || 'local_user',
    user_email: userEmail || null,
  };

  // Persist update in Supabase
  try {
    await supabase
      .from('license_keys')
      .update({
        is_used: true,
        used_at: updatedRecord.used_at,
        used_by: updatedRecord.used_by,
        user_email: updatedRecord.user_email,
      })
      .eq('key', cleanKey);
  } catch (sbUpdateErr) {
    console.warn('Failed to update key in Supabase:', sbUpdateErr);
  }

  // Persist update in Firestore
  if (db) {
    try {
      const keyRef = doc(db, 'license_keys', cleanKey);
      await updateDoc(keyRef, {
        is_used: true,
        used_at: updatedRecord.used_at,
        used_by: updatedRecord.used_by,
        user_email: updatedRecord.user_email,
      });
    } catch (updateErr) {
      console.warn('Failed to update key in Firestore (offline mode active):', updateErr);
    }
  }

  // Update local cache
  const localList = getLocalKeysCache();
  saveLocalKeysCache(
    localList.map((k) => (k.key === cleanKey ? updatedRecord : k))
  );

  return {
    success: true,
    message: `تهانينا! تم تفعيل ${planMeta.nameAr} بنجاح. حسابك الآن برتبة FlowApp Pro غير محدودة.`,
    planName: planMeta.nameAr,
    planCode: keyRecord.plan,
    durationDays: planMeta.durationDays,
    expiresAt: expiresAt,
    cleanKey: cleanKey,
  };
}
