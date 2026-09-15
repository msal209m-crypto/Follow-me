import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { PWAProvider } from './context/PWAContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { DirectLoginBanner } from './components/DirectLoginBanner';
import { SubscriptionModal } from './components/SubscriptionModal';
import { DashboardView } from './components/DashboardView';
import { ItemsView } from './components/ItemsView';
import { StickersView } from './components/StickersView';
import { TransactionsView } from './components/TransactionsView';
import { AccountsView } from './components/AccountsView';
import { DebtsView } from './components/DebtsView';
import { DailyReportsView } from './components/DailyReportsView';
import { OrderGoodsView } from './components/OrderGoodsView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { QuickItemModal } from './components/QuickItemModal';
import { SettingsModal } from './components/SettingsModal';
import { OrderGoodsModal } from './components/OrderGoodsModal';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { AdminLicensePanelModal } from './components/AdminLicensePanelModal';
import { ToastNotification } from './components/ToastNotification';
import { VillageStoreView } from './components/VillageStoreView';
import { PortalLandingScreen } from './components/PortalLandingScreen';
import { useAuth } from './context/AuthContext';
import { Item, Transaction, DebtRecord, DebtPaymentHistoryItem } from './types';

interface MainAppContentProps {
  onSwitchToStore?: () => void;
  onOpenLanding?: () => void;
}

const MainAppContent: React.FC<MainAppContentProps> = ({
  onSwitchToStore,
  onOpenLanding,
}) => {
  const {
    activeTab,
    setActiveTab,
    setSelectedStickerItemId,
    settings,
    isRTL,
    items,
    isCashierMode,
  } = useApp();
  const { isPro, setShowSubscriptionModal, canAddItemWithCount } = useSubscription();

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [initialBarcodeForNewItem, setInitialBarcodeForNewItem] = useState<string | undefined>(undefined);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'GENERAL' | 'CURRENCY' | 'BACKUPS'>('GENERAL');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAdminLicenseModal, setShowAdminLicenseModal] = useState(false);

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

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-row selection:bg-emerald-500 selection:text-white font-sans"
    >
      {/* Vertical Navigation Sidebar */}
      <Sidebar
        onOpenAddItem={handleOpenAddItem}
        onOpenOrderGoods={() => handleOpenOrderGoods(undefined, 'CASH')}
        onOpenSettings={(tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS') => {
          setSettingsInitialTab(tab || 'GENERAL');
          setShowSettingsModal(true);
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenAdminLicenses={() => setShowAdminLicenseModal(true)}
        onSwitchToStore={onSwitchToStore}
        onOpenLanding={onOpenLanding}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Instant PWA Update Notification Banner */}
        <AppUpdateBanner />

        {/* Top Header with Multi-Tenant Cloud & Auth status */}
        <TopHeader
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAddItem={isCashierMode ? () => {} : handleOpenAddItem}
          onOpenOrderGoods={isCashierMode ? () => {} : (item) => handleOpenOrderGoods(item?.id, 'CASH')}
          onOpenSettings={
            isCashierMode
              ? () => {}
              : (tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS') => {
                  setSettingsInitialTab(tab || 'GENERAL');
                  setShowSettingsModal(true);
                }
          }
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenAdminLicenses={() => setShowAdminLicenseModal(true)}
          onSwitchToStore={onSwitchToStore}
          onOpenLanding={onOpenLanding}
          onNavigateToItems={isCashierMode ? () => {} : () => setActiveTab('items')}
          onNavigateToDashboard={isCashierMode ? () => {} : () => setActiveTab('dashboard')}
        />

        {/* Content views */}
        <main className="main-content-container flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {/* Direct & Prominent User Presence / Login Banner */}
            <DirectLoginBanner onOpenAuthModal={() => setShowAuthModal(true)} />

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
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}

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

      {/* Subscription & License Management Modal */}
      <SubscriptionModal onOpenAdminPanel={() => setShowAdminLicenseModal(true)} />

      {/* App Sharing Modal with QR Code and Direct Social Links */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />

      {/* Dedicated Hidden Admin License Generation and Database Management Panel */}
      <AdminLicensePanelModal
        isOpen={showAdminLicenseModal}
        onClose={() => setShowAdminLicenseModal(false)}
      />
    </div>
  );
};

