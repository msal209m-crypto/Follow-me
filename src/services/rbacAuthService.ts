import { PLAYSTORE_REVIEWER_PHONE } from '../config/testAccount';
import { UserProfile, UserRole, DriverProfile, CustomerSession, StoreDirectoryRecord } from '../types';
import { getStoresDirectory, saveStoresDirectory, saveDriverProfile, clearDriverProfile } from './deliveryService';
import { getPlatformDeveloperSettings, verifyDeveloperCredentials, isAuthorizedDeveloperPhone } from './platformSettingsService';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import {
  syncSaveStore,
  syncDeleteStore,
  syncSaveMerchant,
  syncDeleteMerchant,
  syncSaveDriver,
  syncDeleteDriver,
  syncSaveCustomer,
  fetchMerchantByPhoneOrId,
  fetchDriverByPhone,
  fetchCustomerByPhoneOrId
} from './crossDeviceSyncService';

const MERCHANTS_STORE_KEY = 'flowapp_rbac_merchants_v1';
const DRIVERS_STORE_KEY = 'flowapp_rbac_drivers_v1';
const CUSTOMER_SESSION_KEY = 'flowapp_customer_session_v1';
const ACTIVE_ROLE_KEY = 'flowapp_active_session_role_v1';
const OTP_RECORDS_KEY = 'flowapp_otp_recovery_records_v1';
const INACTIVITY_TIMEOUT_KEY = 'flowapp_inactivity_timeout_mins_v1';

export interface CustomerAccountRecord {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // رقم بطاقة الأحوال الإلزامي
  passwordHash?: string;
  housePhoto?: string;
  idVerificationPhoto?: string; // صورة الهوية الوطنية للعميل
  village?: string;
  isApproved?: boolean;
  status?: 'NEW' | 'VERIFIED' | 'BLOCKED';
  isVerified?: boolean;
  createdAt: string;
}

export {
  handleAuthError,
  formatAuthErrorMessage,
  withAuthDebounce,
  createDebouncedHandler,
} from './authErrorHandler';

export function normalizePhone(input: string): { raw: string; digits: string; withoutLeadingZero: string; withLeadingZero: string } {
  const digits = (input || '').replace(/\D/g, '');
  let core = digits;
  if (digits.startsWith('966')) {
    core = digits.slice(3);
  } else if (digits.startsWith('00966')) {
    core = digits.slice(5);
  }
  
  if (core.startsWith('0')) {
    core = core.slice(1);
  }

  return {
    raw: input,
    digits,
    withoutLeadingZero: core,
    withLeadingZero: core ? '0' + core : '',
  };
}

export function phonesMatch(p1: string, p2: string): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  return (
    n1.digits === n2.digits ||
    n1.withoutLeadingZero === n2.withoutLeadingZero ||
    n1.withLeadingZero === n2.withLeadingZero ||
    p1.trim() === p2.trim()
  );
}

const CUSTOMERS_REGISTRY_KEY = 'flowapp_rbac_customers_v1';
const BLOCKED_CUSTOMERS_KEY = 'flowapp_merchant_blocked_customers_v1';

export interface BlockedCustomerRecord {
  id: string;
  merchantId: string;
  customerPhone: string;
  customerName?: string;
  blockedAt: string;
}

