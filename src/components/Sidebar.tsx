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
  Share2,
  KeyRound,
  Lock,
  ShoppingCart,
  Check,
  X,
  Compass,
  Megaphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePWA } from '../context/PWAContext';
import { clearAllSystemSessions } from '../services/rbacAuthService';
import { NavigationTab } from '../types';

interface SidebarProps {
  onOpenAddItem: () => void;
  onOpenOrderGoods: () => void;
  onOpenSettings: (tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS' | 'SUBSCRIPTIONS' | 'SUPPORT' | 'SUBSCRIPTIONS_SUPPORT') => void;
  onOpenAuthModal?: () => void;
  onOpenShareModal?: () => void;
  onSwitchToStore?: () => void;
  onOpenLanding?: () => void;
  onStartTour?: () => void;
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
  onSwitchToStore,
  onOpenLanding,
  onStartTour,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { isInstalled, setShowInstallPromptModal, updateAvailable, applyUpdate } = usePWA();

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
    isCashierMode,
    resetCashierPassword,
  } = useApp();

  // حالة نافذة استعادة كلمة مرور الكاشير للتاجر (المشرف)
  const [showResetPasswordModal, setShowResetPasswordModal] = React.useState(false);
  const [selectedCashierToReset, setSelectedCashierToReset] = React.useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = React.useState<string>('1234');

