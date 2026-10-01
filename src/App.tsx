import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { PWAProvider } from './context/PWAContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { StickersView } from './components/StickersView';
import { TransactionsView } from './components/TransactionsView';
import { AccountsView } from './components/AccountsView';
import { DebtsView } from './components/DebtsView';
import { DailyReportsView } from './components/DailyReportsView';
import { VillageBulletinView } from './components/VillageBulletinView';
import { MerchantAdsView } from './components/MerchantAdsView';
import { OrderGoodsView } from './components/OrderGoodsView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { QuickItemModal } from './components/QuickItemModal';
import { SettingsModal, SettingsTabType } from './components/SettingsModal';
import { OrderGoodsModal } from './components/OrderGoodsModal';
import { RBACAuthModal } from './components/RBACAuthModal';
import { SessionInactivityGuard } from './components/SessionInactivityGuard';
import { clearAllSystemSessions, getActiveSessionRole } from './services/rbacAuthService';
import { ShareModal } from './components/ShareModal';
import { ToastNotification } from './components/ToastNotification';
import { VillageStoreView } from './components/VillageStoreView';
import { PortalLandingScreen } from './components/PortalLandingScreen';
import { WelcomeSplashScreen } from './components/WelcomeSplashScreen';
import { DriverPortalView } from './components/DriverPortalView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { DeveloperControlPanel } from './components/DeveloperControlPanel';
import { MerchantManagementScreen } from './components/MerchantManagementScreen';
import { DriverManagementScreen } from './components/DriverManagementScreen';
import { MerchantOrdersModal } from './components/MerchantOrdersModal';
import { MerchantOrderAlertPopup } from './components/MerchantOrderAlertPopup';
import { useAuth } from './context/AuthContext';
import { Item, Transaction, DebtRecord, DebtPaymentHistoryItem } from './types';
import { getPlatformDeveloperSettings } from './services/platformSettingsService';
import { startMerchantOnboardingTour, hasCompletedTour } from './services/tourService';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Barcode,
  Truck,
  FileSpreadsheet,
  CreditCard,
  FileText,
  Megaphone,
} from 'lucide-react';

interface MainAppContentProps {
  onSwitchToStore?: () => void;
  onOpenLanding?: () => void;
  onNavigateToAdmin?: () => void;
  onOpenRBACAuth?: (role?: 'MERCHANT' | 'CUSTOMER' | 'DRIVER' | 'DEVELOPER') => void;
}

