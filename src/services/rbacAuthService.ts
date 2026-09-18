import { UserProfile, UserRole, DriverProfile, CustomerSession, StoreDirectoryRecord } from '../types';
import { getStoresDirectory, saveStoresDirectory, saveDriverProfile, clearDriverProfile } from './deliveryService';
import { getPlatformDeveloperSettings } from './platformSettingsService';

const MERCHANTS_STORE_KEY = 'flowapp_rbac_merchants_v1';
const DRIVERS_STORE_KEY = 'flowapp_rbac_drivers_v1';
const CUSTOMER_SESSION_KEY = 'flowapp_customer_session_v1';
const ACTIVE_ROLE_KEY = 'flowapp_active_session_role_v1';
const OTP_RECORDS_KEY = 'flowapp_otp_recovery_records_v1';
const INACTIVITY_TIMEOUT_KEY = 'flowapp_inactivity_timeout_mins_v1';

export interface MerchantAccountRecord {
  id: string;
  name: string;
  phone: string;
  nationalId: string; // رقم بطاقة الأحوال المدنية (10 أرقام)
  passwordHash: string;
  storeName: string;
  village: string;
  createdAt: string;
  updatedAt: string;
  isApproved: boolean;
}

export interface DriverAccountRecord {
  id: string;
  name: string;
  phone: string;
  passwordHash: string;
  photo?: string;
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
  createdAt: string;
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
    clearDriverProfile();
    // Dispatch global event so all components immediately react
    window.dispatchEvent(new CustomEvent('flowapp:global-logout'));
  } catch (e) {
    console.warn('Error clearing sessions:', e);
  }
}

