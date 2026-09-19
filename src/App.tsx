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
import { RBACAuthModal } from './components/RBACAuthModal';
import { SessionInactivityGuard } from './components/SessionInactivityGuard';
import { clearAllSystemSessions } from './services/rbacAuthService';
import { ShareModal } from './components/ShareModal';
import { ToastNotification } from './components/ToastNotification';
import { VillageStoreView } from './components/VillageStoreView';
import { PortalLandingScreen } from './components/PortalLandingScreen';
import { WelcomeSplashScreen } from './components/WelcomeSplashScreen';
import { DriverPortalView } from './components/DriverPortalView';
import { PlatformAdminView } from './components/PlatformAdminView';
import { MerchantOrdersModal } from './components/MerchantOrdersModal';
import { MerchantOrderAlertPopup } from './components/MerchantOrderAlertPopup';
import { useAuth } from './context/AuthContext';
import { Item, Transaction, DebtRecord, DebtPaymentHistoryItem } from './types';
import { getPlatformDeveloperSettings } from './services/platformSettingsService';
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
} from 'lucide-react';

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
    language,
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
          onSwitchToStore={onSwitchToStore}
          onOpenLanding={onOpenLanding}
          onOpenMerchantOrders={() => setShowMerchantOrdersModal(true)}
          onNavigateToItems={isCashierMode ? () => {} : () => setActiveTab('items')}
          onNavigateToDashboard={isCashierMode ? () => {} : () => setActiveTab('dashboard')}
        />

        {/* Top Fast Navigation Tabs Bar for Merchant Dashboard */}
        {!isCashierMode && (
          <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2 relative z-20 backdrop-blur-md shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <nav className="flex items-center gap-1.5 sm:gap-2 flex-1 overflow-x-auto no-scrollbar py-0.5" aria-label={language === 'ar' ? 'أقسام لوحة تحكم التاجر' : 'Merchant Dashboard Sections'}>
                {/* 1. الرئيسية */}
                <button
                  type="button"
                  id="tab-merchant-dashboard"
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'dashboard'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'الرئيسية' : 'Dashboard'}</span>
                </button>

                {/* 2. المبيعات / الكاشير */}
                <button
                  type="button"
                  id="tab-merchant-pos"
                  onClick={() => setActiveTab('transactions')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'transactions'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'المبيعات / الكاشير' : 'POS & Sales'}</span>
                </button>

                {/* 3. المخزون */}
                <button
                  type="button"
                  id="tab-merchant-inventory"
                  onClick={() => setActiveTab('items')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'items' || activeTab === 'stickers' || activeTab === 'order_goods'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'المخزون' : 'Inventory'}</span>
                </button>

                {/* 4. التقارير والحسابات */}
                <button
                  type="button"
                  id="tab-merchant-reports"
                  onClick={() => setActiveTab('daily_reports')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    activeTab === 'daily_reports' || activeTab === 'accounts' || activeTab === 'debts'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>{language === 'ar' ? 'التقارير والحسابات' : 'Reports & Accounts'}</span>
                </button>
              </nav>

              {/* Sub-Tabs Pill Switcher (Contextual) */}
              {(activeTab === 'items' || activeTab === 'stickers' || activeTab === 'order_goods') && (
                <div className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('items')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'items' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'الأصناف' : 'Items'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stickers')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'stickers' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'طباعة الباركود' : 'Barcode Labels'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('order_goods')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'order_goods' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'طلب بضاعة' : 'Purchase Orders'}
                  </button>
                </div>
              )}

              {(activeTab === 'daily_reports' || activeTab === 'accounts' || activeTab === 'debts') && (
                <div className="hidden md:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('daily_reports')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'daily_reports' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'التقارير اليومية' : 'Daily Reports'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('accounts')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'accounts' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'الحسابات' : 'Accounts'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      activeTab === 'debts' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {language === 'ar' ? 'الديون والسلف' : 'Debts & Loans'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content views */}
        <main className="main-content-container flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto pb-20 sm:pb-6">
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
      if (portalParam === 'store' || window.location.hash === '#store') return 'store';
      if (portalParam === 'merchant' || window.location.hash === '#merchant') return 'merchant';
      if (portalParam === 'driver' || window.location.hash === '#driver') return 'driver';
      if (portalParam === 'admin' || window.location.hash === '#admin') return 'admin';
    } catch {}
    return 'landing';
  });

  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);
  const [showRBACAuthModal, setShowRBACAuthModal] = useState(false);
  const [rbacInitialRole, setRbacInitialRole] = useState<'DEVELOPER' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER'>('MERCHANT');

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
        name: user.storeName || settings.storeName,
        village: user.village || settings.address,
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

    const merchantEl = document.getElementById('merchant-dashboard');
    const storeEl = document.getElementById('main-store-view');
    if (merchantEl) merchantEl.style.display = 'none';
    if (storeEl) storeEl.style.display = 'block';
  };

  const handleSwitchToMerchant = (storeInfo?: { name?: string; village?: string; isPro?: boolean; merchantPin?: string }) => {
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

    const merchantEl = document.getElementById('merchant-dashboard');
    const storeEl = document.getElementById('main-store-view');
    if (merchantEl) merchantEl.style.display = 'block';
    if (storeEl) storeEl.style.display = 'none';
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

    // MutationObserver to watch if external script toggles style.display directly
    const merchantEl = document.getElementById('merchant-dashboard');
    const storeEl = document.getElementById('main-store-view');
    let observer: MutationObserver | null = null;
    if (merchantEl || storeEl) {
      observer = new MutationObserver(() => {
        const currentMerchant = document.getElementById('merchant-dashboard');
        const currentStore = document.getElementById('main-store-view');
        if (currentMerchant && currentStore) {
          if (currentMerchant.style.display === 'none' && currentStore.style.display === 'block') {
            setPortalMode('store');
          } else if (currentMerchant.style.display === 'block' && currentStore.style.display === 'none') {
            setPortalMode('merchant');
          }
        }
      });
      if (merchantEl) observer.observe(merchantEl, { attributes: true, attributeFilter: ['style', 'class'] });
      if (storeEl) observer.observe(storeEl, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    return () => {
      window.removeEventListener('store:return-to-main', onCustomReturnEvent);
      window.removeEventListener('flowapp:global-logout', onGlobalLogout);
      window.removeEventListener('popstate', onPopState);
      if (observer) observer.disconnect();
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
        {/* Placeholder containers with id so document.getElementById queries never fail */}
        <div id="merchant-dashboard" style={{ display: 'none' }} className="hidden" />
        <div id="main-store-view" style={{ display: 'none' }} className="hidden" />

        {showGlobalAuthModal && (
          <AuthModal
            isOpen={showGlobalAuthModal}
            onClose={handleCloseAuthAndGoToStore}
            onCloseToStore={handleCloseAuthAndGoToStore}
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
        <PlatformAdminView
          settings={settings}
          isRTL={isRTL}
          onReturnToStore={handleSwitchToStore}
          onOpenMerchant={handleSwitchToMerchant}
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

      {showGlobalAuthModal && (
        <AuthModal
          isOpen={showGlobalAuthModal}
          onClose={handleCloseAuthAndGoToStore}
          onCloseToStore={handleCloseAuthAndGoToStore}
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
