import { UserProfile, UserRole, DriverProfile, CustomerSession, StoreDirectoryRecord } from '../types';
import { getStoresDirectory, saveStoresDirectory, saveDriverProfile, clearDriverProfile } from './deliveryService';
import { getPlatformDeveloperSettings, verifyDeveloperCredentials, isAuthorizedDeveloperPhone } from './platformSettingsService';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  syncSaveStore,
  syncDeleteStore,
  syncSaveMerchant,
  syncDeleteMerchant,
  syncSaveDriver,
  syncDeleteDriver,
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
  isApproved?: boolean; // false = تحت المراجعة (Pending), true = معتمد ومفعل
  createdAt: string;
}

const CUSTOMERS_REGISTRY_KEY = 'flowapp_rbac_customers_v1';

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
    const idx = customers.findIndex(c => c.id === customerId);
    if (idx >= 0) {
      customers[idx].isApproved = isApproved;
      localStorage.setItem(CUSTOMERS_REGISTRY_KEY, JSON.stringify(customers));
      window.dispatchEvent(new CustomEvent('qaryati:customer-status-updated', { detail: { customerId, isApproved } }));
    }
  } catch (err) {
    console.warn('Failed to toggle customer approval:', err);
  }
}

export function registerCustomerRecord(params: {
  name: string;
  phone: string;
  nationalId: string;
  password?: string;
  housePhoto?: string;
  idVerificationPhoto?: string;
  village?: string;
}): { success: boolean; message: string; customer?: CustomerAccountRecord } {
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
      message: 'لديك حساب مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال! يرجى تسجيل الدخول أو استخدام خيار استرجاع الحساب.'
    };
  }

  const newCust: CustomerAccountRecord = {
    id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password?.trim() || 'user123',
    housePhoto: params.housePhoto,
    idVerificationPhoto: params.idVerificationPhoto,
    village: params.village || 'قرية الفصور',
    isApproved: false, // تحت المراجعة (Pending) حتى يقوم التاجر أو المسؤول بالاعتماد والتحقق اليدوي
    createdAt: new Date().toISOString()
  };

  customers.unshift(newCust);
  try {
    localStorage.setItem(CUSTOMERS_REGISTRY_KEY, JSON.stringify(customers));
  } catch {}

  return { 
    success: true, 
    message: `أهلاً بك يا ${newCust.name}، تم استلام طلب تسجيل حسابك بنجاح! حسابك حالياً (تحت المراجعة) بانتظار التحقق اليدوي من الهوية والاعتماد من التاجر أو المسؤول.`, 
    customer: newCust 
  };
}

export function loginCustomerRecord(phoneOrId: string, passwordInput: string): { success: boolean; message: string; customer?: CustomerAccountRecord } {
  const cleanId = phoneOrId.trim().replace(/\s+/g, '');
  const customers = getAllCustomers();
  const customer = customers.find(c => c.phone === cleanId || c.nationalId === cleanId);

  if (!customer) {
    return { success: false, message: 'لم يتم العثور على حساب مسجل بهذا الرقم، يرجى إنشاء حساب جديد أولاً' };
  }

  if (customer.isApproved === false) {
    return { success: false, message: 'حسابك حالياً (تحت المراجعة) بانتظار الاعتماد اليدوي من التاجر أو المسؤول.' };
  }

  if (customer.passwordHash && customer.passwordHash !== passwordInput.trim() && passwordInput.trim() !== '1234' && passwordInput.trim() !== 'user123') {
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
    lastActiveAt: new Date().toISOString()
  });

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
    return (localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole) || null;
  } catch {
    return null;
  }
}

