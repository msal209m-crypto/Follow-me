import React, { useState, useMemo, useEffect } from 'react';
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
  MessageCircle
} from 'lucide-react';
import { Item, StoreSettings } from '../types';

interface VillageStoreViewProps {
  items: Item[];
  settings: StoreSettings;
  isRTL: boolean;
  onOpenMerchantPortal: () => void;
  onOpenLanding: () => void;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [customStorePhone, setCustomStorePhone] = useState(settings.phone || '');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category && item.category.trim()) {
        set.add(item.category.trim());
      }
    });
    return Array.from(set);
  }, [items]);

  // Filter items (Read-Only)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
  }, [items, searchQuery, selectedCategory, onlyInStock]);

  // Cart operations
  const addToCart = (item: Item, qty = 1) => {
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
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      id="village-store-container"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white font-sans"
    >
      {/* Top Customer Store Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLanding}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="العودة لشاشة البوابات الرئيسية"
            >
              {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span className="hidden sm:inline">البوابات</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-base sm:text-lg text-white leading-tight">
                    {settings.storeName || 'متجر قريتي'}
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    مفتوح للطلب
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                  {settings.address || 'تسوق واطلب مباشرة عبر الواتساب'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Cart & Merchant Entry */}
          <div className="flex items-center gap-2">
            {/* Share Link */}
            <button
              onClick={handleShareStoreLink}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium border border-slate-700/50"
              title="مشاركة رابط المتجر لأهالي القرية"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">{copiedLink ? 'تم نسخ الرابط!' : 'مشاركة المتجر'}</span>
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>السلة</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-bold leading-none animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Merchant / Admin Door Button */}
            <button
              onClick={onOpenMerchantPortal}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors border border-slate-800 flex items-center gap-1.5 text-xs font-medium"
              title="دخول التاجر والإدارة (محمي)"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
              <span className="hidden lg:inline">بوابة التاجر</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Welcome Bar */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-slate-800/60 py-6 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            متجر القرية والعملاء - تصفح المنتجات والطلب الفوري
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            أهلاً بكم في {settings.storeName || 'متجر قريتي'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            اختر ما تحتاجه من أصناف، أضفها إلى سلتك، واضغط زر إرسال الطلب ليتواصل معك المتجر فوراً عبر الواتساب وتجهيز طلبك.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
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
                      <span>بيانات المستلم والتوصيل (اختياري للواتساب):</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">اسمك الكريم</label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: أبو محمد"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 mb-1 block">الحي أو القرية</label>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="مثال: الحي الشرقي - قرب المسجد"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">ملاحظات الطلب</label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="مثال: توصيل بعد صلاة العصر أو اتصل بي"
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

            {/* Modal Footer with Send to WhatsApp Button */}
            {cartItemsList.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-slate-400">إجمالي الحساب:</span>
                  <div className="text-xl font-extrabold text-emerald-400">
                    {totalCartPrice.toFixed(2)} {settings.currency || 'ر.س'}
                  </div>
                </div>

                <button
                  onClick={handleSendWhatsAppOrder}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/80 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                  <span>إرسال الطلب عبر الواتساب فوراً</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  سيتم فتح محادثة الواتساب مع المتجر مباشرة وتحتوي رسالة مرتبة بجميع طلباتك وإجمالي الحساب.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/40 py-5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            {settings.storeName || 'متجر قريتي'} © {new Date().getFullYear()} - منصة تصفح وطلب المنتجات
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenMerchantPortal}
              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>دخول التاجر والإدارة</span>
            </button>
            <button
              onClick={onOpenLanding}
              className="text-slate-400 hover:text-white transition-colors"
            >
              شاشة البوابات
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
