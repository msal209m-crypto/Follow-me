import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  Menu,
  Plus,
  User,
  Wallet,
  Settings as SettingsIcon,
  Package,
  Coins,
  ChevronDown,
  CheckCircle2,
  Globe,
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  LogOut,
  LogIn,
  Bell,
  AlertTriangle,
  Smartphone,
  Rocket,
  Crown,
  WifiOff,
  Zap,
  Share2,
  ShieldAlert,
  MessageCircle,
  X,
  Store,
  Megaphone,
  Edit3,
  Check,
  Sparkles,
  Tag,
  Truck,
  MapPin,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { useSubscription } from '../context/SubscriptionContext';
import { POPULAR_CURRENCIES, getDefaultRatesForBase } from '../data/currencies';
import { ReorderAlertsDropdown } from './ReorderAlertsDropdown';
import { Item } from '../types';
import { clearAllSystemSessions } from '../services/rbacAuthService';
import { OWNER_CONTACT } from '../config/ownerContact';
import { getDismissedAlertIds } from '../utils/alertUtils';
import { getDeliveryOrders } from '../services/deliveryService';
import { getPlatformDeveloperSettings } from '../services/platformSettingsService';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
  onOpenAddItem: () => void;
  onOpenOrderGoods: (item?: Item) => void;
  onOpenSettings: (tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS') => void;
  onOpenAuthModal: () => void;
  onNavigateToItems?: (item?: Item) => void;
  onNavigateToDashboard?: () => void;
  onOpenShareModal?: () => void;
  onSwitchToStore?: () => void;
  onOpenLanding?: () => void;
  onOpenMerchantOrders?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  onOpenMobileMenu,
  onOpenAddItem,
  onOpenOrderGoods,
  onOpenSettings,
  onOpenAuthModal,
  onNavigateToItems,
  onNavigateToDashboard,
  onOpenShareModal,
  onSwitchToStore,
  onOpenLanding,
  onOpenMerchantOrders,
}) => {
  const {
    currentCashier,
    cashiers,
    setCurrentCashier,
    financialSummary,
    inventoryStats,
    settings,
    updateSettings,
    language,
    setLanguage,
    t,
    isRTL,
    cloudSyncStatus,
    syncToCloudNow,
  } = useApp();

  const { currentUser, userProfile, logout, isCloudConnected } = useAuth();
  const { isInstalled, setShowInstallPromptModal, updateAvailable, applyUpdate, isOnline } = usePWA();
  const { isPro, subscription, setShowSubscriptionModal } = useSubscription();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const alertsMenuRef = useRef<HTMLDivElement>(null);

  // Helper to ensure dropdowns stay 100% visible on screen without clipping or overflowing
  const getClampedDropdownStyle = (
    element: HTMLElement | null,
    desiredWidth: number,
    rtlMode: boolean
  ): React.CSSProperties => {
    if (!element) {
      return {
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        ...(rtlMode ? { right: 0 } : { left: 0 }),
        width: `${desiredWidth}px`,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: '90vh',
        zIndex: 50,
      };
    }

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const menuWidth = Math.min(desiredWidth, viewportWidth - 20);

    let targetLeft: number;
    if (rtlMode) {
      // In RTL, end utility buttons are located near the left edge of the viewport.
      // Aligning dropdown's left edge with button's left edge opens it inwards into the viewport.
      const idealLeft = rect.left;
      targetLeft = Math.max(10, Math.min(idealLeft, viewportWidth - menuWidth - 10));
    } else {
      // In LTR, end utility buttons are located near the right edge of the viewport.
      // Aligning dropdown's right edge with button's right edge opens it inwards into the viewport.
      const idealLeft = rect.right - menuWidth;
      targetLeft = Math.max(10, Math.min(idealLeft, viewportWidth - menuWidth - 10));
    }

    const relativeLeft = targetLeft - rect.left;

    return {
      position: 'absolute',
      top: 'calc(100% + 0.5rem)',
      left: `${relativeLeft}px`,
      width: `${menuWidth}px`,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: '90vh',
      zIndex: 50,
    };
  };

  const [currencyDropdownStyle, setCurrencyDropdownStyle] = useState<React.CSSProperties>({});
  const [languageDropdownStyle, setLanguageDropdownStyle] = useState<React.CSSProperties>({});
  const [userDropdownStyle, setUserDropdownStyle] = useState<React.CSSProperties>({});
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => getDismissedAlertIds());

  // Global platform developer broadcast/announcement (read-only for merchants, managed exclusively by app developer in Developer Console)
  const [developerAnnouncement, setDeveloperAnnouncement] = useState<string>(() => {
    try {
      return getPlatformDeveloperSettings().developerAnnouncement || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const handleDevSettingsUpdated = (e: any) => {
      if (e.detail?.developerAnnouncement !== undefined) {
        setDeveloperAnnouncement(e.detail.developerAnnouncement || '');
      }
    };
    window.addEventListener('qaryati:dev-settings-updated', handleDevSettingsUpdated);
    return () => {
      window.removeEventListener('qaryati:dev-settings-updated', handleDevSettingsUpdated);
    };
  }, []);

  const userInitial = useMemo(() => {
    const raw = (userProfile?.displayName || currentUser?.email || '').trim();
    return raw ? raw.charAt(0).toUpperCase() : 'U';
  }, [userProfile?.displayName, currentUser?.email]);

  useEffect(() => {
    const handleAlertsUpdated = () => {
      setDismissedAlertIds(getDismissedAlertIds());
    };
    window.addEventListener('flowapp:alerts-updated', handleAlertsUpdated);
    return () => window.removeEventListener('flowapp:alerts-updated', handleAlertsUpdated);
  }, []);

  // Real-time Village Store Delivery Orders counter for Merchant
  const [deliveryOrdersCount, setDeliveryOrdersCount] = useState<number>(() => {
    const all = getDeliveryOrders();
    return all.filter((o) => o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'READY_FOR_PICKUP').length;
  });

  const [hasNewIncomingOrders, setHasNewIncomingOrders] = useState<boolean>(() => {
    const all = getDeliveryOrders();
    return all.some((o) => o.status === 'NEW');
  });

  useEffect(() => {
    const refreshDeliveryCount = () => {
      const all = getDeliveryOrders();
      const activeCount = all.filter(
        (o) => o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'READY_FOR_PICKUP'
      ).length;
      setDeliveryOrdersCount(activeCount);
      setHasNewIncomingOrders(all.some((o) => o.status === 'NEW'));
    };

    window.addEventListener('qaryati:orders-updated', refreshDeliveryCount);
    window.addEventListener('qaryati:new-order-received', refreshDeliveryCount);

    return () => {
      window.removeEventListener('qaryati:orders-updated', refreshDeliveryCount);
      window.removeEventListener('qaryati:new-order-received', refreshDeliveryCount);
    };
  }, []);

  const activeAlertsCount = useMemo(() => {
    return inventoryStats.lowStockItems.filter((it) => !dismissedAlertIds.includes(it.id)).length;
  }, [inventoryStats.lowStockItems, dismissedAlertIds]);

  const handleToggleUserDropdown = () => {
    if (!showUserDropdown && userMenuRef.current) {
      setUserDropdownStyle(getClampedDropdownStyle(userMenuRef.current, 320, isRTL));
    }
    setShowUserDropdown((prev) => {
      const next = !prev;
      if (next) {
        setShowAlertsDropdown(false);
        setShowCurrencyDropdown(false);
        setShowLanguageDropdown(false);
      }
      return next;
    });
  };

  const handleToggleCurrencyDropdown = () => {
    if (!showCurrencyDropdown && currencyMenuRef.current) {
      setCurrencyDropdownStyle(getClampedDropdownStyle(currencyMenuRef.current, 240, isRTL));
    }
    setShowCurrencyDropdown((prev) => {
      const next = !prev;
      if (next) {
        setShowAlertsDropdown(false);
        setShowUserDropdown(false);
        setShowLanguageDropdown(false);
      }
      return next;
    });
  };

  const handleToggleLanguageDropdown = () => {
    if (!showLanguageDropdown && languageMenuRef.current) {
      setLanguageDropdownStyle(getClampedDropdownStyle(languageMenuRef.current, 180, isRTL));
    }
    setShowLanguageDropdown((prev) => {
      const next = !prev;
      if (next) {
        setShowAlertsDropdown(false);
        setShowUserDropdown(false);
        setShowCurrencyDropdown(false);
      }
      return next;
    });
  };

  const handleToggleAlertsDropdown = () => {
    setShowAlertsDropdown((prev) => {
      const next = !prev;
      if (next) {
        setShowUserDropdown(false);
        setShowCurrencyDropdown(false);
        setShowLanguageDropdown(false);
      }
      return next;
    });
  };

  useLayoutEffect(() => {
    if (showCurrencyDropdown && currencyMenuRef.current) {
      const updatePosition = () => {
        setCurrencyDropdownStyle(getClampedDropdownStyle(currencyMenuRef.current, 240, isRTL));
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [showCurrencyDropdown, isRTL]);

  useLayoutEffect(() => {
    if (showLanguageDropdown && languageMenuRef.current) {
      const updatePosition = () => {
        setLanguageDropdownStyle(getClampedDropdownStyle(languageMenuRef.current, 180, isRTL));
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [showLanguageDropdown, isRTL]);

  useLayoutEffect(() => {
    if (showUserDropdown && userMenuRef.current) {
      const updatePosition = () => {
        setUserDropdownStyle(getClampedDropdownStyle(userMenuRef.current, 320, isRTL));
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [showUserDropdown, isRTL]);

  // Close dropdowns on outside interaction (click/tap) or Escape key
  useEffect(() => {
    const handleOutsideInteraction = (event: Event) => {
      const target = event.target as Node;
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(target)) {
        setShowCurrencyDropdown(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setShowLanguageDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserDropdown(false);
      }
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(target)) {
        setShowAlertsDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCurrencyDropdown(false);
        setShowLanguageDropdown(false);
        setShowUserDropdown(false);
        setShowAlertsDropdown(false);
      }
    };

    const hasOpenDropdown =
      showCurrencyDropdown || showLanguageDropdown || showUserDropdown || showAlertsDropdown;

    if (hasOpenDropdown) {
      document.addEventListener('mousedown', handleOutsideInteraction);
      document.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideInteraction);
      document.removeEventListener('touchstart', handleOutsideInteraction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCurrencyDropdown, showLanguageDropdown, showUserDropdown, showAlertsDropdown]);

  const handleSelectCurrency = (curr: typeof POPULAR_CURRENCIES[0]) => {
    updateSettings({
      currency: curr.symbol,
      multiCurrency: {
        ...(settings.multiCurrency || {
          enabled: true,
          baseCurrencyCode: curr.code,
          secondaryCurrencyCode: 'USD',
          showDualCurrency: true,
          rates: getDefaultRatesForBase(curr.code),
          lastUpdated: new Date().toISOString(),
          autoFetchRates: true,
        }),
        baseCurrencyCode: curr.code,
        rates: getDefaultRatesForBase(curr.code),
        lastUpdated: new Date().toISOString(),
      },
    });
    setShowCurrencyDropdown(false);
  };

  const handleToggleLanguage = (lang: 'ar' | 'en') => {
    setLanguage(lang);
    setShowLanguageDropdown(false);
  };

  const displayAppName =
    !settings.storeName ||
    settings.storeName === 'تطبيق فلو اب التجاري' ||
    settings.storeName === 'فلو اب (FlowApp)'
      ? (language === 'ar' ? 'فلو اب' : 'FlowUp')
      : settings.storeName;

  return (
    <header className="no-print bg-slate-900/98 backdrop-blur-md border-b border-slate-700/80 sticky top-0 z-30 shadow-md w-full flex flex-col">
      {/* TIER 1: SYSTEM CONTROLS, NAVIGATION & USER ACCOUNT */}
      <div className="relative z-20 flex items-center justify-between gap-1.5 sm:gap-3 px-2 xs:px-3 sm:px-6 py-2 border-b border-slate-800/80 bg-slate-900/98 w-full min-w-0">
        {/* Left / Start: Mobile Menu & Live Indicators */}
        <div className="flex items-center gap-1.5 xs:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 xs:p-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 rounded-xl border border-slate-650 cursor-pointer shrink-0 active:scale-95 shadow-sm transition-all"
            title={t.openMainMenu}
          >
            <Menu className="w-4 h-4 xs:w-5 xs:h-5" />
          </button>

          {/* Cloud Sync Status Pill */}
          <button
            type="button"
            onClick={syncToCloudNow}
            title={
              cloudSyncStatus === 'synced'
                ? t.cloudSynced
                : cloudSyncStatus === 'syncing'
                ? t.cloudSyncing
                : currentUser
                ? t.cloudOffline
                : t.accountSecurityNote
            }
            className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm ${
              cloudSyncStatus === 'synced'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70'
                : cloudSyncStatus === 'syncing'
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-200 animate-pulse'
                : currentUser
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200 hover:bg-cyan-900/70'
                : 'bg-slate-800 border-slate-650 text-slate-300 hover:bg-slate-750'
            }`}
          >
            {cloudSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
            ) : currentUser ? (
              <Cloud className="w-3 h-3 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-slate-400" />
            )}
            <span className="hidden xs:inline">
              {currentUser
                ? cloudSyncStatus === 'synced'
                  ? (language === 'ar' ? 'سحابي متصل' : 'Cloud Synced')
                  : cloudSyncStatus === 'syncing'
                  ? (language === 'ar' ? 'مزامنة...' : 'Syncing...')
                  : (language === 'ar' ? 'متصل' : 'Connected')
                : (language === 'ar' ? 'وضع الضيف' : 'Guest')}
            </span>
          </button>

          {/* Remote Offline SWR Mode indicator */}
          {!isOnline && (
            <div
              title={
                language === 'ar'
                  ? 'وضع المناطق النائية: التطبيق يعمل بكفاءة تامة أوفلاين عبر استراتيجية Stale-While-Revalidate'
                  : 'Remote Offline Mode: App running fully offline with Stale-While-Revalidate caching'
              }
              className="flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold border bg-amber-950/80 border-amber-500/60 text-amber-300 shrink-0"
            >
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'أوفلاين (SWR) ⚡' : 'Offline (SWR) ⚡'}
              </span>
            </div>
          )}

          {/* Live Cash In Hand pill on desktop */}
          <div className="hidden xl:flex items-center bg-emerald-950/40 border border-emerald-600/50 rounded-xl px-2.5 py-1 text-xs text-emerald-200 shrink-0 shadow-inner">
            <Wallet className="w-3.5 h-3.5 text-emerald-400 mx-1 shrink-0" />
            <span className="text-emerald-300/90 mx-1 font-semibold text-[11px]">{t.cashRegister}:</span>
            <span className="font-bold font-mono dir-ltr text-emerald-200 text-xs">
              {financialSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
              <span className="text-[10px] text-emerald-400 font-sans">{settings.currency}</span>
            </span>
          </div>
        </div>

        {/* Right / End: All top controls in a single tidy row */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Merchant Orders Management Button */}
          {onOpenMerchantOrders && (
            <button
              type="button"
              id="top-merchant-delivery-orders-btn"
              onClick={onOpenMerchantOrders}
              className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md text-xs font-bold border ${
                hasNewIncomingOrders
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse shadow-rose-950/60'
                  : deliveryOrdersCount > 0
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400/50 shadow-amber-950/40'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
              }`}
              title={language === 'ar' ? 'إدارة طلبات التوصيل الواردة من المتجر' : 'Store Delivery Orders'}
            >
              <Truck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${hasNewIncomingOrders ? 'text-white animate-bounce' : 'text-amber-300'}`} />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'طلبات التوصيل' : 'Delivery Orders'}
              </span>
              {deliveryOrdersCount > 0 ? (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  hasNewIncomingOrders ? 'bg-white text-rose-600' : 'bg-amber-950 text-amber-300 border border-amber-400/30'
                }`}>
                  {deliveryOrdersCount}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 hidden md:inline">(0)</span>
              )}
            </button>
          )}

          {/* 0. Return to Store Main Button (دالة الخروج والعودة لواجهة المتجر الرئيسية) */}
          {onSwitchToStore && (
            <button
              type="button"
              id="top-return-to-store-main-btn"
              onClick={onSwitchToStore}
              className="h-8 sm:h-9 px-2.5 sm:px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-md shadow-emerald-950/40 text-xs font-bold border border-emerald-400/40"
              title={language === 'ar' ? 'الخروج والعودة إلى واجهة المتجر الرئيسية' : 'Return to Main Store View'}
            >
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100 shrink-0" />
              <span className="hidden sm:inline">
                {language === 'ar' ? 'واجهة المتجر' : 'Store View'}
              </span>
              <span className="text-[10px] bg-emerald-950/60 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-400/30 hidden md:inline">
                {language === 'ar' ? 'خروج' : 'Exit'}
              </span>
            </button>
          )}

          {/* 1. Currency Switcher */}
          <div className="relative" ref={currencyMenuRef}>
            <button
              type="button"
              id="top-currency-switcher-btn"
              onClick={handleToggleCurrencyDropdown}
              className="h-8 sm:h-9 px-2 sm:px-2.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-amber-200 hover:text-amber-100 rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm text-xs font-bold"
              title={t.activeCurrency}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-mono text-[11px] sm:text-xs">{settings.currency}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showCurrencyDropdown && (
              <div
                className="fixed sm:absolute top-14 sm:top-full mt-2 inset-x-2 sm:inset-x-auto end-0 sm:w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1 animate-in fade-in zoom-in-95 overflow-y-auto max-h-[85vh] custom-scrollbar"
              >
                <div className="px-2 py-1 text-[11px] font-bold text-slate-300 border-b border-slate-800 mb-1">
                  {t.activeCurrency}
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 py-1">
                  {POPULAR_CURRENCIES.map((curr) => {
                    const isCurrent =
                      settings.currency.trim() === curr.symbol.trim() ||
                      settings.multiCurrency?.baseCurrencyCode === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => handleSelectCurrency(curr)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                          isCurrent
                            ? 'bg-amber-950/80 text-amber-200 font-bold border-amber-500/50'
                            : 'text-slate-100 hover:bg-slate-800 border-transparent hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{curr.flag}</span>
                          <span>{language === 'ar' ? curr.name : curr.code}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-300 text-[11px]">({curr.symbol})</span>
                          {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1.5 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCurrencyDropdown(false);
                      onOpenSettings('CURRENCY');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 text-[11px] font-bold border border-amber-600/70 transition-colors cursor-pointer active:scale-95"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.multiCurrencyTitle} &gt;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Language Switcher */}
          <div className="relative" ref={languageMenuRef}>
            <button
              type="button"
              id="top-language-switcher-btn"
              onClick={handleToggleLanguageDropdown}
              className="h-8 sm:h-9 px-2 sm:px-2.5 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm text-xs font-bold"
              title={t.switchLanguage}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] sm:text-xs">{language === 'ar' ? 'عربي' : 'EN'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showLanguageDropdown && (
              <div
                className="fixed sm:absolute top-14 sm:top-full mt-2 inset-x-2 sm:inset-x-auto end-0 sm:w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 text-xs space-y-1 animate-in fade-in zoom-in-95 overflow-y-auto max-h-[85vh] custom-scrollbar"
              >
                <div className="px-2 py-1 text-[11px] font-bold text-slate-300 border-b border-slate-800 mb-1">
                  {t.switchLanguage}
                </div>
                <button
                  type="button"
                  id="lang-option-ar"
                  onClick={() => handleToggleLanguage('ar')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                    language === 'ar'
                      ? 'bg-emerald-950/80 text-emerald-200 font-bold border-emerald-500/50'
                      : 'text-slate-100 hover:bg-slate-800 border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🇸🇦</span>
                    <span>العربية (Arabic)</span>
                  </div>
                  {language === 'ar' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  id="lang-option-en"
                  onClick={() => handleToggleLanguage('en')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                    language === 'en'
                      ? 'bg-emerald-950/80 text-emerald-200 font-bold border-emerald-500/50'
                      : 'text-slate-100 hover:bg-slate-800 border-transparent hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🇺🇸</span>
                    <span>English (US)</span>
                  </div>
                  {language === 'en' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            )}
          </div>

          {/* 3. Stock Reorder Notifications Bell */}
          <div className="relative" ref={alertsMenuRef}>
            <button
              type="button"
              id="top-notifications-bell-btn"
              onClick={handleToggleAlertsDropdown}
              className={`relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-sm ${
                activeAlertsCount > 0
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200 hover:bg-amber-900 shadow-md shadow-amber-950/60'
                  : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white'
              }`}
              title={
                activeAlertsCount > 0
                  ? `${t.reorderAlertsTitle} (${activeAlertsCount})`
                  : inventoryStats.lowStockCount > 0
                  ? (language === 'ar' ? 'تم إخفاء التنبيهات مؤقتاً' : 'Alerts snoozed')
                  : t.reorderAlertsTitle
              }
            >
              <Bell className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeAlertsCount > 0 ? 'animate-bounce text-amber-300' : 'text-slate-300'}`} />

              {activeAlertsCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-[9px] min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 shadow-lg ring-2 ring-slate-900 animate-pulse">
                  {activeAlertsCount}
                </span>
              ) : inventoryStats.lowStockCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-slate-700 text-slate-300 font-mono text-[8px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5 ring-1 ring-slate-900" title={language === 'ar' ? 'تنبيهات مخفية' : 'Hidden alerts'}>
                  ✓
                </span>
              ) : null}
            </button>

            {showAlertsDropdown && (
              <ReorderAlertsDropdown
                onClose={() => setShowAlertsDropdown(false)}
                onNavigateToOrderGoods={(item) => onOpenOrderGoods(item)}
                onNavigateToItems={(item) => onNavigateToItems && onNavigateToItems(item)}
              />
            )}
          </div>

          {/* 4. Settings Button */}
          <button
            type="button"
            id="top-btn-settings"
            onClick={() => onOpenSettings()}
            className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
            title={t.navSettings}
          >
            <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
          </button>

          {/* 5. User Account Profile / Direct Sign In */}
          <div className="relative" ref={userMenuRef}>
            {currentUser ? (
              <button
                type="button"
                id="top-auth-user-btn"
                onClick={handleToggleUserDropdown}
                className="h-8 sm:h-9 px-1.5 sm:px-2 bg-slate-800/90 hover:bg-slate-750 border border-emerald-500/60 hover:border-emerald-500 text-emerald-200 rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
                title={userProfile?.displayName || currentUser.email || (language === 'ar' ? 'حساب التاجر' : 'Merchant Account')}
                aria-label={userProfile?.displayName || currentUser.email || 'User Menu'}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white font-black text-xs flex items-center justify-center shadow-inner ring-1 ring-white/30 select-none">
                    {userInitial}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 ring-1 ring-slate-900"></span>
                  </span>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-emerald-300/90 shrink-0 transition-transform duration-200 ${
                    showUserDropdown ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>
            ) : (
              <button
                type="button"
                id="top-auth-login-btn"
                onClick={onOpenAuthModal}
                className="h-8 sm:h-9 px-2.5 sm:px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0 active:scale-95 border border-emerald-400/40"
                title={language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
              >
                <LogIn className="w-3.5 h-3.5 text-white" />
                <span className="hidden xs:inline">{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
              </button>
            )}

            {/* Comprehensive User Profile Dropdown */}
            {showUserDropdown && currentUser && (
              <div
                className="fixed sm:absolute top-14 sm:top-full mt-2 inset-x-2 sm:inset-x-auto end-0 sm:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-3 text-xs space-y-2 overflow-y-auto max-h-[85vh] custom-scrollbar animate-in fade-in zoom-in-95"
              >
                {/* User Header */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shrink-0 ring-1 ring-white/30">
                      {userInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate text-xs">
                        {userProfile?.displayName || currentUser.email?.split('@')[0] || (language === 'ar' ? 'التاجر' : 'Merchant')}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate font-mono" dir="ltr">
                        {currentUser.email}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {userProfile?.role === 'admin'
                            ? (language === 'ar' ? 'مالك / مدير' : 'Owner / Admin')
                            : (language === 'ar' ? 'كاشير' : 'Cashier')}
                        </span>
                        {isPro && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            👑 PRO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(false)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={language === 'ar' ? 'إغلاق القائمة' : 'Close Menu'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {!isCloudConnected && (
                    <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-[11px] flex flex-col gap-1.5 my-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{language === 'ar' ? 'وضع المتجر المحلي' : 'Local Offline Store'}</span>
                      </div>
                      <p className="text-[10px] text-amber-200/80 leading-relaxed">
                        {language === 'ar'
                          ? 'البيانات محفوظة بأمان في هذا الجهاز. لمزامنتها مع السحابة سجّل الدخول عبر Google.'
                          : 'Store is safely stored locally. Sign in with Google to enable cloud sync.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenAuthModal();
                        }}
                        className="w-full py-1 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-center cursor-pointer transition-colors text-xs"
                      >
                        {language === 'ar' ? 'ربط السحابة بـ Google' : 'Connect Google Cloud'}
                      </button>
                    </div>
                  )}

                  {isCloudConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        syncToCloudNow();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{t.cloudSyncTitle}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">{t.cloudSynced}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{t.cloudBackupsTitle}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">{t.autoBackup}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowSubscriptionModal(true);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-amber-300 hover:bg-amber-950/40 border border-transparent hover:border-amber-700/60 transition-colors cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{isPro ? (language === 'ar' ? 'باقة المحترف (نشطة 👑)' : 'Pro License (Active 👑)') : (language === 'ar' ? 'ترقية المتجر (PRO)' : 'Upgrade Pro')}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold">{isPro ? '👑 PRO' : (language === 'ar' ? 'ترقية' : 'Upgrade')}</span>
                  </button>

                  {onOpenShareModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenShareModal();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-sky-300 hover:bg-sky-950/40 border border-transparent hover:border-sky-700/60 transition-colors cursor-pointer active:scale-98"
                    >
                      <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{language === 'ar' ? 'مشاركة رابط التطبيق' : 'Share App Link'}</span>
                    </button>
                  )}

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowInstallPromptModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-cyan-300 hover:bg-cyan-950/40 border border-transparent hover:border-cyan-700/60 transition-colors cursor-pointer active:scale-98"
                    >
                      <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{language === 'ar' ? 'تثبيت التطبيق على جهازك' : 'Install App'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors cursor-pointer active:scale-98"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>{t.advancedSettings}</span>
                  </button>

                  <a
                    href={OWNER_CONTACT.getWhatsAppUrl({ storeName: settings.storeName })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowUserDropdown(false)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-emerald-300 hover:bg-emerald-950/50 border border-transparent hover:border-emerald-600/50 transition-colors cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'ar' ? 'طلب كود وتواصل (واتساب)' : 'WhatsApp Owner / Order Key'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">{OWNER_CONTACT.phoneLocal}</span>
                  </a>

                  {onSwitchToStore && (
                    <button
                      type="button"
                      id="dropdown-return-to-store-main-btn"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onSwitchToStore();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-emerald-300 hover:bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-500/60 transition-colors cursor-pointer active:scale-98"
                      title={language === 'ar' ? 'الخروج والعودة إلى واجهة المتجر الرئيسية' : 'Return to Main Store View'}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold">{language === 'ar' ? 'الخروج لواجهة المتجر الرئيسية' : 'Return to Main Store View'}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        {language === 'ar' ? 'متجر العملاء' : 'Customer View'}
                      </span>
                    </button>
                  )}

                  {onOpenLanding && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenLanding();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-emerald-300 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-700/60 transition-colors cursor-pointer active:scale-98"
                    >
                      <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'ar' ? 'العودة لشاشة البوابات الرئيسية' : 'Return to Portals Screen'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      setShowUserDropdown(false);
                      clearAllSystemSessions();
                      await logout();
                      if (onOpenLanding) onOpenLanding();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 border border-transparent hover:border-rose-700/60 transition-colors cursor-pointer active:scale-98 mt-1"
                  >
                    <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t.signOutBtn}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. Prominent & Immediate Fast Logout Button (زر تسجيل خروج فوري وبارز) */}
          {currentUser && (
            <button
              type="button"
              id="top-immediate-logout-btn"
              onClick={async () => {
                clearAllSystemSessions();
                await logout();
                if (onOpenLanding) {
                  onOpenLanding();
                } else if (onSwitchToStore) {
                  onSwitchToStore();
                }
              }}
              className="h-8 sm:h-9 px-2 sm:px-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-600/50 hover:border-rose-500 text-rose-200 hover:text-white rounded-xl flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shrink-0 shadow-md active:scale-95 text-xs font-black"
              title={language === 'ar' ? 'تسجيل الخروج الفوري وإنهاء الجلسة' : 'Immediate Logout'}
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{language === 'ar' ? 'تسجيل خروج' : 'Logout'}</span>
            </button>
          )}
        </div>
    </div>

    {/* TIER 2: DEDICATED STORE IDENTITY & ANNOUNCEMENT / PROMO SPACE */}
    <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 px-2 xs:px-3 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-slate-950/95 via-slate-900/98 to-slate-950/95 border-t border-slate-800/60 w-full min-w-0">
      {/* Store Brand / Identity */}
      <div
        onClick={onNavigateToDashboard}
        className={`flex items-center gap-2.5 sm:gap-3 shrink-0 ${
          onNavigateToDashboard ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
        }`}
        title={language === 'ar' ? 'الرئيسية - لوحة التحكم' : 'Main Dashboard'}
      >
        {/* Store Emblem */}
        <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 border border-emerald-400/40 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 shrink-0 ring-1 ring-white/20">
          <Store className="w-4 h-4 xs:w-5 xs:h-5 text-white" />
        </div>

        {/* Store Name & Meta */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 xs:gap-2 flex-wrap">
            <h1 className="font-black text-sm xs:text-base sm:text-lg md:text-xl text-white tracking-tight leading-tight select-none truncate max-w-[200px] xs:max-w-xs sm:max-w-sm md:max-w-md">
              {displayAppName}
            </h1>
            {settings.address && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>القرية: {settings.address}</span>
              </span>
            )}
            <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              <span>حساب التاجر المحمي</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
            {settings.phone ? (
              <span>{language === 'ar' ? `هاتف: ${settings.phone}` : `Tel: ${settings.phone}`}</span>
            ) : (
              <span>{language === 'ar' ? 'نظام إدارة المخزون والمبيعات ونقاط البيع' : 'Cloud POS & Inventory Suite'}</span>
            )}
            {settings.taxNumber && (
              <>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[10px] text-slate-400">
                  {language === 'ar' ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Merchant Operational Status & Developer-Managed Platform Broadcast (Read-Only) */}
      <div className="flex-1 min-w-0 flex items-center justify-end gap-2.5">
        {/* If the platform developer has published a global platform notice, display it strictly read-only with NO edit button */}
        {developerAnnouncement ? (
          <div
            id="top-platform-announcement-pill"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-sm max-w-full md:max-w-md truncate"
            title={developerAnnouncement}
          >
            <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Megaphone className="w-3 h-3" />
            </div>
            <div className="min-w-0 truncate flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/30 shrink-0">
                {language === 'ar' ? 'تنبيه المنصة' : 'Platform Alert'}
              </span>
              <span className="text-xs text-slate-200 font-medium truncate">
                {developerAnnouncement}
              </span>
            </div>
          </div>
        ) : (
          /* Store Operational Status Indicator */
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{language === 'ar' ? 'نظام المتجر متصل وجاهز للمبيعات' : 'Store POS Active & Online'}</span>
            </span>
          </div>
        )}
      </div>
    </div>
    </header>
  );
};