  // صلاحيات الكاشير: عند تفعيل حساب الكاشير، إخفاء الحسابات والأرباح والمخزون، والاكتفاء بشاشة نقاط البيع فقط
  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    alert?: boolean;
  }[] = isCashierMode
    ? [
        {
          id: 'transactions',
          label: language === 'ar' ? 'نقاط البيع (بيع كاش / بيع أجل)' : 'POS (Cash / Credit)',
          icon: ShoppingCart,
        },
      ]
    : [
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
        {
          id: 'village_bulletin',
          label: language === 'ar' ? '📢 إعلانات وأخبار القرية' : 'Village Bulletin',
          icon: Megaphone,
        },
        {
          id: 'merchant_ads',
          label: language === 'ar' ? '📈 الترويج والإعلانات' : 'Promotions & Ads',
          icon: Megaphone,
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

  const displayAppName = 'قريتي';

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
            className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${isRTL ? 'text-right' : 'text-left'} cursor-pointer group hover:opacity-90 transition-opacity`}
            title={t.navDashboard}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-emerald-400/40 shadow-md shadow-emerald-950 shrink-0 transition-transform group-hover:scale-105 bg-slate-900">
              <img
                src="/icon.png"
                alt="شعار قريتي"
                className="w-full h-full object-cover"
              />
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

        {/* Unified Scrollable Container: Ensures smooth scrolling, grouped sections, and zero clipping */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-2.5 space-y-3.5 scroll-smooth">
          {/* USER PRESENCE / LOGIN BANNER */}
          {!isCollapsed ? (
            currentUser ? (
              <div className="p-2.5 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/50 border border-emerald-500/60 rounded-2xl space-y-2 shadow-md">
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
              <div className="p-3 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-teal-950/70 border-2 border-emerald-500/70 rounded-2xl space-y-2 shadow-lg shadow-emerald-950/50 animate-pulse">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {language === 'ar' ? 'وضع ضيف (غير مسجل)' : 'Guest (Offline)'}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {items.length} {language === 'ar' ? 'صنف' : 'items'}
                  </span>
                </div>
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
            <div className="py-1 flex justify-center">
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

          {/* Cashier & Quick Balance */}
          {!isCollapsed && (
            <div className="px-3 py-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl flex items-center justify-between text-xs shadow-inner">
              <div className="flex items-center gap-1.5 text-slate-200">
                <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <select
                  value={currentCashier.id}
                  onChange={(e) => {
                    const found = cashiers.find((c) => c.id === e.target.value);
                    if (found) setCurrentCashier(found);
                  }}
                  className="bg-transparent text-emerald-300 font-bold focus:outline-none cursor-pointer py-1 max-w-[125px] truncate"
                >
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                      {c.name} {c.role === 'CASHIER' ? (language === 'ar' ? '(كاشير)' : '(Cashier)') : (language === 'ar' ? '(مشرف)' : '(Admin)')}
                    </option>
                  ))}
                </select>
              </div>

              {isCashierMode ? (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>{language === 'ar' ? 'صلاحيات كاشير' : 'Cashier Mode'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-reset-cashier-pwd-sidebar"
                    onClick={() => {
                      const firstCashier =
                        cashiers.find(
                          (c) => c.role === 'CASHIER' || (c.role?.includes('كاشير') && !c.role?.includes('مدير'))
                        ) || cashiers[1] || cashiers[0];
                      setSelectedCashierToReset(firstCashier?.id || '');
                      setNewPasswordInput(firstCashier?.password || '1234');
                      setShowResetPasswordModal(true);
                    }}
                    className="p-1 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-colors cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                    title={language === 'ar' ? 'استعادة كلمة مرور الكاشير' : 'Reset Cashier Password'}
                  >
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'استعادة' : 'Reset'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300">
                    <Wallet className="w-3 h-3 text-emerald-400" />
                    <span>{financialSummary.cashBalance.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                    <span className="text-[9px] font-sans text-slate-300">{settings.currency}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: قسم الإدارة والتنقل (Management & Navigation) */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'ar' ? 'قسم الإدارة والتنقل' : 'Management & Navigation'}</span>
              </div>
            )}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-tab-${item.id}`}
                    onClick={() => handleSelectTab(item.id)}
                    title={item.label}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all cursor-pointer group border active:scale-[0.98] ${
                      isRTL ? 'text-right' : 'text-left'
                    } ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/60 font-bold ring-1 ring-emerald-400/30'
                        : 'text-slate-200 bg-slate-900/60 hover:bg-slate-800 hover:text-white border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110 border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.alert
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                          : 'bg-slate-800/90 border-slate-700/80 text-slate-300 group-hover:border-emerald-500/40 group-hover:text-emerald-300 group-hover:bg-slate-750'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs truncate">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${
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
                              className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-md flex items-center gap-0.5 shadow-sm"
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
          </div>

          {/* Section 2: قسم المشاركة والتثبيت (Share & Install) */}
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            {!isCollapsed && (
              <div className="px-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'ar' ? 'قسم المشاركة والتثبيت' : 'Share & Install'}</span>
              </div>
            )}

            {!isCollapsed ? (
              <div className="space-y-2">
                {/* Share & Install Link into Settings Modal */}
                <button
                  type="button"
                  id="sidebar-share-install-settings-btn"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenSettings('GENERAL');
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 bg-slate-850 hover:bg-slate-800 text-sky-200 hover:text-white text-xs font-bold rounded-xl border border-sky-500/30 transition-all cursor-pointer shadow-sm active:scale-98"
                  title={language === 'ar' ? 'فتح قسم المشاركة والتثبيت داخل جدول الإعدادات' : 'Open Share & Install in Settings'}
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{language === 'ar' ? 'المشاركة والتثبيت' : 'Share & Install'}</span>
                  </div>
                  <span className="text-[10px] text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-500/40">
                    {language === 'ar' ? 'الإعدادات ⚙️' : 'Settings ⚙️'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
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
              </div>
            )}
          </div>

          {/* Section 3: قسم الإعدادات والتواصل (Settings & Support) */}
          <div className="pt-2.5 border-t border-slate-800/80 space-y-2">
            {!isCollapsed && (
              <div className="px-1 text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mb-1">
                <SettingsIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>{language === 'ar' ? 'قسم الإعدادات والتواصل' : 'Settings & Support'}</span>
              </div>
            )}

            {!isCollapsed ? (
              <div className="space-y-2">
                {/* Return to Store Main View / Exit Button (Prominently styled, never cut off) */}
                {onSwitchToStore && (
                  <button
                    type="button"
                    id="sidebar-return-to-store-main-btn"
                    onClick={async () => {
                      setMobileOpen(false);
                      clearAllSystemSessions();
                      try { await logout(); } catch {}
                      onSwitchToStore();
                    }}
                    className="w-full flex items-center justify-between py-2.5 px-3 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border-2 border-emerald-500/70 hover:border-emerald-400 text-emerald-100 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-950/50 active:scale-[0.98]"
                    title={language === 'ar' ? 'الخروج النهائي والعودة إلى متجر العملاء (يتطلب تسجيل الدخول لاحقاً)' : 'Exit & Logout to Store View'}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{language === 'ar' ? 'متجر العملاء (خروج)' : 'Store View (Logout)'}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 px-1.5 py-0.5 rounded font-extrabold">
                      {language === 'ar' ? 'خروج' : 'Exit'}
                    </span>
                  </button>
                )}

                {/* Back to Portals Screen (Completes Full Logout) */}
                {onOpenLanding && (
                  <button
                    type="button"
                    id="sidebar-portals-screen-btn"
                    onClick={async () => {
                      setMobileOpen(false);
                      clearAllSystemSessions();
                      try { await logout(); } catch {}
                      onOpenLanding();
                    }}
                    className="w-full flex items-center justify-between py-2.5 px-3 bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/70 hover:from-rose-900 hover:to-amber-900 border-2 border-rose-500/70 hover:border-rose-400 text-rose-100 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-950/40 active:scale-[0.98]"
                    title={language === 'ar' ? 'تسجيل الخروج النهائي من حساب التاجر والعودة للواجهة الرئيسية (تتطلب كلمة المرور عند العودة)' : 'Full Logout & Return to Landing'}
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{language === 'ar' ? 'الخروج النهائى للرئيسية' : 'Full Logout to Landing'}</span>
                    </div>
                    <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/50 px-1.5 py-0.5 rounded font-extrabold">
                      🔒 {language === 'ar' ? 'إنهاء' : 'Logout'}
                    </span>
                  </button>
                )}

                {/* Settings & Language Toggle */}
                <div className="flex items-center justify-between gap-2">
                  {!isCashierMode && (
                    <button
                      id="sidebar-btn-settings"
                      onClick={() => {
                        setMobileOpen(false);
                        onOpenSettings();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-650 hover:border-teal-500/50 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-teal-400" />
                      <span>{t.navSettings}</span>
                    </button>
                  )}

                  <button
                    id="sidebar-btn-lang-toggle"
                    onClick={toggleLanguage}
                    title={t.switchLanguage}
                    className={`${isCashierMode ? 'w-full' : ''} py-2 px-3 text-slate-100 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-650 hover:border-emerald-500/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 shadow-sm active:scale-[0.98]`}
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
                  </button>
                </div>

                {/* Onboarding Tour Button in Sidebar */}
                {onStartTour && !isCashierMode && (
                  <button
                    type="button"
                    id="sidebar-btn-tour"
                    onClick={() => {
                      setMobileOpen(false);
                      onStartTour();
                    }}
                    className="w-full flex items-center justify-between py-2 px-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                    title={language === 'ar' ? 'الجولة التعريفية بالنظام' : 'System Onboarding Tour'}
                  >
                    <div className="flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'ar' ? 'الجولة التعريفية' : 'Onboarding Tour'}</span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                      {language === 'ar' ? 'دليل البدء' : 'Guide'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {onSwitchToStore && (
                  <button
                    type="button"
                    id="sidebar-collapsed-return-to-store-btn"
                    onClick={onSwitchToStore}
                    title={language === 'ar' ? 'الخروج والعودة إلى واجهة المتجر الرئيسية' : 'Exit / Return to Main Store View'}
                    className="p-2 text-emerald-300 hover:text-white bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-xl text-xs font-bold border border-emerald-400/50 shadow-md shadow-emerald-950/60 cursor-pointer active:scale-95 transition-all"
                  >
                    <Store className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={toggleLanguage}
                  title={t.switchLanguage}
                  className="p-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-650 shadow-sm"
                >
                  {language === 'ar' ? 'EN' : 'AR'}
                </button>

                {!isCashierMode && (
                  <button
                    onClick={onOpenSettings}
                    title={t.navSettings}
                    className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-650 shadow-sm"
                  >
                    <SettingsIcon className="w-4 h-4 text-teal-400" />
                  </button>
                )}

                {onStartTour && !isCashierMode && (
                  <button
                    type="button"
                    onClick={onStartTour}
                    title={language === 'ar' ? 'الجولة التعريفية' : 'Onboarding Tour'}
                    className="p-2 text-amber-300 hover:text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 rounded-lg border border-amber-500/50 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Compass className="w-4 h-4 text-amber-400" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Generous Bottom Spacer to prevent clipping on mobile or small screens */}
          <div className="h-8 shrink-0" />
        </div>
      </aside>

      {/* نافذة بسيطة ومحلية تتيح للتاجر (المشرف) استعادة وإعادة تعيين كلمة مرور الكاشير */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-750 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'ar' ? 'استعادة كلمة مرور الكاشير' : 'Reset Cashier Password'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'ar'
                      ? 'خاص بالتاجر (المشرف): تعيين كلمة سر جديدة للكاشير عند نسيانها'
                      : 'Owner override: assign a new local password for cashier'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {language === 'ar' ? 'اختر حساب الكاشير:' : 'Select Cashier Account:'}
                </label>
                <select
                  value={selectedCashierToReset}
                  onChange={(e) => setSelectedCashierToReset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.role === 'CASHIER' ? (language === 'ar' ? '(كاشير)' : '(Cashier)') : (language === 'ar' ? '(مشرف)' : '(Supervisor)')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  {language === 'ar' ? 'كلمة المرور الجديدة:' : 'New Password / PIN:'}
                </label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="مثال: 1234 أو كود سري"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">
                    {language === 'ar' ? 'اقتراحات سريعة:' : 'Quick set:'}
                  </span>
                  {['1234', '1122', '5555', '0000'].map((suggested) => (
                    <button
                      key={suggested}
                      type="button"
                      onClick={() => setNewPasswordInput(suggested)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700 cursor-pointer"
                    >
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-confirm-reset-cashier-pwd"
                onClick={() => {
                  resetCashierPassword(selectedCashierToReset, newPasswordInput);
                  setShowResetPasswordModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'ar' ? 'حفظ وتعيين كلمة المرور' : 'Save New Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