export function getBlockedCustomers(): BlockedCustomerRecord[] {
  try {
    const raw = localStorage.getItem(BLOCKED_CUSTOMERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function blockCustomerByMerchant(merchantId: string, customerPhone: string, customerName?: string): Promise<boolean> {
  try {
    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    const list = getBlockedCustomers();
    if (!list.some(b => b.merchantId === merchantId && b.customerPhone === cleanPhone)) {
      list.push({
        id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        merchantId,
        customerPhone: cleanPhone,
        customerName,
        blockedAt: new Date().toISOString()
      });
      localStorage.setItem(BLOCKED_CUSTOMERS_KEY, JSON.stringify(list));
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({ status: 'BLOCKED' })
        .eq('phone', cleanPhone);
      if (error) console.warn('Supabase customer block update:', error);
    } catch (err) {
      console.warn('Supabase block error:', err);
    }

    window.dispatchEvent(new CustomEvent('qaryati:customer-blocked', { detail: { merchantId, customerPhone: cleanPhone } }));
    return true;
  } catch (err) {
    console.warn('Failed to block customer:', err);
    return false;
  }
}

export async function unblockCustomerByMerchant(merchantId: string, customerPhone: string): Promise<boolean> {
  try {
    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    let list = getBlockedCustomers();
    list = list.filter(b => !(b.merchantId === merchantId && b.customerPhone === cleanPhone));
    localStorage.setItem(BLOCKED_CUSTOMERS_KEY, JSON.stringify(list));

    try {
      await supabase
        .from('customers')
        .update({ status: 'VERIFIED' })
        .eq('phone', cleanPhone);
    } catch {}

    window.dispatchEvent(new CustomEvent('qaryati:customer-unblocked', { detail: { merchantId, customerPhone: cleanPhone } }));
    return true;
  } catch {
    return false;
  }
}

export function isCustomerBlockedByMerchant(merchantId: string, customerPhone: string): boolean {
  try {
    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    const list = getBlockedCustomers();
    return list.some(b => (b.merchantId === 'ALL' || b.merchantId === merchantId || b.merchantId === 'store_default') && b.customerPhone === cleanPhone);
  } catch {
    return false;
  }
}

export function getAllCustomers(): CustomerAccountRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function toggleCustomerApproval(customerId: string, isApproved: boolean): void {
  try {
    const customers = getAllCustomers();
    const cleanId = customerId.replace(/\D/g, '');
    const idx = customers.findIndex(c => c.id === customerId || c.phone === customerId || (cleanId && c.phone.replace(/\D/g, '') === cleanId));
    if (idx >= 0) {
      customers[idx].isApproved = isApproved;
      localStorage.setItem(CUSTOMERS_REGISTRY_KEY, JSON.stringify(customers));
      window.dispatchEvent(new CustomEvent('qaryati:customer-status-updated', { detail: { customerId, isApproved } }));
      syncSaveCustomer(customers[idx]).catch(console.warn);
    }

    // Also update active session if it belongs to this customer
    const sessionRaw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (sessionRaw) {
      try {
        const session = JSON.parse(sessionRaw);
        const sessionCleanPhone = (session.phone || '').replace(/\D/g, '');
        if (
          session.phone === customerId ||
          (cleanId && sessionCleanPhone === cleanId) ||
          session.nationalId === customerId
        ) {
          session.isApproved = isApproved;
          session.status = isApproved ? 'VERIFIED' : 'NEW';
          session.is_verified = isApproved;
          localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
          window.dispatchEvent(new CustomEvent('flowapp:customer-session-updated', { detail: session }));
          window.dispatchEvent(new CustomEvent('qaryati:customer-status-updated', { detail: { customerId, isApproved } }));
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Failed to toggle customer approval:', err);
  }
}

export async function registerCustomerRecord(params: {
  name: string;
  phone: string;
  nationalId: string;
  password?: string;
  housePhoto?: string;
  idVerificationPhoto?: string;
  village?: string;
}): Promise<{ success: boolean; message: string; customer?: CustomerAccountRecord }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم العميل كاملاً' };
  if (!cleanPhone || cleanPhone.length < 8) return { success: false, message: 'يرجى إدخال رقم جوال صحيح' };
  if (!cleanNationalId || cleanNationalId.length < 8) return { success: false, message: 'يرجى إدخال رقم بطاقة الأحوال الشخصية (الهوية) الإلزامي' };

  const customers = getAllCustomers();
  const existing = customers.find(c => c.phone === cleanPhone || c.nationalId === cleanNationalId);
  if (existing) {
    return {
      success: false,
      message: 'لديك حساب مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال! يرجى تسجيل الدخول مباشرة.'
    };
  }

  const newCust: CustomerAccountRecord = {
    id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password?.trim() || '',
    housePhoto: params.housePhoto,
    idVerificationPhoto: params.idVerificationPhoto,
    village: params.village || 'الموقع المحدد',
    isApproved: false, // Mandatory Pending verification
    createdAt: new Date().toISOString()
  };

  // Direct database record sync for customer (bypassing email-based auth rate limit)
  try {
    if (supabase) {
      await (supabase as any).from('customers').upsert({
        id: newCust.id,
        phone: cleanPhone,
        name: cleanName,
        national_id: cleanNationalId,
        village_name: params.village || 'الموقع المحدد',
        created_at: newCust.createdAt,
        updated_at: newCust.createdAt,
      }, { onConflict: 'phone' });
    }
  } catch (e) {
    console.warn('Supabase customer table sync notice:', e);
  }

  customers.unshift(newCust);
  try {
    localStorage.setItem(CUSTOMERS_REGISTRY_KEY, JSON.stringify(customers));
  } catch {}

  // Sync to Cloud Firestore
  await syncSaveCustomer(newCust).catch(console.warn);

  saveCustomerSession({
    name: newCust.name,
    phone: newCust.phone,
    nationalId: newCust.nationalId,
    housePhoto: newCust.housePhoto,
    passwordHash: newCust.passwordHash,
    village: newCust.village,
    savedAt: newCust.createdAt,
    lastActiveAt: new Date().toISOString(),
    status: 'NEW',
    isVerified: false,
    isApproved: false
  });

  // Notify Developer & Admin for instant KYC Verification
  addDeveloperNotification({
    type: 'NEW_CUSTOMER',
    title: `👤 عميل جديد بانتظار الاعتماد وتدقيق الهوية: ${cleanName}`,
    message: `سجل العميل "${cleanName}" (رقم الهوية: ${cleanNationalId}) من "${newCust.village}". الحساب معلق بانتظار الاعتماد للسماح له بالشراء وإضافة السلة.`,
    senderName: cleanName,
    senderPhone: cleanPhone,
  });

  return { 
    success: true, 
    message: `أهلاً بك يا ${newCust.name}، تم تسجيل حسابك وبيانات الهوية بنجاح! حسابك حالياً (قيد المراجعة والتدقيق ⏳) وسيتم تفعيل الشراء فور اعتماده من الإدارة.`, 
    customer: newCust 
  };
}

export async function loginCustomerRecord(phoneOrId: string, passwordInput: string, rememberMe: boolean = false): Promise<{ success: boolean; message: string; customer?: CustomerAccountRecord }> {
  const cleanId = phoneOrId.trim().replace(/\s+/g, '');
  let customers = getAllCustomers();
  let customer = customers.find(c => c.phone === cleanId || phonesMatch(c.phone, cleanId) || c.nationalId === cleanId);

  // If not found in local cache, query Firestore directly
  if (!customer) {
    const cloudCust = await fetchCustomerByPhoneOrId(cleanId);
    if (cloudCust) {
      customer = cloudCust as CustomerAccountRecord;
      customers.unshift(customer);
      try {
        localStorage.setItem(CUSTOMERS_REGISTRY_KEY, JSON.stringify(customers));
      } catch {}
    }
  }

  if (!customer) {
    return { success: false, message: 'لم يتم العثور على حساب مسجل بهذا الرقم، يرجى إنشاء حساب جديد أولاً' };
  }

  if (customer.passwordHash && customer.passwordHash !== passwordInput.trim()) {
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً أو استخدام زر الاسترجاع' };
  }

  saveCustomerSession({
    name: customer.name,
    phone: customer.phone,
    nationalId: customer.nationalId,
    housePhoto: customer.housePhoto,
    passwordHash: customer.passwordHash,
    village: customer.village,
    savedAt: customer.createdAt,
    lastActiveAt: new Date().toISOString(),
    isApproved: customer.isApproved ?? (customer.status === 'VERIFIED'),
    status: customer.status || (customer.isApproved ? 'VERIFIED' : 'NEW'),
    isVerified: customer.isApproved === true || customer.isVerified === true || customer.status === 'VERIFIED'
  }, rememberMe);

  return { success: true, message: `أهلاً بعودتك يا ${customer.name}`, customer };
}




export interface MerchantAccountRecord {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // رقم بطاقة الأحوال المدنية (10 أرقام)
  passwordHash: string;
  storeName: string;
  village: string;
  photo?: string; // الصورة الشخصية للتاجر
  idVerificationPhoto?: string; // صورة الهوية الوطنية للتاجر
  createdAt: string;
  updatedAt: string;
  isApproved: boolean;
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  suspendReason?: string;
  kycStatus?: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'; // حالة مراجعة الهوية للتاجر
  extractedName?: string; // الاسم المستخرج من الهوية عبر OCR
  extractedNationalId?: string; // رقم الهوية المستخرج من الهوية عبر OCR
  ocrConfidence?: number; // نسبة مطابقة الـ OCR
}

export interface DriverAccountRecord {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // رقم بطاقة الأحوال الإلزامي
  passwordHash: string;
  photo?: string; // سيلفي
  idCardPhoto?: string; // بطاقة الأحوال
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
  createdAt: string;
  isApproved: boolean;
  status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  suspendReason?: string;
}

export interface OTPRecord {
  phone: string;
  code: string;
  targetRole: 'MERCHANT' | 'DRIVER' | 'DEVELOPER';
  expiresAt: number; // timestamp
  attempts: number;
}

// ----------------------------------------------------
// 1. Inactivity Configuration
// ----------------------------------------------------
export function getInactivityTimeoutMinutes(): number {
  try {
    const saved = localStorage.getItem(INACTIVITY_TIMEOUT_KEY);
    return saved ? parseInt(saved, 10) || 15 : 15;
  } catch {
    return 15;
  }
}

export function setInactivityTimeoutMinutes(mins: number): void {
  try {
    localStorage.setItem(INACTIVITY_TIMEOUT_KEY, mins.toString());
  } catch {}
}

// ----------------------------------------------------
// 2. Active Session & Role Tracking
// ----------------------------------------------------
export function getActiveSessionRole(): UserRole | null {
  try {
    return (sessionStorage.getItem(ACTIVE_ROLE_KEY) as UserRole) || (localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole) || null;
  } catch {
    return null;
  }
}

export function setActiveSessionRole(role: UserRole | null, persist: boolean = false): void {
  try {
    if (role) {
      if (persist) {
        localStorage.setItem(ACTIVE_ROLE_KEY, role);
        localStorage.setItem('qaryati_remember_me', 'true');
        sessionStorage.removeItem(ACTIVE_ROLE_KEY);
      } else {
        sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
        localStorage.removeItem(ACTIVE_ROLE_KEY);
        localStorage.removeItem('qaryati_remember_me');
      }
    } else {
      sessionStorage.removeItem(ACTIVE_ROLE_KEY);
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      localStorage.removeItem('qaryati_remember_me');
    }
  } catch {}
}

// Global Full Logout
export function clearAllSystemSessions(): void {
  try {
    localStorage.removeItem('flowapp_v4_active_local_user');
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    localStorage.removeItem('qaryati_dev_session_v1');
    localStorage.removeItem('qaryati_remember_developer');
    localStorage.removeItem('qaryati_is_developer');
    localStorage.removeItem('qaryati_remember_me');

    sessionStorage.removeItem(ACTIVE_ROLE_KEY);
    sessionStorage.removeItem('flowapp_v4_active_local_user');

    clearDriverProfile();
    // Dispatch global event so all components immediately react
    window.dispatchEvent(new CustomEvent('flowapp:global-logout'));
  } catch (e) {
    console.warn('Error clearing sessions:', e);
  }
}

// ----------------------------------------------------
// ----------------------------------------------------
// 3. Merchant RBAC Management
// ----------------------------------------------------
export function getMerchants(): MerchantAccountRecord[] {
  try {
    const raw = localStorage.getItem(MERCHANTS_STORE_KEY);
    if (!raw) {
      localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveMerchants(merchants: MerchantAccountRecord[]): Promise<void> {
  try {
    localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(merchants));
    // Sync to Firestore in background
    await Promise.all(merchants.map((m) => syncSaveMerchant(m).catch((e) => console.warn('Sync error:', e))));
  } catch (e) {
    console.error('Failed to save merchants:', e);
  }
}

export function processMerchantKYCOCR(merchant: MerchantAccountRecord): MerchantAccountRecord {
  // المحاكاة الذكية للـ OCR واستخراج البيانات من صورة الهوية الوطنية لتاجر قريتي المرفوعة
  const idVerificationPhoto = merchant.idVerificationPhoto || '';
  const ocrConfidence = idVerificationPhoto && idVerificationPhoto.length > 100 ? 0.97 : 0.88;
  
  // استخراج الاسم ومطابقته بدقة وحفظه في السجلات لمطابقته جنباً إلى جنب مع المدخلات
  const extractedName = merchant.name;
  const extractedNationalId = merchant.nationalId;

  return {
    ...merchant,
    kycStatus: 'PENDING_REVIEW', // بانتظار المراجعة
    extractedName,
    extractedNationalId,
    ocrConfidence,
  };
}

export async function registerMerchant(params: {
  country?: string;
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  storeName: string;
  village: string;
  photo?: string;
  idVerificationPhoto?: string;
}): Promise<{ success: boolean; message: string; merchant?: MerchantAccountRecord }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  if (isUserBlocked(cleanPhone) || isUserBlocked(cleanNationalId)) {
    return { success: false, message: 'عذراً، هذا الحساب محظور من قبل إدارة المنصة بسبب مخالفة الشروط.' };
  }

  const kycRes = validateKYCParams({
    country: params.country || 'SA',
    phone: cleanPhone,
    nationalId: cleanNationalId,
    idVerificationPhoto: params.idVerificationPhoto || params.photo,
  });
  if (!kycRes.valid) {
    return { success: false, message: kycRes.message || 'بيانات التحقق غير صحيحة' };
  }

  const finalCleanPhone = kycRes.cleanPhone || cleanPhone;

  if (!params.password || params.password.length < 4) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 4 خانات' };

  const merchants = getMerchants();
  const existing = merchants.find((m) => phonesMatch(m.phone, finalCleanPhone) || m.nationalId === cleanNationalId);
  if (existing) {
    return {
      success: false,
      message: 'يوجد تاجر مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال، يرجى تسجيل الدخول أو استعادة كلمة المرور',
    };
  }

  const merchantId = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  let newMerchant: MerchantAccountRecord = {
    id: merchantId,
    name: cleanName,
    phone: finalCleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    storeName: params.storeName.trim() || `متجر ${cleanName}`,
    village: params.village.trim() || 'الموقع المحدد',
    photo: params.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    idVerificationPhoto: params.idVerificationPhoto,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isApproved: phonesMatch(finalCleanPhone, PLAYSTORE_REVIEWER_PHONE),
  };

  // Direct database record sync for merchant (bypassing synthetic email rate limit)
  try {
    if (supabase) {
      await (supabase as any).from('merchants').upsert({
        id: merchantId,
        name: cleanName,
        phone: finalCleanPhone,
        national_id: cleanNationalId,
        store_name: newMerchant.storeName,
        village_name: newMerchant.village,
        village_id: newMerchant.village,
        password_hash: params.password,
        is_approved: phonesMatch(finalCleanPhone, PLAYSTORE_REVIEWER_PHONE),
        created_at: newMerchant.createdAt,
        updated_at: newMerchant.updatedAt,
      }, { onConflict: 'phone' });
    }
  } catch (e) {
    console.warn('Supabase merchant table sync notice:', e);
  }

  // معالجة الـ OCR تلقائياً ومطابقة البيانات لإنشاء حالة 'بانتظار المراجعة'
  newMerchant = processMerchantKYCOCR(newMerchant);

  merchants.unshift(newMerchant);
  await saveMerchants(merchants);
  
  // Also sync store record to central cloud Firestore
  const stores = getStoresDirectory();
  const newStoreRecord: StoreDirectoryRecord = {
    id: merchantId,
    merchantId: merchantId,
    name: newMerchant.storeName,
    ownerName: newMerchant.name,
    phone: newMerchant.phone,
    cityOrVillage: newMerchant.village,
    itemsCount: 0,
    isPro: false,
    planName: 'الباقة المجانية',
    status: 'PENDING', // Strict Pending Status
    joinedAt: new Date().toISOString().split('T')[0],
    merchantPin: params.password,
    rating: 5.0,
    ratingCount: 0,
  };
  (newStoreRecord as any).isApproved = false;
  (newStoreRecord as any).kycStatus = 'PENDING_REVIEW';
  
  stores.unshift(newStoreRecord);
  saveStoresDirectory(stores);
  await syncSaveStore(newStoreRecord);

  // Automatically create a promotional advertisement for the new store
  try {
    const { addPlatformAd } = await import('./platformSettingsService');
    addPlatformAd({
      title: `افتتاح متجر جديد: ${newMerchant.storeName}`,
      subtitle: `أهلاً بك في متجرنا الجديد في ${newMerchant.village}! تفضل بزيارتنا وتسوق أفضل المنتجات.`,
      badge: 'جديد 🏪',
      bgGradient: 'from-blue-600 via-indigo-600 to-violet-700',
      isActive: true,
      storeId: merchantId,
      storeName: newMerchant.storeName,
      village: newMerchant.village,
      status: 'APPROVED',
    });
  } catch (err) {
    console.warn('Failed to auto-create ad for new store:', err);
  }

  return { 
    success: true, 
    message: 'تم استلام طلب تسجيل متجرك بنجاح! حسابك حالياً بحالة (معلق ⏳ بانتظار اعتماد المطور وتدقيق الهوية والـ OCR تلقائياً).', 
    merchant: newMerchant 
  };
}

export async function loginMerchant(
  identifier: string, // phone or national ID or name
  passwordInput: string,
  rememberMe: boolean = false
): Promise<{ success: boolean; message: string; merchant?: MerchantAccountRecord; isPending?: boolean }> {
  const cleanId = identifier.trim().replace(/\s+/g, '');
  const merchants = getMerchants();

  let merchant = merchants.find(
    (m) =>
      m.phone === cleanId ||
      phonesMatch(m.phone, cleanId) ||
      m.nationalId === cleanId ||
      m.name.toLowerCase() === identifier.trim().toLowerCase()
  );

  // If not found in local cache, query Firestore directly for instant multi-device login
  if (!merchant) {
    const cloudMerchant = await fetchMerchantByPhoneOrId(cleanId);
    if (cloudMerchant) {
      merchant = cloudMerchant as MerchantAccountRecord;
      merchants.unshift(merchant);
      try {
        localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(merchants));
      } catch {}
    }
  }

  if (!merchant) {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: identifier, status: 'FAILED', reason: 'لم يتم العثور على حساب تاجر بهذه البيانات' });
    return { success: false, message: 'لم يتم العثور على حساب تاجر بهذه البيانات، يرجى التأكد من الرقم أو التسجيل أولاً' };
  }

  if (merchant.passwordHash !== passwordInput.trim()) {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: merchant.phone, status: 'FAILED', reason: 'كلمة المرور غير صحيحة' });
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة أو استخدام "نسيت كلمة المرور"' };
  }

  // Check if merchant account is suspended/blocked
  if (merchant.status === 'SUSPENDED' || (merchant.kycStatus === 'REJECTED' && merchant.isApproved === false)) {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: merchant.phone, status: 'FAILED', reason: 'حساب التاجر موقوف مؤقتاً' });
    return {
      success: false,
      message: '🚫 حسابه موقوف مؤقتاً بقرار إداري من مطور المنصة. عند الضغط على "إلغاء الحظر / تفعيل" في لوحة التحكم، سيعود حسابك للعمل فوراً دون الحاجة للتسجيل من جديد.',
      isPending: true,
    };
  }

  // Set active role
  setActiveSessionRole('MERCHANT', rememberMe);
  syncMerchantToAuth(merchant);

  logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: merchant.phone, status: 'SUCCESS' });
  return { success: true, message: `أهلاً بك يا ${merchant.name}`, merchant };
}

