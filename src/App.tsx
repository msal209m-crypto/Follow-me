import React, { useState } from 'react';
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
import { Item, Transaction, DebtRecord, DebtPaymentHistoryItem } from './types';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, setSelectedStickerItemId, settings, isRTL, items } = useApp();
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
          onOpenAddItem={handleOpenAddItem}
          onOpenOrderGoods={(item) => handleOpenOrderGoods(item?.id, 'CASH')}
          onOpenSettings={(tab?: 'GENERAL' | 'CURRENCY' | 'BACKUPS') => {
            setSettingsInitialTab(tab || 'GENERAL');
            setShowSettingsModal(true);
          }}
          onOpenAuthModal={() => setShowAuthModal(true)}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenAdminLicenses={() => setShowAdminLicenseModal(true)}
          onNavigateToItems={() => setActiveTab('items')}
          onNavigateToDashboard={() => setActiveTab('dashboard')}
        />

        {/* Content views */}
        <main className="main-content-container flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {/* Direct & Prominent User Presence / Login Banner */}
            <DirectLoginBanner onOpenAuthModal={() => setShowAuthModal(true)} />
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

export default function App() {
  return (
    <PWAProvider>
      <AuthProvider>
        <AppProvider>
          <SubscriptionProvider>
            <MainAppContent />
          </SubscriptionProvider>
        </AppProvider>
      </AuthProvider>
    </PWAProvider>
  );
}
