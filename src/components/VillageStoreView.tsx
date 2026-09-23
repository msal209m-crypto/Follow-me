import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { copyToClipboard } from '../utils/clipboardUtils';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Phone,
  Send,
  Store,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  MapPin,
  User,
  FileText,
  Clock,
  ChevronDown,
  Info,
  ExternalLink,
  MessageCircle,
  Truck,
  ChefHat,
  Bell,
  Package,
  Check,
  Megaphone,
  Tag,
  LogOut,
  UserCheck,
  Building,
  KeyRound,
  AlertTriangle,
  Star,
  Wallet,
  Navigation,
  Bot
} from 'lucide-react';
import { VillageWalletModal } from './VillageWalletModal';
import { LiveDriverTrackerModal } from './LiveDriverTrackerModal';
import { AIMerchantAssistantModal } from './AIMerchantAssistantModal';
import { getVillageWallet, payWithWallet } from '../services/villageWalletService';
import {
  getGlobalPreferences,
  formatGlobalCurrency,
  getCountryPaymentGateways,
  getCountryByCode,
} from '../services/globalizationService';
import { generateWhatsAppOrderLink } from '../services/whatsappHelper';
import { Item, StoreSettings, DeliveryOrder, StoreDirectoryRecord } from '../types';
import {
  createDeliveryOrder,
  getDeliveryOrders,
  playNotificationChime,
  getStoresDirectory,
  rateDeliveryOrder,
  getStoreProducts,
} from '../services/deliveryService';
import { getPlatformAds, PlatformAd, getPlatformDeveloperSettings, setDeveloperRemembered } from '../services/platformSettingsService';
import {
  getActiveCustomer,
  saveActiveCustomer,
  clearActiveCustomer,
  setActiveSessionRole,
} from '../services/rbacAuthService';
import {
  getApprovedMerchantsByVillage,
  initSupabaseRealtime,
  FIXED_VILLAGES_LIST,
  registerCustomerAccount
} from '../services/supabaseQaryatiService';
import { AdhanTopBarWidget } from './AdhanTopBarWidget';
import { StorePrayerClosedBanner } from './StorePrayerClosedBanner';
import { AdBannerWidget } from './AdBannerWidget';

interface VillageStoreViewProps {
  items: Item[];
  settings: StoreSettings;
  isRTL: boolean;
  onOpenMerchantPortal: () => void;
  onOpenLanding: () => void;
  onOpenAuthModal?: (role?: 'DEVELOPER' | 'MERCHANT' | 'DRIVER' | 'CUSTOMER') => void;
}

interface CartItem {
  item: Item;
  quantity: number;
}

