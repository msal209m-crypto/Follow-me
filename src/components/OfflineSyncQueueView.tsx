import React, { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Clock,
  Eye,
  CheckCircle2,
  Database,
  ArrowRight,
  TrendingUp,
  Package,
  CreditCard,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  OfflineAction,
  getAllFromIndexedDB,
  deleteFromIndexedDB,
  processOfflineSyncQueue,
  clearIndexedDBStore,
} from '../utils/indexedDB';
import { db } from '../lib/firebase';
import { safeSetDoc } from '../lib/firestoreUtils';
import { deleteDoc } from 'firebase/firestore';

export const OfflineSyncQueueView: React.FC = () => {
  const { currentUser, language, isRTL, showNotification, updateOfflineSyncCount } = useApp();
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<OfflineAction | null>(null);

  // Load the current offline queue from IndexedDB
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllFromIndexedDB('offline_queue');
      // Sort chronologically (newest first for display)
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setQueue(data);
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Manually trigger queue synchronization if online
  const handleManualSync = async () => {
    if (!navigator.onLine) {
      showNotification(
        language === 'ar'
          ? 'لا يتوفر اتصال بالإنترنت حالياً! يرجى التحقق من الشبكة ثم المحاولة مجدداً.'
          : 'No internet connection! Please check your network and retry.',
        'warning'
      );
      return;
    }

    if (!currentUser) return;

    try {
      setIsSyncing(true);
      showNotification(
        language === 'ar'
          ? 'جاري بدء مزامنة العمليات المعلقة مع السحابة...'
          : 'Starting offline queue synchronization...',
        'info'
      );

      const { successCount, failedCount } = await processOfflineSyncQueue(
        currentUser.uid,
        safeSetDoc,
        deleteDoc,
        db
      );

      await updateOfflineSyncCount();
      await loadQueue();

      if (successCount > 0) {
        showNotification(
          language === 'ar'
            ? `تمت مزامنة ${successCount} عمليات معلقة بنجاح مع السحابة!`
            : `Successfully synchronized ${successCount} offline actions!`,
          'success'
        );
      } else if (failedCount > 0) {
        showNotification(
          language === 'ar'
            ? 'فشلت المزامنة لبعض العمليات. تأكد من ثبات اتصال الإنترنت.'
            : 'Synchronization failed for some items. Check connection stability.',
          'error'
        );
      } else {
        showNotification(
          language === 'ar' ? 'لا توجد عمليات معلقة للمزامنة حالياً.' : 'No pending actions to sync.',
          'info'
        );
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      showNotification(
        language === 'ar' ? 'حدث خطأ غير متوقع أثناء المزامنة.' : 'An unexpected error occurred during sync.',
        'error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete an individual action from the queue
  const handleDeleteAction = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteFromIndexedDB('offline_queue', id);
      showNotification(
        language === 'ar' ? 'تم حذف العملية المعلقة من طابور المزامنة.' : 'Deleted queued action.',
        'info'
      );
      await updateOfflineSyncCount();
      await loadQueue();
      if (selectedAction?.id === id) {
        setSelectedAction(null);
      }
    } catch (err) {
      console.error('Failed to delete offline action:', err);
    }
  };

  // Clear the entire queue
  const handleClearAll = async () => {
    if (
      !window.confirm(
        language === 'ar'
          ? 'هل أنت متأكد من رغبتك في تفريغ طابور المزامنة بالكامل؟ لن يتم إرسال هذه العمليات للسحابة.'
          : 'Are you sure you want to clear the entire offline queue? These operations will not sync to the cloud.'
      )
    ) {
      return;
    }

    try {
      await clearIndexedDBStore('offline_queue');
      showNotification(
        language === 'ar' ? 'تم تفريغ طابور المزامنة بنجاح.' : 'Offline queue cleared.',
        'success'
      );
      await updateOfflineSyncCount();
      await loadQueue();
      setSelectedAction(null);
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  };

  // Human-readable collection name translation
  const getCollectionLabel = (colName: string) => {
    if (language === 'ar') {
      switch (colName) {
        case 'transactions':
          return 'فواتير ومبيعات';
        case 'items':
          return 'أصناف ومخزون';
        case 'debts':
          return 'ديون وحسابات';
        default:
          return colName;
      }
    } else {
      return colName.charAt(0).toUpperCase() + colName.slice(1);
    }
  };

  // Get appropriate icon for collection types
  const getCollectionIcon = (colName: string) => {
    switch (colName) {
      case 'transactions':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'items':
        return <Package className="w-4 h-4 text-cyan-400" />;
      case 'debts':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      default:
        return <Database className="w-4 h-4 text-slate-400" />;
    }
  };

  // Format date helper
  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const isOnline = navigator.onLine;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Top Banner & Status Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-white">
              {language === 'ar' ? 'طابور العمليات غير المتزامنة (الأوفلاين)' : 'Offline Sync Queue'}
            </h2>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>{language === 'ar' ? 'متصل بالإنترنت' : 'Online'}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>{language === 'ar' ? 'أوفلاين' : 'Offline'}</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            {language === 'ar'
              ? 'تُحفظ العمليات والبيانات التي تقوم بها أثناء غياب الإنترنت هنا تلقائياً في قاعدة بيانات جهازك الآمنة (IndexedDB)، وسترتفع للسحابة بمجرد شبك الإنترنت لمنع أي فقدان للمبيعات.'
              : 'Actions performed offline are cached securely in IndexedDB and will sync to the cloud as soon as connection is recovered.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing || queue.length === 0}
            className="flex-1 sm:flex-none h-10 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/30 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-slate-950 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (language === 'ar' ? 'جاري المزامنة...' : 'Syncing...') : (language === 'ar' ? 'مزامنة الآن 🌐' : 'Sync Now')}</span>
          </button>

          {queue.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isSyncing}
              className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-xl border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
              title={language === 'ar' ? 'تفريغ السجل بالكامل' : 'Clear Queue'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Queue List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <span className="text-xs font-bold text-slate-300">
                {language === 'ar'
                  ? `العمليات المسجلة بانتظار الرفع (${queue.length})`
                  : `Queued Operations (${queue.length})`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {language === 'ar' ? 'ترتيب زمني تنازلي' : 'Newest first'}
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <span>{language === 'ar' ? 'جاري تحميل العمليات المعلقة...' : 'Loading queued actions...'}</span>
              </div>
            ) : queue.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-sm text-slate-200">
                    {language === 'ar' ? 'الكل متزامن وسليم! ✨' : 'All is synchronized!'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed mx-auto">
                    {language === 'ar'
                      ? 'لا توجد أي عمليات بيع أو تعديل مخزون معلقة محلياً. جميع بياناتك تم حفظها ورفعها للسحابة بنجاح.'
                      : 'There are no pending offline actions. All data is perfectly secure on the cloud.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[60vh] overflow-y-auto no-scrollbar">
                {queue.map((action) => {
                  const payload = action.payload || {};
                  const isSelected = selectedAction?.id === action.id;

                  return (
                    <div
                      key={action.id}
                      onClick={() => setSelectedAction(action)}
                      className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-slate-850/40 select-none ${
                        isSelected ? 'bg-slate-800/40 border-r-3 border-emerald-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Collection Type Badge */}
                        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {getCollectionIcon(action.collection)}
                        </div>

                        {/* Title and Timestamp */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-xs text-white truncate">
                              {payload.invoiceNumber || payload.name || payload.personName || action.id}
                            </span>
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                              {getCollectionLabel(action.collection)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatDate(action.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detail View Indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-emerald-400 font-mono font-bold hidden sm:inline">
                          {payload.totalAmount !== undefined
                            ? `${payload.totalAmount} ${language === 'ar' ? 'ر.س' : 'SAR'}`
                            : payload.quantity !== undefined
                            ? `${payload.quantity} وحدة`
                            : payload.remainingDebt !== undefined
                            ? `${payload.remainingDebt} ر.س دين`
                            : ''}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteAction(action.id, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title={language === 'ar' ? 'حذف من المزامنة' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Eye className="w-4 h-4 text-slate-500 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Operation Detail Modal Look */}
        <div className="lg:col-span-1">
          {selectedAction ? (
            <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4 animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-white">تفاصيل العملية المعلقة</span>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="text-slate-500 hover:text-white rounded p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail fields */}
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">نوع الكولكشن:</span>
                  <span className="col-span-2 text-white font-semibold font-mono">
                    {selectedAction.collection}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">العملية:</span>
                  <span className="col-span-2 text-white font-mono">
                    <span className="px-1.5 py-0.2 text-[10px] rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-black">
                      {selectedAction.operation}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span className="text-slate-400 font-bold">توقيت التسجيل:</span>
                  <span className="col-span-2 text-slate-200 font-mono text-[10px]">
                    {formatDate(selectedAction.timestamp)}
                  </span>
                </div>

                {/* Sub payload preview block */}
                <div className="border-t border-slate-800/80 pt-3.5 space-y-2">
                  <span className="text-slate-400 font-black block text-[10px]">البيانات المسجلة (Payload):</span>
                  <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-[10px] text-cyan-300 max-h-56 overflow-y-auto no-scrollbar space-y-1.5 leading-relaxed">
                    {selectedAction.payload ? (
                      <div>
                        {selectedAction.collection === 'transactions' && (
                          <div className="space-y-1">
                            <p className="text-slate-400 border-b border-slate-900 pb-1 font-sans">📄 فاتورة مبيعات</p>
                            <p>المعرف: {selectedAction.payload.id}</p>
                            <p>الفاتورة: {selectedAction.payload.invoiceNumber}</p>
                            <p>النوع: {selectedAction.payload.type}</p>
                            <p>العميل: {selectedAction.payload.partyName || 'عميل كاش نقدي'}</p>
                            <p>الصافي: {selectedAction.payload.totalAmount} ر.س</p>
                            <p>المدفوع: {selectedAction.payload.paidAmount} ر.س</p>
                            <p>المتبقي: {selectedAction.payload.remainingDebt} ر.س</p>
                            <p>الأصناف: {selectedAction.payload.items?.length || 0} أصناف</p>
                          </div>
                        )}

                        {selectedAction.collection === 'items' && (
                          <div className="space-y-1">
                            <p className="text-slate-400 border-b border-slate-900 pb-1 font-sans">📦 صنف في المخزن</p>
                            <p>المعرف: {selectedAction.payload.id}</p>
                            <p>الاسم: {selectedAction.payload.name}</p>
                            <p>الباركود: {selectedAction.payload.barcode}</p>
                            <p>الكمية: {selectedAction.payload.quantity}</p>
                            <p>سعر الشراء: {selectedAction.payload.costPrice} ر.س</p>
                            <p>سعر البيع: {selectedAction.payload.salePrice} ر.س</p>
                          </div>
                        )}

                        {selectedAction.collection === 'debts' && (
                          <div className="space-y-1">
                            <p className="text-slate-400 border-b border-slate-900 pb-1 font-sans">💳 سجل ديون عميل</p>
                            <p>المعرف: {selectedAction.payload.id}</p>
                            <p>العميل: {selectedAction.payload.personName}</p>
                            <p>الهاتف: {selectedAction.payload.phone || 'غير مسجل'}</p>
                            <p>مجموع الدين: {selectedAction.payload.totalDebt} ر.س</p>
                            <p>الرصيد المتبقي: {selectedAction.payload.remainingDebt} ر.س</p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-900/60 mt-2 text-[9px] text-slate-500">
                          JSON Payload (Raw View):
                          <pre className="text-slate-400 mt-1 max-w-full overflow-x-auto text-[9px]">
                            {JSON.stringify(selectedAction.payload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500">Null payload</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detached delete action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={(e) => handleDeleteAction(selectedAction.id, e)}
                  className="w-full bg-slate-800 hover:bg-slate-750 text-rose-400 hover:text-rose-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف هذه العملية وتخطي المزامنة</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <Eye className="w-5 h-5 text-slate-600" />
              <span>انقر على أي عملية في القائمة لمشاهدة تفاصيل الفاتورة أو الصنف المسجل بالكامل هنا.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