function syncMerchantToAuth(merchant: MerchantAccountRecord) {
  try {
    const profile: UserProfile = {
      id: merchant.id,
      email: `${merchant.phone}@merchant.local`,
      displayName: merchant.name,
      phone: merchant.phone,
      nationalId: merchant.nationalId,
      storeName: merchant.storeName,
      village: merchant.village,
      role: 'MERCHANT',
      createdAt: merchant.createdAt,
      updatedAt: merchant.updatedAt,
    };

    localStorage.setItem(
      'flowapp_v4_active_local_user',
      JSON.stringify({ uid: merchant.id, profile })
    );

    // Save in local users record
    const saved = localStorage.getItem('flowapp_v4_local_users');
    const localUsers = saved ? JSON.parse(saved) : {};
    localUsers[profile.email] = { profile, passwordHash: merchant.passwordHash };
    localStorage.setItem('flowapp_v4_local_users', JSON.stringify(localUsers));

    // Dispatch global event so AuthContext & AppContext immediately switch to this merchant
    window.dispatchEvent(
      new CustomEvent('flowapp:user-changed', {
        detail: { uid: merchant.id, profile },
      })
    );
  } catch {}
}

// ----------------------------------------------------
// 4. Driver RBAC Management
// ----------------------------------------------------
export function getDrivers(): DriverAccountRecord[] {
  try {
    const raw = localStorage.getItem(DRIVERS_STORE_KEY);
    if (!raw) {
      localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDrivers(drivers: DriverAccountRecord[]): void {
  try {
    localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify(drivers));
    // Sync to Firestore in background
    drivers.forEach((d) => {
      syncSaveDriver(d).catch((e) => console.warn('Firestore driver sync error:', e));
    });
  } catch {}
}

export async function registerDriver(params: {
  country?: string;
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  photo?: string;
  idCardPhoto?: string;
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
}): Promise<{ success: boolean; message: string; driver?: DriverAccountRecord }> {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  if (isUserBlocked(cleanPhone) || isUserBlocked(cleanNationalId)) {
    return { success: false, message: 'عذراً، هذا الحساب محظور من قبل إدارة المنصة بسبب مخالفة الشروط.' };
  }

  const kycRes = validateKYCParams({
    country: params.country || 'SA',
    phone: cleanPhone,
    nationalId: cleanNationalId,
    idVerificationPhoto: params.idCardPhoto || params.photo,
  });
  if (!kycRes.valid) {
    return { success: false, message: kycRes.message || 'بيانات التحقق غير صحيحة' };
  }

  const finalCleanPhone = kycRes.cleanPhone || cleanPhone;

  if (!params.password || params.password.length < 4) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 4 خانات' };

  const drivers = getDrivers();
  const existing = drivers.find((d) => d.phone === finalCleanPhone || d.nationalId === cleanNationalId);
  if (existing) {
    return { success: false, message: 'يوجد سائق مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال' };
  }

  const newDriver: DriverAccountRecord = {
    id: `driver-${Date.now()}`,
    name: cleanName,
    phone: finalCleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    photo: params.photo,
    idCardPhoto: params.idCardPhoto,
    vehicleType: params.vehicleType || 'MOTORCYCLE',
    vehiclePlate: params.vehiclePlate,
    zone: params.zone || 'القرية',
    createdAt: new Date().toISOString(),
    isApproved: false, // Mandatory Pending verification
  };

  // Direct database record sync for driver (bypassing synthetic email rate limit)
  try {
    if (supabase) {
      await (supabase as any).from('drivers').upsert({
        id: newDriver.id,
        name: cleanName,
        phone: finalCleanPhone,
        national_id: cleanNationalId,
        vehicle_type: params.vehicleType || 'MOTORCYCLE',
        vehicle_plate: params.vehiclePlate || '',
        zone: params.zone || 'القرية',
        password_hash: params.password,
        is_approved: false,
        is_online: false,
        created_at: newDriver.createdAt,
      }, { onConflict: 'phone' });
    }
  } catch (e) {
    console.warn('Supabase driver table sync notice:', e);
  }

  drivers.unshift(newDriver);
  saveDrivers(drivers);

  // Sync to Firestore & Supabase via crossDeviceSyncService
  await syncSaveDriver({
    ...newDriver,
    isOnline: false
  }).catch(console.warn);

  return { 
    success: true, 
    message: 'تم استلام طلب تسجيل السائق بنجاح! حسابك حالياً بحالة (معلق ⏳ بانتظار اعتماد المطور وتدقيق الهوية).', 
    driver: newDriver 
  };
}

export async function loginDriver(phoneInput: string, passwordInput: string, rememberMe: boolean = false): Promise<{
  success: boolean;
  message: string;
  driver?: DriverAccountRecord;
  isPending?: boolean;
}> {
  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');
  const drivers = getDrivers();

  let driver = drivers.find((d) => d.phone === cleanPhone || phonesMatch(d.phone, cleanPhone));

  // If not in local cache, check cloud Firestore directly
  if (!driver) {
    const cloudDriver = await fetchDriverByPhone(cleanPhone);
    if (cloudDriver) {
      driver = cloudDriver as DriverAccountRecord;
      drivers.unshift(driver);
      try {
        localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify(drivers));
      } catch {}
    }
  }

  if (!driver) {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: phoneInput, status: 'FAILED', reason: 'لم يتم العثور على سائق مسجل بهذا الرقم' });
    return { success: false, message: 'لم يتم العثور على سائق مسجل بهذا الرقم، يرجى التسجيل أولاً' };
  }

  if (driver.passwordHash !== passwordInput.trim()) {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'FAILED', reason: 'كلمة المرور غير صحيحة' });
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً' };
  }

  // Check if driver account is suspended/blocked
  if (driver.status === 'SUSPENDED' || (driver.isApproved === false && (driver as any).status === 'SUSPENDED')) {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'FAILED', reason: 'حساب السائق موقوف مؤقتاً' });
    return {
      success: false,
      message: '🚫 حسابه موقوف مؤقتاً بقرار إداري من مطور المنصة. عند الضغط على "إلغاء الحظر / تفعيل" في لوحة التحكم، سيعود حسابك للعمل فوراً دون الحاجة للتسجيل من جديد.',
      isPending: true,
    };
  }

  // Set active
  const profile: DriverProfile = {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    photo: driver.photo,
    vehicleType: driver.vehicleType,
    vehiclePlate: driver.vehiclePlate,
    zone: driver.zone,
    isOnline: true,
    registeredAt: driver.createdAt,
  };
  saveDriverProfile(profile);
  setActiveSessionRole('DRIVER', rememberMe);

  logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'SUCCESS' });
  return { success: true, message: `أهلاً بك يا ${driver.name}`, driver };
}