export const VillageStoreView: React.FC<VillageStoreViewProps> = ({
  items,
  settings,
  isRTL,
  onOpenMerchantPortal,
  onOpenLanding,
  onOpenAuthModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'TRANSFER'>('CASH_ON_DELIVERY');
  const [copiedLink, setCopiedLink] = useState(false);
  const [customStorePhone, setCustomStorePhone] = useState(settings.phone || '');

  // Enterprise Modals State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLiveTrackerOpen, setIsLiveTrackerOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(() => getVillageWallet().balance);

  // Sync wallet balance
  useEffect(() => {
    const handleWalletUpdate = (e: any) => {
      if (e.detail?.balance !== undefined) {
        setWalletBalance(e.detail.balance);
      }
    };
    window.addEventListener('qaryati:wallet-updated', handleWalletUpdate);
    return () => window.removeEventListener('qaryati:wallet-updated', handleWalletUpdate);
  }, []);

  // Customer Session & Identity (RBAC Customer)
  const [activeCustomer, setActiveCustomer] = useState(() => getActiveCustomer());
  const [showCustomerAuthModal, setShowCustomerAuthModal] = useState(false);
  const [custModalName, setCustModalName] = useState(activeCustomer?.name || '');
  const [custModalPhone, setCustModalPhone] = useState(activeCustomer?.phone || '');
  const [custModalNationalId, setCustModalNationalId] = useState(activeCustomer?.nationalId || '');
  const [custModalHousePhoto, setCustModalHousePhoto] = useState(activeCustomer?.housePhoto || '');
  const [custModalPassword, setCustModalPassword] = useState(activeCustomer?.passwordHash || '');
  const [custModalVillage, setCustModalVillage] = useState(activeCustomer?.village || '');

  // Sync activeCustomer fields with cart inputs
  useEffect(() => {
    if (activeCustomer) {
      if (activeCustomer.name) setCustomerName(activeCustomer.name);
      if (activeCustomer.phone) setCustomerPhone(activeCustomer.phone);
      if (activeCustomer.village) setCustomerAddress(activeCustomer.village);
    }
  }, [activeCustomer]);

  // Secret Developer Trigger (5 consecutive taps on logo within 2.5s)
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimerRef = React.useRef<any>(null);

  const handleLogoSecretTap = () => {
    setLogoTapCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
        setDeveloperRemembered(true);
        setActiveSessionRole('DEVELOPER');
        
        // Defer action to next tick to avoid updating state while rendering
        setTimeout(() => {
          if (onOpenAuthModal) {
            onOpenAuthModal('DEVELOPER');
          } else {
            onOpenMerchantPortal();
          }
        }, 0);
        
        return 0;
      }
      if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
      logoTapTimerRef.current = setTimeout(() => {
        setLogoTapCount(0);
      }, 2500);
      return next;
    });
  };

  // Check if customer credentials exist on mount; if not, open registration modal
  useEffect(() => {
    if (!activeCustomer?.name || !activeCustomer?.phone || !activeCustomer?.nationalId) {
      setShowCustomerAuthModal(true);
    }
  }, [activeCustomer]);

  // Village & Store Selection - Strictly Gatekept
  const [allStores, setAllStores] = useState<StoreDirectoryRecord[]>(() =>
    getStoresDirectory().filter((s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false)
  );
  const [selectedVillage, setSelectedVillage] = useState<string>('ALL');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('default');

  useEffect(() => {
    const handleStoresRefresh = () => {
      setAllStores(getStoresDirectory().filter((s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false));
    };
    window.addEventListener('qaryati:stores-updated', handleStoresRefresh);
    window.addEventListener('qaryati:order-rated', handleStoresRefresh);
    window.addEventListener('qaryati:merchant-approval-changed', handleStoresRefresh);

    // Supabase Realtime master sync
    const unsubRealtime = initSupabaseRealtime({
      onMerchantApprovalChanged: () => {
        handleStoresRefresh();
      },
    });

    return () => {
      window.removeEventListener('qaryati:stores-updated', handleStoresRefresh);
      window.removeEventListener('qaryati:order-rated', handleStoresRefresh);
      window.removeEventListener('qaryati:merchant-approval-changed', handleStoresRefresh);
      if (unsubRealtime) unsubRealtime();
    };
  }, []);

  // Sync Supabase merchants dynamically when a village is chosen (Village-First Query)
  useEffect(() => {
    let isMounted = true;
    if (selectedVillage && selectedVillage !== 'ALL') {
      getApprovedMerchantsByVillage(selectedVillage).then((dbStores) => {
        if (isMounted && dbStores && dbStores.length > 0) {
          setAllStores((prev) => {
            const map = new Map<string, StoreDirectoryRecord>();
            prev.forEach((st) => map.set(st.id, st));
            dbStores.forEach((st) => map.set(st.id, st));
            return Array.from(map.values()).filter(
              (s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false
            );
          });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedVillage]);

  // Rating State for Customer Order Review
  const [ratingStoreScore, setRatingStoreScore] = useState<number>(5);
  const [ratingDriverScore, setRatingDriverScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string>('');

  // Store-specific products in multi-vendor directory
  const [storeSpecificProducts, setStoreSpecificProducts] = useState<Item[]>([]);

  useEffect(() => {
    if (selectedStoreId && selectedStoreId !== 'default') {
      // Load local storage first for quick display
      const prods = getStoreProducts(selectedStoreId);
      setStoreSpecificProducts(prods);

      // Real-time listener from Firestore
      const itemsCol = collection(db, 'stores', selectedStoreId, 'items');
      const unsub = onSnapshot(itemsCol, (snapshot) => {
        const loaded: Item[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Item);
        });
        setStoreSpecificProducts(loaded);
        try {
          localStorage.setItem(`merchant_${selectedStoreId}_items`, JSON.stringify(loaded));
        } catch (e) {
          console.warn('Failed to cache store products locally:', e);
        }
      }, (error) => {
        console.warn('Real-time store items subscription error:', error);
      });

      return () => unsub();
    } else {
      setStoreSpecificProducts([]);
    }
  }, [selectedStoreId]);

  // Active items for the selected store
  const activeDisplayItems = useMemo(() => {
    if (selectedStoreId !== 'default') {
      if (storeSpecificProducts.length > 0) return storeSpecificProducts;
      const matched = items.filter(
        (i) => i.merchantId === selectedStoreId || i.storeId === selectedStoreId
      );
      return matched;
    }
    return items;
  }, [selectedStoreId, storeSpecificProducts, items]);

  const [devSettings, setDevSettings] = useState(() => getPlatformDeveloperSettings());

  useEffect(() => {
    const handleDevSettingsUpdate = (e: any) => {
      if (e.detail) {
        setDevSettings(e.detail);
      } else {
        setDevSettings(getPlatformDeveloperSettings());
      }
    };
    window.addEventListener('qaryati:dev-settings-updated', handleDevSettingsUpdate);
    return () => window.removeEventListener('qaryati:dev-settings-updated', handleDevSettingsUpdate);
  }, []);

  const FIXED_VILLAGES = [
    'قرية الفصور',
    'قرية الحقالي',
    'قرية الباركة',
    'قرية الانهوم',
    'قرية مشيجبه',
    'سوق حول جباري',
    'قرية المداد',
    'قرية الجامع',
    'قرية المسيلة',
    'قرية المكيل',
  ];

  // Strictly the 10 fixed villages requested by user
  const villageList = FIXED_VILLAGES;

  // Stores available in the selected village - strictly enforcing Village-First Filtering:
  // Select * From merchants Where village_id = [Chosen_Village] And is_approved = true
  const availableStores = useMemo(() => {
    const approvedStores = allStores.filter(
      (s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false
    );
    if (selectedVillage === 'ALL') return approvedStores;
    return approvedStores.filter(
      (s) =>
        s.cityOrVillage === selectedVillage ||
        s.cityOrVillage?.includes(selectedVillage)
    );
  }, [allStores, selectedVillage]);

  // Currently active selected store target
  const activeSelectedStore = useMemo(() => {
    if (selectedStoreId === 'default') {
      return {
        name: settings.storeName || 'متجر قريتي',
        phone: settings.phone || '',
        village: settings.address || '',
      };
    }
    const found = allStores.find((s) => s.id === selectedStoreId);
    if (found) {
      return {
        name: found.name,
        phone: found.phone,
        village: found.cityOrVillage,
      };
    }
    return {
      name: settings.storeName || 'متجر قريتي',
      phone: settings.phone || '',
      village: settings.address || '',
    };
  }, [selectedStoreId, allStores, settings]);

  // Track active placed order
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('qaryati_customer_last_order_id');
    } catch {
      return null;
    }
  });
  const [trackedOrder, setTrackedOrder] = useState<DeliveryOrder | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Sync tracked order with local storage orders
  useEffect(() => {
    if (!trackedOrderId) {
      setTrackedOrder(null);
      return;
    }
    const all = getDeliveryOrders();
    const found = all.find((o) => o.id === trackedOrderId);
    if (found) {
      setTrackedOrder(found);
    }
  }, [trackedOrderId]);

  useEffect(() => {
    const handleOrderUpdates = () => {
      if (!trackedOrderId) return;
      const all = getDeliveryOrders();
      const found = all.find((o) => o.id === trackedOrderId);
      if (found) {
        setTrackedOrder(found);
      }
    };

    window.addEventListener('qaryati:orders-updated', handleOrderUpdates);
    window.addEventListener('qaryati:order-accepted', handleOrderUpdates);
    window.addEventListener('qaryati:order-ready-for-pickup', handleOrderUpdates);
    window.addEventListener('qaryati:order-delivered', handleOrderUpdates);

    return () => {
      window.removeEventListener('qaryati:orders-updated', handleOrderUpdates);
      window.removeEventListener('qaryati:order-accepted', handleOrderUpdates);
      window.removeEventListener('qaryati:order-ready-for-pickup', handleOrderUpdates);
      window.removeEventListener('qaryati:order-delivered', handleOrderUpdates);
    };
  }, [trackedOrderId]);

  // Platform Promotional Ads from Developer / Owner Console
  const [platformAds, setPlatformAds] = useState<PlatformAd[]>(() =>
    getPlatformAds().filter((a) => a.isActive)
  );

  useEffect(() => {
    const handleAdsUpdate = () => {
      setPlatformAds(getPlatformAds().filter((a) => a.isActive));
    };
    window.addEventListener('qaryati:ads-updated', handleAdsUpdate);
    return () => window.removeEventListener('qaryati:ads-updated', handleAdsUpdate);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeDisplayItems.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [activeDisplayItems]);

  // Filter items (Read-Only)
  const filteredItems = useMemo(() => {
    return activeDisplayItems.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        String(item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barcode && String(item.barcode).toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;

      const matchStock = !onlyInStock || item.quantity > 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [activeDisplayItems, searchQuery, selectedCategory, onlyInStock]);

  // Cart operations
  const addToCart = (item: Item, qty = 1) => {
    if (!activeCustomer || !activeCustomer.name || !activeCustomer.phone || !activeCustomer.nationalId || !activeCustomer.housePhoto || !activeCustomer.passwordHash) {
      alert('⚠️ تنبيه أمني: لا يمكن إضافة أي صنف إلى السلة إلا بعد تسجيل الحساب بالكامل (الاسم، رقم الجوال، رقم البطاقة الشخصية، صورة واجهة المنزل، وكلمة السر). يرجى إتمام التسجيل أولاً.');
      setShowCustomerAuthModal(true);
      return;
    }

    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? existing.quantity + qty : qty;
      return {
        ...prev,
        [item.id]: { item, quantity: newQty },
      };
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: newQty },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Cart Calculations
  const cartItemsList: CartItem[] = Object.keys(cart).map((key) => cart[key]);
  const totalCartCount: number = cartItemsList.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  const totalCartPrice: number = cartItemsList.reduce(
    (sum: number, item: CartItem) => sum + item.quantity * item.item.salePrice,
    0
  );

  // Clean WhatsApp number
  const getWhatsAppTargetPhone = () => {
    const raw = customStorePhone || settings.phone || '';
    let cleaned = raw.replace(/\D/g, '');
    // If starts with 05 in Saudi Arabia, convert to 9665
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      cleaned = '966' + cleaned.substring(1);
    }
    return cleaned;
  };

  // Format and Send WhatsApp Order
  const handleSendWhatsAppOrder = () => {
    if (cartItemsList.length === 0) return;

    const currency = settings.currency || 'ر.س';
    const storeName = settings.storeName || 'متجر قريتي';
    const cleanPhone = getWhatsAppTargetPhone();

    let message = `🛒 *طلب جديد من متجر القرية*\n`;
    message += `🏪 *المتجر:* ${storeName}\n`;
    if (customerName.trim()) {
      message += `👤 *اسم العميل:* ${customerName.trim()}\n`;
    }
    if (customerAddress.trim()) {
      message += `📍 *العنوان / الحي بالقرية:* ${customerAddress.trim()}\n`;
    }
    if (orderNotes.trim()) {
      message += `📝 *ملاحظات الطلب:* ${orderNotes.trim()}\n`;
    }
    message += `--------------------------------\n`;
    message += `📋 *قائمة المشتريات المطلوبة:*\n`;

    cartItemsList.forEach((cartItem, idx) => {
      const itemTotal = cartItem.quantity * cartItem.item.salePrice;
      const unitStr = cartItem.item.unit ? ` ${cartItem.item.unit}` : '';
      message += `${idx + 1}. *${cartItem.item.name}*\n   الكمية: ${cartItem.quantity}${unitStr} × ${cartItem.item.salePrice.toFixed(2)} ${currency} = *${itemTotal.toFixed(2)} ${currency}*\n`;
    });

    message += `--------------------------------\n`;
    message += `💵 *إجمالي قيمة الطلب:* *${totalCartPrice.toFixed(2)} ${currency}*\n`;
    message += `📅 *تاريخ الإرسال:* ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}\n`;
    message += `✨ تم تجهيز هذا الطلب عبر منصة متجر قريتي الرقمية.`;

    const encodedMsg = encodeURIComponent(message);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    } else {
      // Fallback if no phone configured
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
    }
  };

  // Send Order Directly to Store with System Notification & Driver Flow
  const handlePlaceOrderToStore = () => {
    const currentDevSettings = getPlatformDeveloperSettings();
    if (currentDevSettings.maintenanceMode) {
      alert(currentDevSettings.maintenanceMessage || 'عذراً، المنصة في وضع الصيانة والتحديثات الكبرى حالياً. لا يمكن استقبال طلبات جديدة مؤقتاً.');
      return;
    }

    if (cartItemsList.length === 0) return;

    const validName = customerName.trim() || 'عميل المتجر';
    const validPhone = customerPhone.trim() || (customStorePhone || '05xxxxxxxx');
    const validAddress = customerAddress.trim() || (settings.address ? `حي ${settings.address}` : 'القرية');
    const deliveryFee = 10;
    const subtotal = totalCartPrice;
    const totalAmount = subtotal + deliveryFee;

    // Save customer identity for future quick visits
    saveActiveCustomer({
      name: validName,
      phone: validPhone,
      nationalId: activeCustomer?.nationalId,
      housePhoto: activeCustomer?.housePhoto,
      passwordHash: activeCustomer?.passwordHash,
      village: validAddress,
    });
    setActiveCustomer({
      name: validName,
      phone: validPhone,
      nationalId: activeCustomer?.nationalId,
      housePhoto: activeCustomer?.housePhoto,
      passwordHash: activeCustomer?.passwordHash,
      village: validAddress,
    });

    if (activeCustomer?.nationalId) {
      registerCustomerAccount({
        name: validName,
        phone: validPhone,
        nationalId: activeCustomer.nationalId,
        villageName: validAddress,
      }).catch(() => {});
    }

    const newOrder = createDeliveryOrder({
      customerName: validName,
      customerPhone: validPhone,
      customerAddress: validAddress,
      storeName: activeSelectedStore.name || settings.storeName || 'متجر قريتي',
      storePhone: activeSelectedStore.phone || settings.phone || '',
      storeAddress: activeSelectedStore.village || settings.address || '',
      items: cartItemsList.map((ci) => ({
        itemId: ci.item.id,
        name: ci.item.name,
        quantity: ci.quantity,
        unitPrice: ci.item.salePrice,
        unit: ci.item.unit,
        total: ci.quantity * ci.item.salePrice,
      })),
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      status: 'NEW',
      notes: orderNotes.trim() || undefined,
    });

    try {
      localStorage.setItem('qaryati_customer_last_order_id', newOrder.id);
    } catch {}

    setTrackedOrderId(newOrder.id);
    setTrackedOrder(newOrder);
    setIsCartOpen(false);
    setIsTrackingModalOpen(true);
    clearCart();
  };

  // Send WhatsApp message for a created order
  const handleSendWhatsAppForExistingOrder = (order: DeliveryOrder) => {
    const currency = settings.currency || 'ر.س';
    const cleanPhone = getWhatsAppTargetPhone();

    let msg = `🛒 *طلب رسمي جديد - رقم #${order.orderNumber}*\n`;
    msg += `🏪 *المتجر:* ${order.storeName}\n`;
    msg += `👤 *العميل:* ${order.customerName}\n`;
    msg += `📞 *رقم الجوال:* ${order.customerPhone}\n`;
    msg += `📍 *العنوان:* ${order.customerAddress}\n`;
    if (order.notes) msg += `📝 *ملاحظة:* ${order.notes}\n`;
    msg += `--------------------------------\n`;
    msg += `📋 *الأصناف:*\n`;
    order.items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.name}* (الكمية: ${it.quantity} ${it.unit || ''}) = ${it.total.toFixed(2)} ${currency}\n`;
    });
    msg += `--------------------------------\n`;
    msg += `💵 *إجمالي الحساب مع التوصيل:* *${order.totalAmount.toFixed(2)} ${currency}*\n`;
    msg += `طريقة الدفع: ${order.paymentMethod === 'TRANSFER' ? 'تحويل بنكي' : 'كاش عند الاستلام'}\n`;
    msg += `تم تسجيل الطلب في نظام المتجر وبانتظار بدء التجهيز والتوصيل. شكراً لكم!`;

    const encoded = encodeURIComponent(msg);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  // Direct 1-click single-item WhatsApp Order
  const handleDirectWhatsAppProduct = (item: Item) => {
    const currency = settings.currency || 'ر.س';
    const storeName = settings.storeName || 'متجر قريتي';
    const cleanPhone = getWhatsAppTargetPhone();

    let message = `🛒 *طلب فوري عبر الواتساب*\n`;
    message += `🏪 *المتجر:* ${storeName}\n`;
    message += `📦 *الصنف المطلوب:* *${item.name}*\n`;
    message += `💵 *السعر:* ${item.salePrice.toFixed(2)} ${currency} ${item.unit ? `لكل ${item.unit}` : ''}\n`;
    if (customerName.trim()) {
      message += `👤 *اسم العميل:* ${customerName.trim()}\n`;
    }
    if (customerAddress.trim()) {
      message += `📍 *العنوان / القرية:* ${customerAddress.trim()}\n`;
    }
    message += `📅 *تاريخ الطلب:* ${new Date().toLocaleDateString('ar-SA')}\n`;
    message += `هل الصنف متاح حالياً للتوصيل أو الاستلام؟ شكراً لك.`;

    const encodedMsg = encodeURIComponent(message);
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, '_blank');
    }
  };

  // Interoperability with custom event qaryati:add-to-cart
  useEffect(() => {
    const handleAddEvent = (e: any) => {
      const targetId = e.detail?.id;
      if (!targetId) return;
      const target = items.find((i) => String(i.id) === String(targetId));
      if (target) {
        addToCart(target);
      }
    };
    window.addEventListener('qaryati:add-to-cart', handleAddEvent);
    return () => window.removeEventListener('qaryati:add-to-cart', handleAddEvent);
  }, [items, addToCart]);

  const handleShareStoreLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?portal=store`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.storeName || 'متجر قريتي',
          text: `تفضل بزيارة وتصفح متجر ${settings.storeName || 'قريتي'} واطلب احتياجاتك مباشرة عبر الواتساب:`,
          url: url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      id="village-store-container"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white font-sans"
    >
      {devSettings.maintenanceMode && (
        <div className="bg-amber-950/95 border-b-2 border-amber-600 px-4 py-3 text-amber-200 text-center text-xs sm:text-sm font-bold shadow-xl flex items-center justify-center gap-2 z-40 sticky top-0">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <span>
            <strong>تنبيه صيانة المنصة:</strong> {devSettings.maintenanceMessage || 'عذراً، المنصة في وضع الصيانة والتحديثات الكبرى حالياً. لا يمكن استقبال طلبات جديدة مؤقتاً.'}
          </span>
        </div>
      )}

      {/* Top Customer Store Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Back to Portals Button */}
            <button
              onClick={onOpenLanding}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-700/80 shadow-xs cursor-pointer"
              title="الرجوع إلى القائمة الرئيسية للبوابات وشاشات الدخول"
            >
              {isRTL ? <ArrowRight className="w-4 h-4 text-emerald-400" /> : <ArrowLeft className="w-4 h-4 text-emerald-400" />}
              <span className="text-[11px] sm:text-xs">البوابات</span>
            </button>

            <div className="flex items-center gap-2">
              <div
                onClick={handleLogoSecretTap}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-95 transition-transform"
                title="شعار المتجر (النقر 5 مرات يفتح خيارات المطور)"
              >
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm sm:text-base text-white leading-tight">
                    {settings.storeName || 'متجر قريتي'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    مفتوح للطلب
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[130px] sm:max-w-xs">
                  {settings.address || 'تسوق واطلب مباشرة عبر الواتساب'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Tracking, Cart, Share & Merchant Portal */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Active Order Tracker Button */}
            {trackedOrder && trackedOrder.status !== 'CANCELLED' && (
              <button
                onClick={() => setIsTrackingModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                title="متابعة حالة الطلب الحالي المباشرة"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-[11px] sm:text-xs">متابعة طلبي</span>
                <span className="font-mono text-[10px] font-black bg-amber-400/20 px-1 py-0.5 rounded">
                  #{trackedOrder.orderNumber}
                </span>
              </button>
            )}

            {/* Digital Village Wallet Header Button */}
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950 to-teal-900 hover:from-emerald-900 hover:to-teal-800 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              title="فتح محفظة القرية الرقمية وشحن الرصيد"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">محفظتي:</span>
              <span className="font-black font-mono text-emerald-300">{formatGlobalCurrency(walletBalance)}</span>
            </button>

            {/* AI Commerce Assistant Button */}
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="فتح مساعد الذكاء الاصطناعي لتوليد العروض وتحليل المخزون"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] sm:text-xs">مساعد AI</span>
            </button>

            {/* Share Link Button */}
            <button
              onClick={handleShareStoreLink}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold border border-slate-700/80 cursor-pointer shadow-xs"
              title="مشاركة رابط هذا المتجر المباشر عبر الواتساب ووسائل التواصل"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] sm:text-xs">{copiedLink ? 'تم النسخ!' : 'مشاركة'}</span>
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="فتح سلة التسوق ومعاينة الأصناف المختارة"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>السلة</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-none animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Merchant / Admin Door Button */}
            <button
              onClick={onOpenMerchantPortal}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 transition-all border border-slate-700/80 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
              title="دخول التاجر والمدير لإدارة المنتجات والمبيعات"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] sm:text-xs">التاجر</span>
            </button>

            {/* Dedicated Roles & Auth Modal Button */}
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => onOpenAuthModal('MERCHANT')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 transition-all border border-slate-700/80 flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
                title="فتح نافذة تبديل الأدوار وتجهيز حسابات التجار والسائقين"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] sm:text-xs">الأدوار</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Developer Customizable Top Banner */}
      {(devSettings.storefrontBannerText || devSettings.developerAnnouncement) && (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-500/40 px-4 py-2 text-emerald-200 text-center text-xs font-bold shadow-md flex items-center justify-center gap-2 z-20">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>{devSettings.storefrontBannerText || devSettings.developerAnnouncement}</span>
        </div>
      )}

      {/* Promoted Ads Banner Widget */}
      <div className="max-w-6xl mx-auto px-4 mt-4 mb-1">
        <AdBannerWidget currentVillage={selectedVillage} isDarkMode={true} isRTL={isRTL} />
      </div>

      {/* Hero Welcome Bar */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-slate-800/60 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {devSettings.storefrontBadgeText || 'متجر القرية والعملاء - تصفح المنتجات والطلب الفوري'}
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            {devSettings.storefrontHeaderTitle || `أهلاً بكم في ${settings.storeName || 'متجر قريتي'}`}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {devSettings.storefrontSubTitle || 'اختر ما تحتاجه من أصناف، أضفها إلى سلتك، واضغط زر إرسال الطلب ليتواصل معك المتجر فوراً عبر الواتساب وتجهيز طلبك.'}
          </p>
        </div>
      </div>

      {/* Customer Account & Village/Store Selector Toolbar */}
      <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-3 shadow-inner">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Customer Profile Status */}
          <div className="flex items-center gap-2.5">
            {activeCustomer ? (
              <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-2xl">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>مرحباً، {activeCustomer.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      عميل القرية
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {activeCustomer.phone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearActiveCustomer();
                    setActiveCustomer(null);
                  }}
                  className="mr-2 p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="تسجيل خروج العميل"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomerAuthModal(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 text-slate-200 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>تسجيل دخول العميل (الاسم والجوال)</span>
              </button>
            )}
          </div>

          {/* Village and Store Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Village Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                aria-label="تحديد القرية أو الحي"
                value={selectedVillage}
                onChange={(e) => {
                  setSelectedVillage(e.target.value);
                  setSelectedStoreId('default');
                }}
                className="bg-transparent text-slate-200 focus:outline-hidden text-xs font-bold cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">كل القرى والأحياء</option>
                {villageList.map((vil) => (
                  <option key={vil} value={vil} className="bg-slate-900 text-white">
                    {vil}
                  </option>
                ))}
              </select>
            </div>

            {/* Store Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <Store className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <select
                aria-label="اختيار المتجر"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-hidden text-xs font-bold cursor-pointer max-w-[180px] truncate"
              >
                <option value="default" className="bg-slate-900 text-white">
                  {settings.storeName || 'متجر قريتي'} (الأساسي)
                </option>
                {availableStores.map((st) => (
                  <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                    {st.name} {st.isPro ? '👑' : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Adhan & Prayer Times Widget */}
            {devSettings.storefrontShowAdhan !== false && (
              <AdhanTopBarWidget isRTL={isRTL} isDarkMode={true} compact={false} />
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Prayer Time Closed Banner (if active) */}
        <StorePrayerClosedBanner isRTL={isRTL} />
        {selectedVillage === 'ALL' ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MapPin className="w-3.5 h-3.5" />
                اختر قريتك للبدء في التسوق
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">أسماء القرى المتاحة في المنصة</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
                مجرد ما تضغط على القرية (مثل قرية الفصور أو غيرها)، ستظهر لك فوراً المتاجر المسجلة في هذه القرية فقط.
              </p>
            </div>

            {/* Standalone Circular Icons and Buttons (No boxes or card containers) */}
            <div className="flex flex-wrap items-start justify-center gap-7 sm:gap-10 py-6 max-w-4xl mx-auto">
              {villageList.map((village) => {
                const villageStores = allStores.filter(
                  (s) =>
                    (s.cityOrVillage === village || s.cityOrVillage?.includes(village)) &&
                    s.status !== 'SUSPENDED' &&
                    (s as any).isApproved !== false
                );
                return (
                  <button
                    key={village}
                    type="button"
                    onClick={() => {
                      setSelectedVillage(village);
                      setSelectedStoreId('default');
                    }}
                    className="flex flex-col items-center group cursor-pointer transition-all duration-200 focus:outline-none select-none text-center"
                  >
                    {/* Standalone Circular Icon Button */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-2 border-slate-700/80 group-hover:border-emerald-400 group-hover:bg-emerald-950/40 text-emerald-400 group-hover:text-emerald-300 flex items-center justify-center shadow-lg shadow-black/40 group-hover:shadow-emerald-500/25 group-hover:scale-105 active:scale-95 transition-all duration-200">
                      <MapPin className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-200 group-hover:-translate-y-1" />
                      {villageStores.length > 0 && (
                        <span
                          className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[11px] font-mono px-2 py-0.5 rounded-full shadow-md border-2 border-slate-900"
                          title={`${villageStores.length} متجر`}
                        >
                          {villageStores.length}
                        </span>
                      )}
                    </div>

                    {/* Village Name Directly Underneath */}
                    <span className="mt-3 text-sm sm:text-base font-extrabold text-slate-200 group-hover:text-emerald-400 transition-colors tracking-tight max-w-[120px] line-clamp-1">
                      {village}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {villageStores.length > 0 ? `${villageStores.length} متجر` : 'لا توجد متاجر'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected Village Header Bar */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">القرية المحددة حالياً:</div>
                  <h3 className="font-black text-white text-base sm:text-lg">{selectedVillage}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedVillage('ALL');
                  setSelectedStoreId('default');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
              >
                {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>تغيير القرية / عرض كل القرى</span>
              </button>
            </div>

            {/* Quick Village Switcher (Horizontal Circular/Pill buttons) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setSelectedVillage('ALL');
                  setSelectedStoreId('default');
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
              >
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>كل القرى</span>
              </button>

              {villageList.map((vil) => {
                const isSelected = selectedVillage === vil;
                const storeCount = allStores.filter((s) => s.cityOrVillage === vil).length;
                return (
                  <button
                    key={vil}
                    type="button"
                    onClick={() => {
                      setSelectedVillage(vil);
                      setSelectedStoreId('default');
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span>{vil}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                      {storeCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of Stores Registered in this Village */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>المتاجر المسجلة في {selectedVillage} ({availableStores.length}):</span>
                </h4>
                <span className="text-[11px] text-slate-400">اختر المتجر لتصفح منتجاته والطلب منه مباشرة</span>
              </div>

              {availableStores.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl">
                  <Store className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">لا توجد متاجر مسجلة في {selectedVillage} حتى الآن</p>
                  <p className="text-xs text-slate-500 mt-1">هل أنت تاجر في هذه القرية؟ يمكنك تسجيل متجرك الآن بكل سهولة.</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) onOpenAuthModal('MERCHANT');
                      else onOpenMerchantPortal();
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل متجر جديد في {selectedVillage}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {availableStores.map((st) => {
                    const isSelected = selectedStoreId === st.id;
                    const ratingVal = st.rating || 5;
                    const ratingCount = st.ratingCount || 0;
                    return (
                      <div
                        key={st.id}
                        onClick={() => setSelectedStoreId(st.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                            : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                              <Store className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-extrabold text-white text-sm leading-tight flex items-center gap-1.5">
                                <span>{st.name}</span>
                                {st.isPro && <span className="text-xs" title="تاجر معتمد">👑</span>}
                              </h5>
                              <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">{st.cityOrVillage}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950 shrink-0">
                              المحدد للتسوق ✓
                            </span>
                          )}
                        </div>

                        {/* Store Ratings (Stars) */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`w-3.5 h-3.5 ${
                                    starIdx <= Math.round(ratingVal)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-mono font-bold text-amber-300 ml-1">
                              {ratingVal.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({ratingCount > 0 ? `${ratingCount} تقييم` : 'جديد'})
                            </span>
                          </div>

                          <span className="text-[11px] font-bold text-emerald-400">
                            {isSelected ? 'المتجر النشط' : 'تصفح المتجر ←'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="flex flex-col gap-3">
          {/* Search bar & stock toggle */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم المنتج، الصنف، أو القسم..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-2.5 pr-9 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer self-start sm:self-center px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
              />
              <span>عرض المتوفر فقط</span>
            </label>
          </div>

          {/* Categories Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                الكل ({items.length})
              </button>
              {categories.map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">لا توجد منتجات مطابقة</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              جرب تغيير عبارة البحث أو اختيار قسم آخر، أو أزل تصفية المتوفر فقط.
            </p>
          </div>
        ) : (
          <div
            id="products-container"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {filteredItems.map((item) => {
              const inCart = cart[item.id];
              const isAvailable = item.quantity > 0 && item.available !== false;
              const currency = settings.currency || 'ر.س';
              const productImage = item.image || item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';

              return (
                <div
                  key={item.id}
                  className="bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md relative group"
                >
                  <div>
                    {/* Product Image & Badges */}
                    <div className="relative w-full h-32 sm:h-36 mb-3 rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800">
                      <img
                        src={productImage}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';
                        }}
                      />

                      {/* Availability Badge */}
                      <div className="absolute top-2 right-2">
                        {isAvailable ? (
                          <span className="text-[10px] font-bold text-emerald-300 bg-slate-950/85 backdrop-blur border border-emerald-500/30 px-2 py-0.5 rounded-md shadow">
                            متوفر
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-300 bg-slate-950/85 backdrop-blur border border-rose-500/30 px-2 py-0.5 rounded-md shadow">
                            نفذ
                          </span>
                        )}
                      </div>

                      {/* Category Badge */}
                      {item.category && (
                        <div className="absolute bottom-2 right-2">
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur text-slate-300">
                            {item.category}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Title & Info */}
                    <div className="mb-2">
                      <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        {item.unit && <span>الوحدة: {item.unit}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Cart Action */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">سعر البيع</span>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-400">
                        {item.salePrice.toFixed(2)}{' '}
                        <span className="text-xs font-normal text-slate-400">{currency}</span>
                      </div>
                    </div>

                    {/* Interactive Cart Buttons & 1-Click WhatsApp */}
                    {inCart ? (
                      <div className="flex items-center justify-between bg-slate-800/90 rounded-xl p-1 border border-emerald-500/40">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="إنقاص"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs text-emerald-400">
                          {inCart.quantity} {item.unit || ''}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-colors cursor-pointer"
                          title="زيادة"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => addToCart(item)}
                          disabled={!isAvailable}
                          className={`flex-1 py-2 px-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isAvailable
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-emerald-950/50'
                              : 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-800'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>{isAvailable ? 'إضافة للسلة' : 'غير متوفر'}</span>
                        </button>
                        {isAvailable && (
                          <button
                            onClick={() => handleDirectWhatsAppProduct(item)}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="طلب هذا الصنف عبر الواتساب فوراً"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3.5 rounded-2xl shadow-2xl shadow-emerald-950/80 border border-emerald-400/30 flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-100 font-medium">سلة الطلبات ({totalCartCount} صنف)</div>
                <div className="text-base font-extrabold text-white">
                  {totalCartPrice.toFixed(2)} {settings.currency || 'ر.س'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl">
              <span>عرض السلة وإرسال</span>
              {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">سلة مشترياتك</h3>
                  <p className="text-xs text-slate-400">
                    {totalCartCount} أصناف بإجمالي {totalCartPrice.toFixed(2)} {settings.currency || 'ر.س'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cartItemsList.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="p-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="تفريغ السلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-3">
              {cartItemsList.length === 0 ? (
                <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                  <ShoppingCart className="w-12 h-12 stroke-1 mb-2 text-slate-600" />
                  <p className="text-sm font-medium">سلة مشترياتك فارغة حالياً</p>
                  <p className="text-xs text-slate-500 mt-1">تصفح الأصناف واضغط على إضافة للسلة</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5">
                    {cartItemsList.map(({ item, quantity }) => {
                      const itemTotal = quantity * item.salePrice;
                      const currency = settings.currency || 'ر.س';

                      return (
                        <div
                          key={item.id}
                          className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {item.salePrice.toFixed(2)} {currency}{' '}
                              {item.unit ? `لكل ${item.unit}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Quantity buttons */}
                            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center font-bold text-xs text-white">
                                {quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Total for this item */}
                            <div className="text-right min-w-[65px]">
                              <div className="font-extrabold text-sm text-emerald-400">
                                {itemTotal.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-500">{currency}</div>
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Customer Delivery Details Form */}
                  <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                      <span>بيانات المستلم والتوصيل:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">اسمك الكريم *</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: أبو محمد"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">رقم الجوال للتواصل والتوصيل *</label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="مثال: 0501234567"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">الحي أو موقع التوصيل بالقرية *</label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="مثال: الحي الشرقي - قرب المسجد"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">طريقة الدفع المفضلة</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="CASH_ON_DELIVERY">كاش عند الاستلام</option>
                          <option value="TRANSFER">تحويل بنكي</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">ملاحظات الطلب (اختياري)</label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="مثال: توصيل سريع أو الاتصال قبل الوصول"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Store WhatsApp Phone Number check */}
                    {!settings.phone && (
                      <div className="mt-1 pt-2 border-t border-slate-800">
                        <label className="text-[11px] text-amber-400 mb-1 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5" />
                          <span>رقم واتساب المتجر (لتوجيه الرسالة إليه):</span>
                        </label>
                        <input
                          type="text"
                          value={customStorePhone}
                          onChange={(e) => setCustomStorePhone(e.target.value)}
                          placeholder="مثال: 966500000000 أو 0500000000"
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer with Send Order to Store and WhatsApp Buttons */}
            {cartItemsList.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col gap-3">
                <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>قيمة الأصناف:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {totalCartPrice.toFixed(2)} {settings.currency || 'ر.س'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>أجرة التوصيل داخل القرية:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      10.00 {settings.currency || 'ر.س'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-sm font-extrabold text-white">
                    <span>المجموع الكلي:</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      {(totalCartPrice + 10).toFixed(2)} {settings.currency || 'ر.س'}
                    </div>
                  </div>
                </div>

                {/* Primary Button: Send Order to Store with Delivery Workflow */}
                <button
                  id="btn-send-order-to-store"
                  onClick={handlePlaceOrderToStore}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/80 transition-all hover:scale-[1.01] active:scale-[0.99] border border-emerald-400/30"
                >
                  <Truck className="w-5 h-5 text-white" />
                  <span>إرسال الطلب إلى المتجر والتوصيل 🚀</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 py-1.5 px-2 rounded-xl border border-emerald-500/20">
                  <Bell className="w-3.5 h-3.5 shrink-0" />
                  <span>يصل إشعار فوري للتاجر لقبول الطلب وتجهيزه وتوجيهه لسائق التوصيل 🛵</span>
                </div>

                {/* Secondary Button: WhatsApp only */}
                <button
                  onClick={handleSendWhatsAppOrder}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-teal-400" />
                  <span>إرسال عبر الواتساب فقط 💬</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Live Order Tracking Modal */}
      {isTrackingModalOpen && trackedOrder && (
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsTrackingModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      متابعة مسار طلبك
                    </h3>
                    <span className="font-mono text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {trackedOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    تحديث حي ومباشر لحالة طلبك وتجهيزه وتوصيله
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tracking Stepper Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* Stepper Steps */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
                {/* Step 1: Received */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-400">
                      1. تم إرسال الطلب بنجاح بالنظام
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تم تسجيل طلبك وإرسال إشعار فوري لمتجر {trackedOrder.storeName}
                    </p>
                  </div>
                </div>

                {/* Step 2: Merchant Acceptance & Preparation */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      trackedOrder.status === 'NEW'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 animate-pulse'
                        : trackedOrder.status !== 'CANCELLED'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {trackedOrder.status === 'NEW' ? (
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                    ) : trackedOrder.status !== 'CANCELLED' ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-extrabold ${
                        trackedOrder.status === 'NEW'
                          ? 'text-amber-400'
                          : trackedOrder.status !== 'CANCELLED'
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      2. قبول المتجر وتجهيز الأصناف 👨‍🍳
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {trackedOrder.status === 'NEW' &&
                        'وصل إشعار للتاجر وبانتظار بدء التجهيز... سيصلك تحديث فوري ⏳'}
                      {trackedOrder.status === 'ACCEPTED' &&
                        'قام التاجر بقبول طلبك ويقوم حالياً بتجهيز وتعبئة الأصناف 👨‍🍳'}
                      {trackedOrder.status === 'READY_FOR_PICKUP' &&
                        'تم اكتمال تجهيز الأصناف بالكامل بالمحل وتغليفها 📦'}
                      {(trackedOrder.status === 'OUT_FOR_DELIVERY' ||
                        trackedOrder.status === 'ON_THE_WAY' ||
                        trackedOrder.status === 'DELIVERED') &&
                        'تم تجهيز الطلب بالكامل من المتجر ✅'}
                    </p>
                  </div>
                </div>

                {/* Step 3: Delivery Driver */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      trackedOrder.status === 'READY_FOR_PICKUP'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 animate-pulse'
                        : trackedOrder.status === 'OUT_FOR_DELIVERY' || trackedOrder.status === 'ON_THE_WAY'
                        ? 'bg-indigo-500 text-white animate-bounce'
                        : trackedOrder.status === 'DELIVERED'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {trackedOrder.status === 'READY_FOR_PICKUP' ? (
                      <Package className="w-3.5 h-3.5" />
                    ) : trackedOrder.status === 'OUT_FOR_DELIVERY' || trackedOrder.status === 'ON_THE_WAY' ? (
                      <Truck className="w-3.5 h-3.5" />
                    ) : trackedOrder.status === 'DELIVERED' ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Truck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-extrabold ${
                        trackedOrder.status === 'READY_FOR_PICKUP'
                          ? 'text-blue-400'
                          : trackedOrder.status === 'OUT_FOR_DELIVERY' || trackedOrder.status === 'ON_THE_WAY'
                          ? 'text-indigo-400'
                          : trackedOrder.status === 'DELIVERED'
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      3. سائق التوصيل والاستلام 🛵
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {trackedOrder.status === 'NEW' && 'سيتم إشعار السائق فور انتهاء التاجر من تجهيز طلبك.'}
                      {trackedOrder.status === 'ACCEPTED' &&
                        'الطلب قيد التحضير وبانتظار إشعار السائق فور جهوزيته.'}
                      {trackedOrder.status === 'READY_FOR_PICKUP' &&
                        'الطلب جاهز بالمحل! تم إرسال إشعار لمناديب التوصيل للاستلام فوراً 📦'}
                      {(trackedOrder.status === 'OUT_FOR_DELIVERY' ||
                        trackedOrder.status === 'ON_THE_WAY') && (
                        <span className="text-indigo-300 font-bold">
                          الطلب خرج مع السائق {trackedOrder.driverName || ''} وهو في الطريق إليك الآن! 🛵
                        </span>
                      )}
                      {trackedOrder.status === 'DELIVERED' && 'تم استلام وتوصيل الطلب بنجاح.'}
                    </p>

                    {trackedOrder.driverPhone && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsLiveTrackerOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-white animate-spin" />
                          <span>فتح الخريطة الحية للتتبع بالـ GPS 🗺️</span>
                        </button>

                        <a
                          href={`tel:${trackedOrder.driverPhone}`}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-bold flex items-center gap-1.5"
                        >
                          <Phone className="w-3 h-3" />
                          <span>اتصال</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Completed */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      trackedOrder.status === 'DELIVERED'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4
                      className={`text-xs sm:text-sm font-extrabold ${
                        trackedOrder.status === 'DELIVERED' ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      4. التسليم والاستلام 🎉
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {trackedOrder.status === 'DELIVERED'
                        ? 'تم تسليم الطلب واستلام الحساب بنجاح! بالعافية والبركة.'
                        : 'يتم التسليم عند باب منزلك مع استلام الحساب.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items & Totals */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 mb-1">الأصناف المطلوبة:</div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {trackedOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-800/40"
                    >
                      <span>
                        {idx + 1}. {it.name} × {it.quantity} {it.unit || ''}
                      </span>
                      <span className="font-mono text-emerald-400">
                        {it.total.toFixed(2)} {settings.currency || 'ر.س'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">الإجمالي النهائي مع التوصيل:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {trackedOrder.totalAmount.toFixed(2)} {settings.currency || 'ر.س'}
                  </span>
                </div>
              </div>

              {/* Order Rating Section (Store & Driver Rating) */}
              {trackedOrder.isRated ? (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تم تسجيل تقييمك لهذا الطلب بنجاح ⭐</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-300 text-[11px] pt-1">
                    <div className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-400" />
                      <span>تقييم المتجر:</span>
                      <span className="font-bold text-amber-300">⭐ {trackedOrder.storeRating || 5}/5</span>
                    </div>
                    {trackedOrder.driverRating && (
                      <div className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تقييم السائق:</span>
                        <span className="font-bold text-amber-300">⭐ {trackedOrder.driverRating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Star className="w-4 h-4 fill-amber-400" />
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-white">تقييم الخدمة بالنجوم (5 نجوم)</h5>
                        <p className="text-[10px] text-slate-400">شاركنا رأيك في المتجر والسائق لتحسين الخدمة</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                      تقييم العميل
                    </span>
                  </div>

                  {ratingSuccessMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{ratingSuccessMsg}</span>
                    </div>
                  )}

                  {/* 1. Store Rating */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تقييم المتجر ({trackedOrder.storeName}):</span>
                      </span>
                      <span className="font-mono text-amber-300 font-bold">{ratingStoreScore} من 5</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRatingStoreScore(starVal)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                          title={`${starVal} نجوم للمتجر`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              starVal <= ratingStoreScore
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Driver Rating (خمس نجوم) */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>تقييم السائق ({trackedOrder.driverName || 'سائق التوصيل'}):</span>
                      </span>
                      <span className="font-mono text-amber-300 font-bold">{ratingDriverScore} من 5</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRatingDriverScore(starVal)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                          title={`${starVal} نجوم للسائق`}
                        >
                          <Star
                            className={`w-6 h-6 transition-colors ${
                              starVal <= ratingDriverScore
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600 hover:text-amber-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Feedback */}
                  <input
                    type="text"
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="ملاحظات أو تعليق إضافي على الخدمة (اختياري)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500"
                  />

                  {/* Submit Rating Button */}
                  <button
                    type="button"
                    disabled={isSubmittingRating}
                    onClick={() => {
                      if (!trackedOrder) return;
                      setIsSubmittingRating(true);
                      const res = rateDeliveryOrder({
                        orderId: trackedOrder.id,
                        storeRating: ratingStoreScore,
                        driverRating: ratingDriverScore,
                        feedback: ratingComment.trim() || undefined,
                      });
                      setIsSubmittingRating(false);
                      if (res.success && res.order) {
                        setTrackedOrder(res.order);
                        setRatingSuccessMsg('شكراً لك! تم إرسال تقييمك للمتجر والسائق بنجاح ⭐');
                      }
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5 fill-slate-950" />
                    <span>إرسال التقييم للمتجر والسائق (5 نجوم)</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={() => handleSendWhatsAppForExistingOrder(trackedOrder)}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-teal-400" />
                  <span>مراسلة المتجر عبر الواتساب</span>
                </button>

                <button
                  onClick={() => setIsTrackingModalOpen(false)}
                  className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Quick Login Modal (تسجيل دخول العميل البسيط) */}
      {showCustomerAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">تسجيل بيانات العميل (إلزامي للطلب)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يرجى تسجيل (الاسم + رقم الجوال + رقم بطاقة الأحوال) لضمان الجدية ومنع التلاعب وسرعة توصيل الطلبات.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!custModalName.trim() || !custModalPhone.trim() || !custModalNationalId.trim()) {
                  alert('يرجى تعبئة الحقول الإلزامية: الاسم الكامل، رقم الجوال، ورقم بطاقة الأحوال');
                  return;
                }
                const customerData = {
                  name: custModalName.trim(),
                  phone: custModalPhone.trim(),
                  nationalId: custModalNationalId.trim(),
                  housePhoto: custModalHousePhoto.trim() || '',
                  passwordHash: custModalPassword.trim() || 'user123',
                  village: custModalVillage.trim() || undefined,
                };
                saveActiveCustomer(customerData);
                setActiveCustomer(customerData);
                setCustomerName(customerData.name);
                setCustomerPhone(customerData.phone);
                if (customerData.village) setCustomerAddress(customerData.village);
                setShowCustomerAuthModal(false);
                alert('✅ تم تسجيل بياناتك بنجاح! يمكنك الآن تصفح أسعار المتاجر واختيار بقالتك والطلب مباشرة.');
              }}
              className="space-y-2.5 max-h-[70vh] overflow-y-auto px-1"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد محمد السبيعي"
                  value={custModalName}
                  onChange={(e) => setCustModalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الهاتف / الجوال *</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="05xxxxxxxx"
                  value={custModalPhone}
                  onChange={(e) => setCustModalPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم بطاقة الأحوال (الهوية الوطنية) *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="مثال: 1088998877 (لمنع التلاعب وضمان الجدية)"
                  value={custModalNationalId}
                  onChange={(e) => setCustModalNationalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">القرية التابع لها (من القرى الثابتة)</label>
                <select
                  value={custModalVillage}
                  onChange={(e) => setCustModalVillage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
                >
                  <option value="">اختر قريتك...</option>
                  {FIXED_VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const pInput = prompt('أدخل رقم جوالك المسجل لاستعادة كلمة السر عبر زر الأمان:');
                    if (!pInput) return;
                    if (activeCustomer && activeCustomer.phone === pInput.trim()) {
                      alert(`🔒 نظام الأمان:\nكلمة السر الخاصة بك هي: ${activeCustomer.passwordHash || 'غير متوفرة'}`);
                    } else {
                      alert('⚠️ رقم الجوال غير مطابق للحساب الحالي على هذا الجهاز.');
                    }
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>زر الأمان لاستعادة كلمة السر</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  تم التسجيل بنجاح
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerAuthModal(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Modals */}
      <VillageWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        isDarkMode={true}
      />

      <LiveDriverTrackerModal
        isOpen={isLiveTrackerOpen}
        onClose={() => setIsLiveTrackerOpen(false)}
        orderId={trackedOrder?.orderNumber || '101'}
        customerName={customerName || activeCustomer?.name || 'العميل العزيز'}
        driverName={trackedOrder?.driverName || 'المندوب علي العفيفي'}
        driverPhone={trackedOrder?.driverPhone || '+966501234567'}
        villageName={selectedVillage || 'قريتك المحددة'}
        isDarkMode={true}
      />

      <AIMerchantAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        storeName={settings.storeName || 'متجر قريتي'}
        villageName={selectedVillage}
        items={activeDisplayItems}
        isDarkMode={true}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/40 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {settings.storeName || 'متجر قريتي'} © {new Date().getFullYear()} - منصة تصفح وطلب المنتجات
          </p>
          <div className="flex items-center gap-4">
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={() => onOpenAuthModal('DEVELOPER')}
                className="text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="لوحة المطور وإدارة الصلاحيات"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>إدارة الصلاحيات والمطور</span>
              </button>
            )}
            <button
              onClick={onOpenMerchantPortal}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>دخول التاجر والإدارة</span>
            </button>
            <button
              onClick={onOpenLanding}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              شاشة البوابات
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
