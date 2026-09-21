import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Calendar,
  Tag,
  User,
  Heart,
  Share2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Filter,
  Sparkles,
  MapPin,
  Send,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export interface BulletinNotice {
  id: string;
  merchantId?: string;
  storeName: string;
  village: string;
  category: 'GENERAL' | 'EVENTS' | 'SERVICES' | 'AGRICULTURE';
  title: string;
  content: string;
  authorName: string;
  phone?: string;
  date: string;
  likes: number;
}

const STORAGE_KEY = 'qorayti_village_bulletin_notices_v1';

const INITIAL_NOTICES: BulletinNotice[] = [
  {
    id: 'notice-1',
    storeName: 'تموينات الأمل',
    village: 'قرية الوادي الأخضر',
    category: 'GENERAL',
    title: 'وصول دفعة طازجة من الخضار والفاكهة البلدية صباح اليوم',
    content: 'يسعدنا إعلام أهل القرية الكرام بوصول خضار بلدية طازجة (طماطم، خيار، طماطم محلية، ورق عنب) بأسعار خاصة جداً.',
    authorName: 'أبو أحمد (صاحب المتجر)',
    phone: '0501234567',
    date: new Date().toISOString(),
    likes: 14,
  },
  {
    id: 'notice-2',
    storeName: 'ديوانية القرية',
    village: 'قرية الوادي الأخضر',
    category: 'EVENTS',
    title: 'دعوة عامة لحفل زفاف وابن القرية الشاب (محمد)',
    content: 'يسر عائلة ال علي دعوة أهالي القرية الكرام لحضور حفل العشاء والعرضة الشعبية بمناسبة زفاف ابننا محمد، وذلك مساء يوم الخميس المقبل.',
    authorName: 'عائلة آل علي',
    phone: '0509876543',
    date: new Date(Date.now() - 86400000).toISOString(),
    likes: 32,
  },
  {
    id: 'notice-3',
    storeName: 'ورشة ومغسلة القرية',
    village: 'قرية الوادي الأخضر',
    category: 'SERVICES',
    title: 'خدمة صيانة وتوصيل أسطوانات الغاز حتى باب البيت',
    content: 'تتوفر خدمة التوصيل السريع لأسطوانات الغاز ومياه الشرب النقية لكافة أحياء القرية طوال أيام الأسبوع من 8 صباحاً وحتى 11 مساءً.',
    authorName: 'معلم حسن',
    phone: '0551122334',
    date: new Date(Date.now() - 172800000).toISOString(),
    likes: 9,
  },
  {
    id: 'notice-4',
    storeName: 'مشاتل الزراعة المحلية',
    village: 'قرية الوادي الأخضر',
    category: 'AGRICULTURE',
    title: 'بدء موسم توزيع فسائل النخيل وأسمدة العضوية الطبيعية',
    content: 'تنويه لكافة المزارعين وملاك المزارع بالقرية، توفرت كميات محدودة من الأسمدة العضوية وفسائل النخيل الممتازة بأسعار مدعومة.',
    authorName: 'مكتب الإرشاد الزراعي',
    phone: '0564433221',
    date: new Date(Date.now() - 259200000).toISOString(),
    likes: 21,
  },
];

