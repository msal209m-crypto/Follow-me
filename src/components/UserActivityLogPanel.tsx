import React, { useState, useMemo } from 'react';
import {
  Activity,
  Package,
  CreditCard,
  ShoppingCart,
  Settings as SettingsIcon,
  Search,
  Filter,
  User,
  Calendar,
  Clock,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  Edit3,
  PlusCircle,
  Coins,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ActivityLog, ActivityCategory } from '../types';

export const UserActivityLogPanel: React.FC = () => {
  const { activityLogs, cashiers, settings, language, t, clearActivityLogs, showNotification } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return activityLogs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // User filter
      if (selectedUser !== 'ALL' && log.performedBy !== selectedUser) {
        return false;
      }

      // Date filter
      const logTime = new Date(log.timestamp).getTime();
      if (dateFilter === 'TODAY' && logTime < todayStart) {
        return false;
      }
      if (dateFilter === 'WEEK' && logTime < weekStart) {
        return false;
      }
      if (dateFilter === 'MONTH' && logTime < monthStart) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (log.title || '').toLowerCase().includes(q);
        const matchesDetails = (log.details || '').toLowerCase().includes(q);
        const matchesUser = (log.performedBy || '').toLowerCase().includes(q);
        const matchesTarget = (log.targetName || '').toLowerCase().includes(q) || (log.targetId || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDetails && !matchesUser && !matchesTarget) {
          return false;
        }
      }

      return true;
    });
  }, [activityLogs, selectedCategory, selectedUser, dateFilter, searchQuery]);

  // Statistics Counts
  const stats = useMemo(() => {
    let inventoryCount = 0;
    let accountsCount = 0;
    let salesCount = 0;
    let settingsCount = 0;

    activityLogs.forEach((log) => {
      if (log.category === 'INVENTORY') inventoryCount++;
      else if (log.category === 'ACCOUNTS') accountsCount++;
      else if (log.category === 'SALES') salesCount++;
      else if (log.category === 'SETTINGS') settingsCount++;
    });

    return {
      total: activityLogs.length,
      inventoryCount,
      accountsCount,
      salesCount,
      settingsCount,
    };
  }, [activityLogs]);

  // Unique users found in logs
  const distinctUsers = useMemo(() => {
    const userSet = new Set<string>();
    cashiers.forEach((c) => {
      if (c.name) userSet.add(c.name);
    });
    activityLogs.forEach((l) => {
      if (l.performedBy) userSet.add(l.performedBy);
    });
    return Array.from(userSet);
  }, [cashiers, activityLogs]);

  // Format relative timestamp
  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return language === 'ar' ? 'الآن' : 'Just now';
      if (diffMins < 60) return language === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      if (diffHours < 24) return language === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      if (diffDays === 1) return language === 'ar' ? 'أمس' : 'Yesterday';
      if (diffDays < 7) return language === 'ar' ? `منذ ${diffDays} أيام` : `${diffDays}d ago`;

      return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Helper for action badges & styling
  const getActionBadge = (actionType: ActivityLog['actionType'], category: ActivityCategory) => {
    switch (actionType) {
      case 'ITEM_ADD':
        return {
          icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: language === 'ar' ? 'إضافة صنف' : 'Add Item',
        };
      case 'ITEM_UPDATE':
        return {
          icon: <Edit3 className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          label: language === 'ar' ? 'تعديل مخزون' : 'Stock Edit',
        };
      case 'ITEM_DELETE':
        return {
          icon: <Trash2 className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          label: language === 'ar' ? 'حذف صنف' : 'Delete Item',
        };
      case 'SALE_TRANSACTION':
        return {
          icon: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: language === 'ar' ? 'فاتورة بيع' : 'Sale',
        };
      case 'PURCHASE_TRANSACTION':
        return {
          icon: <Package className="w-4 h-4 text-cyan-400" />,
          bgColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
          label: language === 'ar' ? 'شراء وتوريد' : 'Purchase',
        };
      case 'ORDER_GOODS_RECEIVE':
        return {
          icon: <ArrowRightLeft className="w-4 h-4 text-teal-400" />,
          bgColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
          label: language === 'ar' ? 'استلام بضاعة' : 'Goods Receipt',
        };
      case 'DEBT_PAYMENT':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
          bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: language === 'ar' ? 'سداد دين' : 'Debt Payment',
        };
      case 'DEBT_LOAN':
        return {
          icon: <Coins className="w-4 h-4 text-amber-400" />,
          bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          label: language === 'ar' ? 'سلفة نقدية' : 'Cash Loan',
        };
      case 'DEBT_CREATE':
        return {
          icon: <User className="w-4 h-4 text-purple-400" />,
          bgColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          label: language === 'ar' ? 'حساب دين جديد' : 'New Debt',
        };
      case 'DEBT_DELETE':
        return {
          icon: <Trash2 className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          label: language === 'ar' ? 'حذف دين' : 'Delete Debt',
        };
      case 'TRANSACTION_DELETE':
        return {
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
          bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          label: language === 'ar' ? 'إلغاء فاتورة' : 'Cancel Invoice',
        };
      case 'SETTINGS_UPDATE':
        return {
          icon: <SettingsIcon className="w-4 h-4 text-blue-400" />,
          bgColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          label: language === 'ar' ? 'تحديث إعدادات' : 'Settings',
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-slate-400" />,
          bgColor: 'bg-slate-800 text-slate-300 border-slate-700',
          label: language === 'ar' ? 'عملية' : 'Action',
        };
    }
  };

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    try {
      if (filteredLogs.length === 0) {
        showNotification(language === 'ar' ? 'لا توجد بيانات لتصديرها' : 'No activity data to export', 'warning');
        return;
      }
      const headers = ['التاريخ والوقت', 'المستخدم', 'القسم', 'نوع العملية', 'العنوان', 'التفاصيل', 'المرجع'];
      const rows = filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US'),
        `"${(log.performedBy || '').replace(/"/g, '""')}"`,
        `"${log.category}"`,
        `"${log.actionType}"`,
        `"${(log.title || '').replace(/"/g, '""')}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`,
        `"${(log.targetId || log.targetName || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_log_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification(language === 'ar' ? 'تم تصدير سجل العمليات بنجاح!' : 'Activity log exported successfully!', 'success');
    } catch (e) {
      console.error(e);
      showNotification(language === 'ar' ? 'فشل تصدير السجل' : 'Failed to export log', 'error');
    }
  };

  // Print filtered logs
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              {language === 'ar' ? 'إجمالي العمليات' : 'Total Operations'}
            </div>
            <div className="text-lg font-black text-white">{stats.total}</div>
          </div>
        </div>

        {/* Inventory Actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              {language === 'ar' ? 'حركات المخزون' : 'Inventory Updates'}
            </div>
            <div className="text-lg font-black text-emerald-400">{stats.inventoryCount}</div>
          </div>
        </div>

        {/* Accounts & Debts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              {language === 'ar' ? 'الحسابات والسداد' : 'Accounts & Debts'}
            </div>
            <div className="text-lg font-black text-amber-400">{stats.accountsCount}</div>
          </div>
        </div>

        {/* Sales Transactions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 truncate">
              {language === 'ar' ? 'المبيعات والطلبيات' : 'Sales & Invoices'}
            </div>
            <div className="text-lg font-black text-teal-400">{stats.salesCount}</div>
          </div>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'ar' ? `الكل (${stats.total})` : `All (${stats.total})`}
          </button>
          <button
            onClick={() => setSelectedCategory('INVENTORY')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'INVENTORY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? `المخزون والأصناف (${stats.inventoryCount})` : `Inventory (${stats.inventoryCount})`}</span>
          </button>
          <button
            onClick={() => setSelectedCategory('ACCOUNTS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'ACCOUNTS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? `الحسابات والديون (${stats.accountsCount})` : `Accounts (${stats.accountsCount})`}</span>
          </button>
          <button
            onClick={() => setSelectedCategory('SALES')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'SALES'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? `المبيعات والفواتير (${stats.salesCount})` : `Sales (${stats.salesCount})`}</span>
          </button>
          <button
            onClick={() => setSelectedCategory('SETTINGS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'SETTINGS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? `الإعدادات (${stats.settingsCount})` : `Settings (${stats.settingsCount})`}</span>
          </button>
        </div>

        {/* Filter Inputs Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث في تفاصيل العملية، الصنف، العميل، رقم الفاتورة...' : 'Search activity, item, customer, invoice...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by User / Cashier */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  {language === 'ar' ? 'جميع المستخدمين' : 'All Users'}
                </option>
                {distinctUsers.map((u) => (
                  <option key={u} value={u} className="bg-slate-900 text-white">
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Date */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  {language === 'ar' ? 'كل الفترات' : 'All Time'}
                </option>
                <option value="TODAY" className="bg-slate-900 text-white">
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </option>
                <option value="WEEK" className="bg-slate-900 text-white">
                  {language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}
                </option>
                <option value="MONTH" className="bg-slate-900 text-white">
                  {language === 'ar' ? 'هذا الشهر' : 'This Month'}
                </option>
              </select>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              title={language === 'ar' ? 'تصدير السجل إلى Excel/CSV' : 'Export CSV'}
              className="bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            {/* Print Log */}
            <button
              onClick={handlePrint}
              title={language === 'ar' ? 'طباعة تقرير السجل' : 'Print Activity Log'}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
            </button>

            {/* Clear Log Trigger */}
            {activityLogs.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                title={language === 'ar' ? 'مسح سجل العمليات' : 'Clear Log'}
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-600/30 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal for clearing logs */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-black text-sm text-white">
                {language === 'ar' ? 'تأكيد مسح سجل العمليات' : 'Clear Activity Logs'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'ar'
                ? 'هل أنت متأكد من مسح جميع السجلات التاريخية للعمليات؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to clear all operation history records? This cannot be undone.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  clearActivityLogs();
                  setShowClearConfirm(false);
                  showNotification(language === 'ar' ? 'تم مسح السجل بنجاح' : 'Log cleared successfully', 'info');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {language === 'ar' ? 'نعم، مسح السجل' : 'Yes, Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log Entries Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-black text-sm text-white">
              {language === 'ar' ? 'سجل العمليات والتغييرات المباشرة' : 'Live Operations & Changes Feed'}
            </h3>
            <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
              {filteredLogs.length} {language === 'ar' ? 'عملية' : 'entries'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {language === 'ar' ? 'يتم تسجيل كل تعديل تلقائياً لحفظ حقوق المتجر وتتبع المسؤولين' : 'Auto-recorded audit trail for store security'}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-300">
              {language === 'ar' ? 'لا توجد عمليات مسجلة مطابقة للفلاتر الحالية' : 'No recorded activity matching filters'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'ar'
                ? 'أي إضافة أو تعديل للمخزون أو عمليات بيع وشراء وسداد ديون ستظهر هنا فوراً بالتفاصيل الدقيقة والوقت والمستخدم المسؤول.'
                : 'All inventory edits, sales, purchases, and debt payments will appear here with precise time and user.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredLogs.map((log) => {
              const badge = getActionBadge(log.actionType, log.category);
              const exactDate = new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                >
                  {/* Left / Main Section */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Action Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badge.bgColor}`}
                    >
                      {badge.icon}
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {log.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bgColor}`}
                        >
                          {badge.label}
                        </span>
                        {log.targetId && (
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            {log.targetId}
                          </span>
                        )}
                      </div>

                      {/* Details Description */}
                      <p className="text-slate-300 text-xs leading-relaxed break-words">
                        {log.details}
                      </p>

                      {/* Diffs tags if available (e.g. stock or price change) */}
                      {log.diffs && log.diffs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {log.diffs.map((diff, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1.5"
                            >
                              <strong className="text-slate-400 font-normal">{diff.label}:</strong>
                              <span className="text-rose-400 line-through font-mono">{String(diff.oldVal)}</span>
                              <span className="text-slate-500">➔</span>
                              <span className="text-emerald-400 font-bold font-mono">{String(diff.newVal)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: User & Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/50">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.performedBy || (language === 'ar' ? 'مستخدم النظام' : 'User')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono" title={exactDate}>
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(log.timestamp)}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      {exactDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