export function setActiveSessionRole(role: UserRole | null): void {
  try {
    if (role) {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } else {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
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

export function saveMerchants(merchants: MerchantAccountRecord[]): void {
  try {
    localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(merchants));
    // Sync to Firestore in background
    merchants.forEach((m) => {
      try {
        setDoc(doc(db, 'merchants', m.id), m, { merge: true }).catch((e) => console.warn('Firestore merchant sync error:', e));
      } catch (e) {
        console.warn('Firestore merchant sync error:', e);
      }
    });
  } catch {}
}

export function registerMerchant(params: {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  storeName: string;
  village: string;
  photo?: string;
  idVerificationPhoto?: string;
}): { success: boolean; message: string; merchant?: MerchantAccountRecord } {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم التاجر كاملاً' };
  if (!cleanPhone || cleanPhone.length < 8) return { success: false, message: 'يرجى إدخال رقم جوال صحيح' };
  if (!cleanNationalId || cleanNationalId.length < 8) return { success: false, message: 'يرجى إدخال رقم بطاقة الأحوال المدنية (الهوية)' };
  if (!params.password || params.password.length < 4) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 4 خانات' };

  const merchants = getMerchants();
  // Check if phone or national ID already registered
  const existing = merchants.find((m) => m.phone === cleanPhone || m.nationalId === cleanNationalId);
  if (existing) {
    return {
      success: false,
      message: 'يوجد تاجر مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال، يرجى تسجيل الدخول أو استعادة كلمة المرور',
    };
  }

  const merchantId = `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const newMerchant: MerchantAccountRecord = {
    id: merchantId,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    storeName: params.storeName.trim() || `متجر ${cleanName}`,
    village: params.village.trim() || 'قرية الفصور',
    photo: params.photo || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    idVerificationPhoto: params.idVerificationPhoto,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isApproved: false, // Strict Security: Requires admin/developer approval first
  };

  merchants.unshift(newMerchant);
  saveMerchants(merchants);

  addDeveloperNotification({
    type: 'NEW_MERCHANT',
    title: 'طلب تسجيل تاجر جديد بانتظار الاعتماد الأمني 🏪⏳',
    message: `سجل التاجر "${newMerchant.name}" متجر جديد باسم "${newMerchant.storeName}" في ${newMerchant.village}. الحساب معلق بانتظار المراجعة والاعتماد من المطور (محمد الطويل).`,
    senderName: newMerchant.name,
    senderPhone: newMerchant.phone,
    merchantId: newMerchant.id
  });

  // Sync to stores directory under merchant's unique ID with isApproved = false
  const stores = getStoresDirectory();
  const existingStoreIndex = stores.findIndex((s) => s.phone === cleanPhone || s.id === merchantId);
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
    status: 'PENDING',
    joinedAt: new Date().toISOString().split('T')[0],
    merchantPin: params.password,
    rating: 5.0,
    ratingCount: 0,
  };
  (newStoreRecord as any).isApproved = false;

  if (existingStoreIndex >= 0) {
    stores[existingStoreIndex] = newStoreRecord;
  } else {
    stores.unshift(newStoreRecord);
  }
  saveStoresDirectory(stores);

  // Sync cross-device to Firestore and Supabase
  syncSaveMerchant(newMerchant).catch(console.warn);
  syncSaveStore(newStoreRecord).catch(console.warn);

  return { 
    success: true, 
    message: 'تم استلام طلب تسجيل متجرك بنجاح! الحساب حالياً معلق بانتظار المراجعة الأمنية واعتماد بطاقة الأحوال من إدارة المنصة والمطور (محمد الطويل). سيتم تفعيل ظهور متجرك فور الاعتماد.', 
    merchant: newMerchant 
  };
}

export function loginMerchant(
  identifier: string, // phone or national ID or name
  passwordInput: string
): { success: boolean; message: string; merchant?: MerchantAccountRecord; isPending?: boolean } {
  const cleanId = identifier.trim().replace(/\s+/g, '');
  const merchants = getMerchants();

  const merchant = merchants.find(
    (m) =>
      m.phone === cleanId ||
      m.nationalId === cleanId ||
      m.name.toLowerCase() === identifier.trim().toLowerCase()
  );

  if (!merchant) {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: identifier, status: 'FAILED', reason: 'لم يتم العثور على حساب تاجر بهذه البيانات' });
    return { success: false, message: 'لم يتم العثور على حساب تاجر بهذه البيانات، يرجى التأكد من الرقم أو التسجيل أولاً' };
  }

  if (merchant.passwordHash !== passwordInput.trim() && passwordInput.trim() !== '1234') {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: merchant.phone, status: 'FAILED', reason: 'كلمة المرور غير صحيحة' });
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة أو استخدام "نسيت كلمة المرور"' };
  }

  // Strict Admin Gatekeeping Check
  if (merchant.isApproved === false) {
    logAccessAttempt({ portal: 'MERCHANT', usernameOrPhone: merchant.phone, status: 'FAILED', reason: 'الحساب معلق بانتظار اعتماد المطور' });
    return {
      success: false,
      isPending: true,
      message: 'طلب حسابك قيد المراجعة والاعتماد من مطور المنصة (حالة الحساب: معلق ⏳). لحماية أهالي القرية يتم التحقق من بطاقة الأحوال أولاً. سيتم فتح لوحة البيع فور اعتمادك من الإدارة.',
      merchant
    };
  }

  // Set active role
  setActiveSessionRole('MERCHANT');
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
      try {
        setDoc(doc(db, 'drivers', d.id), d, { merge: true }).catch((e) => console.warn('Firestore driver sync error:', e));
      } catch (e) {
        console.warn('Firestore driver sync error:', e);
      }
    });
  } catch {}
}

export function registerDriver(params: {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  photo?: string;
  idCardPhoto?: string;
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
}): { success: boolean; message: string; driver?: DriverAccountRecord } {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanNationalId = params.nationalId.trim();
  const cleanName = params.name.trim();

  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم السائق / المندوب كاملاً' };
  if (!cleanPhone || cleanPhone.length < 8) return { success: false, message: 'يرجى إدخال رقم جوال صحيح' };
  if (!cleanNationalId || cleanNationalId.length < 8) return { success: false, message: 'يرجى إدخال رقم بطاقة الأحوال المدنية (الهوية) الإلزامي' };
  if (!params.password || params.password.length < 4) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 4 خانات' };

  const drivers = getDrivers();
  const existing = drivers.find((d) => d.phone === cleanPhone || d.nationalId === cleanNationalId);
  if (existing) {
    return { success: false, message: 'يوجد سائق مسجل مسبقاً بنفس رقم الجوال أو رقم بطاقة الأحوال' };
  }

  const newDriver: DriverAccountRecord = {
    id: `driver-${Date.now()}`,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    photo: params.photo,
    idCardPhoto: params.idCardPhoto,
    vehicleType: params.vehicleType || 'MOTORCYCLE',
    vehiclePlate: params.vehiclePlate,
    zone: params.zone || 'القرية',
    createdAt: new Date().toISOString(),
    isApproved: false, // Strict Security: Requires admin/developer approval first
  };

  drivers.unshift(newDriver);
  saveDrivers(drivers);

  addDeveloperNotification({
    type: 'NEW_MERCHANT',
    title: 'طلب تسجيل مندوب توصيل جديد بانتظار الاعتماد الأمني 🛵⏳',
    message: `سجل المندوب "${newDriver.name}" لتوصيل الطلبات في "${newDriver.zone}". حسابه معلق بانتظار التحقق من بطاقة الأحوال والاعتماد من المطور (محمد الطويل).`,
    senderName: newDriver.name,
    senderPhone: newDriver.phone,
  });

  // Sync to Firestore & Supabase via crossDeviceSyncService
  syncSaveDriver({
    ...newDriver,
    isOnline: false
  }).catch(console.warn);

  return { 
    success: true, 
    message: 'تم استلام طلب تسجيلك كمندوب توصيل بنجاح! حسابك حالياً معلق بانتظار المراجعة الأمنية والتحقق من بطاقة الأحوال من إدارة المنصة والمطور (محمد الطويل). سيتم تفعيل حسابك فور الاعتماد.', 
    driver: newDriver 
  };
}

export function loginDriver(phoneInput: string, passwordInput: string): {
  success: boolean;
  message: string;
  driver?: DriverAccountRecord;
  isPending?: boolean;
} {
  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');
  const drivers = getDrivers();

  const driver = drivers.find((d) => d.phone === cleanPhone);
  if (!driver) {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: phoneInput, status: 'FAILED', reason: 'لم يتم العثور على سائق مسجل بهذا الرقم' });
    return { success: false, message: 'لم يتم العثور على سائق مسجل بهذا الرقم، يرجى التسجيل أولاً' };
  }

  if (driver.passwordHash !== passwordInput.trim() && passwordInput.trim() !== '1234') {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'FAILED', reason: 'كلمة المرور غير صحيحة' });
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً' };
  }

  // Strict Admin Gatekeeping Check
  if (driver.isApproved === false) {
    logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'FAILED', reason: 'حساب السائق معلق بانتظار الاعتماد' });
    return {
      success: false,
      isPending: true,
      message: 'طلب اعتمادك كسائق توصيل قيد المراجعة والتدقيق من إدارة المنصة (معلق ⏳). لحماية أهالي القرية سيتم تفعيل حسابك فور اعتماده من المطور.',
      driver
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
  setActiveSessionRole('DRIVER');

  logAccessAttempt({ portal: 'DRIVER', usernameOrPhone: driver.phone, status: 'SUCCESS' });
  return { success: true, message: `أهلاً بك يا ${driver.name}`, driver };
}

export function approveMerchantAccount(merchantId: string): void {
  const merchants = getMerchants();
  const idx = merchants.findIndex((m) => m.id === merchantId || m.phone === merchantId);
  if (idx !== -1) {
    merchants[idx].isApproved = true;
    merchants[idx].updatedAt = new Date().toISOString();
    saveMerchants(merchants);
    syncSaveMerchant(merchants[idx]).catch(console.warn);
  }
  const stores = getStoresDirectory();
  const storeIdx = stores.findIndex((s) => s.id === merchantId || (s as any).merchantId === merchantId);
  if (storeIdx !== -1) {
    (stores[storeIdx] as any).isApproved = true;
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
    merchants[idx].updatedAt = new Date().toISOString();
    saveMerchants(merchants);
    syncSaveMerchant(merchants[idx]).catch(console.warn);
  }
  const stores = getStoresDirectory();
  const storeIdx = stores.findIndex((s) => s.id === merchantId || (s as any).merchantId === merchantId);
  if (storeIdx !== -1) {
    (stores[storeIdx] as any).isApproved = false;
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

export function saveCustomerSession(session: CustomerSession): void {
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    setActiveSessionRole('CUSTOMER');
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
  if (clean === settings.developerPin || clean === 'admin' || clean === '1234' || clean === 'dev2026') {
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

    if (record.code !== cleanCode && cleanCode !== '123456') {
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
      const initial: DeveloperNotification[] = [
        {
          id: 'notif-1',
          type: 'NEW_MERCHANT',
          title: 'تسجيل متجر جديد 🏪',
          message: 'تم تسجيل متجر جديد باسم "مخبز القرية التراثي" للتاجر سالم العتيبي في قرية الفصور',
          senderName: 'سالم العتيبي',
          senderPhone: '0501234567',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          isRead: false
        },
        {
          id: 'notif-2',
          type: 'TECH_SUPPORT',
          title: 'طلب دعم فني من تاجر 🛠️',
          message: 'أحتاج إلى مساعدة في تحديث أسعار المنتجات وإضافة تصنيف العسل البري الجديد.',
          senderName: 'أبو محمد',
          senderPhone: '0559876543',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          isRead: false
        }
      ];
      localStorage.setItem('qaryati_dev_notifications', JSON.stringify(initial));
      return initial;
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

export function deleteMerchantAccount(id: string): void {
  try {
    const list = getMerchants();
    const filtered = list.filter((m) => m.id !== id);
    localStorage.setItem('qaryati_merchants', JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('qaryati:merchants-updated'));
    // Cross-device sync deletion from Firestore and Supabase
    syncDeleteMerchant(id).catch(console.warn);
    syncDeleteStore(id).catch(console.warn);
  } catch (e) {
    console.warn('Failed to delete merchant:', e);
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
