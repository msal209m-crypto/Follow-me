import React, { useState, useEffect } from 'react';
import {
  Truck,
  Bike,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Package,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  User,
  Power,
  RefreshCw,
  AlertCircle,
  Home,
  MessageSquare,
  Navigation,
  LogOut,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { DeliveryOrder, DriverProfile, StoreSettings } from '../types';
import {
  getDeliveryOrders,
  updateOrderStatus,
  getDriverProfile,
  saveDriverProfile,
  clearDriverProfile,
  playNotificationChime,
  saveDeliveryOrders
} from '../services/deliveryService';
import { clearAllSystemSessions } from '../services/rbacAuthService';
import { DriverInteractiveMap } from './DriverInteractiveMap';

interface DriverPortalViewProps {
  settings: StoreSettings;
  isRTL: boolean;
  onReturnToStore: () => void;
  onOpenLanding: () => void;
}

export const DriverPortalView: React.FC<DriverPortalViewProps> = ({
  settings,
  isRTL,
  onReturnToStore,
  onOpenLanding,
}) => {
  const [profile, setProfile] = useState<DriverProfile | null>(() => getDriverProfile());
  const [orders, setOrders] = useState<DeliveryOrder[]>(() => getDeliveryOrders());
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'AVAILABLE' | 'HISTORY'>('ACTIVE');
  const [pickupAlert, setPickupAlert] = useState<DeliveryOrder | null>(null);
  const [viewMode, setViewMode] = useState<'MAP' | 'LIST'>('MAP');
  const [confirmations, setConfirmations] = useState<Record<string, { checked: boolean; name: string }>>({});

  // Driver Login/Registration form state
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'MOTORCYCLE' | 'BICYCLE'>('MOTORCYCLE');
  const [authError, setAuthError] = useState('');

  // Driver Edit Profile Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editVehicle, setEditVehicle] = useState<'CAR' | 'MOTORCYCLE' | 'BICYCLE'>('MOTORCYCLE');

  // Refresh orders from local storage or events
  const refreshData = () => {
    setOrders(getDeliveryOrders());
    setProfile(getDriverProfile());
  };

  useEffect(() => {
    const handleOrdersUpdate = () => setOrders(getDeliveryOrders());
    const handleDriverUpdate = () => setProfile(getDriverProfile());
    const handleReadyPickup = (e: any) => {
      const order = e.detail as DeliveryOrder;
      setOrders(getDeliveryOrders());
      setPickupAlert(order);
      playNotificationChime('ready_pickup');
    };

    window.addEventListener('qaryati:orders-updated', handleOrdersUpdate);
    window.addEventListener('qaryati:driver-updated', handleDriverUpdate);
    window.addEventListener('qaryati:order-ready-for-pickup', handleReadyPickup);

    return () => {
      window.removeEventListener('qaryati:orders-updated', handleOrdersUpdate);
      window.removeEventListener('qaryati:driver-updated', handleDriverUpdate);
      window.removeEventListener('qaryati:order-ready-for-pickup', handleReadyPickup);
    };
  }, []);

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      setAuthError('يرجى إدخال اسم السائق أو المندوب');
      return;
    }
    if (!driverPhone.trim()) {
      setAuthError('يرجى إدخال رقم هاتف التواصل');
      return;
    }

    const newProfile: DriverProfile = {
      id: `drv-${Date.now()}`,
      name: driverName.trim(),
      phone: driverPhone.trim(),
      vehicleType,
      isOnline: true,
      totalDelivered: 0,
    };

    saveDriverProfile(newProfile);
    setProfile(newProfile);
    setAuthError('');
  };

  const handleDeveloperLogin = () => {
    const devProfile: DriverProfile = {
      id: 'drv-developer-simulation',
      name: 'مطور النظام (سائق تجريبي)',
      phone: '0500000000',
      vehicleType: 'MOTORCYCLE',
      isOnline: true,
      totalDelivered: 0,
    };
    saveDriverProfile(devProfile);
    setProfile(devProfile);
    setAuthError('');
  };

  const handleToggleOnlineStatus = () => {
    if (!profile) return;
    const updated: DriverProfile = {
      ...profile,
      isOnline: !profile.isOnline,
    };
    saveDriverProfile(updated);
    setProfile(updated);
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditPhone(profile.phone);
    setEditVehicle(profile.vehicleType || 'MOTORCYCLE');
    setShowEditModal(true);
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!editName.trim() || !editPhone.trim()) return;
    const updated: DriverProfile = {
      ...profile,
      name: editName.trim(),
      phone: editPhone.trim(),
      vehicleType: editVehicle,
    };
    saveDriverProfile(updated);
    setProfile(updated);
    setShowEditModal(false);
  };

  const handleLogout = () => {
    clearAllSystemSessions();
    clearDriverProfile();
    setProfile(null);
    if (onOpenLanding) {
      onOpenLanding();
    } else if (onReturnToStore) {
      onReturnToStore();
    }
  };

  // Status updates
  const handleAcceptOrder = (orderId: string) => {
    if (!profile) return;
    updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', {
      driverId: profile.id,
      driverName: profile.name,
      driverPhone: profile.phone,
    });
    refreshData();
    setActiveTab('ACTIVE');
  };

  const handleCompleteDelivery = (orderId: string, recipientName?: string) => {
    if (!profile) return;
    
    if (recipientName) {
      const ordersList = getDeliveryOrders();
      const idx = ordersList.findIndex((o) => o.id === orderId);
      if (idx !== -1) {
        const current = ordersList[idx];
        ordersList[idx] = {
          ...current,
          notes: current.notes 
            ? `${current.notes} (تم تأكيد الاستلام بواسطة: ${recipientName})` 
            : `(تم تأكيد الاستلام بواسطة: ${recipientName})`,
        };
        saveDeliveryOrders(ordersList);
      }
    }

    updateOrderStatus(orderId, 'DELIVERED');
    const updatedProfile: DriverProfile = {
      ...profile,
      totalDelivered: (profile.totalDelivered || 0) + 1,
    };
    saveDriverProfile(updatedProfile);
    refreshData();
  };

  const handleCancelDelivery = (orderId: string) => {
    const reason = window.prompt('يرجى كتابة سبب تعذر التسليم أو الإلغاء:');
    if (reason !== null) {
      updateOrderStatus(orderId, 'CANCELLED');
      refreshData();
    }
  };

  // Filter orders
  const availableOrders = orders.filter(
    (o) => o.status === 'READY_FOR_PICKUP' || (o.status === 'NEW' && !o.driverId)
  );

  const activeDeliveries = orders.filter(
    (o) => o.driverId === profile?.id && (o.status === 'OUT_FOR_DELIVERY' || o.status === 'ON_THE_WAY')
  );

  const completedDeliveries = orders.filter(
    (o) => o.driverId === profile?.id && o.status === 'DELIVERED'
  );

  const handleCheckboxChange = (orderId: string, checked: boolean) => {
    setConfirmations((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || { name: '' }),
        checked,
      },
    }));
  };

  const handleNameChange = (orderId: string, name: string) => {
    setConfirmations((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || { checked: false }),
        name,
      },
    }));
  };

  const totalEarnedDeliveryFees = completedDeliveries.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // If driver is not logged in, show Driver Login screen
  if (!profile) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative p-4 sm:p-6"
      >
        <div className="max-w-md mx-auto w-full my-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-950/40 font-black">
              <Truck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">بوابة مندوب التوصيل</h1>
            <p className="text-xs text-slate-400 mt-1">
              تسجيل دخول سريع لاستلام طلبات الأهالي والتوصيل لقرية {settings.storeName || 'قريتي'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <form onSubmit={handleRegisterDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المندوب / السائق</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="مثال: خالد الشهري"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف الاتصال والواتساب</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">وسيلة التوصيل</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'MOTORCYCLE', label: 'دباب / نارية', icon: Bike },
                    { id: 'CAR', label: 'سيارة', icon: Truck },
                    { id: 'BICYCLE', label: 'دراجة', icon: Navigation },
                  ].map((v) => {
                    const Icon = v.icon;
                    const isSelected = vehicleType === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVehicleType(v.id as any)}
                        className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] font-bold">{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {authError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer"
              >
                بدء العمل واستلام الطلبات 🛵
              </button>
            </form>

            {/* Quick developer bypass option */}
            <div className="mt-3.5 pt-3 border-t border-slate-800/60">
              <button
                type="button"
                onClick={handleDeveloperLogin}
                className="w-full py-2.5 bg-slate-800/40 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700/80 hover:border-amber-500/40 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>🛠️ دخول سريع بصفتي مطور النظام (محاكاة تجريبية)</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={onReturnToStore}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>العودة للمتجر</span>
              </button>

              <button
                type="button"
                onClick={onOpenLanding}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <span>شاشة البوابات الرئيسية</span>
                {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600">
          منظومة التوصيل لقرية {settings.storeName || 'قريتي'} • نظام التوصيل المحلي
        </footer>
      </div>
    );
  }

  // Active Driver Dashboard
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white">{profile.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    profile.isOnline
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {profile.isOnline ? 'متاح للطلبات' : 'غير متصل'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{profile.phone}</span>
                <span>•</span>
                <span>{profile.totalDelivered || 0} طلب مكتمل</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="p-2 px-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تعديل بيانات السائق ومركبة التوصيل"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تعديل بياناتي</span>
            </button>

            <button
              type="button"
              onClick={handleToggleOnlineStatus}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                profile.isOnline
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800 text-rose-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="تبديل حالة التوفر"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{profile.isOnline ? 'إيقاف مؤقت' : 'تفعيل'}</span>
            </button>

            <button
              type="button"
              onClick={onReturnToStore}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">المتجر</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-200 hover:text-white border border-rose-600/50 hover:border-rose-500 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              title="تسجيل الخروج الفوري"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">تسجيل خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto w-full flex-1 p-4 space-y-4">
        {/* Real-time Order Alert Banner for Driver */}
        {pickupAlert && (
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-2 border-emerald-500/80 p-4 rounded-3xl shadow-xl shadow-emerald-950/50 animate-bounce flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 text-xl shadow-md">
                🛎️
              </div>
              <div>
                <div className="text-emerald-300 font-black text-sm flex items-center gap-2">
                  <span>طلب جديد تم تجهيزه وجاهز للاستلام والتوصيل فوراً!</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    #{pickupAlert.id.slice(-6)}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  العميل: <strong className="text-white">{pickupAlert.customerName}</strong> • المكان: <strong className="text-white">{pickupAlert.customerAddress}</strong> • الرسوم: <strong className="text-emerald-400 font-mono">{pickupAlert.deliveryFee} {settings.currency}</strong>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('AVAILABLE');
                  setPickupAlert(null);
                }}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
              >
                استلام الطلب الآن 🛵
              </button>
              <button
                type="button"
                onClick={() => setPickupAlert(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-amber-400">الطلبات الجارية معك</span>
            <div className="text-xl font-black text-white font-mono mt-0.5">{activeDeliveries.length}</div>
            <span className="text-[10px] text-slate-500">في الطريق للتسليم</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-emerald-400">الطلبات المكتملة</span>
            <div className="text-xl font-black text-white font-mono mt-0.5">{completedDeliveries.length}</div>
            <span className="text-[10px] text-slate-500">تم توصيلها بنجاح</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] font-bold text-cyan-400">أرباح التوصيل</span>
            <div className="text-xl font-black text-cyan-300 font-mono mt-0.5">
              {totalEarnedDeliveryFees}{' '}
              <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
            </div>
            <span className="text-[10px] text-slate-500">مجموع رسوم التوصيل</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>الطلبات الجارية ({activeDeliveries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AVAILABLE')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'AVAILABLE'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>طلبات جاهزة للاستلام ({availableOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>السجل المكتمل ({completedDeliveries.length})</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE ORDERS */}
        {activeTab === 'ACTIVE' && (
          <div className="space-y-3">
            {activeDeliveries.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                <Truck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="font-bold text-white text-sm">لا توجد طلبات جارية معك حالياً</h3>
                <p className="text-xs text-slate-400 mt-1">
                  يمكنك استعراض الطلبات الجاهزة للاستلام من التبويب أعلاه وقبول التوصيل.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('AVAILABLE')}
                  className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                >
                  استعراض الطلبات الجاهزة ({availableOrders.length})
                </button>
              </div>
            ) : (
              activeDeliveries.map((order) => {
                const isConfirmed = confirmations[order.id]?.checked || false;
                const recipientName = confirmations[order.id]?.name || '';

                return (
                  <div
                    key={order.id}
                    className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">{order.orderNumber}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {order.status === 'ON_THE_WAY' ? '🛵 في الطريق للتوصيل' : '📦 تم الاستلام / جارٍ التجهيز'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-emerald-400">
                          المبلغ المطلوب: {order.totalAmount} {settings.currency}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'دفع عند الاستلام (كاش)' : 'مدفوع إلكترونياً / تحويل'}
                        </div>
                      </div>
                    </div>

                    {/* Custom Horizontal Status Tracker */}
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-3.5">
                      <span className="text-[10px] font-black text-slate-400 block">شريط حالة مسار التوصيل:</span>
                      <div className="flex items-center justify-between relative px-2">
                        {/* Tracker line background */}
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0"></div>
                        
                        {/* Tracker line active progress */}
                        <div 
                          className="absolute left-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 to-emerald-500 z-0 transition-all duration-500"
                          style={{
                            width: order.status === 'DELIVERED' ? '100%' : order.status === 'ON_THE_WAY' ? '50%' : '0%'
                          }}
                        ></div>

                        {/* Step 1: تم الاستلام */}
                        <div className="flex flex-col items-center z-10 relative">
                          <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md border-2 border-amber-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-black text-amber-400 mt-1.5">تم الاستلام</span>
                        </div>

                        {/* Step 2: في الطريق */}
                        <div className="flex flex-col items-center z-10 relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (order.status === 'OUT_FOR_DELIVERY') {
                                updateOrderStatus(order.id, 'ON_THE_WAY');
                                refreshData();
                              }
                            }}
                            disabled={order.status !== 'OUT_FOR_DELIVERY'}
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md border-2 transition-all duration-500 cursor-pointer ${
                              order.status === 'ON_THE_WAY' || order.status === 'DELIVERED'
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-amber-500/40 hover:text-amber-400'
                            }`}
                            title="انقر لتحديث الحالة إلى: في الطريق"
                          >
                            <Bike className={`w-4 h-4 ${order.status === 'ON_THE_WAY' ? 'animate-bounce' : ''}`} />
                          </button>
                          <span className={`text-[10px] font-black mt-1.5 transition-colors duration-500 ${
                            order.status === 'ON_THE_WAY' || order.status === 'DELIVERED' ? 'text-amber-400' : 'text-slate-500'
                          }`}>في الطريق</span>
                        </div>

                        {/* Step 3: تم التوصيل */}
                        <div className="flex flex-col items-center z-10 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-md border-2 transition-all duration-500 ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}>
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className={`text-[10px] font-black mt-1.5 transition-colors duration-500 ${
                            order.status === 'DELIVERED' ? 'text-emerald-400' : 'text-slate-500'
                          }`}>تم التوصيل</span>
                        </div>
                      </div>

                      {/* Helper status text and action */}
                      {order.status === 'OUT_FOR_DELIVERY' && (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              updateOrderStatus(order.id, 'ON_THE_WAY');
                              refreshData();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 animate-pulse" />
                            <span>تحديث الشحنة: أنا في الطريق للزبون الآن 🛵</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Customer Info and Quick Call / WhatsApp */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{order.customerAddress}</span>
                        </div>
                        {order.notes && (
                          <div className="text-[10px] text-amber-300/80 mt-1">ملاحظة: {order.notes}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-colors shadow-sm"
                          title="اتصال هاتفي"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-colors shadow-sm"
                          title="محادثة واتساب"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Order Items summary */}
                    <div className="text-xs space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] font-bold text-slate-400">محتويات الطلب:</span>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                          <span>• {item.name} × {item.quantity}</span>
                          <span className="font-mono text-slate-400">{item.total} {settings.currency}</span>
                        </div>
                      ))}
                    </div>

                    {/* Recipient Confirmation Panel */}
                    <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-850 space-y-3">
                      <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                        <span>مربع تأكيد التحقق والمستلم (الزبون):</span>
                      </div>
                      
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-slate-400 mb-1">اسم الشخص المستلم للطلب فعلياً:</label>
                            <input
                              type="text"
                              value={recipientName}
                              onChange={(e) => handleNameChange(order.id, e.target.value)}
                              placeholder="مثال: صاحب الطلب نفسه / العائلة"
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="flex items-center h-full pt-3.5 sm:pt-4">
                            <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isConfirmed}
                                onChange={(e) => handleCheckboxChange(order.id, e.target.checked)}
                                className="rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0 w-4 h-4"
                              />
                              <span>تأكيد المستلم أن الطلب وصله كاملاً وسليماً ✅</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isConfirmed) {
                            alert('يرجى تفعيل خيار "تأكيد المستلم أن الطلب وصله كاملاً وسليماً" لإكمال توصيل الشحنة!');
                            return;
                          }
                          handleCompleteDelivery(order.id, recipientName || 'صاحب الطلب نفسه');
                        }}
                        className={`py-2.5 px-3 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                          isConfirmed
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                            : 'bg-slate-850 text-slate-500 border border-slate-800 cursor-not-allowed'
                        }`}
                        title={!isConfirmed ? 'يتطلب تأكيد استلام المستلم بالأسفل أولاً' : 'اضغط لإتمام وإغلاق الشحنة'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>تم التسليم وتأكيد المستلم 👥</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCancelDelivery(order.id)}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        <span>تعذر التسليم / إلغاء ❌</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: AVAILABLE READY ORDERS */}
        {activeTab === 'AVAILABLE' && (
          <div className="space-y-4">
            {/* Map/List Sub-Toggle */}
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => setViewMode('MAP')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    viewMode === 'MAP'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🗺️ الخريطة التفاعلية الذكية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    viewMode === 'LIST'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>📋 قائمة الطلبات الكلاسيكية ({availableOrders.length})</span>
                </button>
              </div>
            </div>

            {viewMode === 'MAP' ? (
              <DriverInteractiveMap
                availableOrders={availableOrders}
                activeDeliveries={activeDeliveries}
                onAcceptOrder={handleAcceptOrder}
                settings={settings}
                isRTL={isRTL}
              />
            ) : (
              <div className="space-y-3">
                {availableOrders.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <h3 className="font-bold text-white text-sm">لا توجد طلبات معلقة بالمتجر حالياً</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      سيظهر أي طلب جديد يطلبه أهالي القرية هنا فور تجهيزه من قبل المتجر.
                    </p>
                    <button
                      type="button"
                      onClick={refreshData}
                      className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>تحديث القائمة</span>
                    </button>
                  </div>
                ) : (
                  availableOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-amber-400 text-sm">{order.orderNumber}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                              جاهز للاستلام والتوصيل
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            العنوان: <strong className="text-slate-200">{order.customerAddress}</strong>
                          </div>
                        </div>

                        <div className="text-left font-mono">
                          <div className="font-black text-white text-sm">
                            {order.totalAmount} {settings.currency}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-bold">
                            أجرة التوصيل: +{order.deliveryFee} {settings.currency}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div className="text-[11px] text-slate-400">
                          العميل: <strong className="text-slate-200">{order.customerName}</strong> ({order.items.length} أصناف)
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAcceptOrder(order.id)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>أنا في الطريق إليك 🛵 (استلام وتوصيل)</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-2">
            {completedDeliveries.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-xs">
                لم تقم بتوصيل أي طلبات حتى الآن.
              </div>
            ) : (
              completedDeliveries.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{order.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        مكتمل ومسلم
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {order.customerName} • {order.customerAddress}
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <div className="font-bold text-emerald-400">+{order.deliveryFee} {settings.currency}</div>
                    <div className="text-[10px] text-slate-500">{new Date(order.updatedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {/* Driver Profile Edit Modal */}
        {showEditModal && profile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white">تعديل بيانات السائق ومركبة التوصيل</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfileEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم السائق / المندوب</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف التواصل والواتساب</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3" />
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 text-left font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع مركبة التوصيل</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditVehicle('MOTORCYCLE')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        editVehicle === 'MOTORCYCLE'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bike className="w-5 h-5" />
                      <span className="text-[11px] font-bold">دراجة نارية</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditVehicle('CAR')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        editVehicle === 'CAR'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Truck className="w-5 h-5" />
                      <span className="text-[11px] font-bold">سيارة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditVehicle('BICYCLE')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        editVehicle === 'BICYCLE'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bike className="w-5 h-5" />
                      <span className="text-[11px] font-bold">سيكل / هوائية</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات ✅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