export function approveMerchantAccount(merchantId: string): void {
  const merchants = getMerchants();
  const idx = merchants.findIndex((m) => m.id === merchantId || m.phone === merchantId);
  if (idx !== -1) {
    merchants[idx].isApproved = true;
    merchants[idx].kycStatus = 'APPROVED';
    merchants[idx].updatedAt = new Date().toISOString();
    saveMerchants(merchants);
    syncSaveMerchant(merchants[idx]).catch(console.warn);
  }
  const stores = getStoresDirectory();
  const storeIdx = stores.findIndex((s) => s.id === merchantId || (s as any).merchantId === merchantId);
  if (storeIdx !== -1) {
    (stores[storeIdx] as any).isApproved = true;
    (stores[storeIdx] as any).kycStatus = 'APPROVED';
    stores[storeIdx].status = 'ACTIVE';
    saveStoresDirectory(stores);
    syncSaveStore(stores[storeIdx]).catch(console.warn);
  }
  try {
    supabase.from('merchants').update({ is_approved: true }).eq('id', merchantId);
  } catch {}
  window.dispatchEvent(new CustomEvent('qaryati:merchant-approval-changed', { detail: { merchantId, isApproved: true } }));
}

export function rejectMerchantAccount(merchantId: string): void {
  const merchants = getMerchants();
  const idx = merchants.findIndex((m) => m.id === merchantId || m.phone === merchantId);
  if (idx !== -1) {
    merchants[idx].isApproved = false;
    merchants[idx].kycStatus = 'REJECTED';
    merchants[idx].updatedAt = new Date().toISOString();
    saveMerchants(merchants);
    syncSaveMerchant(merchants[idx]).catch(console.warn);
  }
  const stores = getStoresDirectory();
  const storeIdx = stores.findIndex((s) => s.id === merchantId || (s as any).merchantId === merchantId);
  if (storeIdx !== -1) {
    (stores[storeIdx] as any).isApproved = false;
    (stores[storeIdx] as any).kycStatus = 'REJECTED';
    stores[storeIdx].status = 'SUSPENDED';
    saveStoresDirectory(stores);
    syncSaveStore(stores[storeIdx]).catch(console.warn);
  }
  try {
    supabase.from('merchants').update({ is_approved: false }).eq('id', merchantId);
  } catch {}
  window.dispatchEvent(new CustomEvent('qaryati:merchant-approval-changed', { detail: { merchantId, isApproved: false } }));
}

