import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SubscriptionInfo, SubscriptionTier } from '../types';
import {
  verifyLicenseKey,
  generateLicenseKey,
  calculateDaysRemaining,
  LicensePlanCode,
  LICENSE_PLANS,
} from '../utils/licenseEngine';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc } from 'firebase/firestore';
import { safeSetDoc } from '../lib/firestoreUtils';
import { verifyAndRedeemLicenseKey } from '../services/licenseKeyService';

const STORAGE_KEY = 'flowapp_subscription_license_v1';
export const FREE_ITEM_LIMIT = 75;

interface SubscriptionContextType {
  subscription: SubscriptionInfo;
  isPro: boolean;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
  activateLicenseKey: (key: string) => Promise<{ success: boolean; message: string; planName?: string }>;
  activateOnlinePayment: (
    planCode: LicensePlanCode,
    details?: { cardNumber?: string; payerName?: string }
  ) => Promise<{ success: boolean; message: string }>;
  cancelSubscription: () => void;
  generateAdminKey: (planCode: LicensePlanCode, memo?: string) => string;
  freeItemLimit: number;
  canAddItemWithCount: (currentCount: number) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  tier: 'FREE',
  isPro: false,
  expiresAt: null,
  licenseKey: null,
  activatedAt: null,
  planName: 'الخطة الأساسية المجانية',
  daysRemaining: 0,
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // Initialize from LocalStorage
  const [subscription, setSubscription] = useState<SubscriptionInfo>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SubscriptionInfo = JSON.parse(saved);
        // Check expiration
        if (parsed.expiresAt) {
          const days = calculateDaysRemaining(parsed.expiresAt);
          if (days <= 0) {
            return {
              ...DEFAULT_SUBSCRIPTION,
              planName: 'الاشتراك منتهي (الخطة المجانية)',
            };
          }
          return {
            ...parsed,
            isPro: true,
            daysRemaining: days,
          };
        } else if (parsed.planCode === 'LIFE') {
          return {
            ...parsed,
            isPro: true,
            daysRemaining: 9999,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse subscription state:', e);
    }
    return DEFAULT_SUBSCRIPTION;
  });

  // Keep daysRemaining updated
  useEffect(() => {
    if (subscription.isPro && subscription.expiresAt) {
      const days = calculateDaysRemaining(subscription.expiresAt);
      if (days <= 0 && subscription.tier === 'PRO') {
        // Expired
        const expiredSub: SubscriptionInfo = {
          ...DEFAULT_SUBSCRIPTION,
          planName: 'الاشتراك منتهي (الخطة المجانية)',
        };
        setSubscription(expiredSub);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredSub));
      } else if (days !== subscription.daysRemaining) {
        setSubscription((prev) => ({ ...prev, daysRemaining: days }));
      }
    }
  }, [subscription.expiresAt, subscription.isPro, subscription.tier, subscription.daysRemaining]);

  // Sync with Firestore profile if user logs in
  useEffect(() => {
    if (userProfile?.subscriptionTier === 'PRO') {
      const expiresAt = userProfile.subscriptionExpiresAt || null;
      const days = expiresAt ? calculateDaysRemaining(expiresAt) : 9999;
      if (!expiresAt || days > 0) {
        const synced: SubscriptionInfo = {
          tier: 'PRO',
          isPro: true,
          expiresAt,
          licenseKey: userProfile.licenseKey || subscription.licenseKey,
          activatedAt: subscription.activatedAt || new Date().toISOString(),
          planName: expiresAt ? `برو معتمد (${days} يوم متبقي)` : 'برو دائم (مدى الحياة)',
          daysRemaining: days,
        };
        setSubscription(synced);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
      }
    }
  }, [userProfile?.subscriptionTier, userProfile?.subscriptionExpiresAt, userProfile?.licenseKey]);

  // Helper to persist subscription state
  const persistSubscription = useCallback(
    async (newSub: SubscriptionInfo) => {
      const updatedSub: SubscriptionInfo = { ...newSub };
      setSubscription(updatedSub);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSub));
      } catch (err) {
        console.warn('Failed to save subscription to localStorage:', err);
      }

      // Dispatch event for instant multi-window/component synchronization
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowapp:subscription-updated', { detail: updatedSub }));
      }

      // Also persist to Firestore if logged in
      if (currentUser?.uid && db) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await safeSetDoc(
            userRef,
            {
              subscriptionTier: updatedSub.tier,
              subscriptionExpiresAt: updatedSub.expiresAt,
              licenseKey: updatedSub.licenseKey || null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Firestore subscription sync deferred (offline):', e);
        }
      }
    },
    [currentUser?.uid]
  );

  // 1. SECURE DATABASE & OFFLINE LICENSE KEY ACTIVATION
  const activateLicenseKey = useCallback(
    async (inputKey: string) => {
      const userId = currentUser?.uid || 'local_user';
      const userEmail = currentUser?.email || (userProfile as any)?.email;

      const result = await verifyAndRedeemLicenseKey(inputKey, userId, userEmail);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      const now = new Date();
      const activatedSub: SubscriptionInfo = {
        tier: 'PRO',
        isPro: true,
        expiresAt: result.expiresAt || null,
        licenseKey: result.cleanKey || inputKey.trim().toUpperCase(),
        activatedAt: now.toISOString(),
        planCode: result.planCode,
        planName: result.planName,
        paymentType: 'OFFLINE_KEY',
        daysRemaining: result.durationDays || 9999,
      };

      await persistSubscription(activatedSub);

      return {
        success: true,
        message: result.message,
        planName: result.planName,
      };
    },
    [currentUser?.uid, currentUser?.email, userProfile, persistSubscription]
  );

  // 2. ONLINE PAYMENT ACTIVATION (Card / Digital Wallet)
  const activateOnlinePayment = useCallback(
    async (planCode: LicensePlanCode) => {
      const plan = LICENSE_PLANS.find((p) => p.code === planCode) || LICENSE_PLANS[0];
      const isLifetime = plan.code === 'LIFE';
      const now = new Date();
      let expiresAt: string | null = null;
      let daysRemaining = 9999;

      if (!isLifetime) {
        const expiryDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        expiresAt = expiryDate.toISOString();
        daysRemaining = plan.durationDays;
      }

      // Generate a digital receipt license
      const digitalKey = generateLicenseKey(plan.code, 'DIGITAL');

      const activatedSub: SubscriptionInfo = {
        tier: 'PRO',
        isPro: true,
        expiresAt,
        licenseKey: digitalKey,
        activatedAt: now.toISOString(),
        planCode: plan.code,
        planName: plan.nameAr,
        paymentType: 'ONLINE_CARD',
        daysRemaining,
      };

      await persistSubscription(activatedSub);

      return {
        success: true,
        message: `تم سداد الاشتراك وتفعيل ${plan.nameAr} فوراً! رقم الترخيص: ${digitalKey}`,
      };
    },
    [persistSubscription]
  );

  // 3. CANCEL / RESET SUBSCRIPTION
  const cancelSubscription = useCallback(() => {
    persistSubscription(DEFAULT_SUBSCRIPTION);
  }, [persistSubscription]);

  // 4. ADMIN GENERATOR (For store owner to generate keys for clients)
  const generateAdminKey = useCallback((planCode: LicensePlanCode) => {
    return generateLicenseKey(planCode);
  }, []);

  // 5. HELPER: Check if item can be added
  const canAddItemWithCount = useCallback(
    (currentCount: number) => {
      if (subscription.isPro) return true;
      return currentCount < FREE_ITEM_LIMIT;
    },
    [subscription.isPro]
  );

  const contextValue = useMemo(
    () => ({
      subscription,
      isPro: subscription.isPro,
      showSubscriptionModal,
      setShowSubscriptionModal,
      activateLicenseKey,
      activateOnlinePayment,
      cancelSubscription,
      generateAdminKey,
      freeItemLimit: FREE_ITEM_LIMIT,
      canAddItemWithCount,
    }),
    [
      subscription,
      subscription.isPro,
      subscription.tier,
      subscription.expiresAt,
      subscription.daysRemaining,
      showSubscriptionModal,
      activateLicenseKey,
      activateOnlinePayment,
      cancelSubscription,
      generateAdminKey,
      canAddItemWithCount,
    ]
  );

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