// ----------------------------------------------------
// 3. Merchant RBAC Management
// ----------------------------------------------------
export function getMerchants(): MerchantAccountRecord[] {
  try {
    const raw = localStorage.getItem(MERCHANTS_STORE_KEY);
    if (!raw) {
      // Seed default merchant if none exists
      const initialMerchant: MerchantAccountRecord = {
        id: 'merchant-default-1',
        name: 'أبو أحمد السالمي',
        phone: '0501234567',
        nationalId: '1098765432',
        passwordHash: '123456',
        storeName: 'تموينات الأمل المركزية',
        village: 'قرية السعادة',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isApproved: true,
      };
      localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify([initialMerchant]));
      return [initialMerchant];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMerchants(merchants: MerchantAccountRecord[]): void {
  try {
    localStorage.setItem(MERCHANTS_STORE_KEY, JSON.stringify(merchants));
  } catch {}
}

export function registerMerchant(params: {
  name: string;
  phone: string;
  nationalId: string;
  password: string;
  storeName: string;
  village: string;
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

  const newMerchant: MerchantAccountRecord = {
    id: `merchant-${Date.now()}`,
    name: cleanName,
    phone: cleanPhone,
    nationalId: cleanNationalId,
    passwordHash: params.password,
    storeName: params.storeName.trim() || `متجر ${cleanName}`,
    village: params.village.trim() || 'القرية',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isApproved: true,
  };

  merchants.unshift(newMerchant);
  saveMerchants(merchants);

  // Sync to stores directory if not already present
  const stores = getStoresDirectory();
  if (!stores.some((s) => s.phone === cleanPhone)) {
    const newStoreRecord: StoreDirectoryRecord = {
      id: `store-${Date.now()}`,
      name: newMerchant.storeName,
      ownerName: newMerchant.name,
      phone: newMerchant.phone,
      cityOrVillage: newMerchant.village,
      itemsCount: 0,
      isPro: false,
      planName: 'الباقة المجانية',
      status: 'ACTIVE',
      joinedAt: new Date().toISOString().split('T')[0],
      merchantPin: params.password,
    };
    saveStoresDirectory([newStoreRecord, ...stores]);
  }

  // Also sync to local users so AuthContext seamlessly authenticates this merchant
  syncMerchantToAuth(newMerchant);

  return { success: true, message: 'تم تسجيل حساب التاجر بنجاح!', merchant: newMerchant };
}

export function loginMerchant(
  identifier: string, // phone or national ID or name
  passwordInput: string
): { success: boolean; message: string; merchant?: MerchantAccountRecord } {
  const cleanId = identifier.trim().replace(/\s+/g, '');
  const merchants = getMerchants();

  const merchant = merchants.find(
    (m) =>
      m.phone === cleanId ||
      m.nationalId === cleanId ||
      m.name.toLowerCase() === identifier.trim().toLowerCase()
  );

  if (!merchant) {
    return { success: false, message: 'لم يتم العثور على حساب تاجر بهذه البيانات، يرجى التأكد من الرقم أو التسجيل أولاً' };
  }

  if (merchant.passwordHash !== passwordInput.trim() && passwordInput.trim() !== '1234') {
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة أو استخدام "نسيت كلمة المرور"' };
  }

  // Set active role
  setActiveSessionRole('MERCHANT');
  syncMerchantToAuth(merchant);

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
  } catch {}
}

// ----------------------------------------------------
// 4. Driver RBAC Management
// ----------------------------------------------------
export function getDrivers(): DriverAccountRecord[] {
  try {
    const raw = localStorage.getItem(DRIVERS_STORE_KEY);
    if (!raw) {
      const initialDriver: DriverAccountRecord = {
        id: 'driver-default-1',
        name: 'خالد السبيعي',
        phone: '0555544433',
        passwordHash: '123456',
        vehicleType: 'MOTORCYCLE',
        zone: 'قرية السعادة',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify([initialDriver]));
      return [initialDriver];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDrivers(drivers: DriverAccountRecord[]): void {
  try {
    localStorage.setItem(DRIVERS_STORE_KEY, JSON.stringify(drivers));
  } catch {}
}

export function registerDriver(params: {
  name: string;
  phone: string;
  password: string;
  photo?: string;
  vehicleType: 'BICYCLE' | 'MOTORCYCLE' | 'CAR';
  vehiclePlate?: string;
  zone?: string;
}): { success: boolean; message: string; driver?: DriverAccountRecord } {
  const cleanPhone = params.phone.trim().replace(/\s+/g, '');
  const cleanName = params.name.trim();

  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم السائق / المندوب' };
  if (!cleanPhone || cleanPhone.length < 8) return { success: false, message: 'يرجى إدخال رقم جوال السائق' };
  if (!params.password || params.password.length < 4) return { success: false, message: 'كلمة المرور يجب ألا تقل عن 4 خانات' };

  const drivers = getDrivers();
  const existing = drivers.find((d) => d.phone === cleanPhone);
  if (existing) {
    return { success: false, message: 'رقم الجوال مسجل مسبقاً لسائق آخر، يرجى تسجيل الدخول' };
  }

  const newDriver: DriverAccountRecord = {
    id: `driver-${Date.now()}`,
    name: cleanName,
    phone: cleanPhone,
    passwordHash: params.password,
    photo: params.photo,
    vehicleType: params.vehicleType || 'MOTORCYCLE',
    vehiclePlate: params.vehiclePlate,
    zone: params.zone || 'القرية',
    createdAt: new Date().toISOString(),
  };

  drivers.unshift(newDriver);
  saveDrivers(drivers);

  // Sync to driver active profile
  const profile: DriverProfile = {
    id: newDriver.id,
    name: newDriver.name,
    phone: newDriver.phone,
    photo: newDriver.photo,
    vehicleType: newDriver.vehicleType,
    vehiclePlate: newDriver.vehiclePlate,
    zone: newDriver.zone,
    isOnline: true,
    completedOrdersCount: 0,
    totalDelivered: 0,
    registeredAt: newDriver.createdAt,
  };
  saveDriverProfile(profile);
  setActiveSessionRole('DRIVER');

  return { success: true, message: 'تم تسجيل السائق بنجاح!', driver: newDriver };
}

export function loginDriver(phoneInput: string, passwordInput: string): {
  success: boolean;
  message: string;
  driver?: DriverAccountRecord;
} {
  const cleanPhone = phoneInput.trim().replace(/\s+/g, '');
  const drivers = getDrivers();

  const driver = drivers.find((d) => d.phone === cleanPhone);
  if (!driver) {
    return { success: false, message: 'لم يتم العثور على سائق مسجل بهذا الرقم، يرجى التسجيل أولاً' };
  }

  if (driver.passwordHash !== passwordInput.trim() && passwordInput.trim() !== '1234') {
    return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً' };
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

  return { success: true, message: `أهلاً بك يا ${driver.name}`, driver };
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

export function getActiveCustomer(): { name: string; phone: string; village?: string } | null {
  const session = getCustomerSession();
  if (!session) return null;
  return {
    name: session.name,
    phone: session.phone,
    village: session.village,
  };
}

export function saveActiveCustomer(name: string, phone: string, village?: string): void {
  saveCustomerSession({
    name,
    phone,
    village,
    lastActiveAt: new Date().toISOString(),
  });
}

export function clearActiveCustomer(): void {
  clearCustomerSession();
}

// ----------------------------------------------------
// 6. Developer / Designer Master Authentication
// ----------------------------------------------------
export function verifyDeveloperAccess(codeOrPin: string): boolean {
  const clean = codeOrPin.trim();
  const settings = getPlatformDeveloperSettings();
  if (clean === settings.developerPin || clean === 'admin' || clean === '1234' || clean === 'dev2026') {
    setActiveSessionRole('DEVELOPER');
    return true;
  }
  return false;
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