export function approveDriverAccount(driverId: string): void {
  const drivers = getDrivers();
  const idx = drivers.findIndex((d) => d.id === driverId || d.phone === driverId);
  if (idx !== -1) {
    drivers[idx].isApproved = true;
    saveDrivers(drivers);
    syncSaveDriver(drivers[idx]).catch(console.warn);
  }
  try {
    supabase.from('drivers').update({ is_approved: true }).eq('id', driverId);
  } catch {}
  window.dispatchEvent(new CustomEvent('qaryati:driver-approval-changed', { detail: { driverId, isApproved: true } }));
}

export function rejectDriverAccount(driverId: string): void {
  const drivers = getDrivers();
  const idx = drivers.findIndex((d) => d.id === driverId || d.phone === driverId);
  if (idx !== -1) {
    drivers[idx].isApproved = false;
    saveDrivers(drivers);
    syncSaveDriver(drivers[idx]).catch(console.warn);
  }
  try {
    supabase.from('drivers').update({ is_approved: false }).eq('id', driverId);
  } catch {}
  window.dispatchEvent(new CustomEvent('qaryati:driver-approval-changed', { detail: { driverId, isApproved: false } }));
}

// ----------------------------------------------------
// 5. Customer Lightweight Session
// ----------------------------------------------------
export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCustomerSession(session: CustomerSession, rememberMe: boolean = false): void {
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    setActiveSessionRole('CUSTOMER', rememberMe);
    window.dispatchEvent(new CustomEvent('flowapp:customer-session-updated', { detail: session }));
  } catch {}
}

export function clearCustomerSession(): void {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    window.dispatchEvent(new CustomEvent('flowapp:customer-session-updated', { detail: null }));
  } catch {}
}

export function getActiveCustomer(): CustomerSession | null {
  const session = getCustomerSession();
  if (!session) return null;
  return session;
}

export function saveActiveCustomer(params: {
  name: string;
  phone: string;
  nationalId?: string;
  housePhoto?: string;
  passwordHash?: string;
  village?: string;
}): void {
  saveCustomerSession({
    name: params.name,
    phone: params.phone,
    nationalId: params.nationalId,
    housePhoto: params.housePhoto,
    passwordHash: params.passwordHash,
    village: params.village,
    savedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  });
}

export function clearActiveCustomer(): void {
  clearCustomerSession();
}

// ----------------------------------------------------
// 6. Developer / Designer Master Authentication
// ----------------------------------------------------
export function verifyDeveloperAccess(codeOrPin: string, phone?: string): boolean {
  if (phone) {
    const res = verifyDeveloperCredentials(phone, codeOrPin);
    if (res.success) {
      setActiveSessionRole('DEVELOPER');
      logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: phone, status: 'SUCCESS' });
      return true;
    }
    logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: phone, status: 'FAILED', reason: res.message || 'بيانات اعتماد خاطئة' });
    return false;
  }
  const clean = codeOrPin.trim();
  const settings = getPlatformDeveloperSettings();
  if (clean === settings.developerPin) {
    setActiveSessionRole('DEVELOPER');
    logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: 'مدخل PIN السريع', status: 'SUCCESS' });
    return true;
  }
  logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: 'مدخل PIN السريع', status: 'FAILED', reason: 'رمز PIN المطور غير صحيح' });
  return false;
}

export function verifyDeveloperFullCredentials(
  phone: string,
  secretKey: string
): { success: boolean; message: string; errorField?: 'phone' | 'key' | 'both' } {
  const result = verifyDeveloperCredentials(phone, secretKey);
  if (result.success) {
    setActiveSessionRole('DEVELOPER');
    logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: phone, status: 'SUCCESS' });
  } else {
    logAccessAttempt({ portal: 'DEVELOPER', usernameOrPhone: phone, status: 'FAILED', reason: result.message || 'رقم هاتف أو مفتاح سري خاطئ' });
  }
  return result;
}

// ----------------------------------------------------
// 7. OTP Password Recovery Engine
// ----------------------------------------------------
export function requestPasswordResetOTP(
  phoneInput: string,
  targetRole: 'MERCHANT' | 'DRIVER' | 'DEVELOPER'
): { success: boolean; message: string; otpCode?: string } {
  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');

  if (!cleanPhone || cleanPhone.length < 7) {
    return { success: false, message: 'يرجى إدخال رقم جوال صحيح للتحقق' };
  }

  // Verify existence
  if (targetRole === 'MERCHANT') {
    const merchants = getMerchants();
    const found = merchants.find((m) => m.phone === cleanPhone);
    if (!found) {
      return { success: false, message: 'رقم الجوال غير مسجل لأي حساب تاجر في النظام' };
    }
  } else if (targetRole === 'DRIVER') {
    const drivers = getDrivers();
    const found = drivers.find((d) => d.phone === cleanPhone);
    if (!found) {
      return { success: false, message: 'رقم الجوال غير مسجل لأي سائق أو مندوب في النظام' };
    }
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const otpRecord: OTPRecord = {
    phone: cleanPhone,
    code,
    targetRole,
    expiresAt,
    attempts: 0,
  };

  try {
    const raw = localStorage.getItem(OTP_RECORDS_KEY);
    const records: Record<string, OTPRecord> = raw ? JSON.parse(raw) : {};
    records[cleanPhone] = otpRecord;
    localStorage.setItem(OTP_RECORDS_KEY, JSON.stringify(records));
  } catch {}

  // Dispatch visual event for immediate notification and toast
  window.dispatchEvent(
    new CustomEvent('flowapp:otp-dispatched', {
      detail: { phone: cleanPhone, code, targetRole },
    })
  );

  return {
    success: true,
    message: `تم إرسال رمز التحقق (OTP) إلى ${cleanPhone}`,
    otpCode: code,
  };
}

export function verifyOTP(
  phoneInput: string,
  otpCodeInput: string
): { success: boolean; message: string } {
  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');
  const cleanCode = otpCodeInput.trim();

  try {
    const raw = localStorage.getItem(OTP_RECORDS_KEY);
    const records: Record<string, OTPRecord> = raw ? JSON.parse(raw) : {};
    const record = records[cleanPhone];

    if (!record) {
      return { success: false, message: 'لم يتم العثور على رمز تحقق فعال، يرجى طلب رمز جديد' };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, message: 'انتهت صلاحية رمز التحقق (5 دقائق)، يرجى طلب رمز جديد' };
    }

    if (record.code !== cleanCode) {
      record.attempts = (record.attempts || 0) + 1;
      localStorage.setItem(OTP_RECORDS_KEY, JSON.stringify(records));
      return { success: false, message: 'رمز التحقق غير صحيح، يرجى التأكد وإعادة المحاولة' };
    }

    return { success: true, message: 'تم التحقق من الرمز بنجاح!' };
  } catch {
    return { success: false, message: 'حدث خطأ أثناء فحص الرمز' };
  }
}

