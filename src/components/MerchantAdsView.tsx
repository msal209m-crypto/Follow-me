import React, { useState, useEffect } from 'react';
import { Megaphone, Sparkles, CheckCircle2, AlertCircle, Plus, Layers, BadgeDollarSign, Calendar, ExternalLink, Clock, Image, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAds, submitAdRequest, DEFAULT_AD_PACKAGES } from '../services/adsService';
import { AdRecord } from '../types';

export const MerchantAdsView: React.FC = () => {
  const { currentUser } = useAuth();
  const merchantId = currentUser?.uid || '';
  const merchantName = currentUser?.displayName || 'التاجر المعلن';
  const merchantVillage = (currentUser as any)?.village || 'قرية الفصور';

  const [ads, setAds] = useState<AdRecord[]>([]);
  const [activePackageId, setActivePackageId] = useState(DEFAULT_AD_PACKAGES[0].id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMerchantAds = () => {
      const allAds = getAds();
      const myAds = allAds.filter((ad) => ad.merchantId === merchantId);
      setAds(myAds);
    };

    loadMerchantAds();
    window.addEventListener('qaryati:ads-updated', loadMerchantAds);
    return () => {
      window.removeEventListener('qaryati:ads-updated', loadMerchantAds);
    };
  }, [merchantId]);

  const handleSubmitAd = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('يرجى كتابة عنوان جذاب للإعلان الترويجي.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('يرجى كتابة وصف موجز ومغري لجذب العملاء.');
      return;
    }

    setLoading(true);

    const selectedPack = DEFAULT_AD_PACKAGES.find((p) => p.id === activePackageId);
    const packageName = selectedPack ? selectedPack.name : DEFAULT_AD_PACKAGES[0].name;

    setTimeout(() => {
      try {
        submitAdRequest({
          merchantId,
          storeId: merchantId, // Store matches merchant ID
          storeName: (currentUser as any)?.storeName || `متجر ${merchantName}`,
          title: title.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          packageName,
          village: merchantVillage
        });

        setSuccessMsg('تم تقديم طلب حملتك الترويجية بنجاح! تم إرسال الإعلان إلى المطور للمراجعة والتفعيل الفوري 🚀');
        setTitle('');
        setDescription('');
        setImageUrl('');
        setLinkUrl('');
      } catch (err: any) {
        setErrorMsg('حدث خطأ أثناء إرسال طلب الترويج، يرجى المحاولة مجدداً.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/25 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[150px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 z-10 relative">
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ترقية المبيعات والحضور الرقمي 📢</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">إعلانات القرية المروّجة والمدفوعة</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              اشترك في باقات الإعلانات الذكية لتعميم منتجاتك أو بقالتك في شريط الترويج الذهبي أعلى شاشات جميع العملاء والزوار والسائقين في القرية.
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shrink-0">
            <Megaphone className="w-7 h-7" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Ad Subscription Request Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>طلب إطلاق حملة ترويجية جديدة</span>
            </h3>

            {/* Error and Success Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAd} className="space-y-4">
              
              {/* Select Package Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">1. اختر باقة الاشتراك للإعلان الترويجي:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEFAULT_AD_PACKAGES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePackageId(p.id)}
                      className={`p-3.5 rounded-2xl text-right border transition-all flex flex-col justify-between h-32 relative ${activePackageId === p.id ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900'}`}
                    >
                      <div>
                        <span className="block text-xs font-black text-slate-300">{p.name}</span>
                        <p className="text-[9px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                      </div>
                      <div className="flex items-baseline justify-between w-full mt-2 border-t border-slate-800/80 pt-1.5">
                        <span className="text-[10px] text-slate-500">المدة: {p.durationDays} أيام</span>
                        <span className="text-xs font-black text-emerald-400">{p.price} ر.س</span>
                      </div>
                      {activePackageId === p.id && (
                        <div className="absolute top-1 left-1.5 bg-emerald-500 text-slate-950 p-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ad Title */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">2. عنوان جذاب للإعلان:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: خصم 20% على جميع الخضروات الطازجة اليوم! 🥦"
                  className="w-full text-xs rounded-xl px-4 py-3 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Ad Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">3. تفاصيل ونص الإعلان:</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً موجزاً يوضح العرض والأسعار المخفضة لدفع الزبائن لزيارة بقالتك..."
                  className="w-full text-xs rounded-xl px-4 py-3 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Grid for Image URL & Destination Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">4. رابط الصورة الترويجية (اختياري):</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full text-xs rounded-xl px-4 py-3 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <Image className="w-4 h-4 text-slate-600 absolute top-1/2 -translate-y-1/2 left-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">5. رابط توجيه الزبون (اختياري):</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="رابط المتجر أو كود الخصم المباشر"
                      className="w-full text-xs rounded-xl px-4 py-3 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <ArrowUpRight className="w-4 h-4 text-slate-600 absolute top-1/2 -translate-y-1/2 left-3" />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <BadgeDollarSign className="w-4 h-4 shrink-0" />
                  <span>{loading ? 'جاري إرسال الطلب وحجز الباقة...' : 'تقديم إعلانك للمراجعة والتفعيل 🚀'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Existing Ads List & History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>إعلاناتي النشطة والسابقة ({ads.length})</span>
            </h3>

            {ads.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs border border-dashed border-slate-800 rounded-2xl">
                لا توجد حملات إعلانية سابقة لك بالمنصة. قدم طلبك الأول وسيقوم المطور بتفعيله فوراً لتعميم بقالتك!
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar">
                {ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl space-y-3 hover:border-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{ad.createdAt.split('T')[0]}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          ad.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : ad.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : ad.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ad.status === 'APPROVED'
                          ? '✅ معتمد ونشط'
                          : ad.status === 'PENDING'
                          ? '⏳ قيد المراجعة'
                          : ad.status === 'REJECTED'
                          ? '❌ مرفوض'
                          : '🚫 منتهي'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-white">{ad.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{ad.description}</p>
                    </div>

                    {/* Ad Image Preview if present */}
                    {ad.imageUrl && (
                      <div className="w-full h-16 rounded-xl overflow-hidden border border-slate-800">
                        <img src={ad.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-2">
                      <span className="font-bold">الباقة: {ad.packageName}</span>
                      {ad.endDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span>ينتهي: {ad.endDate}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