const PortalRouter: React.FC = () => {
  const { items, settings, isRTL } = useApp();
  const { currentUser } = useAuth();
  
  // Check URL query parameters or hash to support direct linking (?portal=store or ?portal=merchant)
  const [portalMode, setPortalMode] = useState<'landing' | 'store' | 'merchant'>(() => {
    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const portalParam = params.get('portal');
      if (portalParam === 'store' || window.location.hash === '#store') return 'store';
      if (portalParam === 'merchant' || window.location.hash === '#admin') return 'merchant';
    } catch {}
    return 'landing';
  });

  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);

  const handleSwitchToStore = () => {
    setPortalMode('store');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'store');
      window.history.replaceState(null, '', url.toString());
    } catch {}

    const merchantEl = document.getElementById('merchant-dashboard');
    const storeEl = document.getElementById('main-store-view');
    if (merchantEl) merchantEl.style.display = 'none';
    if (storeEl) storeEl.style.display = 'block';
  };

  const handleSwitchToMerchant = () => {
    setPortalMode('merchant');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('portal', 'merchant');
      window.history.replaceState(null, '', url.toString());
    } catch {}

    const merchantEl = document.getElementById('merchant-dashboard');
    const storeEl = document.getElementById('main-store-view');
    if (merchantEl) merchantEl.style.display = 'block';
    if (storeEl) storeEl.style.display = 'none';
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

    const onPopState = () => {
      try {
        const search = window.location.search;
        const params = new URLSearchParams(search);
        const portalParam = params.get('portal');
        if (portalParam === 'store' || window.location.hash === '#store') {
          setPortalMode('store');
        } else if (portalParam === 'merchant' || window.location.hash === '#admin') {
          setPortalMode('merchant');
        } else {
          setPortalMode('landing');
        }
      } catch {}
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('store:return-to-main', onCustomReturnEvent);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return (
    <>
      <div
        id="merchant-dashboard"
        style={{ display: portalMode === 'merchant' ? 'block' : 'none' }}
        className={portalMode === 'merchant' ? 'w-full min-h-screen' : 'hidden'}
      >
        {portalMode === 'merchant' && (
          <MainAppContent
            onSwitchToStore={handleSwitchToStore}
            onOpenLanding={handleSwitchToLanding}
          />
        )}
      </div>

      <div
        id="main-store-view"
        style={{ display: portalMode === 'store' ? 'block' : 'none' }}
        className={portalMode === 'store' ? 'w-full min-h-screen' : 'hidden'}
      >
        {portalMode === 'store' && (
          <VillageStoreView
            items={items}
            settings={settings}
            isRTL={isRTL}
            onOpenMerchantPortal={handleSwitchToMerchant}
            onOpenLanding={handleSwitchToLanding}
          />
        )}
      </div>

      <div
        id="landing-portal-view"
        style={{ display: portalMode === 'landing' ? 'block' : 'none' }}
        className={portalMode === 'landing' ? 'w-full min-h-screen' : 'hidden'}
      >
        {portalMode === 'landing' && (
          <PortalLandingScreen
            settings={settings}
            itemsCount={items.length}
            isRTL={isRTL}
            isAuthenticated={!!currentUser}
            onEnterStore={handleSwitchToStore}
            onEnterMerchant={handleSwitchToMerchant}
            onOpenAuthModal={() => setShowGlobalAuthModal(true)}
          />
        )}
      </div>

      {showGlobalAuthModal && (
        <AuthModal
          isOpen={showGlobalAuthModal}
          onClose={() => setShowGlobalAuthModal(false)}
        />
      )}
    </>
  );
};

export default function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <AppProvider>
          <SubscriptionProvider>
            <PortalRouter />
          </SubscriptionProvider>
        </AppProvider>
      </AuthProvider>
    </PWAProvider>
  );
}