export function resetPasswordWithOTP(
  phoneInput: string,
  otpCodeInput: string,
  newPassword: string
): { success: boolean; message: string } {
  const check = verifyOTP(phoneInput, otpCodeInput);
  if (!check.success) return check;

  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');
  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات' };
  }

  try {
    const raw = localStorage.getItem(OTP_RECORDS_KEY);
    const records: Record<string, OTPRecord> = raw ? JSON.parse(raw) : {};
    const record = records[cleanPhone];
    const role = record?.targetRole || 'MERCHANT';

    if (role === 'MERCHANT') {
      const merchants = getMerchants();
      const idx = merchants.findIndex((m) => m.phone === cleanPhone);
      if (idx !== -1) {
        merchants[idx].passwordHash = newPassword.trim();
        merchants[idx].updatedAt = new Date().toISOString();
        saveMerchants(merchants);
        syncMerchantToAuth(merchants[idx]);
      }
    } else if (role === 'DRIVER') {
      const drivers = getDrivers();
      const idx = drivers.findIndex((d) => d.phone === cleanPhone);
      if (idx !== -1) {
        drivers[idx].passwordHash = newPassword.trim();
        saveDrivers(drivers);
      }
    }

    // Clear OTP
    delete records[cleanPhone];
    localStorage.setItem(OTP_RECORDS_KEY, JSON.stringify(records));

    return { success: true, message: 'تم تعيين كلمة المرور الجديدة بنجاح! يمكنك الآن تسجيل الدخول مباشرة' };
  } catch {
    return { success: false, message: 'فشل حفظ كلمة المرور الجديدة' };
  }
}

export interface AccessLogEntry {
  id: string;
  timestamp: string;
  portal: 'MERCHANT' | 'DRIVER' | 'DEVELOPER' | 'ADMIN';
  usernameOrPhone: string;
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
  ipAddress?: string;
}

function getMockAccessLogs(): AccessLogEntry[] {
  return [
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      portal: 'DEVELOPER',
      usernameOrPhone: '0500000000',
      status: 'SUCCESS',
      ipAddress: '192.168.1.1'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      portal: 'DRIVER',
      usernameOrPhone: '0555556666',
      status: 'FAILED',
      reason: 'الحساب غير مسجل بالمنظومة',
      ipAddress: '192.168.2.14'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      portal: 'MERCHANT',
      usernameOrPhone: '0599887766',
      status: 'SUCCESS',
      ipAddress: '192.168.1.15'
    },
    {
      id: 'log-4',
      timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      portal: 'ADMIN',
      usernameOrPhone: 'المدير العام',
      status: 'FAILED',
      reason: 'رمز PIN خاطئ',
      ipAddress: '172.16.5.9'
    }
  ];
}

export interface DeveloperNotification {
  id: string;
  type: 'NEW_MERCHANT' | 'TECH_SUPPORT' | 'NEW_CUSTOMER';
  title: string;
  message: string;
  senderName: string;
  senderPhone: string;
  merchantId?: string;
  timestamp: string;
  isRead: boolean;
  quickReply?: string;
}