const MainAppContent: React.FC<MainAppContentProps> = ({
  onSwitchToStore,
  onOpenLanding,
  onNavigateToAdmin,
  onOpenRBACAuth,
}) => {
  const {
    activeTab,
    setActiveTab,
    setSelectedStickerItemId,
    settings,
    isRTL,
    language,
    items,
    isCashierMode,
  } = useApp();
  const { currentUser, userProfile } = useAuth();
  const activeMerchantId = currentUser?.uid;
  const { isPro, setShowSubscriptionModal, canAddItemWithCount } = useSubscription();

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [initialBarcodeForNewItem, setInitialBarcodeForNewItem] = useState<string | undefined>(undefined);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabType>('GENERAL');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMerchantOrdersModal, setShowMerchantOrdersModal] = useState(false);

  // Order Goods modal state
  const [showOrderGoodsModal, setShowOrderGoodsModal] = useState(false);
  const [orderGoodsItemId, setOrderGoodsItemId] = useState<string | undefined>(undefined);
  const [orderGoodsInitialType, setOrderGoodsInitialType] = useState<'CASH' | 'CREDIT'>('CASH');

  const [receiptData, setReceiptData] = useState<{
    transaction?: Transaction;
    debtPayment?: { debt: DebtRecord; payment: DebtPaymentHistoryItem };
  } | null>(null);

  // Quick navigation to stickers tab for a specific item
  const handlePrintStickersForItem = (itemId: string) => {
    setSelectedStickerItemId(itemId);
    setActiveTab('stickers');
  };

  const handleEditItem = (item: Item) => {
    setItemToEdit(item);
    setInitialBarcodeForNewItem(undefined);
    setShowItemModal(true);
  };

  const handleOpenAddItem = (initialBarcode?: string) => {
    if (!canAddItemWithCount(items.length)) {
      setShowSubscriptionModal(true);
      return;
    }
    setItemToEdit(null);
    setInitialBarcodeForNewItem(initialBarcode);
    setShowItemModal(true);
  };

  const handleOpenOrderGoods = (itemId?: string, initialType: 'CASH' | 'CREDIT' = 'CASH') => {
    setOrderGoodsItemId(itemId);
    setOrderGoodsInitialType(initialType);
    setShowOrderGoodsModal(true);
  };

  const handlePrintTransactionReceipt = (tx: Transaction) => {
    setReceiptData({ transaction: tx });
  };

  const handlePrintDebtReceipt = (debt: DebtRecord, payment: DebtPaymentHistoryItem) => {
    setReceiptData({ debtPayment: { debt, payment } });
  };

  // Onboarding Tour Trigger
  const handleStartTour = () => {
    startMerchantOnboardingTour({
      language,
      activeMerchantId,
      ownerName: userProfile?.displayName || settings.ownerName || (language === 'ar' ? 'التاجر المسؤول' : 'Merchant'),
      storeName: settings.storeName || userProfile?.storeName || 'متجري الذكي',
      villageName: userProfile?.village || settings.address || '',
      onNavigateToTab: (tab) => setActiveTab(tab as any),
      onOpenAddItem: () => handleOpenAddItem(),
      onOpenSettings: () => {
        setSettingsInitialTab('GENERAL');
        setShowSettingsModal(true);
      },
    });
  };

  // Auto-launch Onboarding Tour for new merchants entering the dashboard for the first time
  useEffect(() => {
    if (isCashierMode) return;

    // Small delay to ensure all header and dashboard elements are fully painted in the DOM
    const timer = setTimeout(() => {
      if (!hasCompletedTour(activeMerchantId)) {
        handleStartTour();
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [activeMerchantId, isCashierMode]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-row selection:bg-emerald-500 selection:text-white font-sans"
    >
      {/* Vertical Navigation Sidebar */}
      <Sidebar
        onOpenAddItem={handleOpenAddItem}
        onOpenOrderGoods={() => handleOpenOrderGoods(undefined, 'CASH')}
        onOpenSettings={(tab?: SettingsTabType) => {
          setSettingsInitialTab(tab || 'GENERAL');
          setShowSettingsModal(true);
        }}
        onOpenAuthModal={() => (onOpenRBACAuth ? onOpenRBACAuth('MERCHANT') : undefined)}
        onOpenShareModal={() => setShowShareModal(true)}
        onSwitchToStore={onSwitchToStore}
        onOpenLanding={onOpenLanding}
        onStartTour={isCashierMode ? undefined : handleStartTour}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

        {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Instant PWA Update Notification Banner */}
        <AppUpdateBanner />

        {/* Top Header with Multi-Tenant Cloud & Auth status */}
        <TopHeader
          onOpenMobileMenu={() => setMobileOpen(true)}
          onOpenAddItem={isCashierMode ? () => {} : handleOpenAddItem}
          onOpenOrderGoods={isCashierMode ? () => {} : (item) => handleOpenOrderGoods(item?.id, 'CASH')}
          onOpenSettings={
            isCashierMode
              ? () => {}
              : (tab?: SettingsTabType) => {
                  setSettingsInitialTab(tab || 'GENERAL');
                  setShowSettingsModal(true);
                }
          }
          onOpenAuthModal={() => (onOpenRBACAuth ? onOpenRBACAuth('MERCHANT') : undefined)}
          onOpenShareModal={() => setShowShareModal(true)}
          onSwitchToStore={onSwitchToStore}
          onOpenLanding={onOpenLanding}
          onOpenMerchantOrders={() => setShowMerchantOrdersModal(true)}
          onNavigateToItems={isCashierMode ? () => {} : () => setActiveTab('items')}
          onNavigateToDashboard={isCashierMode ? () => {} : () => setActiveTab('dashboard')}
          onNavigateToAdmin={onNavigateToAdmin}
          onStartTour={isCashierMode ? undefined : handleStartTour}
        />

        {/* Content views */}
        <main className="main-content-container flex-1 overflow-y-auto pb-24 sm:pb-8">
          <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
            {/* صلاحيات الكاشير: عند تفعيل حساب الكاشير، إخفاء الحسابات والأرباح والمخزون، والاكتفاء بشاشة نقاط البيع فقط */}
            {isCashierMode ? (
              <TransactionsView
                onPrintReceipt={handlePrintTransactionReceipt}
                onOpenOrderGoodsModal={undefined}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    onOpenAddItem={handleOpenAddItem}
                    onOpenOrderGoods={handleOpenOrderGoods}
                    onPrintReceipt={handlePrintTransactionReceipt}
                    onNavigate={(tab) => setActiveTab(tab)}
                    onOpenSettings={(tab) => {
                      setSettingsInitialTab(tab || 'GENERAL');
                      setShowSettingsModal(true);
                    }}
                    onStartTour={handleStartTour}
                  />
                )}

                {activeTab === 'items' && (
                  <ItemsView
                    onOpenAddItem={handleOpenAddItem}
                    onOpenOrderGoods={handleOpenOrderGoods}
                    onEditItem={handleEditItem}
                    onPrintStickersForItem={handlePrintStickersForItem}
                  />
                )}

                {activeTab === 'stickers' && <StickersView />}

                {activeTab === 'transactions' && (
                  <TransactionsView
                    onPrintReceipt={handlePrintTransactionReceipt}
                    onOpenOrderGoodsModal={(type) => handleOpenOrderGoods(undefined, type || 'CASH')}
                  />
                )}

                {activeTab === 'order_goods' && (
                  <OrderGoodsView
                    onOpenAddItem={handleOpenAddItem}
                    onPrintReceipt={handlePrintTransactionReceipt}
                  />
                )}

                {activeTab === 'accounts' && <AccountsView />}

                {activeTab === 'debts' && (
                  <DebtsView onPrintDebtReceipt={handlePrintDebtReceipt} />
                )}

                {activeTab === 'daily_reports' && <DailyReportsView />}

                {activeTab === 'village_bulletin' && <VillageBulletinView />}

                {activeTab === 'merchant_ads' && <MerchantAdsView />}
              </>
            )}
          </div>
        </main>

        {/* Mobile Sticky Bottom Tab Bar (نظام التبويبات السفلي السريع لتسهيل التصفح ومنع التمرير) */}
        {!isCashierMode && (
          <nav
            aria-label="التبويبات السريعة السفلية"
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/98 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl"
          >
            {/* 1. الرئيسية */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-emerald-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>الرئيسية</span>
            </button>

            {/* 2. المبيعات / الكاشير */}
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'text-emerald-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingCart className={`w-5 h-5 mb-0.5 ${activeTab === 'transactions' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>الكاشير</span>
            </button>

            {/* Quick Add Button in Center */}
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 -mt-4 border-2 border-slate-900 active:scale-95 transition-all cursor-pointer"
              title="إضافة صنف جديد"
            >
              <Package className="w-5 h-5" />
            </button>

            {/* 3. المخزون */}
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'items' || activeTab === 'stickers' || activeTab === 'order_goods'
                  ? 'text-emerald-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className={`w-5 h-5 mb-0.5 ${activeTab === 'items' || activeTab === 'stickers' || activeTab === 'order_goods' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>المخزون</span>
            </button>

            {/* 4. التقارير والحسابات */}
            <button
              type="button"
              onClick={() => setActiveTab('daily_reports')}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'daily_reports' || activeTab === 'accounts' || activeTab === 'debts'
                  ? 'text-emerald-400 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className={`w-5 h-5 mb-0.5 ${activeTab === 'daily_reports' || activeTab === 'accounts' || activeTab === 'debts' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>التقارير</span>
            </button>
          </nav>
        )}
      </div>

      {/* Modals */}
      {showItemModal && (
        <QuickItemModal
          itemToEdit={itemToEdit}
          initialBarcode={initialBarcodeForNewItem}
          settings={settings}
          onClose={() => {
            setShowItemModal(false);
            setItemToEdit(null);
            setInitialBarcodeForNewItem(undefined);
          }}
        />
      )}

      {showOrderGoodsModal && (
        <OrderGoodsModal
          initialItemId={orderGoodsItemId}
          initialOrderType={orderGoodsInitialType}
          onClose={() => {
            setShowOrderGoodsModal(false);
            setOrderGoodsItemId(undefined);
          }}
          onOpenAddItem={handleOpenAddItem}
          onSuccess={handlePrintTransactionReceipt}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          initialTab={settingsInitialTab}
          onClose={() => setShowSettingsModal(false)}
          onOpenShareModal={() => {
            setShowSettingsModal(false);
            setShowShareModal(true);
          }}
        />
      )}

      {receiptData && (
        <PrintReceiptModal
          transaction={receiptData.transaction}
          debtPayment={receiptData.debtPayment}
          settings={settings}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Global Iframe-safe Toast */}
      <ToastNotification />

      {/* Immediate PWA Install Prompt Modal */}
      <PWAInstallModal />

      {/* Subscription & License Activation Modal for Merchants */}
      <SubscriptionModal />

      {/* App Sharing Modal with QR Code and Direct Social Links */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Village Store Merchant Orders Management Modal */}
      <MerchantOrdersModal
        isOpen={showMerchantOrdersModal}
        onClose={() => setShowMerchantOrdersModal(false)}
        settings={settings}
        isRTL={isRTL}
        onOpenStore={onSwitchToStore}
      />

      {/* Real-time Order Alert Popup for incoming delivery requests */}
      <MerchantOrderAlertPopup
        settings={settings}
        isRTL={isRTL}
        onOpenOrdersModal={() => setShowMerchantOrdersModal(true)}
      />
    </div>
  );
};

const PortalRouter: React.FC = () => {
  const { items, settings, isRTL, updateSettings, setActiveTab } = useApp();
  const { currentUser } = useAuth();
  const devSettings = getPlatformDeveloperSettings();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  
  // Check URL query parameters or hash to support direct linking (?portal=store, ?portal=merchant, ?portal=driver, ?portal=admin)
  const [portalMode, setPortalMode] = useState<'landing' | 'store' | 'merchant' | 'driver' | 'admin'>(() => {
    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const portalParam = params.get('portal');
      const activeRole = getActiveSessionRole();

      if (portalParam === 'admin' || window.location.hash === '#admin') {
        if (activeRole === 'DEVELOPER') return 'admin';
        return 'landing';
      }
      if (portalParam === 'driver' || window.location.hash === '#driver') {
        if (activeRole === 'DRIVER') return 'driver';
        return 'landing';
      }
      if (portalParam === 'merchant' || window.location.hash === '#merchant') {
        if (activeRole === 'MERCHANT') return 'merchant';
        return 'landing';
      }
      if (portalParam === 'store' || window.location.hash === '#store') return 'store';
    } catch {}
    return 'landing';
  });

  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);
  const [showRBACAuthModal, setShowRBACAuthModal] = useState(false);
  const [rbacInitialRole, setRbacInitialRole] = useState<'DEVELOPER' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER'>('MERCHANT');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'manage-merchants' | 'manage-drivers'>('dashboard');

  // Secret Developer Keyboard Shortcut listener (Ctrl + Shift + D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleOpenRBACAuth('DEVELOPER');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  const handleOpenRBACAuth = (role?: 'DEVELOPER' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER') => {
    if (role) {
      setRbacInitialRole(role);
    }
    setShowRBACAuthModal(true);
  };

  // Dedicated close handler for AuthModal / RBACAuthModal:
  // When closing via (X), it immediately closes the modal and seamlessly transitions to
  // the core application interface (Village Store & Customers), ensuring it will not reappear
  // unless explicitly requested via the dedicated page icon.
  const handleCloseAuthAndGoToStore = () => {
    setShowGlobalAuthModal(false);
    setShowRBACAuthModal(false);
    handleSwitchToStore();
  };

  const handleRoleAuthSuccess = (role: 'DEVELOPER' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER', user: any) => {
    setShowRBACAuthModal(false);
    if (role === 'DEVELOPER') {
      handleSwitchToAdmin();
    } else if (role === 'MERCHANT') {
      handleSwitchToMerchant({
        name: user?.storeName || settings.storeName,
        village: user?.village || settings.address,
      });
    } else if (role === 'DRIVER') {
      handleSwitchToDriver();
    } else if (role === 'CUSTOMER') {
      handleSwitchToStore();
    }
  };

  const handleSwitchToStore = () => {
    setPortalMode('store');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'store');
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const handleSwitchToMerchant = (storeInfo?: { name?: string; village?: string; isPro?: boolean; merchantPin?: string }) => {
    const activeRole = getActiveSessionRole();
    if (activeRole !== 'MERCHANT' && activeRole !== 'DEVELOPER' && !currentUser) {
      setRbacInitialRole('MERCHANT');
      setShowRBACAuthModal(true);
      return;
    }

    if (storeInfo?.name) {
      updateSettings({
        storeName: storeInfo.name,
        address: storeInfo.village || settings.address,
      });
      setActiveTab('items');
    }
    setPortalMode('merchant');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'merchant');
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const handleSwitchToDriver = () => {
    setPortalMode('driver');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'driver');
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const handleSwitchToAdmin = () => {
    setPortalMode('admin');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'admin');
      window.history.replaceState(null, '', url.toString());
    } catch {}
  };

  const handleSwitchToLanding = () => {
    setPortalMode('landing');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('portal');
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    } catch {}
  };

  // دالة الخروج والعودة إلى واجهة المتجر الرئيسية (Global helper and event handler)
  useEffect(() => {
    const returnToStoreMain = () => {
      handleSwitchToStore();
    };

    (window as any).returnToStoreMain = returnToStoreMain;

    const onCustomReturnEvent = () => {
      handleSwitchToStore();
    };
    window.addEventListener('store:return-to-main', onCustomReturnEvent);

    const onGlobalLogout = () => {
      handleSwitchToLanding();
    };
    window.addEventListener('flowapp:global-logout', onGlobalLogout);

    const onPopState = () => {
      try {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const portalParam = params.get('portal');
        if (portalParam === 'store' || window.location.hash === '#store') {
          setPortalMode('store');
        } else if (portalParam === 'merchant' || window.location.hash === '#merchant') {
          setPortalMode('merchant');
        } else if (portalParam === 'driver' || window.location.hash === '#driver') {
          setPortalMode('driver');
        } else if (portalParam === 'admin' || window.location.hash === '#admin') {
          setPortalMode('admin');
        } else {
          setPortalMode('landing');
        }
      } catch {}
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('store:return-to-main', onCustomReturnEvent);
      window.removeEventListener('flowapp:global-logout', onGlobalLogout);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  if (portalMode === 'landing') {
    if (devSettings.showWelcomeSplash && !hasSeenWelcome) {
      return (
        <WelcomeSplashScreen
          settings={settings}
          isRTL={isRTL}
          onEnterPortal={() => setHasSeenWelcome(true)}
        />
      );
    }

    return (
      <>
        <PortalLandingScreen
          settings={settings}
          itemsCount={items.length}
          isRTL={isRTL}
          isAuthenticated={!!currentUser}
          onEnterStore={handleSwitchToStore}
          onEnterMerchant={handleSwitchToMerchant}
          onEnterDriver={handleSwitchToDriver}
          onEnterAdmin={handleSwitchToAdmin}
          onOpenAuthModal={(role) => handleOpenRBACAuth(role)}
        />

        {showRBACAuthModal && (
          <RBACAuthModal
            isOpen={showRBACAuthModal}
            onClose={handleCloseAuthAndGoToStore}
            onCloseToStore={handleCloseAuthAndGoToStore}
            initialRole={rbacInitialRole}
            onSuccess={handleRoleAuthSuccess}
            onRoleLoginSuccess={handleRoleAuthSuccess}
            isRTL={isRTL}
          />
        )}
      </>
    );
  }

  if (portalMode === 'driver') {
    return (
      <>
        <SessionInactivityGuard
          isActiveSession={true}
          onAutoLogout={() => {
            clearAllSystemSessions();
            handleSwitchToLanding();
          }}
          isRTL={isRTL}
        />
        <DriverPortalView
          settings={settings}
          isRTL={isRTL}
          onReturnToStore={handleSwitchToStore}
          onOpenLanding={handleSwitchToLanding}
        />
        {showRBACAuthModal && (
          <RBACAuthModal
            isOpen={showRBACAuthModal}
            onClose={handleCloseAuthAndGoToStore}
            onCloseToStore={handleCloseAuthAndGoToStore}
            initialRole={rbacInitialRole}
            onSuccess={handleRoleAuthSuccess}
            onRoleLoginSuccess={handleRoleAuthSuccess}
            isRTL={isRTL}
          />
        )}
      </>
    );
  }

  if (portalMode === 'admin') {
    const role = getActiveSessionRole();
    
    return (
      <>
        {role === 'DEVELOPER' && (
          <DeveloperControlPanel
            onNavigate={(mode) => {
              if (mode === 'store') handleSwitchToStore();
              else if (mode === 'merchant') handleSwitchToMerchant();
              else if (mode === 'driver') handleSwitchToDriver();
              else if (mode === 'admin') {
                setActiveAdminTab('dashboard');
                handleSwitchToAdmin();
              }
              else if (mode === 'manage-merchants') {
                setActiveAdminTab('manage-merchants');
                handleSwitchToAdmin();
              }
              else if (mode === 'manage-drivers') {
                setActiveAdminTab('manage-drivers');
                handleSwitchToAdmin();
              }
            }}
            onClose={() => {
              clearAllSystemSessions();
              handleSwitchToLanding();
            }}
            isDarkMode={true}
          />
        )}
        <SessionInactivityGuard
          isActiveSession={true}
          onAutoLogout={() => {
            clearAllSystemSessions();
            handleSwitchToLanding();
          }}
          isRTL={isRTL}
        />
        
        {activeAdminTab === 'manage-merchants' ? (
          <MerchantManagementScreen onClose={() => setActiveAdminTab('dashboard')} />
        ) : activeAdminTab === 'manage-drivers' ? (
          <DriverManagementScreen onClose={() => setActiveAdminTab('dashboard')} />
        ) : (
          <PlatformAdminView
            settings={settings}
            isRTL={isRTL}
            onReturnToStore={handleSwitchToStore}
            onOpenMerchant={handleSwitchToMerchant}
            onOpenDriver={handleSwitchToDriver}
            onOpenLanding={handleSwitchToLanding}
          />
        )}
        {showRBACAuthModal && (
          <RBACAuthModal
            isOpen={showRBACAuthModal}
            onClose={handleCloseAuthAndGoToStore}
            onCloseToStore={handleCloseAuthAndGoToStore}
            initialRole={rbacInitialRole}
            onSuccess={handleRoleAuthSuccess}
            onRoleLoginSuccess={handleRoleAuthSuccess}
            isRTL={isRTL}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SessionInactivityGuard
        isActiveSession={portalMode === 'merchant'}
        onAutoLogout={() => {
          clearAllSystemSessions();
          handleSwitchToLanding();
        }}
        isRTL={isRTL}
      />

      <div
        id="merchant-dashboard"
        style={{ display: portalMode === 'merchant' ? 'block' : 'none' }}
        className={portalMode === 'merchant' ? 'w-full min-h-screen' : 'hidden'}
      >
        <MainAppContent
          onSwitchToStore={handleSwitchToStore}
          onOpenLanding={handleSwitchToLanding}
          onNavigateToAdmin={handleSwitchToAdmin}
          onOpenRBACAuth={(role) => handleOpenRBACAuth(role || 'MERCHANT')}
        />
      </div>

      <div
        id="main-store-view"
        style={{ display: portalMode === 'store' ? 'block' : 'none' }}
        className={portalMode === 'store' ? 'w-full min-h-screen' : 'hidden'}
      >
        <VillageStoreView
          items={items}
          settings={settings}
          isRTL={isRTL}
          onOpenMerchantPortal={handleSwitchToMerchant}
          onOpenLanding={handleSwitchToLanding}
          onOpenAuthModal={(role) => handleOpenRBACAuth(role)}
        />
      </div>

      {showRBACAuthModal && (
        <RBACAuthModal
          isOpen={showRBACAuthModal}
          onClose={handleCloseAuthAndGoToStore}
          onCloseToStore={handleCloseAuthAndGoToStore}
          initialRole={rbacInitialRole}
          onSuccess={handleRoleAuthSuccess}
          onRoleLoginSuccess={handleRoleAuthSuccess}
          isRTL={isRTL}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <PWAProvider>
        <AuthProvider>
          <AppProvider>
            <SubscriptionProvider>
              <AppUpdateBanner />
              <PortalRouter />
            </SubscriptionProvider>
          </AppProvider>
        </AuthProvider>
      </PWAProvider>
    </ThemeProvider>
  );
}
