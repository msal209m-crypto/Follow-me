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
  AlertCircle,
  Star,
  Wallet,
  Navigation,
  Bot,
  Menu,
  LocateFixed,
  Compass,
  Layers
} from 'lucide-react';
import { CoffeeTreeLogo } from './CoffeeTreeLogo';
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
  verifyAndCompleteDeliveryOrder,
} from '../services/deliveryService';
import { getPlatformAds, PlatformAd, getPlatformDeveloperSettings, setDeveloperRemembered } from '../services/platformSettingsService';
import {
  getActiveCustomer,
  saveActiveCustomer,
  clearActiveCustomer,
  setActiveSessionRole,
  registerCustomerRecord,
  getAllCustomers,
} from '../services/rbacAuthService';
import {
  getApprovedMerchantsByVillage,
  initSupabaseRealtime,
  registerCustomerAccount,
  getCustomersLocalCache,
} from '../services/supabaseQaryatiService';
import { subscribeToVillageStores, fetchAllStores } from '../services/crossDeviceSyncService';
import { AdhanTopBarWidget } from './AdhanTopBarWidget';
import { StorePrayerClosedBanner } from './StorePrayerClosedBanner';
import { AdBannerWidget } from './AdBannerWidget';
import { StoreAdsBanner } from './StoreAdsBanner';
import { getStoreLiveStatus } from '../utils/storeWorkingHours';
import { OrderDeliveryMiniMap } from './OrderDeliveryMiniMap';
import { VillageMapPickerModal } from './VillageMapPickerModal';
import { googleReverseGeocode, calculateDistanceKm, formatDistanceDisplay } from '../services/googleMapsService';

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
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState<'home' | 'orders' | 'wallet' | 'cart' | 'profile'>('home');
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
  const [isCustomerHubOpen, setIsCustomerHubOpen] = useState(false);
  const [showCustomerAuthModal, setShowCustomerAuthModal] = useState(false);
  const [customerModalError, setCustomerModalError] = useState<string | null>(null);
  const [customerModalSuccess, setCustomerModalSuccess] = useState<string | null>(null);
  const [custModalName, setCustModalName] = useState(activeCustomer?.name || '');
  const [custModalPhone, setCustModalPhone] = useState(activeCustomer?.phone || '');
  const [custModalNationalId, setCustModalNationalId] = useState(activeCustomer?.nationalId || '');
  const [custModalHousePhoto, setCustModalHousePhoto] = useState(activeCustomer?.housePhoto || '');
  const [custModalPassword, setCustModalPassword] = useState(activeCustomer?.passwordHash || '');
  const [custModalVillage, setCustModalVillage] = useState(activeCustomer?.village || '');
  const [custModalIdPhoto, setCustModalIdPhoto] = useState('');

  // Sync activeCustomer fields with cart inputs
  useEffect(() => {
    if (activeCustomer) {
      if (activeCustomer.name) setCustomerName(activeCustomer.name);
      if (activeCustomer.phone) setCustomerPhone(activeCustomer.phone);
      if (activeCustomer.village) setCustomerAddress(activeCustomer.village);
    }
  }, [activeCustomer]);

  // Real-time synchronization of customer approval & KYC state
  useEffect(() => {
    const handleCustUpdate = () => {
      setActiveCustomer(getActiveCustomer());
    };
    window.addEventListener('flowapp:customer-session-updated', handleCustUpdate);
    window.addEventListener('qaryati:customer-status-updated', handleCustUpdate);
    return () => {
      window.removeEventListener('flowapp:customer-session-updated', handleCustUpdate);
      window.removeEventListener('qaryati:customer-status-updated', handleCustUpdate);
    };
  }, []);

  const isCustomerApproved = (cust: any) => {
    if (!cust) return false;
    if (cust.isApproved === true || cust.is_verified === true || cust.status === 'VERIFIED') return true;
    const cleanPhone = (cust.phone || '').replace(/\D/g, '');
    const supaCusts = getCustomersLocalCache();
    const foundSupa = supaCusts.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (cleanPhone && cPhone === cleanPhone) || (cust.nationalId && c.national_id === cust.nationalId);
    });
    if (foundSupa && (foundSupa.is_verified === true || foundSupa.status === 'VERIFIED')) return true;
    const rbacCusts = getAllCustomers();
    const foundRbac = rbacCusts.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (cleanPhone && cPhone === cleanPhone) || (cust.nationalId && c.nationalId === cust.nationalId);
    });
    if (foundRbac && foundRbac.isApproved === true) return true;
    return false;
  };

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

  // Village & Store Selection - Live Cloud Sync across all devices
  const [allStores, setAllStores] = useState<StoreDirectoryRecord[]>(() =>
    getStoresDirectory().filter((s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false)
  );
  // Location mode: 'NEARBY' (المتاجر القريبة حسب موقع المستخدم) or 'ALL' (جميع المتاجر)
  const [locationFilterMode, setLocationFilterMode] = useState<'NEARBY' | 'ALL'>('NEARBY');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0); // 0 = جميع المسافات (مرتبة بالأقرب)
  const [selectedVillage, setSelectedVillage] = useState<string>('موقعك الحالي');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('default');
  const [visitedAdNotice, setVisitedAdNotice] = useState<{ storeName: string; village: string } | null>(null);

  // GPS & Location States for dynamic nearby filtering
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);
  const [locationToast, setLocationToast] = useState<string | null>(null);
  const [isLocationSelectorModalOpen, setIsLocationSelectorModalOpen] = useState<boolean>(false);
  const [customVillageInput, setCustomVillageInput] = useState<string>('');

  // Live real-time tick to update store open/closed statuses and prayer pauses automatically
  const [, setLiveTimeTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimeTick(Date.now());
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Sync village and store when direct ad navigation event is fired
  useEffect(() => {
    const handleDirectNavigation = (e: any) => {
      const { storeId, village, storeName } = e?.detail || {};
      if (storeId) {
        setSelectedStoreId(storeId);
      }
      if (village) {
        setSelectedVillage(village);
      }
      if (storeName) {
        setVisitedAdNotice({ storeName, village: village || '' });
        // Auto dismiss after 8 seconds
        setTimeout(() => {
          setVisitedAdNotice(null);
        }, 8000);
        // Smooth scroll to store toolbar & products
        setTimeout(() => {
          const el = document.getElementById('village-store-toolbar') || document.getElementById('store-products-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    };

    window.addEventListener('qaryati:navigate-to-store', handleDirectNavigation);
    return () => {
      window.removeEventListener('qaryati:navigate-to-store', handleDirectNavigation);
    };
  }, []);

  // Sync village when active customer updates
  useEffect(() => {
    if (activeCustomer?.village && activeCustomer.village.trim()) {
      setSelectedVillage(activeCustomer.village.trim());
    }
  }, [activeCustomer]);

  useEffect(() => {
    const handleStoresRefresh = (e?: any) => {
      const list = (e?.detail && Array.isArray(e.detail)) ? e.detail : getStoresDirectory();
      setAllStores(list.filter((s: any) => s.status !== 'SUSPENDED' && s.isApproved !== false));
    };
    window.addEventListener('qaryati:stores-updated', handleStoresRefresh);
    window.addEventListener('qaryati:order-rated', handleStoresRefresh);
    window.addEventListener('qaryati:merchant-approval-changed', handleStoresRefresh);

    // Initial fresh fetch from Firestore
    fetchAllStores().then((cloudStores) => {
      if (cloudStores && cloudStores.length > 0) {
        setAllStores(cloudStores.filter((s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false));
      }
    }).catch(console.warn);

    // Real-time Cloud listener across all phones & devices for all stores
    const unsubCloudStores = subscribeToVillageStores('', (cloudStores) => {
      if (cloudStores) {
        setAllStores(cloudStores.filter((s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false));
      }
    });

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
      if (unsubCloudStores) unsubCloudStores();
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

  // Dynamic location list extracted purely from registered active stores
  const villageList = useMemo(() => {
    const locations = new Set<string>();
    allStores.forEach((s) => {
      const v = (s.cityOrVillage || (s as any).village || '').trim();
      if (v) locations.add(v);
    });
    const list = Array.from(locations).sort();
    return list;
  }, [allStores]);

  // GPS Auto-detect handler (الموقع هو الذي يحدد المتاجر القريبة)
  const handleDetectGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationToast('خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      setTimeout(() => setLocationToast(null), 4000);
      return;
    }
    setIsLocatingGPS(true);
    setLocationToast('جارٍ قراءة إحداثيات موقعك عبر الـ GPS 🛰️...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setLocationFilterMode('NEARBY');

        try {
          const detectedPlace = await googleReverseGeocode(latitude, longitude);
          const finalLocation = (detectedPlace && detectedPlace.trim()) ? detectedPlace.trim() : 'موقعك الحالي (GPS)';
          setSelectedVillage(finalLocation);
          setSelectedStoreId('default');
          setIsLocationSelectorModalOpen(false);
          setLocationToast(`📍 تم تحديد موقعك: "${finalLocation}" • تظهر المتاجر الأقرب لموقعك`);
        } catch {
          setSelectedVillage('موقعك الحالي (GPS)');
          setSelectedStoreId('default');
          setIsLocationSelectorModalOpen(false);
          setLocationToast('📍 تم تحديد موقعك • تظهر المتاجر الأقرب لموقعك');
        } finally {
          setIsLocatingGPS(false);
          setTimeout(() => setLocationToast(null), 5000);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        setLocationToast('تعذر قراءة الـ GPS (يرجى السماح بالوصول للموقع، أو اختيار "جميع المتاجر").');
        setTimeout(() => setLocationToast(null), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectVillage = (villageName: string) => {
    setSelectedVillage(villageName);
    setSelectedStoreId('default');
    setIsLocationSelectorModalOpen(false);
    if (villageName === 'ALL') {
      setLocationFilterMode('ALL');
      setLocationToast('🌐 تم تفعيل عرض جميع المتاجر من كافة المناطق');
    } else {
      setLocationFilterMode('NEARBY');
      setLocationToast(`📍 تم تفعيل تصفية المتاجر في: "${villageName}"`);
    }
    setTimeout(() => setLocationToast(null), 4000);
  };

  const handleShowAllStores = () => {
    setLocationFilterMode('ALL');
    setSelectedVillage('ALL');
    setSelectedStoreId('default');
    setIsLocationSelectorModalOpen(false);
    setLocationToast('🌐 تم عرض جميع المتاجر من كافة المناطق');
    setTimeout(() => setLocationToast(null), 4000);
  };

  // Stores available filtered by GPS location / nearby or all stores, plus search & categories
  const availableStores = useMemo(() => {
    const approvedStores = allStores.filter(
      (s) => s.status !== 'SUSPENDED' && (s as any).isApproved !== false
    );

    // Calculate distance for each store if user coordinates are known
    let result = approvedStores.map((st) => {
      let distanceKm: number | undefined = undefined;
      if (userCoords && st.lat !== undefined && st.lng !== undefined) {
        distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, st.lat, st.lng);
      }
      return {
        ...st,
        distanceKm,
      };
    });

    // 1. Location Filtering & Proximity Sorting
    if (locationFilterMode === 'NEARBY') {
      if (userCoords) {
        // If max distance radius is active (> 0)
        if (maxDistanceKm > 0) {
          result = result.filter(
            (s) => s.distanceKm === undefined || s.distanceKm <= maxDistanceKm
          );
        }
        // Sort closest first
        result.sort((a, b) => {
          if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
            return a.distanceKm - b.distanceKm;
          }
          if (a.distanceKm !== undefined) return -1;
          if (b.distanceKm !== undefined) return 1;
          return 0;
        });
      } else if (selectedVillage !== 'ALL' && selectedVillage !== 'موقعك الحالي') {
        const target = selectedVillage.trim().toLowerCase();
        result = result.filter((s) => {
          const vill = (s.cityOrVillage || (s as any).village || s.address || '').toLowerCase();
          return vill.includes(target) || target.includes(vill);
        });
      }
    }

    // 2. Filter by circular category if selected
    if (selectedCategory && selectedCategory !== 'ALL') {
      const cat = selectedCategory.toLowerCase();
      result = result.filter((s) => {
        const storeCat = `${(s as any).category || ''} ${(s as any).classification || ''} ${(s as any).storeType || ''} ${s.name || ''}`.toLowerCase();
        
        if (cat === 'مغذي') {
          return storeCat.includes('مغذي') || storeCat.includes('بقالة') || storeCat.includes('تموين') || storeCat.includes('سوبر') || storeCat.includes('مواد غذائية');
        }
        if (cat === 'مطاعم') {
          return storeCat.includes('مطعم') || storeCat.includes('مطاعم') || storeCat.includes('برجر') || storeCat.includes('وجبات') || storeCat.includes('شاورما') || storeCat.includes('مشويات') || storeCat.includes('أكلات') || storeCat.includes('بيتزا');
        }
        if (cat === 'صيدليات') {
          return storeCat.includes('صيدل') || storeCat.includes('دواء') || storeCat.includes('طبي') || storeCat.includes('صحة') || storeCat.includes('علاج');
        }
        if (cat === 'مخبوزات') {
          return storeCat.includes('مخبز') || storeCat.includes('مخبوزات') || storeCat.includes('حلويات') || storeCat.includes('معجنات') || storeCat.includes('كيك') || storeCat.includes('أفران');
        }
        if (cat === 'مقاهي') {
          return storeCat.includes('مقهى') || storeCat.includes('مقاهي') || storeCat.includes('كافيه') || storeCat.includes('بن') || storeCat.includes('قهوة') || storeCat.includes('شاي');
        }
        if (cat === 'خضار') {
          return storeCat.includes('خضار') || storeCat.includes('فواكه') || storeCat.includes('لحم') || storeCat.includes('ملحمة') || storeCat.includes('دواجن') || storeCat.includes('طازج');
        }
        if (cat === 'خدمات') {
          return storeCat.includes('خدم') || storeCat.includes('مغسل') || storeCat.includes('صيانة') || storeCat.includes('خياط') || storeCat.includes('إلكترون') || storeCat.includes('اتصالات');
        }
        return storeCat.includes(cat);
      });
    }

    // 3. Filter by top search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.cityOrVillage.toLowerCase().includes(q) ||
          s.ownerName?.toLowerCase().includes(q) ||
          ((s as any).category && (s as any).category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [allStores, locationFilterMode, userCoords, maxDistanceKm, selectedVillage, searchQuery, selectedCategory]);

  // Currently active selected store target with merchant settings
  const activeSelectedStore = useMemo(() => {
    if (selectedStoreId === 'default') {
      return {
        id: 'default',
        name: settings.storeName || 'متجر قريتي',
        phone: settings.phone || '',
        village: settings.address || '',
        freeDelivery: settings.freeDelivery ?? false,
        freeDeliveryMinOrder: settings.freeDeliveryMinOrder,
        deliveryFee: settings.deliveryFee ?? 10,
        isPro: true,
      };
    }
    const found = allStores.find((s) => s.id === selectedStoreId);
    if (found) {
      return {
        ...found,
        id: found.id,
        name: found.name,
        phone: found.phone,
        village: found.cityOrVillage,
        freeDelivery: found.freeDelivery ?? false,
        freeDeliveryMinOrder: found.freeDeliveryMinOrder,
        deliveryFee: found.deliveryFee ?? 10,
      };
    }
    return {
      id: 'default',
      name: settings.storeName || 'متجر قريتي',
      phone: settings.phone || '',
      village: settings.address || '',
      freeDelivery: settings.freeDelivery ?? false,
      freeDeliveryMinOrder: settings.freeDeliveryMinOrder,
      deliveryFee: settings.deliveryFee ?? 10,
      isPro: false,
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

  // Customer direct confirmation handler (تأكيد استلام الطلب من العميل مباشرة)
  const handleCustomerConfirmReceipt = (orderId: string) => {
    const res = verifyAndCompleteDeliveryOrder({
      orderId,
      isDirectCustomerConfirmation: true,
      manualBypassReason: 'تأكيد مباشر من العميل في واجهة التطبيق',
    });
    if (res.success && res.order) {
      setTrackedOrder(res.order);
    }
  };

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
    if (!activeCustomer || !activeCustomer.name || !activeCustomer.phone) {
      alert('⚠️ يرجى تسجيل الدخول أو إنشاء حساب عميل أولاً للتمكن من إضافة المنتجات إلى السلة والتسوق.');
      setShowCustomerAuthModal(true);
      return;
    }

    // Strict Gatekeeping: Only approved/verified customers are permitted to buy or add to cart
    if (!isCustomerApproved(activeCustomer)) {
      alert('⏳ حسابك قيد مراجعة وتدقيق الهوية (KYC):\nتم تسجيل بياناتك بنجاح، وبمجرد اعتماد حسابك وتوثيق الهوية من قِبل إدارة القرية/المطور، سيُتاح لك فوراً إضافة المنتجات إلى السلة والشراء وإتمام الطلبات بأمان.');
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

  // Check if active store offers free delivery based on merchant settings and cart amount
  const isSelectedStoreFreeDelivery = useMemo(() => {
    if (activeSelectedStore.freeDelivery) {
      if (activeSelectedStore.freeDeliveryMinOrder && activeSelectedStore.freeDeliveryMinOrder > 0) {
        return totalCartPrice >= activeSelectedStore.freeDeliveryMinOrder;
      }
      return true;
    }
    if ((activeSelectedStore as any).promoTag?.includes('توصيل مجاني')) {
      return true;
    }
    if (selectedStoreId === 'default' && settings.freeDelivery) {
      if (settings.freeDeliveryMinOrder && settings.freeDeliveryMinOrder > 0) {
        return totalCartPrice >= settings.freeDeliveryMinOrder;
      }
      return true;
    }
    return false;
  }, [activeSelectedStore, totalCartPrice, selectedStoreId, settings]);

  const activeDeliveryFee = isSelectedStoreFreeDelivery ? 0 : (activeSelectedStore.deliveryFee ?? 10);

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

    if (!activeCustomer || !isCustomerApproved(activeCustomer)) {
      alert('⏳ تنبيه: لا يمكن إتمام وإرسال الطلب إلا بعد اعتماد وتوثيق الهوية من قِبل إدارة المنصة. حسابك حالياً بانتظار الاعتماد الرسمي لضمان أمان القرية.');
      return;
    }

    const validName = customerName.trim() || 'عميل المتجر';
    const validPhone = customerPhone.trim() || (customStorePhone || '05xxxxxxxx');
    const validAddress = customerAddress.trim() || (settings.address ? `حي ${settings.address}` : 'القرية');
    const deliveryFee = activeDeliveryFee;
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

      {/* ================================================================= */}
      {/* TOP HEADER: شريط علوي موحد متناسق مع هوية شجرة البن */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Start (Right in RTL): Menu & Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Menu Button (فتح القائمة والخيارات الجانبية) */}
            <button
              type="button"
              onClick={() => setIsSideMenuOpen(true)}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white transition-all flex items-center justify-center border border-slate-700/80 shadow-xs cursor-pointer active:scale-95"
              title="القائمة الرئيسية"
              aria-label="القائمة الرئيسية"
            >
              <Menu className="w-5 h-5 text-emerald-400" />
            </button>

            {/* Notifications Button (الإشعارات والتنبيهات) */}
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 sm:p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white transition-all flex items-center justify-center border border-slate-700/80 shadow-xs cursor-pointer active:scale-95"
              title="الإشعارات وتنبيهات الطلبات"
              aria-label="الإشعارات"
            >
              <Bell className="w-5 h-5 text-amber-400" />
              {trackedOrder && trackedOrder.status !== 'CANCELLED' && trackedOrder.status !== 'DELIVERED' ? (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping ring-2 ring-slate-900" />
              ) : trackedOrder && trackedOrder.status === 'DELIVERED' ? (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              ) : (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-500 ring-2 ring-slate-900" />
              )}
            </button>
          </div>

          {/* Center: Logo (Coffee Tree) & App Branding */}
          <div
            onClick={() => {
              setSelectedStoreId('default');
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="الرئيسية - قريتي"
          >
            <CoffeeTreeLogo size={36} />
            <div className="flex flex-col text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <h1 className="font-black text-base sm:text-lg text-white leading-none tracking-tight group-hover:text-emerald-400 transition-colors">
                  قريتي
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {selectedVillage === 'ALL' ? 'المنصة الموحدة' : selectedVillage}
                </span>
              </div>
              <p className="text-[10px] text-amber-300/90 font-medium leading-tight mt-0.5">
                شجرة البن • المتاجر والخدمات
              </p>
            </div>
          </div>

          {/* End (Left in RTL): Shopping Cart & Customer Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Active Order Tracker Shortcut (if active) */}
            {trackedOrder && trackedOrder.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => setIsTrackingModalOpen(true)}
                className={`hidden md:flex px-2.5 py-1.5 rounded-xl border text-xs font-bold items-center gap-1.5 transition-all shadow-xs ${
                  trackedOrder.status === 'DELIVERED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                }`}
                title={trackedOrder.status === 'DELIVERED' ? 'تم استلام الطلب بنجاح' : 'متابعة حالة الطلب الحالي'}
              >
                {trackedOrder.status === 'DELIVERED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px]">تم استلام الطلب ✓</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="text-[11px]">متابعة طلبي</span>
                  </>
                )}
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 sm:px-3 sm:py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              title="فتح سلة التسوق"
            >
              <ShoppingCart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden sm:inline">السلة</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-none animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Customer Account Button */}
            <button
              type="button"
              onClick={() => {
                if (!activeCustomer) {
                  setShowCustomerAuthModal(true);
                } else {
                  setIsCustomerHubOpen(true);
                }
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white transition-all flex items-center justify-center border border-slate-700/80 cursor-pointer shadow-xs active:scale-95"
              title={activeCustomer ? activeCustomer.name : 'تسجيل الدخول / حساب العميل'}
            >
              {activeCustomer ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[11px]">
                  {activeCustomer.name.slice(0, 1)}
                </div>
              ) : (
                <User className="w-5 h-5 text-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* SEARCH BAR (شريط البحث الواسع المرن في منتصف الشاشة) */}
      {/* ================================================================= */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-3.5 pb-1">
        <div className="relative flex items-center w-full shadow-lg rounded-2xl bg-slate-900/90 border border-slate-800/90 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-1">
          <div className="pr-3 text-emerald-400 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن المتاجر والخدمات في قريتك..."
            className="w-full bg-transparent border-none py-2 px-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Village Filter Badge Button */}
          <button
            type="button"
            onClick={() => setIsLocationSelectorModalOpen(true)}
            className="pl-2 shrink-0 flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
            title="تحديد أو تغيير الموقع"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate max-w-[120px]">{selectedVillage === 'ALL' ? 'كل القرى' : selectedVillage}</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* LOCATION & NEARBY FILTER BAR (شريط تحديد الموقع والمتاجر القريبة) */}
      {/* ================================================================= */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-1 pb-1">
        <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-md flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-2 rounded-xl shrink-0 ${selectedVillage === 'ALL' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
              <MapPin className={`w-4 h-4 ${selectedVillage !== 'ALL' ? 'animate-bounce' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400">النطاق الجغرافي:</span>
                <span className="text-xs font-black text-white truncate">
                  {selectedVillage === 'ALL' ? '🌐 جميع المتاجر (كافة المناطق)' : `📍 ${selectedVillage}`}
                </span>
                {selectedVillage !== 'ALL' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    المتاجر القريبة منك فقط
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    عرض الكل
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {selectedVillage === 'ALL'
                  ? 'يتم عرض جميع المتاجر. يمكنك تحديد موقعك لحصر البقالات القريبة منك فقط.'
                  : `يتم حصر البقالات والمتاجر في نطاق ${selectedVillage}. اضغط "عرض الكل" لرؤية باقي المناطق.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 mr-auto">
            {selectedVillage !== 'ALL' && (
              <button
                type="button"
                onClick={handleShowAllStores}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5 shadow-xs active:scale-95"
                title="عرض جميع المتاجر والقرى"
              >
                <span>عرض جميع المتاجر 🌐</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDetectGPSLocation}
              disabled={isLocatingGPS}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 border ${
                isLocatingGPS
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                  : selectedVillage !== 'ALL'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-950/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-emerald-500/20'
              }`}
              title="تحديد الموقع المباشر عبر الـ GPS"
            >
              {isLocatingGPS ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ التحديد...</span>
                </>
              ) : (
                <>
                  <LocateFixed className="w-3.5 h-3.5" />
                  <span>تحديد موقعي (GPS)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsLocationSelectorModalOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1 shadow-xs active:scale-95"
              title="اختيار القرية أو المنطقة يدوياً"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">تغيير</span>
            </button>
          </div>
        </div>

        {/* Location feedback banner/toast */}
        {locationToast && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{locationToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocationToast(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* HORIZONTAL SCROLL CATEGORIES (الأقسام الأفقية بأيقونات دائرية ملونة) */}
      {/* ================================================================= */}
      <div className="max-w-6xl mx-auto w-full px-4 pt-2 pb-1">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {[
            { id: 'ALL', name: 'الكل', emoji: '🏪', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
            { id: 'مغذي', name: 'مغذي وبقالة', emoji: '🛒', bg: 'bg-green-500/20 text-green-300 border-green-500/40' },
            { id: 'مطاعم', name: 'مطاعم', emoji: '🍔', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
            { id: 'مخبوزات', name: 'مخبوزات', emoji: '🥐', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
            { id: 'صيدليات', name: 'صيدليات', emoji: '💊', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
            { id: 'مقاهي', name: 'مقاهي وبن', emoji: '☕', bg: 'bg-amber-900/40 text-amber-200 border-amber-600/50' },
            { id: 'خضار', name: 'خضار وفواكه', emoji: '🍎', bg: 'bg-lime-500/20 text-lime-300 border-lime-500/40' },
            { id: 'خدمات', name: 'خدمات سريعة', emoji: '⚡', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
          ].map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (selectedCategory === cat.id && cat.id !== 'ALL') {
                    setSelectedCategory('ALL');
                  } else {
                    setSelectedCategory(cat.id);
                  }
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
              >
                <div
                  className={`w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center text-xl sm:text-2xl border-2 transition-all shadow-md group-hover:scale-105 active:scale-95 ${
                    isCatActive
                      ? 'border-emerald-400 bg-emerald-500/25 ring-3 ring-emerald-500/30 shadow-emerald-500/20'
                      : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                </div>
                <span
                  className={`text-[11px] sm:text-xs transition-colors text-center whitespace-nowrap ${
                    isCatActive ? 'text-emerald-400 font-black' : 'text-slate-300 group-hover:text-white font-medium'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-4 pb-28 flex flex-col gap-5">
        {/* Promotional Ads & Offers Banner */}
        <StoreAdsBanner currentVillage={selectedVillage} isRTL={isRTL} />

        {/* Prayer Time Closed Banner (if active) */}
        <StorePrayerClosedBanner isRTL={isRTL} />

        {/* ================================================================= */}
        {/* VILLAGES & STORES DIRECTORY (الموقع هو الذي يحدد المتاجر القريبة أو جميع المتاجر) */}
        {/* ================================================================= */}
        {selectedStoreId === 'default' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-3 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1">
                {/* Mode 1: المتاجر القريبة حسب موقع المستخدم */}
                <button
                  type="button"
                  onClick={() => {
                    setLocationFilterMode('NEARBY');
                    if (!userCoords) {
                      handleDetectGPSLocation();
                    } else {
                      setLocationToast('📍 تظهر المتاجر القريبة من موقعك مرتبة بالأقرب');
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border shadow-sm ${
                    locationFilterMode === 'NEARBY'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <LocateFixed className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin' : ''}`} />
                  <span>المتاجر القريبة مني (حسب موقعك)</span>
                  {userCoords && (
                    <span className="w-2 h-2 rounded-full bg-slate-950 shrink-0" />
                  )}
                </button>

                {/* Mode 2: جميع المتاجر */}
                <button
                  type="button"
                  onClick={handleShowAllStores}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer border shadow-sm ${
                    locationFilterMode === 'ALL'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>جميع المتاجر (الكل)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                    {allStores.length}
                  </span>
                </button>

                {/* Distance Radius Filter (Only in NEARBY mode when GPS detected) */}
                {locationFilterMode === 'NEARBY' && userCoords && (
                  <div className="flex items-center gap-1 mr-2">
                    <span className="text-[11px] text-slate-400 font-bold shrink-0">النطاق:</span>
                    {[
                      { label: 'الأقرب', val: 0 },
                      { label: '5 كم', val: 5 },
                      { label: '10 كم', val: 10 },
                      { label: '25 كم', val: 25 },
                    ].map((radius) => (
                      <button
                        key={radius.val}
                        type="button"
                        onClick={() => setMaxDistanceKm(radius.val)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                          maxDistanceKm === radius.val
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {radius.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 hidden sm:flex items-center gap-1.5 shrink-0 font-medium">
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>{availableStores.length} متجر متاح</span>
              </div>
            </div>

            {/* Section Header - المتاجر القريبة حسب الموقع أو كل المتاجر */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-400" />
                  <span>
                    {locationFilterMode === 'NEARBY'
                      ? (userCoords
                          ? `المتاجر القريبة من موقعك (${selectedVillage !== 'ALL' ? selectedVillage : 'الموقع الحالي'})`
                          : 'المتاجر القريبة حسب الموقع')
                      : 'جميع المتاجر والخدمات المتاحة'}
                  </span>
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {availableStores.length} متجر
                </span>
                {locationFilterMode === 'NEARBY' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{userCoords ? 'فرز حسب الأقرب لموقعك أولاً' : 'تحديد الموقع بالـ GPS'}</span>
                  </span>
                )}
                {selectedCategory !== 'ALL' && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    قسم: {selectedCategory}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {locationFilterMode === 'NEARBY' && !userCoords ? (
                  <button
                    type="button"
                    onClick={handleDetectGPSLocation}
                    disabled={isLocatingGPS}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>تحديد موقعي الآن 📍</span>
                  </button>
                ) : locationFilterMode === 'NEARBY' ? (
                  <button
                    type="button"
                    onClick={handleShowAllStores}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>عرض كافة المتاجر ({allStores.length}) ←</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Stores Grid or Clean Empty State */}
            {availableStores.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                  <Store className="w-8 h-8" />
                </div>
                <div className="max-w-lg mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-white">
                    {locationFilterMode === 'NEARBY'
                      ? 'لا توجد متاجر مسجلة قريبة من موقعك حالياً'
                      : 'لا توجد متاجر مسجلة في المنصة حالياً'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    تمت تهيئة وفرمتة التطبيق بنجاح. التطبيق جديد كلياً ونظيف من أي بيانات تجريبية أو وهمية. بإمكان التجار وأصحاب المحلات والأنشطة تسجيل محلاتهم ومواقعهم الآن لتظهر تلقائياً للعملاء القريبين حسب الموقع الجغرافي.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuthModal) {
                        onOpenAuthModal('MERCHANT');
                      } else {
                        onOpenMerchantPortal();
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل متجر جديد الآن 🏪</span>
                  </button>
                  {locationFilterMode === 'NEARBY' && (
                    <button
                      type="button"
                      onClick={handleShowAllStores}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-slate-700 shadow-sm active:scale-95"
                    >
                      <Layers className="w-4 h-4" />
                      <span>عرض جميع المتاجر ({allStores.length}) 🌐</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDetectGPSLocation}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border border-amber-500/30 shadow-sm active:scale-95"
                  >
                    <LocateFixed className="w-4 h-4" />
                    <span>تحديث موقعي (GPS) 📍</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {availableStores.map((st) => {
                    const ratingVal = st.rating || 4.8;
                    const ratingCount = st.ratingCount || 24;
                    const storeCover = (st as any).coverPhoto || (st as any).storeCover || (st as any).cover || (st as any).photo || null;
                    const storeLogo = (st as any).logo || (st as any).storeLogo || (st as any).photo || null;
                    const storeIcon = (st as any).storeIcon || null;
                    const storeTagline = (st as any).tagline || null;
                    const promoTag = (st as any).promoTag || (st.isPro ? 'توصيل سريع' : 'متوفر الآن');
                    const liveStatus = getStoreLiveStatus(st, settings);
                    const isFreeDelivery = Boolean(
                      st.freeDelivery ||
                      (st as any).promoTag?.includes('توصيل مجاني') ||
                      (st.id === 'store-alrezq') ||
                      (selectedStoreId === 'default' && st.id === selectedStoreId && settings.freeDelivery)
                    );

                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setSelectedStoreId(st.id);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-800/90 bg-[#151821] hover:bg-[#1a1e2b] hover:border-emerald-500/60 shadow-lg hover:shadow-2xl transition-all cursor-pointer flex flex-col items-center text-center group hover:-translate-y-1 relative overflow-hidden"
                      >
                        {/* Top Cover Banner with Centered Floating Logo Badge */}
                        <div className="w-full h-28 sm:h-32 rounded-xl sm:rounded-2xl relative overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group-hover:scale-[1.02] transition-transform">
                          {storeCover ? (
                            <img
                              src={storeCover}
                              alt={st.name}
                              className="w-full h-full object-cover brightness-[0.7] group-hover:brightness-[0.8] transition-all"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/60" />
                          )}

                          {/* Floating Store Logo Badge (Central White Tile like in Screenshot) */}
                          <div className="absolute inset-0 m-auto w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white shadow-2xl p-1.5 flex items-center justify-center text-slate-900 font-black border border-white/50 group-hover:scale-110 transition-transform z-10">
                            {storeLogo && (storeLogo.startsWith('http') || storeLogo.startsWith('data:image')) ? (
                              <img
                                src={storeLogo}
                                alt={st.name}
                                className="w-full h-full object-contain rounded-xl"
                              />
                            ) : storeLogo || storeIcon ? (
                              <span className="text-2xl sm:text-3xl select-none" role="img" aria-label="store icon">
                                {storeLogo || storeIcon}
                              </span>
                            ) : (
                              <div className="flex flex-col items-center justify-center">
                                <Store className="w-6 h-6 text-emerald-600" />
                              </div>
                            )}
                          </div>

                          {/* Free Delivery Badge (شارة توصيل مجاني بناءً على إعدادات التاجر) */}
                          {isFreeDelivery && (
                            <span className="absolute top-2 left-2 text-[9px] sm:text-[10px] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white font-black px-2 py-0.5 rounded-lg shadow-lg z-10 flex items-center gap-1 border border-emerald-400/40 animate-pulse">
                              <Truck className="w-3 h-3 text-emerald-100" />
                              <span>توصيل مجاني 🛵</span>
                            </span>
                          )}

                          {/* Pro/Verified Badge */}
                          {st.isPro && (
                            <span className="absolute top-2 right-2 text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md shadow-md z-10">
                              👑 معتمد
                            </span>
                          )}
                        </div>

                        {/* Store Info & Status */}
                        <div className="w-full mt-2.5 flex flex-col items-center">
                          {/* Store Name */}
                          <h4 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition-colors line-clamp-1 w-full text-center">
                            {st.name}
                          </h4>

                          {/* Tagline if configured */}
                          {storeTagline && (
                            <p className="text-[10px] text-emerald-400/90 font-medium line-clamp-1 w-full text-center mt-0.5">
                              {storeTagline}
                            </p>
                          )}

                          {/* Live Status (مفتوح الآن / مغلق) */}
                          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold">
                            <span className={`w-2 h-2 rounded-full ${liveStatus.dotColor}`} />
                            <span className={liveStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'}>
                              {liveStatus.badgeText}
                            </span>
                          </div>

                          {/* Free Delivery Tag or Promo Tag */}
                          {isFreeDelivery ? (
                            <div className="mt-1 flex items-center justify-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <Truck className="w-3 h-3 text-emerald-400" />
                                <span>توصيل مجاني</span>
                                {st.freeDeliveryMinOrder ? ` (+${st.freeDeliveryMinOrder} ${settings.currency || 'ر.س'})` : ''}
                              </span>
                            </div>
                          ) : (
                            promoTag && (
                              <div className="text-[11px] text-slate-300 font-medium mt-0.5 line-clamp-1">
                                {promoTag}
                              </div>
                            )
                          )}

                          {/* Rating */}
                          <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1 mt-1 font-mono">
                            <span>⭐ {ratingVal.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-500 font-normal">({ratingCount})</span>
                          </div>

                          {/* Location & Distance Badge (المسافة والموقع الجغرافي) */}
                          <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium w-full px-1">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[100px]">{st.cityOrVillage || st.address || 'موقع مسجل'}</span>
                            {st.distanceKm !== undefined && (
                              <span className="font-bold text-amber-300 font-mono text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 shrink-0 mr-auto">
                                {formatDistanceDisplay(st.distanceKm)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* Customer Pending Verification Notice (only if pending) */}
        {activeCustomer && !isCustomerApproved(activeCustomer) && (
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <strong className="text-amber-300 block text-xs">حسابك قيد مراجعة وتدقيق الهوية (KYC) ⏳</strong>
                <span className="text-[11px] text-amber-200/90">
                  بمجرد اعتماد وتوثيق الهوية، سيُتاح لك فوراً إضافة المنتجات إلى السلة وإتمام الطلبات.
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-600/30 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40 shrink-0">
              قيد التدقيق
            </span>
          </div>
        )}

        {/* ================================================================= */}
        {/* PRODUCTS CATALOG: لا تظهر إلا إذا ضغط المستخدم على المتجر واختاره */}
        {/* ================================================================= */}
        {selectedStoreId !== 'default' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Active Selected Store Header Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg border border-white/80 p-1 overflow-hidden">
                  {(() => {
                    const activeLogo = (activeSelectedStore as any).logo || (activeSelectedStore as any).storeLogo;
                    const activeIcon = (activeSelectedStore as any).storeIcon;
                    if (activeLogo && (activeLogo.startsWith('http') || activeLogo.startsWith('data:image'))) {
                      return (
                        <img
                          src={activeLogo}
                          alt={activeSelectedStore.name}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      );
                    }
                    if (activeLogo || activeIcon) {
                      return (
                        <span className="text-2xl sm:text-3xl select-none" role="img">
                          {activeLogo || activeIcon}
                        </span>
                      );
                    }
                    return <Store className="w-7 h-7 text-emerald-600" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-xs">
                      قائمة منتجات المتجر 🛍️
                    </span>
                    <span className="text-xs text-amber-300 font-bold">
                      📍 {activeSelectedStore.village}
                    </span>
                    {isSelectedStoreFreeDelivery && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 border border-emerald-400 flex items-center gap-1 shadow-sm">
                        <Truck className="w-3 h-3 text-slate-950" />
                        <span>توصيل مجاني 🛵</span>
                        {activeSelectedStore.freeDeliveryMinOrder ? ` (فوق ${activeSelectedStore.freeDeliveryMinOrder} ${settings.currency || 'ر.س'})` : ''}
                      </span>
                    )}
                    {(() => {
                      const currentStoreObj = allStores.find((s) => s.id === selectedStoreId) || (activeSelectedStore as any);
                      const status = getStoreLiveStatus(currentStoreObj, settings);
                      return (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-xs ${status.badgeBg} ${status.badgeBorder} ${status.badgeTextClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                          <span>{status.badgeText}</span>
                          {status.detailText && (
                            <span className="opacity-85 text-[9px] font-normal border-r border-current/20 pr-1 mr-0.5">
                              {status.detailText}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                    {activeSelectedStore.name}
                  </h3>
                  {(activeSelectedStore as any).tagline && (
                    <p className="text-[11px] text-emerald-300/90 font-medium truncate mt-0.5">
                      {(activeSelectedStore as any).tagline}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStoreId('default')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-emerald-500/30 shadow-md shrink-0 flex items-center gap-1.5 active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لقائمة المتاجر</span>
              </button>
            </div>

            {/* Products List Controls Header */}
            <div className="flex items-center justify-between gap-3 pt-1 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  أصناف المتجر ({filteredItems.length}):
                </h4>
                {selectedCategory !== 'ALL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    قسم: {selectedCategory}
                  </span>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                />
                <span>المتوفر فقط</span>
              </label>
            </div>

            {/* Products Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800/80 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">لا توجد منتجات مطابقة لهذا المتجر</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  جرب إزالة تحديد المتوفر فقط أو تغيير تصنيف البحث.
                </p>
              </div>
            ) : (
              <div
                id="products-container"
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3.5 sm:gap-4"
              >
                {filteredItems.map((item) => {
                  const inCart = cart[item.id];
                  const isAvailable = item.quantity > 0 && item.available !== false;
                  const currency = settings.currency || 'ر.س';
                  const productImage = item.image || item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/95 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md relative group"
                    >
                      <div>
                        {/* Product Image & Badges */}
                        <div className="relative w-full h-32 sm:h-40 mb-3 rounded-xl overflow-hidden bg-slate-950/80 border border-slate-800">
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
                    <span>أجرة التوصيل:</span>
                    {isSelectedStoreFreeDelivery ? (
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-emerald-400" />
                        <span>مجاني 🎉</span>
                        <span className="line-through text-slate-500 text-[10px] mr-1">10.00 {settings.currency || 'ر.س'}</span>
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-400">
                        {activeDeliveryFee.toFixed(2)} {settings.currency || 'ر.س'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-sm font-extrabold text-white">
                    <span>المجموع الكلي:</span>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      {(totalCartPrice + activeDeliveryFee).toFixed(2)} {settings.currency || 'ر.س'}
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
              {/* Interactive Live Mini-Map */}
              <OrderDeliveryMiniMap
                order={trackedOrder}
                settings={settings}
                isRTL={isRTL}
                defaultExpanded={true}
              />

              {/* Customer Secure Handover PIN & Confirmation Card */}
              {trackedOrder.status !== 'DELIVERED' ? (
                <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-emerald-950/30 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-white">
                        كود تسليم الشحنة للسائق (Handover PIN)
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-black">
                      خاص بك 🔐
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                    <div className="text-[11px] text-slate-400 mb-1">
                      أعطِ هذا الكود السري للسائق عند وصوله إلى باب بيتك لاستلام طلبك:
                    </div>
                    <div className="font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-[0.35em] py-1 select-all">
                      {trackedOrder.deliveryPin || '---'}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 text-center leading-relaxed">
                    🛡️ هذا الكود يحميك ويحفظ حق السائق والتاجر، ولا تسلّمه إلا بعد معاينة الأغراض.
                  </p>

                  <button
                    type="button"
                    onClick={() => handleCustomerConfirmReceipt(trackedOrder.id)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>أؤكد أنني استلمت طلبي كاملاً وسليماً الآن ✅</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-4 text-center space-y-2 animate-in fade-in">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <h4 className="font-black text-sm text-white">تم تسليم وتأكيد استلام طلبك بنجاح! 🎉</h4>
                  <p className="text-xs text-emerald-300/90">
                    {trackedOrder.deliveryVerificationNotes || 'تم التحقق من اكتمال التوصيل وحفظ حقوق السائق والتاجر والعميل.'}
                  </p>
                </div>
              )}

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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl max-w-md w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 my-auto"
          >
            {/* Modal Header */}
            <div className="shrink-0 p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">تسجيل بيانات العميل</h3>
                  <p className="text-[11px] text-slate-400">
                    الاسم ورقم الجوال والقرية لتوصيل الطلبات بدقة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCustomerAuthModal(false);
                  setCustomerModalError(null);
                  setCustomerModalSuccess(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCustomerModalError(null);
                setCustomerModalSuccess(null);

                if (!custModalName.trim() || !custModalPhone.trim() || !custModalNationalId.trim()) {
                  setCustomerModalError('يرجى تعبئة الحقول الإلزامية: الاسم الكامل، رقم الجوال، ورقم بطاقة الأحوال');
                  return;
                }
                const res = await registerCustomerRecord({
                  name: custModalName.trim(),
                  phone: custModalPhone.trim(),
                  nationalId: custModalNationalId.trim(),
                  housePhoto: custModalHousePhoto.trim() || '',
                  idVerificationPhoto: custModalIdPhoto,
                  password: custModalPassword.trim() || 'user123',
                  village: custModalVillage.trim() || (selectedVillage !== 'ALL' ? selectedVillage : 'الموقع المحدد'),
                });

                if (!res.success) {
                  setCustomerModalError(res.message);
                  return;
                }

                // If user selected a village during customer registration, sync it
                if (custModalVillage.trim()) {
                  setSelectedVillage(custModalVillage.trim());
                }

                setCustomerModalSuccess(res.message);
                setTimeout(() => {
                  setShowCustomerAuthModal(false);
                  setCustomerModalError(null);
                  setCustomerModalSuccess(null);
                }, 1200);
              }}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3"
            >
              {customerModalError && (
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{customerModalError}</span>
                </div>
              )}

              {customerModalSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-600/80 text-emerald-200 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{customerModalSuccess}</span>
                </div>
              )}

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
                  placeholder="مثال: 1088998877"
                  value={custModalNationalId}
                  onChange={(e) => setCustModalNationalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  رفع صورة الهوية الوطنية (اختياري)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setCustModalIdPhoto(ev.target?.result as string || '');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 cursor-pointer"
                />
                {custModalIdPhoto && (
                  <div className="mt-1 text-[10px] text-emerald-400 font-bold">
                    ✓ تم إرفاق صورة الهوية الوطنية بنجاح
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">الموقع / الحي / العنوان *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={custModalVillage || (selectedVillage !== 'ALL' && selectedVillage !== 'موقعك الحالي' ? selectedVillage : '')}
                    onChange={(e) => setCustModalVillage(e.target.value)}
                    placeholder="اكتب اسم الحي أو المدينة أو موقعك"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleDetectGPSLocation}
                    className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    title="تحديد الموقع الجغرافي عبر GPS"
                  >
                    <LocateFixed className="w-3.5 h-3.5" />
                    <span>GPS</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  حفظ وتسجيل البيانات ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerAuthModal(false);
                    setCustomerModalError(null);
                    setCustomerModalSuccess(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
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

      {/* Customer Account Hub Modal (حساب العميل المتكامل) */}
      {isCustomerHubOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right relative">
            <button
              onClick={() => setIsCustomerHubOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-lg">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">حساب العميل</h3>
                <p className="text-xs text-emerald-400 font-bold">مرحباً بك، {activeCustomer?.name || 'العميل الكريم'}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">رقم الجوال:</span>
                <span className="text-white font-mono font-bold" dir="ltr">{activeCustomer?.phone || 'غير مسجل'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">القرية التابع لها:</span>
                <span className="text-white font-bold">{activeCustomer?.village || 'غير محدد'}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">حالة الاعتماد (KYC):</span>
                <span className={activeCustomer?.isApproved ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {activeCustomer?.isApproved ? 'معتمد رسمياً ✓' : 'قيد المراجعة ⏳'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomerHubOpen(false);
                  setIsTrackingModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>تتبع الطلبات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCustomerHubOpen(false);
                  setIsWalletModalOpen(true);
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>محفظة القرية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCustomerHubOpen(false);
                  handleShareStoreLink();
                }}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-teal-400" />
                <span>مشاركة التطبيق</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clearActiveCustomer();
                  setActiveCustomer(null);
                  setIsCustomerHubOpen(false);
                }}
                className="p-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/55 border border-rose-800 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/40 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {settings.storeName || 'متجر قريتي'} © {new Date().getFullYear()} - منصة تصفح وطلب المنتجات
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenAuthModal ? onOpenAuthModal('DEVELOPER') : onOpenLanding()}
              className="px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-700/50 text-purple-300 transition-all text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="لوحة تحكم المطور الشاملة (تحكم كامل: المتاجر، التجار، السائقين، العملاء، الطلبات)"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>لوحة المطور الشاملة 🛡️</span>
            </button>
            <button
              type="button"
              onClick={onOpenLanding}
              className="text-slate-400 hover:text-emerald-400 transition-colors text-xs cursor-pointer flex items-center gap-1.5"
              title="دخول التجار ومندوبي التوصيل وإدارة المتاجر"
            >
              <Store className="w-3.5 h-3.5 text-slate-500" />
              <span>بوابة التجار والمناديب 🔑</span>
            </button>
          </div>
        </div>
      </footer>

      {/* ================================================================= */}
      {/* FIXED BOTTOM NAVIGATION BAR: شريط التنقل السفلي الثابت والأنيق */}
      {/* ================================================================= */}
      <nav
        aria-label="شريط التنقل السفلي"
        className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] py-2 px-3 sm:px-6"
      >
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Home */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('home');
              setSelectedStoreId('default');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeBottomNav === 'home' && selectedStoreId === 'default'
                ? 'text-emerald-400 font-black scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Store className="w-5 h-5" />
              {activeBottomNav === 'home' && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </div>
            <span className="text-[10px]">الرئيسية</span>
          </button>

          {/* Orders / Live Tracker */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('orders');
              if (trackedOrder && trackedOrder.status !== 'CANCELLED') {
                setIsTrackingModalOpen(true);
              } else {
                setIsLiveTrackerOpen(true);
              }
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
              activeBottomNav === 'orders' ? 'text-amber-400 font-black scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Truck className="w-5 h-5" />
              {trackedOrder && trackedOrder.status !== 'CANCELLED' && trackedOrder.status !== 'DELIVERED' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-[10px]">الطلبات</span>
          </button>

          {/* Village Wallet */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('wallet');
              setIsWalletModalOpen(true);
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeBottomNav === 'wallet' ? 'text-emerald-400 font-black scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px]">المحفظة</span>
          </button>

          {/* Shopping Cart */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('cart');
              setIsCartOpen(true);
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer relative ${
              activeBottomNav === 'cart' ? 'text-teal-400 font-black scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black leading-none animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">السلة</span>
          </button>

          {/* Customer Profile / Account */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomNav('profile');
              if (activeCustomer) {
                setIsCustomerHubOpen(true);
              } else {
                setShowCustomerAuthModal(true);
              }
            }}
            className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
              activeBottomNav === 'profile' ? 'text-emerald-400 font-black scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              {activeCustomer ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-[10px]">
                  {activeCustomer.name.slice(0, 1)}
                </div>
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <span className="text-[10px]">{activeCustomer ? 'حسابي' : 'دخول'}</span>
          </button>
        </div>
      </nav>

      {/* ================================================================= */}
      {/* SIDE MENU DRAWER MODAL: قائمة جانبية أنيقة لسهولة التنقل */}
      {/* ================================================================= */}
      {isSideMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-start animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xs h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <CoffeeTreeLogo size={32} />
                  <div>
                    <h3 className="font-black text-white text-base leading-none">قريتي</h3>
                    <p className="text-[10px] text-amber-300 font-medium mt-0.5">منصة القرى والمتاجر الرقمية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSideMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer Profile Status */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
                {activeCustomer ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-white">{activeCustomer.name}</div>
                      <div className="text-[10px] text-emerald-400 font-mono" dir="ltr">{activeCustomer.phone}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      معتمد ✓
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSideMenuOpen(false);
                      setShowCustomerAuthModal(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold transition-all text-center border border-emerald-500/30 cursor-pointer"
                  >
                    تسجيل الدخول / إنشاء حساب عميل
                  </button>
                )}
              </div>

              {/* Navigation Items */}
              <div className="space-y-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    setSelectedStoreId('default');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>الرئيسية (كافة المتاجر)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    setIsLiveTrackerOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>تتبع طلباتي الحية</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    setIsWalletModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>محفظة القرية الرقمية</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    setIsAIModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <span>المساعد الذكي للقرية</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    handleShareStoreLink();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-teal-400" />
                  <span>مشاركة رابط المنصة</span>
                </button>
              </div>

              {/* Portal Links */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 px-1">بوابات الشركاء والعمل:</div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    onOpenMerchantPortal();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 flex items-center gap-2.5 text-xs font-bold transition-all border border-slate-800 cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>بوابة التجار وإدارة المتجر 🔑</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSideMenuOpen(false);
                    onOpenLanding();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 flex items-center gap-2.5 text-xs font-bold transition-all border border-slate-800 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  <span>لوحة البوابات الرئيسية</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center space-y-1">
              <p>منصة قريتي الرقمية الموحدة © {new Date().getFullYear()}</p>
              <p className="text-emerald-500/80">هوية شجرة البن الخولاني الأصيلة</p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* NOTIFICATIONS MODAL (الإشعارات والتنبيهات المباشرة) */}
      {/* ================================================================= */}
      {isNotificationsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right relative">
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">مركز الإشعارات</h3>
                <p className="text-xs text-slate-400">آخر المستجدات وعروض التوصيل لقرى المنصة</p>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {trackedOrder && trackedOrder.status !== 'CANCELLED' && (
                trackedOrder.status === 'DELIVERED' ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 flex items-start gap-3 shadow-md">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-black text-emerald-300">
                        تم تسليم طلبك رقم #{trackedOrder.orderNumber} بنجاح ✅
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        تم توثيق استلام الطلب رسمياً من متجر {trackedOrder.storeName}. نشكرك لثقتك بمنصة قريتي!
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            setIsTrackingModalOpen(true);
                          }}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>عرض تفاصيل الفاتورة وتقييم المتجر والسائق ←</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.removeItem('qaryati_customer_last_order_id');
                            } catch {}
                            setTrackedOrderId(null);
                            setTrackedOrder(null);
                            setIsNotificationsOpen(false);
                          }}
                          className="text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-750 cursor-pointer inline-flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg transition-colors border border-slate-700"
                        >
                          <span>مسح وإخفاء الإشعار ✕</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 shadow-md">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div className="flex-1">
                      <div className="text-xs font-black text-amber-300">
                        {trackedOrder.status === 'NEW' && `طلبك رقم #${trackedOrder.orderNumber} قيد مراجعة وتأكيد المتجر ⏳`}
                        {trackedOrder.status === 'ACCEPTED' && `طلبك رقم #${trackedOrder.orderNumber} تم قبوله وجارٍ تجهيزه 👨‍🍳`}
                        {trackedOrder.status === 'READY_FOR_PICKUP' && `طلبك رقم #${trackedOrder.orderNumber} جاهز بانتظار استلام السائق 📦`}
                        {(trackedOrder.status === 'OUT_FOR_DELIVERY' || trackedOrder.status === 'ON_THE_WAY') && `طلبك رقم #${trackedOrder.orderNumber} في الطريق إليك مع السائق 🛵`}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {(trackedOrder.status === 'OUT_FOR_DELIVERY' || trackedOrder.status === 'ON_THE_WAY')
                          ? `السائق ${trackedOrder.driverName || 'المندوب'} في طريقه إليك الآن.`
                          : 'يمكنك متابعة المندوب والوصول لحظياً عبر شاشة التتبع المباشر.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          setIsTrackingModalOpen(true);
                        }}
                        className="mt-2 text-xs font-bold text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>فتح شاشة التتبع المباشر ←</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-white">عروض التوصيل والخصومات الحصرية</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">اطلب من كافة بقالات ومتاجر قريتك واستمتع بتوصيل فوري ودقيق لباب منزلك.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <Wallet className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-black text-white">رصيدك في محفظة القرية: {formatGlobalCurrency(walletBalance)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">يمكنك الشحن والدفع السريع بضغطة زر عند إتمام أي طلب.</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsNotificationsOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* LOCATION & GPS SELECTOR MODAL (نافذة اختيار وتحديد الموقع الجغرافي) */}
      {/* ================================================================= */}
      {isLocationSelectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5 text-right relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsLocationSelectorModalOpen(false)}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">تحديد الموقع والمتاجر القريبة</h3>
                <p className="text-xs text-slate-400">حدد موقعك لحصر البقالات الأقرب لك، أو تصفح كافة المتاجر</p>
              </div>
            </div>

            {/* Quick Action 1: GPS Auto Detect */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LocateFixed className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white">تحديد الموقع التلقائي بالـ GPS</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  دقة فورية
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                استخدم موقع جهازك الحالي للتعرف على قريتك أو منطقتك تلقائياً وعرض المتاجر المحيطة بك فقط.
              </p>
              <button
                type="button"
                onClick={handleDetectGPSLocation}
                disabled={isLocatingGPS}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-emerald-950/50 active:scale-98 disabled:opacity-50"
              >
                {isLocatingGPS ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>جارٍ الاتصال بالأقمار الصناعية وقراءة الموقع...</span>
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-4 h-4" />
                    <span>📍 استخدام موقعي الحالي عبر الـ GPS</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Action 2: Show ALL stores without filter */}
            <button
              type="button"
              onClick={handleShowAllStores}
              className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedVillage === 'ALL'
                  ? 'bg-emerald-500/20 border-emerald-400 text-white font-black'
                  : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                  🌐
                </div>
                <div className="text-right">
                  <div className="text-xs font-black">عرض جميع المتاجر (كافة القرى والمناطق)</div>
                  <div className="text-[10px] text-slate-400">إلغاء التقييد الجغرافي وتصفح كل الشركاء المسجلين</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {allStores.length} متجر
              </span>
            </button>

            {/* List of Available Locations */}
            {villageList.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                  <span>المواقع والمناطق المسجلة في التطبيق:</span>
                  <span className="text-[10px]">{villageList.length} منطقة متاحة</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {villageList.map((vil) => {
                    const isSelected = selectedVillage === vil;
                    const storeCount = allStores.filter(
                      (s) => s.cityOrVillage === vil || s.cityOrVillage?.includes(vil)
                    ).length;
                    return (
                      <button
                        key={vil}
                        type="button"
                        onClick={() => handleSelectVillage(vil)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white font-black shadow-xs'
                            : 'bg-slate-950/50 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span className="text-xs truncate">{vil}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {storeCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Location Name Input */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-400">
                أو اكتب اسم موقعك / حيك يدوياً:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customVillageInput}
                  onChange={(e) => setCustomVillageInput(e.target.value)}
                  placeholder="مثال: الحي الشرقي، وسط البلد، شمال الوادي..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customVillageInput.trim()) {
                      handleSelectVillage(customVillageInput.trim());
                      setCustomVillageInput('');
                    }
                  }}
                  disabled={!customVillageInput.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
                >
                  تطبيق الموقع
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsLocationSelectorModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
