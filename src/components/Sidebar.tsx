import React, { useEffect } from 'react';
import {
  Package,
  Barcode,
  ArrowLeftRight,
  Calculator,
  CreditCard,
  FileSpreadsheet,
  Store,
  User,
  Settings as SettingsIcon,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  Wallet,
  Truck,
  Globe,
  ArrowRight,
  ArrowLeft,
  LogIn,
  LogOut,
  ShieldCheck,
  Smartphone,
  Rocket,
  Cloud,
  Crown,
  Share2,
  ShieldAlert,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { useSubscription } from '../context/SubscriptionContext';
import { NavigationTab } from '../types';
import { OWNER_CONTACT } from '../config/ownerContact';

interface SidebarProps {
  onOpenAddItem: () => void;
  onOpenOrderGoods: () => void;
  onOpenSettings: (tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS') => void;
  onOpenAuthModal?: () => void;
  onOpenShareModal?: () => void;
  onOpenAdminLicenses?: () => void;
  onSwitchToStore?: () => void;
  onOpenLanding?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenAddItem,
  onOpenOrderGoods,
  onOpenSettings,
  onOpenAuthModal,
  onOpenShareModal,
  onOpenAdminLicenses,
  onSwitchToStore,
  onOpenLanding,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { isInstalled, setShowInstallPromptModal, updateAvailable, applyUpdate } = usePWA();
  const { isPro, subscription, setShowSubscriptionModal } = useSubscription();

  const isAccountAdmin =
    (userProfile?.role || '').toLowerCase() === 'admin' ||
    (currentUser?.email || '').toLowerCase() === 'msal209m@gmail.com';
  const {
    activeTab,
    setActiveTab,
    items,
    debts,
    currentCashier,
    setCurrentCashier,
    cashiers,
    settings,
    inventoryStats,
    financialSummary,
    exportDataJSON,
    language,
    setLanguage,
    t,
    isRTL,
  } = useApp();

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    alert?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: LayoutDashboard,
    },
    {
      id: 'items',
      label: t.navItems,
      icon: Package,
      badge: items.length,
      alert: inventoryStats.lowStockCount > 0,
    },
    {
      id: 'stickers',
      label: t.navStickers,
      icon: Barcode,
    },
    {
      id: 'transactions',
      label: t.navTransactions,
      icon: ArrowLeftRight,
    },
    {
      id: 'order_goods',
      label: t.navOrderGoods,
      icon: Truck,
      badge: inventoryStats.lowStockCount > 0 ? inventoryStats.lowStockCount : undefined,
      alert: inventoryStats.lowStockCount > 0,
    },
    {
      id: 'accounts',
      label: t.navAccounts,
      icon: Calculator,
    },
    {
      id: 'debts',
      label: t.navDebts,
      icon: CreditCard,
      badge: debts.filter((d) => d.remainingDebt > 0).length,
    },
    {
      id: 'daily_reports',
      label: t.navDailyReports,
      icon: FileSpreadsheet,
    },
  ];

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const displayAppName =
    !settings.storeName ||
    settings.storeName === 'تطبيق فلو اب التجاري' ||
    settings.storeName === 'فلو اب (FlowApp)'
      ? (language === 'ar' ? 'فلو اب' : 'FlowUp')
      : settings.storeName;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden cursor-pointer"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Vertical Sidebar */}
      <aside
        className={`no-print fixed lg:sticky top-0 ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } z-40 h-screen bg-slate-900/95 border-slate-750 border-slate-700/80 flex flex-col justify-between transition-all duration-300 shadow-xl ${
          mobileOpen
            ? 'translate-x-0 w-72 sm:w-80'
            : isRTL
            ? 'translate-x-full lg:translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Top Header / Brand */}
        <div className="p-3.5 sm:p-4 border-b border-slate-700/80 flex items-center justify-between gap-2 bg-slate-950/40">
          <button
            type="button"
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-right cursor-pointer group hover:opacity-90 transition-opacity"
            title={t.navDashboard}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 flex items-center justify-center shadow-md shadow-emerald-950 text-white font-black text-lg sm:text-xl shrink-0 transition-transform group-hover:scale-105 border border-emerald-400/40">
              {language === 'ar' ? 'فلو' : 'FL'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-wide truncate group-hover:text-emerald-300 transition-colors">
                  {displayAppName}
                </h1>
                <span className="inline-block bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                  {t.verticalDashboard}
                </span>
              </div>
            )}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-650 transition-colors cursor-pointer active:scale-95 shadow-sm"
            title={isCollapsed ? t.expandMenu : t.collapseMenu}
          >
            {isCollapsed ? (
              isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Back / Close Button */}
          <button
            id="sidebar-mobile-back-btn"
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-200 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 active:bg-emerald-800 rounded-xl border border-emerald-500/60 transition-all cursor-pointer text-xs font-bold shrink-0 shadow-sm active:scale-95"
            title={language === 'ar' ? 'العودة للصفحة' : 'Back to page'}
          >
            {isRTL ? <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" /> : <ArrowLeft className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{language === 'ar' ? 'عودة' : 'Back'}</span>
          </button>
        </div>

        {/* PROMINENT USER PRESENCE / DIRECT LOGIN SECTION (Clearly felt, not hidden) */}
        {!isCollapsed ? (
          currentUser ? (
            <div className="mx-2 mt-2 p-2.5 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/50 border border-emerald-500/60 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black text-xs shrink-0 shadow-sm">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-white truncate">
                      {userProfile?.displayName || currentUser.email?.split('@')[0] || 'التاجر'}
                    </div>
                    <div className="text-[10px] text-emerald-300 font-semibold truncate">
                      {userProfile?.storeName || 'متجري التجاري'}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded-full border border-emerald-500/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'ar' ? 'متصل' : 'Online'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenSettings('BACKUPS');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer active:scale-95"
                  title={language === 'ar' ? 'المزامنة السحابية' : 'Cloud Sync'}
                >
                  <Cloud className="w-3 h-3 text-cyan-400" />
                  <span>{language === 'ar' ? 'السحابة' : 'Cloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-bold rounded-xl bg-rose-950/50 hover:bg-rose-900 text-rose-200 border border-rose-500/40 transition-colors cursor-pointer active:scale-95"
                  title={language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                >
                  <LogOut className="w-3 h-3 text-rose-400" />
                  <span>{language === 'ar' ? 'خروج' : 'Logout'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-2 mt-2 p-3 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/70 border-2 border-emerald-500/70 rounded-2xl space-y-2 shadow-lg shadow-emerald-950/50 animate-pulse">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {language === 'ar' ? 'وضع ضيف (غير مسجل)' : 'Guest (Offline)'}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {language === 'ar' ? 'غير متصل سحابياً' : 'Local Only'}
                </span>
              </div>
              <p className="text-[11px] text-slate-200 font-medium leading-tight">
                {language === 'ar'
                  ? 'سجّل دخولك الآن بضغطة زر لحفظ كافة الفواتير والأصناف سحابياً'
                  : 'Sign in directly to sync your inventory & bills safely to cloud'}
              </p>
              <button
                type="button"
                id="sidebar-direct-login-btn"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuthModal && onOpenAuthModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 ring-2 ring-emerald-400/40"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'تسجيل الدخول المباشر 🔐' : 'Sign In Directly 🔐'}</span>
              </button>
            </div>
          )
        ) : (
          <div className="px-2 py-2 flex justify-center">
            {currentUser ? (
              <button
                type="button"
                onClick={() => logout()}
                className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900 transition-colors"
                title={`${userProfile?.displayName || 'التاجر'} (اضغط لتسجيل الخروج)`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal && onOpenAuthModal()}
                className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm animate-pulse"
                title={language === 'ar' ? 'تسجيل الدخول المباشر' : 'Direct Sign In'}
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Cashier & Quick Balance (Clean & Sleek) */}
        {!isCollapsed && (
          <div className="px-3 py-1.5 mx-2 mt-2 bg-slate-950/80 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs shadow-inner">
            <div className="flex items-center gap-1.5 text-slate-200">
              <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <select
                value={currentCashier.id}
                onChange={(e) => {
                  const found = cashiers.find((c) => c.id === e.target.value);
                  if (found) setCurrentCashier(found);
                }}
                className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer py-1"
              >
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300">
              <Wallet className="w-3 h-3 text-emerald-400" />
              <span>{financialSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
              <span className="text-[9px] font-sans text-slate-300">{settings.currency}</span>
            </div>
          </div>
        )}

        {/* Navigation Items (Single sleek, direct list) */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group border active:scale-[0.98] ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/60 font-bold ring-1 ring-emerald-400/30'
                    : 'text-slate-200 bg-slate-900/60 hover:bg-slate-800 hover:text-white border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors border ${
                    isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : item.alert
                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/90 border-slate-700/80 text-slate-300 group-hover:border-emerald-500/40 group-hover:text-emerald-300 group-hover:bg-slate-750'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Label & Badges */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-slate-800 border-slate-700/80 text-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.alert && (
                        <span
                          title={t.itemsReachedReorder}
                          className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>{inventoryStats.lowStockCount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Actions / Settings / Language / PWA Install */}
        <div className="p-3 border-t border-slate-750 border-slate-700/80 bg-slate-950/70 space-y-2">
          {!isCollapsed && (
            <>
              {/* Pro Subscription Banner Card */}
              <div
                onClick={() => {
                  setMobileOpen(false);
                  setShowSubscriptionModal(true);
                }}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-md ${
                  isPro
                    ? 'bg-gradient-to-r from-amber-950/70 via-slate-900 to-yellow-950/60 border-amber-500/50 hover:border-amber-400'
                    : 'bg-gradient-to-r from-amber-500/20 via-slate-900 to-yellow-500/20 border-amber-500/60 hover:border-amber-400 animate-pulse'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-black text-white truncate">
                      {isPro ? (language === 'ar' ? 'باقة المحترف (PRO)' : 'Pro Merchant Plan') : (language === 'ar' ? 'ترقية لباقة المحترف' : 'Upgrade to Pro')}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isPro ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-400 text-slate-950'}`}>
                    {isPro ? (subscription.expiresAt ? `${subscription.daysRemaining} يوم` : 'دائم') : '👑 PRO'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                  <span>{isPro ? (language === 'ar' ? 'جميع الميزات مفتوحة' : 'All features unlocked') : (language === 'ar' ? 'أصناف ومزامنة غير محدودة' : 'Unlimited inventory & sync')}</span>
                  <span className="text-amber-400 font-bold">{language === 'ar' ? 'تفاصيل ←' : 'Details →'}</span>
                </div>
              </div>

              {/* Share App Button */}
              {onOpenShareModal && (
                <button
                  type="button"
                  id="sidebar-share-app-btn"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenShareModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-850 hover:bg-slate-800 text-sky-300 hover:text-sky-200 text-xs font-bold rounded-xl border border-sky-500/30 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'ar' ? 'مشاركة رابط التطبيق' : 'Share App Link'}</span>
                </button>
              )}

              {/* Admin License Panel Button */}
              {isAccountAdmin && onOpenAdminLicenses && (
                <button
                  type="button"
                  id="sidebar-admin-licenses-btn"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAdminLicenses();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 text-xs font-bold rounded-xl border border-amber-500/50 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'ar' ? 'لوحة تحكم المشرف (الأكواد)' : 'Admin License Panel'}</span>
                </button>
              )}

              {/* Install PWA Button if not installed */}
              {!isInstalled && (
                <button
                  type="button"
                  id="sidebar-pwa-install-btn"
                  onClick={() => {
                    setMobileOpen(false);
                    setShowInstallPromptModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 text-cyan-200 text-xs font-bold rounded-xl border border-cyan-500/50 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'ar' ? '📱 تثبيت التطبيق على جهازك' : '📱 Install App on Device'}</span>
                </button>
              )}

              {/* Update PWA Button if update is ready */}
              {updateAvailable && (
                <button
                  type="button"
                  id="sidebar-pwa-update-btn"
                  onClick={applyUpdate}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer active:scale-98 animate-bounce"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? '🚀 تطبيق التحديث الجديد الآن' : '🚀 Apply New Update Now'}</span>
                </button>
              )}
            </>
          )}

          {!isCollapsed ? (
            <div className="space-y-2">
              {/* Village Storefront for Customers */}
              {onSwitchToStore && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onSwitchToStore();
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  title="عرض واجهة متجر القرية للعملاء"
                >
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>متجر القرية (للعملاء)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-medium">عام</span>
                </button>
              )}

              {/* Back to Portals Screen */}
              {onOpenLanding && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenLanding();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  <span>شاشة البوابات الرئيسية</span>
                </button>
              )}

              <a
                href={OWNER_CONTACT.getWhatsAppUrl({ storeName: settings.storeName })}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between py-2 px-3 bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title={`${language === 'ar' ? 'تواصل مع المالك الرسمي عبر الواتساب' : 'Contact Owner via WhatsApp'}: ${OWNER_CONTACT.phoneDisplay}`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'واتساب المالك الرسمي' : 'Owner WhatsApp'}</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-bold">{OWNER_CONTACT.phoneLocal}</span>
              </a>

              <div className="flex items-center justify-between gap-2">
                <button
                  id="sidebar-btn-settings"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenSettings();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-650 hover:border-teal-500/50 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <SettingsIcon className="w-4 h-4 text-teal-400" />
                  <span>{t.navSettings}</span>
                </button>

                <button
                  id="sidebar-btn-lang-toggle"
                  onClick={toggleLanguage}
                  title={t.switchLanguage}
                  className="py-2 px-3 text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-650 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-sm active:scale-[0.98]"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <a
                href={OWNER_CONTACT.getWhatsAppUrl({ storeName: settings.storeName })}
                target="_blank"
                rel="noopener noreferrer"
                title={`${language === 'ar' ? 'واتساب المالك الرسمي' : 'Owner WhatsApp'}: ${OWNER_CONTACT.phoneDisplay}`}
                className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 rounded-lg text-xs font-bold border border-emerald-500/50 shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </a>

              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  title={language === 'ar' ? 'مشاركة رابط التطبيق' : 'Share App'}
                  className="p-2 text-sky-400 hover:text-sky-300 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-650 shadow-sm cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
              {isAccountAdmin && onOpenAdminLicenses && (
                <button
                  type="button"
                  onClick={onOpenAdminLicenses}
                  title={language === 'ar' ? 'لوحة تحكم المشرف' : 'Admin Panel'}
                  className="p-2 text-amber-400 hover:text-amber-300 bg-amber-950/80 hover:bg-amber-900 rounded-lg text-xs font-bold border border-amber-500/50 shadow-sm cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                title={language === 'ar' ? 'باقة المحترف (PRO)' : 'Pro Subscription'}
                className="p-2 text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 rounded-lg text-xs font-bold border border-amber-500/50 shadow-sm"
              >
                <Crown className="w-4 h-4" />
              </button>
              <button
                onClick={toggleLanguage}
                title={t.switchLanguage}
                className="p-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-650 shadow-sm"
              >
                {language === 'ar' ? 'EN' : 'AR'}
              </button>
              <button
                onClick={onOpenSettings}
                title={t.navSettings}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-650 shadow-sm"
              >
                <SettingsIcon className="w-4 h-4 text-teal-400" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