export const VillageBulletinView: React.FC = () => {
  const { language, settings } = useApp();
  const { currentUser, userProfile } = useAuth();

  const [notices, setNotices] = useState<BulletinNotice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error loading bulletin notices:', e);
    }
    return INITIAL_NOTICES;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'GENERAL' | 'EVENTS' | 'SERVICES' | 'AGRICULTURE'>('GENERAL');
  const [newAuthor, setNewAuthor] = useState(userProfile?.displayName || settings.ownerName || 'أحد أهالي القرية');
  const [newPhone, setNewPhone] = useState(settings.phone || '');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
    } catch (e) {
      console.warn('Error saving bulletin notices:', e);
    }
  }, [notices]);

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const notice: BulletinNotice = {
      id: `notice-${Date.now()}`,
      merchantId: currentUser?.uid,
      storeName: settings.storeName || userProfile?.storeName || 'متجر قريتي',
      village: settings.village || 'القرية',
      category: newCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
      authorName: newAuthor.trim() || 'أحد أهالي القرية',
      phone: newPhone.trim(),
      date: new Date().toISOString(),
      likes: 1,
    };

    setNotices([notice, ...notices]);
    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleLike = (id: string) => {
    setNotices(
      notices.map((n) => (n.id === id ? { ...n, likes: n.likes + 1 } : n))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الإعلان؟' : 'Are you sure you want to delete this notice?')) {
      setNotices(notices.filter((n) => n.id !== id));
    }
  };

  const handleShareWhatsApp = (n: BulletinNotice) => {
    const text = `📢 *${n.title}*
📝 ${n.content}
🏪 *الجهة / المُعلن:* ${n.authorName} (${n.storeName})
📍 *القرية:* ${n.village}
📞 *التواصل:* ${n.phone || 'غير متوفر'}
---
_مرسل عبر تطبيق قريتي للتجارة المحلية والقرى_`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedCategory === 'ALL') return true;
    return n.category === selectedCategory;
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'EVENTS':
        return { label: language === 'ar' ? '🎉 مناسبات وأفراح' : 'Events & Weddings', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'SERVICES':
        return { label: language === 'ar' ? '🔧 خدمات وطوارئ' : 'Services & Utilities', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'AGRICULTURE':
        return { label: language === 'ar' ? '🌱 زراعة ومواسم' : 'Agriculture & Seasons', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      default:
        return { label: language === 'ar' ? '📢 عام وعاجل' : 'General & Urgent', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-inner">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {language === 'ar' ? 'مجتمع القرية الحي' : 'Live Village Community'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              {language === 'ar' ? 'لوحة إعلانات وأخبار القرية' : 'Village Bulletin & Community Notices'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'مركز إعلانات القرية، المناسبات، التنبيهات والأخبار المحلية لأهالي القرية والمتاجر'
                : 'Community bulletin for village events, announcements, alerts, and local updates'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-950 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'نشر إعلان جديد' : 'Post New Notice'}</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'ALL', label: language === 'ar' ? '🌐 كافة الإعلانات والأخبار' : 'All Notices' },
          { id: 'GENERAL', label: language === 'ar' ? '📢 عام وعاجل' : 'General & Urgent' },
          { id: 'EVENTS', label: language === 'ar' ? '🎉 مناسبات وأفراح' : 'Events' },
          { id: 'SERVICES', label: language === 'ar' ? '🔧 خدمات ومرافق' : 'Services' },
          { id: 'AGRICULTURE', label: language === 'ar' ? '🌱 زراعة ومواسم' : 'Agriculture' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
              selectedCategory === tab.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotices.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">
              {language === 'ar' ? 'لا توجد إعلانات مطابقة حالياً' : 'No notices found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? 'كن أول من ينشر خبراً أو إعلاناً لأهالي القرية' : 'Be the first to post an announcement for the village'}
            </p>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const badge = getCategoryBadge(notice.category);
            return (
              <div
                key={notice.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {new Date(notice.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                    {notice.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    {notice.content}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      {notice.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-200">{notice.authorName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {notice.village} • {notice.storeName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Like button */}
                    <button
                      onClick={() => handleLike(notice.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                      title={language === 'ar' ? 'إعجاب / تأييد' : 'Like'}
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500/30" />
                      <span>{notice.likes}</span>
                    </button>

                    {/* WhatsApp share */}
                    <button
                      onClick={() => handleShareWhatsApp(notice)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all cursor-pointer"
                      title={language === 'ar' ? 'مشاركة عبر واتساب' : 'Share via WhatsApp'}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{language === 'ar' ? 'مشاركة' : 'Share'}</span>
                    </button>

                    {/* Delete if owner */}
                    {notice.merchantId === currentUser?.uid && (
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title={language === 'ar' ? 'حذف الإعلان' : 'Delete Notice'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Notice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {language === 'ar' ? 'نشر إعلان جديد في لوحة القرية' : 'Post New Village Notice'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'سيظهر الإعلان فوراً لكافة أهالي وزوار القرية' : 'Will appear instantly to all village residents'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'ar' ? 'تصنيف الإعلان' : 'Category'}
                </label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="GENERAL">📢 {language === 'ar' ? 'عام وعاجل' : 'General & Urgent'}</option>
                  <option value="EVENTS">🎉 {language === 'ar' ? 'مناسبات وأفراح وعزاء' : 'Events & Weddings'}</option>
                  <option value="SERVICES">🔧 {language === 'ar' ? 'خدمات ومرافق عامة' : 'Services & Utilities'}</option>
                  <option value="AGRICULTURE">🌱 {language === 'ar' ? 'زراعة ومواسم وأسواق' : 'Agriculture & Seasonal'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'ar' ? 'عنوان الإعلان أو الحدث' : 'Notice Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'ar' ? 'مثال: وصول دفعة خضار جديدة أو دعوة عامة...' : 'e.g., New vegetable shipment or community event'}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'ar' ? 'تفاصيل الإعلان كاملاً' : 'Announcement Details'}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={language === 'ar' ? 'اكتب التفاصيل والمواعيد وأرقام التواصل إن وجدت...' : 'Write full details, times, and contact numbers...'}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {language === 'ar' ? 'اسم المُعلن / المسؤول' : 'Author Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {language === 'ar' ? 'رقم التواصل (اختياري)' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="050xxxxxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'نشر الآن' : 'Publish Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