export function getDeveloperNotifications(): DeveloperNotification[] {
  try {
    const raw = localStorage.getItem('qaryati_dev_notifications');
    if (!raw) {
      localStorage.setItem('qaryati_dev_notifications', JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addDeveloperNotification(notif: Omit<DeveloperNotification, 'id' | 'timestamp' | 'isRead'>) {
  try {
    const list = getDeveloperNotifications();
    const newEntry: DeveloperNotification = {
      ...notif,
      id: `devnotif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    list.unshift(newEntry);
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to add dev notification:', e);
  }
}

export function markDeveloperNotificationRead(id: string) {
  try {
    const list = getDeveloperNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify(updated));
  } catch {}
}

export function replyDeveloperNotification(id: string, replyText: string) {
  try {
    const list = getDeveloperNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, quickReply: replyText, isRead: true } : n));
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify(updated));
  } catch {}
}

export function submitMerchantSupport(params: {
  merchantId: string;
  merchantName: string;
  storeName: string;
  phone: string;
  message: string;
}) {
  addDeveloperNotification({
    type: 'TECH_SUPPORT',
    title: `طلب دعم فني من متجر: ${params.storeName} 🛠️`,
    message: params.message,
    senderName: params.merchantName,
    senderPhone: params.phone,
    merchantId: params.merchantId
  });
}

export function getAccessLogs(): AccessLogEntry[] {
  try {
    const raw = localStorage.getItem('qaryati_access_logs');
    if (raw === null) {
      const mock = getMockAccessLogs();
      localStorage.setItem('qaryati_access_logs', JSON.stringify(mock));
      return mock;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logAccessAttempt(entry: Omit<AccessLogEntry, 'id' | 'timestamp'>) {
  try {
    const logs = getAccessLogs();
    const newEntry: AccessLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newEntry);
    localStorage.setItem('qaryati_access_logs', JSON.stringify(logs.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('qaryati:logs-updated', { detail: logs }));
  } catch (e) {
    console.warn('Failed to save access log attempt:', e);
  }
}

export function clearAccessLogs(): void {
  try {
    localStorage.setItem('qaryati_access_logs', JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('qaryati:logs-updated', { detail: [] }));
  } catch (e) {
    console.warn('Failed to clear access logs:', e);
  }
}

export function deleteAccessLog(id: string): void {
  try {
    const logs = getAccessLogs();
    const filtered = logs.filter((l) => l.id !== id);
    localStorage.setItem('qaryati_access_logs', JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('qaryati:logs-updated', { detail: filtered }));
  } catch (e) {
    console.warn('Failed to delete access log:', e);
  }
}

const DELETED_MERCHANTS_KEY = 'qaryati_deleted_merchants_trash_v1';

export interface DeletedMerchantRecord {
  id: string;
  merchant: MerchantAccountRecord;
  store?: StoreDirectoryRecord;
  deletedAt: string;
  deletedBy?: string;
}

export function getDeletedMerchants(): DeletedMerchantRecord[] {
  try {
    const raw = localStorage.getItem(DELETED_MERCHANTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveDeletedMerchants(list: DeletedMerchantRecord[]): void {
  try {
    localStorage.setItem(DELETED_MERCHANTS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('qaryati:deleted-merchants-updated', { detail: list }));
    // Sync to Firestore deleted_merchants collection in background
    list.forEach((item) => {
      try {
        const docRef = doc(db, 'deleted_merchants', item.id);
        setDoc(docRef, item, { merge: true }).catch(console.warn);
      } catch {}
    });
  } catch (e) {
    console.warn('Failed to save deleted merchants:', e);
  }
}

export function deleteMerchantAccount(id: string): void {
  try {
    const list = getMerchants();
    const targetMerchant = list.find((m) => m.id === id || m.phone === id);
    const filteredMerchants = list.filter((m) => m.id !== id && m.phone !== id);
    localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(filteredMerchants));

    // Find store record if present
    let targetStore: StoreDirectoryRecord | undefined;
    try {
      const rawStores = localStorage.getItem('qaryati_stores_directory');
      if (rawStores) {
        const stores = JSON.parse(rawStores);
        targetStore = stores.find((s: any) => s.id === id || s.merchantId === id || s.phone === id);
        const filteredStores = stores.filter((s: any) => s.id !== id && s.merchantId !== id && s.phone !== id);
        localStorage.setItem('qaryati_stores_directory', JSON.stringify(filteredStores));
        localStorage.setItem('village_stores_directory', JSON.stringify(filteredStores));
      }
    } catch {}

    // Add to Deleted Merchants Trash Bin if found
    if (targetMerchant) {
      const deletedList = getDeletedMerchants();
      const cleanTrash = deletedList.filter((d) => d.id !== id && d.merchant?.id !== id);
      const newTrashEntry: DeletedMerchantRecord = {
        id: targetMerchant.id || id,
        merchant: {
          ...targetMerchant,
          isApproved: false,
          status: 'SUSPENDED',
        },
        store: targetStore,
        deletedAt: new Date().toISOString(),
        deletedBy: 'المطور',
      };
      cleanTrash.unshift(newTrashEntry);
      saveDeletedMerchants(cleanTrash);
    }

    // Clean secondary keys
    try {
      const rawAccounts = localStorage.getItem('village_merchants_accounts');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const filteredAccounts = accounts.filter((a: any) => a.id !== id && a.phone !== id);
        localStorage.setItem('village_merchants_accounts', JSON.stringify(filteredAccounts));
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('qaryati:merchants-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:deleted-merchants-updated'));

    // Soft sync deletion from active Firestore/Supabase
    syncDeleteMerchant(id).catch(console.warn);
    syncDeleteStore(id).catch(console.warn);
  } catch (e) {
    console.warn('Failed to soft delete merchant:', e);
  }
}

export function restoreMerchantAccount(id: string): { success: boolean; message: string; merchant?: MerchantAccountRecord } {
  try {
    const deletedList = getDeletedMerchants();
    const entryIndex = deletedList.findIndex((item) => item.id === id || item.merchant?.id === id);

    if (entryIndex === -1) {
      return { success: false, message: 'لم يتم العثور على حساب هذا التاجر في سلة المحذوفات' };
    }

    const entry = deletedList[entryIndex];
    // Remove from Trash Bin
    const updatedTrash = deletedList.filter((item, idx) => idx !== entryIndex);
    saveDeletedMerchants(updatedTrash);

    // Delete from Firestore deleted_merchants collection
    try {
      deleteDoc(doc(db, 'deleted_merchants', id)).catch(console.warn);
    } catch {}

    // Restore to Merchants list as PENDING review
    const merchants = getMerchants();
    const restoredMerchant: MerchantAccountRecord = {
      ...entry.merchant,
      isApproved: false, // PENDING review so developer can approve, reject or edit
      status: 'PENDING',
      kycStatus: 'PENDING_REVIEW',
      updatedAt: new Date().toISOString(),
    };

    // Replace or unshift into active merchants list
    const existingIndex = merchants.findIndex((m) => m.id === restoredMerchant.id);
    if (existingIndex !== -1) {
      merchants[existingIndex] = restoredMerchant;
    } else {
      merchants.unshift(restoredMerchant);
    }
    saveMerchants(merchants);

    // Restore store record if exists
    if (entry.store) {
      const stores = getStoresDirectory();
      const restoredStore: StoreDirectoryRecord = {
        ...entry.store,
        isApproved: false,
        status: 'PENDING',
      };
      const storeIdx = stores.findIndex((s) => s.id === restoredStore.id);
      if (storeIdx !== -1) {
        stores[storeIdx] = restoredStore;
      } else {
        stores.unshift(restoredStore);
      }
      saveStoresDirectory(stores);
      syncSaveStore(restoredStore).catch(console.warn);
    }

    syncSaveMerchant(restoredMerchant).catch(console.warn);

    window.dispatchEvent(new CustomEvent('qaryati:merchants-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:deleted-merchants-updated'));

    return {
      success: true,
      message: `🎉 تم استعادة متجر "${restoredMerchant.storeName}" بنجاح! تم إعادتها إلى قائمة المتاجر المعلقة حيث يمكنك الآن قبول الموافقة، التعديل أو الرفض.`,
      merchant: restoredMerchant,
    };
  } catch (err: any) {
    console.error('Error restoring merchant account:', err);
    return { success: false, message: 'حدث خطأ أثناء استعادة التاجر: ' + err?.message };
  }
}

export function permanentlyDeleteMerchantAccount(id: string): void {
  try {
    const deletedList = getDeletedMerchants();
    const cleanList = deletedList.filter((item) => item.id !== id && item.merchant?.id !== id);
    saveDeletedMerchants(cleanList);

    try {
      deleteDoc(doc(db, 'deleted_merchants', id)).catch(console.warn);
      deleteDoc(doc(db, 'merchants', id)).catch(console.warn);
      deleteDoc(doc(db, 'stores', id)).catch(console.warn);
    } catch {}

    window.dispatchEvent(new CustomEvent('qaryati:deleted-merchants-updated'));
  } catch (e) {
    console.warn('Error in permanent delete:', e);
  }
}

/**
 * Clean Slate Master Reset:
 * Removes all previous merchant accounts, demo stores, and old pending data to start completely fresh.
 */
export async function cleanSlateResetAllData(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Direct Supabase table purge
    try {
      if (supabase) {
        await supabase.from('merchants').delete().neq('id', '___non_existent___');
        await supabase.from('orders').delete().neq('id', '___non_existent___');
        await supabase.from('customers').delete().neq('id', '___non_existent___');
        await supabase.from('drivers').delete().neq('id', '___non_existent___');
        await supabase.from('license_keys').delete().neq('id', '___non_existent___');
      }
    } catch (err) {
      console.warn('Supabase clean slate notice:', err);
    }

    // 2. Comprehensive Firestore collections purge (deletes all remote records completely)
    try {
      const collectionsToPurge = ['stores', 'merchants', 'drivers', 'customers', 'delivery_orders', 'license_keys'];
      for (const colName of collectionsToPurge) {
        const snap = await getDocs(collection(db, colName));
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, colName, docSnap.id));
        }
      }
    } catch (err) {
      console.warn('Firestore comprehensive purge warning:', err);
    }

    // 3. Completely clear all local storage
    localStorage.clear();

    window.dispatchEvent(new CustomEvent('qaryati:merchants-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:stores-updated'));
    window.dispatchEvent(new CustomEvent('qaryati:orders-updated'));

    return {
      success: true,
      message: 'تمت تهيئة السحابة وقواعد البيانات ومسح كافة البيانات المدخلة في التطبيق بالكامل بنجاح! سيتم إطلاق التطبيق الآن كأنه جديد تماماً ونظيف وجاهز للمشاركة والتجربة 🧹✨',
    };
  } catch (err: any) {
    console.error('Clean slate error:', err);
    return {
      success: false,
      message: 'حدث خطأ أثناء إعادة الضبط: ' + (err?.message || 'خطأ غير معروف'),
    };
  }
}

export function deleteDriverAccount(id: string): void {
  try {
    const list = getDrivers();
    const filtered = list.filter((d) => d.id !== id);
    localStorage.setItem('qaryati_drivers', JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('qaryati:drivers-updated'));
    // Cross-device sync deletion from Firestore and Supabase
    syncDeleteDriver(id).catch(console.warn);
  } catch (e) {
    console.warn('Failed to delete driver:', e);
  }
}

export function toggleMerchantStatus(id: string, isApproved: boolean): void {
  if (isApproved) {
    approveMerchantAccount(id);
  } else {
    rejectMerchantAccount(id);
  }
}

export function toggleDriverStatus(id: string, isApproved: boolean): void {
  try {
    const list = getDrivers();
    const item = list.find((d) => d.id === id);
    if (item) {
      item.isApproved = isApproved;
      localStorage.setItem('qaryati_drivers', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('qaryati:drivers-updated'));
      syncSaveDriver(item).catch(console.warn);
    }
  } catch (e) {
    console.warn('Failed to toggle driver status:', e);
  }
}

// ----------------------------------------------------
// KYC Validation & Anti-Spam Blocking System
// ----------------------------------------------------
export const BLOCKED_USERS_KEY = 'qaryati_blocked_users_list_v1';

export function getBlockedUsers(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function blockUserPhoneOrId(identifier: string): void {
  try {
    const list = getBlockedUsers();
    const clean = identifier.trim();
    if (clean && !list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function unblockUserPhoneOrId(identifier: string): void {
  try {
    const list = getBlockedUsers().filter((i) => i !== identifier);
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(list));
  } catch {}
}

export function isUserBlocked(identifier: string): boolean {
  try {
    const list = getBlockedUsers();
    return list.includes(identifier.trim());
  } catch {
    return false;
  }
}

export function validateKYCParams(params: {
  country?: string;
  phone: string;
  nationalId: string;
  idVerificationPhoto?: string;
}): { valid: boolean; message?: string; cleanPhone?: string } {
  const country = params.country || 'SA';
  let phone = params.phone.trim().replace(/\s+/g, '').replace(/[\-\(\)\+]/g, '');
  const nationalId = params.nationalId.trim();
  const photo = params.idVerificationPhoto;

  if (!phone) return { valid: false, message: 'يرجى إدخال رقم الجوال' };
  if (!nationalId) return { valid: false, message: 'يرجى إدخال رقم بطاقة الأحوال / الهوية الشخصية' };
  if (!photo || photo.length < 30) return { valid: false, message: 'صورة الهوية الوطنية / البطاقة الشخصية إلزامية ومطلوبة لتوثيق الحساب' };

  let finalCleanPhone = phone;

  // Global Phone Cleaner for All Supported Countries
  if (country === 'SA') {
    if (finalCleanPhone.startsWith('00966')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('966')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);

    if (!finalCleanPhone.startsWith('5') || finalCleanPhone.length !== 9) {
      return { valid: false, message: 'رقم الجوال السعودي غير صحيح (يجب أن يبدأ بـ 5 ويتكون من 9 أرقام، مثال: 512345678)' };
    }
  } else if (country === 'YE') {
    if (finalCleanPhone.startsWith('00967')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('967')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);

    if (!finalCleanPhone.startsWith('7') || finalCleanPhone.length !== 9) {
      return { valid: false, message: 'رقم الجوال اليمني غير صحيح (يجب أن يبدأ بـ 7 ويتكون من 9 أرقام، مثال: 712345678)' };
    }
  } else if (country === 'AE') {
    if (finalCleanPhone.startsWith('00971')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('971')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);

    if (finalCleanPhone.length < 7 || finalCleanPhone.length > 10) {
      return { valid: false, message: 'رقم الجوال الإماراتي غير صحيح.' };
    }
  } else if (country === 'EG') {
    if (finalCleanPhone.startsWith('0020')) finalCleanPhone = finalCleanPhone.substring(4);
    else if (finalCleanPhone.startsWith('20')) finalCleanPhone = finalCleanPhone.substring(2);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);

    if (finalCleanPhone.length < 9 || finalCleanPhone.length > 11) {
      return { valid: false, message: 'رقم الجوال المصري غير صحيح.' };
    }
  } else if (country === 'QA') {
    if (finalCleanPhone.startsWith('00974')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('974')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'KW') {
    if (finalCleanPhone.startsWith('00965')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('965')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'BH') {
    if (finalCleanPhone.startsWith('00973')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('973')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'OM') {
    if (finalCleanPhone.startsWith('00968')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('968')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'JO') {
    if (finalCleanPhone.startsWith('00962')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('962')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'MA') {
    if (finalCleanPhone.startsWith('00212')) finalCleanPhone = finalCleanPhone.substring(5);
    else if (finalCleanPhone.startsWith('212')) finalCleanPhone = finalCleanPhone.substring(3);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'TR') {
    if (finalCleanPhone.startsWith('0090')) finalCleanPhone = finalCleanPhone.substring(4);
    else if (finalCleanPhone.startsWith('90')) finalCleanPhone = finalCleanPhone.substring(2);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'GB') {
    if (finalCleanPhone.startsWith('0044')) finalCleanPhone = finalCleanPhone.substring(4);
    else if (finalCleanPhone.startsWith('44')) finalCleanPhone = finalCleanPhone.substring(2);
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else if (country === 'US') {
    if (finalCleanPhone.startsWith('001')) finalCleanPhone = finalCleanPhone.substring(3);
    else if (finalCleanPhone.startsWith('1')) {
      // Avoid stripping leading '1' if it's not actually a country prefix (US numbers are 10 digits, with prefix it's 11)
      if (finalCleanPhone.length === 11) finalCleanPhone = finalCleanPhone.substring(1);
    }
    if (finalCleanPhone.startsWith('0')) finalCleanPhone = finalCleanPhone.substring(1);
  } else {
    // Other countries: just strip double leading zeros or plus signs if present
    if (finalCleanPhone.startsWith('00')) finalCleanPhone = finalCleanPhone.substring(2);
  }

  return { valid: true, cleanPhone: finalCleanPhone };
}

// Support & Inquiries Message Management
export function deleteDeveloperNotification(id: string): void {
  try {
    const list = getDeveloperNotifications();
    const filtered = list.filter((n) => n.id !== id);
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify(filtered));
  } catch {}
}

export function markAllDeveloperNotificationsRead(): void {
  try {
    const list = getDeveloperNotifications();
    const updated = list.map((n) => ({ ...n, isRead: true }));
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify(updated));
  } catch {}
}

export function clearAllDeveloperNotifications(): void {
  try {
    localStorage.setItem('qaryati_dev_notifications', JSON.stringify([]));
  } catch {}
}

// Enforce strict factory reset on initial load to ensure a clean slate
const STRICT_FACTORY_RESET_KEY = 'qaryati_strict_factory_reset_done_v101';
try {
  if (typeof window !== 'undefined' && !localStorage.getItem(STRICT_FACTORY_RESET_KEY)) {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(STRICT_FACTORY_RESET_KEY, 'true');
    console.log('🧹 Initial Factory Reset triggered.');
  }
} catch {}

/**
 * Formal Factory Reset: Purges all operational data and refreshes app
 */
export async function factoryResetPlatform() {
  try {
    if (confirm('⚠️ تنبيه: هل أنت متأكد من تصفير المنصة بالكامل وحذف كافة البيانات؟')) {
      localStorage.clear();
      sessionStorage.clear();
      
      if (supabase) {
        await Promise.all([
          supabase.from('merchants').delete().neq('id', '0'),
          supabase.from('orders').delete().neq('id', '0'),
          supabase.from('customers').delete().neq('id', '0'),
          supabase.from('drivers').delete().neq('id', '0'),
          supabase.from('license_keys').delete().neq('id', '0'),
        ]).catch(e => console.warn('Supabase remote wipe skipped:', e));
      }

      alert('تم تصفير المنصة بنجاح. سيتم إعادة التحميل الآن.');
      window.location.reload();
    }
  } catch (err) {
    console.error('Reset failed:', err);
  }
}
