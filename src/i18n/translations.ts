export type Language = 'ar' | 'en';

export interface Translations {
  // Common / General
  appName: string;
  appSubtitle: string;
  verticalDashboard: string;
  language: string;
  arabic: string;
  english: string;
  switchLanguage: string;
  currency: string;
  activeCurrency: string;
  advancedSettings: string;
  cashier: string;
  activeEmployee: string;
  cashRegister: string;
  cashInHand: string;
  cashBalance: string;
  bankBalance: string;
  cardBalance: string;
  search: string;
  searchPlaceholder: string;
  filter: string;
  allCategories: string;
  actions: string;
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirm: string;
  close: string;
  print: string;
  export: string;
  exportBackup: string;
  import: string;
  importBackup: string;
  reset: string;
  resetDefaultData: string;
  confirmResetMsg: string;
  confirmDeleteMsg: string;
  loading: string;
  success: string;
  error: string;
  clear: string;
  selectAll: string;
  deselectAll: string;
  total: string;
  quantity: string;
  price: string;
  costPrice: string;
  salePrice: string;
  profit: string;
  profitMargin: string;
  notes: string;
  date: string;
  status: string;
  completed: string;
  pending: string;
  cancelled: string;
  phone: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  piece: string;
  itemsCount: string;
  units: string;
  details: string;
  noData: string;
  noMatchingData: string;
  
  // Navigation
  navMainMenus: string;
  navSectionOverview: string;
  navSectionCatalog: string;
  navSectionSalesProcurement: string;
  navSectionFinanceReports: string;
  navDashboard: string;
  navDashboardSub: string;
  navItems: string;
  navItemsSub: string;
  navStickers: string;
  navStickersSub: string;
  navTransactions: string;
  navTransactionsSub: string;
  navOrderGoods: string;
  navOrderGoodsSub: string;
  navAccounts: string;
  navAccountsSub: string;
  navDebts: string;
  navDebtsSub: string;
  navDailyReports: string;
  navDailyReportsSub: string;
  navSettings: string;
  quickAddItem: string;
  quickOrderGoods: string;
  expandMenu: string;
  collapseMenu: string;
  openMainMenu: string;

  // Dashboard View
  dashboardTitle: string;
  dashboardSubtitle: string;
  todaySales: string;
  todaySalesCount: string;
  todayProfitEst: string;
  totalDebtsDue: string;
  customerDebtsDue: string;
  supplierDebtsDue: string;
  personalLoansDue: string;
  debtorsCount: string;
  lowStockAlerts: string;
  outOfStockAlerts: string;
  safeStock: string;
  salesTrend7Days: string;
  paymentMethodsDistribution: string;
  inventoryValueCost: string;
  inventoryValueSale: string;
  criticalStockTitle: string;
  recentTransactionsToday: string;
  quickActions: string;
  newSaleInvoice: string;
  manageDebts: string;
  reorderGoods: string;
  viewAllItems: string;
  viewAllTransactions: string;
  noSalesToday: string;
  noLowStockItems: string;
  cashRegisterBalance: string;

  // Items View
  itemsListTitle: string;
  totalRegisteredItems: string;
  scanBarcodeCamera: string;
  scanBarcodeCameraDesc: string;
  addNewItem: string;
  totalIncomeRevenue: string;
  totalSalesRegistered: string;
  netSalesProfit: string;
  stockMargin: string;
  stockCapitalCost: string;
  totalStockUnitsInStore: string;
  lowStockItems: string;
  shortagesCount: string;
  showShortagesOnly: string;
  cancelShortageFilter: string;
  needRestock: string;
  allStockAdequate: string;
  itemNameAndCategory: string;
  quantityInStore: string;
  totalQuantityValue: string;
  costTotal: string;
  showingItemsCount: string;
  autoStockUpdateNotice: string;
  printSticker: string;
  editItem: string;
  deleteItem: string;
  lowStockWarning: string;
  tableBarcode: string;
  tableNameCategory: string;
  tableStockQty: string;
  tableCostPrice: string;
  tableSalePrice: string;
  tableTotalValue: string;
  tableActions: string;
  itemActivityTracking: string;
  lastSaleLabel: string;
  lastPurchaseLabel: string;
  noSalesYet: string;
  noPurchasesYet: string;
  viewMovementHistory: string;
  fastMoving: string;
  activeMoving: string;
  stagnantItem: string;
  newItem: string;
  awaitingSupply: string;
  filterAllMovements: string;
  filterStagnant: string;
  filterRecentSales: string;
  filterAwaitingSupply: string;
  sortByLastSale: string;
  sortByLastPurchase: string;

  // POS / Transactions View
  posTitle: string;
  posCartTitle: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  quickSearchItems: string;
  scanOrEnterBarcode: string;
  paymentType: string;
  cashSale: string;
  creditSale: string;
  cashPurchase: string;
  orderGoodsCash: string;
  orderGoodsCredit: string;
  paymentMethod: string;
  cash: string;
  bankTransfer: string;
  cardNetwork: string;
  customerOrSupplierName: string;
  customerName: string;
  supplierName: string;
  personName: string;
  subtotal: string;
  discount: string;
  tax: string;
  grandTotal: string;
  amountPaid: string;
  remainingDebtAmount: string;
  completeTransaction: string;
  recentTransactions: string;
  invoiceNumber: string;
  time: string;
  printReceipt: string;
  viewReceipt: string;

  // Order Goods / Purchases View
  orderGoodsTitle: string;
  orderGoodsSubtitle: string;
  orderGoodsCashBtn: string;
  orderGoodsCreditBtn: string;
  orderGoodsModalTitle: string;
  selectItemToOrder: string;
  orderQuantity: string;
  supplierCostPrice: string;
  supplierNameInput: string;
  supplierPhoneInput: string;
  orderNotes: string;
  submitOrder: string;
  orderHistory: string;

  // Accounts & Balances View
  accountsTitle: string;
  accountsSubtitle: string;
  treasuryCash: string;
  bankAccount: string;
  posCardAccount: string;
  customerDebtsReceivable: string;
  supplierDebtsPayable: string;
  financialOverview: string;
  cashFlowSummary: string;
  totalInflows: string;
  totalOutflows: string;
  netLiquidity: string;

  // Debts & Loans View
  debtsTitle: string;
  debtsSubtitle: string;
  customersDebtsTab: string;
  suppliersDebtsTab: string;
  personalLoansTab: string;
  recordNewLoan: string;
  recordPayment: string;
  totalRemainingDebts: string;
  totalPaidSoFar: string;
  accumulatedDebt: string;
  paymentHistory: string;
  loanHistory: string;
  payAmount: string;
  loanAmount: string;
  paymentSource: string;
  debtorName: string;
  receiptNumber: string;
  recordedBy: string;

  // Daily Reports View
  dailyReportsTitle: string;
  dailyReportsSubtitle: string;
  selectReportDate: string;
  filterByCashier: string;
  allCashiers: string;
  dailyTotalSales: string;
  dailyNetProfits: string;
  dailyTransactionsCount: string;
  salesByPaymentMethod: string;
  topSellingItems: string;
  hourlySalesBreakdown: string;
  printDailyReport: string;
  dailyReportTab: string;
  monthlyReportTab: string;
  perPersonReportTab: string;
  exportExcelBtn: string;
  exportPdfBtn: string;
  shareReportBtn: string;
  shareReportCopied: string;
  selectMonthLabel: string;
  monthSummaryTitle: string;
  daySummaryTitle: string;
  exportOptionsTitle: string;
  exportOptionsDesc: string;

  // Stickers View
  stickersTitle: string;
  stickersSubtitle: string;
  selectItemForSticker: string;
  stickerCount: string;
  labelSize: string;
  showStoreNameOnSticker: string;
  showPriceOnSticker: string;
  showBarcodeTextOnSticker: string;
  showItemNameOnSticker: string;
  printStickersNow: string;
  previewStickers: string;

  // Modals & Scanner
  modalAddItemTitle: string;
  modalEditItemTitle: string;
  itemBarcodeLabel: string;
  itemNameLabel: string;
  itemCategoryLabel: string;
  itemCostPriceLabel: string;
  itemSalePriceLabel: string;
  itemQuantityLabel: string;
  itemMinStockLabel: string;
  itemUnitLabel: string;
  itemNotesLabel: string;
  saveItemBtn: string;
  generateBarcode: string;
  cameraScannerTitle: string;
  cameraLookingForBarcode: string;
  flashToggle: string;
  switchCamera: string;
  barcodeNotFound: string;
  addNewItemWithThisBarcode: string;

  // Settings Modal
  settingsTitle: string;
  storeInformation: string;
  storeNameLabel: string;
  storePhoneLabel: string;
  taxNumberLabel: string;
  addressLabel: string;
  currencySettingLabel: string;
  footerNoteLabel: string;
  backupAndRestore: string;
  dangerZone: string;
  clearAllDataBtn: string;
  clearAllConfirmMsg: string;

  // Cloud & Multi-Tenant Security
  cloudSyncTitle: string;
  cloudSynced: string;
  cloudSyncing: string;
  cloudOffline: string;
  cloudError: string;
  loginTitle: string;
  loginSubtitle: string;
  loginWithGoogle: string;
  loginWithEmail: string;
  createAccount: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  storeNamePlaceholder: string;
  displayNamePlaceholder: string;
  signInBtn: string;
  signUpBtn: string;
  signOutBtn: string;
  roleOwner: string;
  roleManager: string;
  roleCashier: string;
  accountSecurityNote: string;

  // Cloud Backups & Auto-Protection
  cloudBackupsTitle: string;
  cloudBackupsSubtitle: string;
  createManualBackupBtn: string;
  creatingBackup: string;
  backupSuccessMsg: string;
  autoBackupSettings: string;
  autoBackupEnabledLabel: string;
  autoBackupIntervalLabel: string;
  min15: string;
  min30: string;
  hour1: string;
  lastBackupLabel: string;
  noBackupsFound: string;
  restoreBackupBtn: string;
  restoringBackup: string;
  restoreSuccessMsg: string;
  restoreConfirmTitle: string;
  restoreConfirmDesc: string;
  deleteBackupBtn: string;
  backupTypeManual: string;
  backupTypeAuto: string;
  downloadBackupJSON: string;
  deviceSwitchReady: string;
  deviceSwitchReadyDesc: string;
  manualJsonBackupTitle: string;
  manualJsonBackupSubtitle: string;
  exportDatabaseJsonBtn: string;
  importDatabaseJsonBtn: string;
  dragDropJsonPrompt: string;
  databaseBackupSecuredMsg: string;
  databaseRestoredSuccessMsg: string;
  invalidJsonFileMsg: string;
  restoreModeReplace: string;
  restoreModeMerge: string;
  databaseSnapshotSummary: string;

  // Reorder & Low Stock Alerts
  reorderAlertsTitle: string;
  reorderAlertsSubtitle: string;
  itemsReachedReorder: string;
  itemsNeedReorderCount: string;
  noReorderAlerts: string;
  reorderPoint: string;
  currentStock: string;
  deficitQuantity: string;
  quickReorder: string;
  reorderAllDeficitItems: string;
  reorderAlertBanner: string;
  viewAllLowStock: string;
  stockStatusCritical: string;
  stockStatusWarning: string;
  stockStatusGood: string;
  outOfStock: string;
  lowStockBadge: string;

  // Multi-Currency & Exchange Rates
  multiCurrencyTitle: string;
  multiCurrencySubtitle: string;
  baseCurrency: string;
  baseCurrencyDesc: string;
  secondaryDisplayCurrency: string;
  secondaryDisplayCurrencyDesc: string;
  showDualCurrencyOnReceipts: string;
  fetchLiveRates: string;
  fetchingRates: string;
  ratesUpdatedSuccess: string;
  ratesUpdatedFallback: string;
  exchangeRatesTable: string;
  exchangeRateLabel: string;
  inverseRateLabel: string;
  customRate: string;
  resetToMarketRate: string;
  currencyConverterTitle: string;
  currencyConverterDesc: string;
  amountToConvert: string;
  fromCurrency: string;
  toCurrency: string;
  convertedResult: string;
  rateLastUpdated: string;
  payWithOtherCurrency: string;
  paymentCurrency: string;
  equivalentInBase: string;
  tenderedAmount: string;
  changeDue: string;
  enabledCurrencies: string;
}

export const translations: Record<Language, Translations> = {
  ar: {
    // General
    appName: 'فلو اب',
    appSubtitle: 'FlowApp - نظام إدارة المخزون ونقاط البيع',
    verticalDashboard: 'لوحة التحكم الرأسية',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    switchLanguage: 'تغيير اللغة',
    currency: 'العملة',
    activeCurrency: 'العملة النشطة',
    advancedSettings: 'إعدادات متقدمة',
    cashier: 'الكاشير',
    activeEmployee: 'الموظف النشط',
    cashRegister: 'الخزينة',
    cashInHand: 'الخزينة النقدية',
    cashBalance: 'رصيد الخزينة',
    bankBalance: 'رصيد الحساب البنكي',
    cardBalance: 'رصيد الشبكة / البطاقة',
    search: 'بحث',
    searchPlaceholder: 'ابحث بالاسم أو رقم الباركود أو التصنيف...',
    filter: 'تصفية',
    allCategories: 'جميع التصنيفات',
    actions: 'إجراءات',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    close: 'إغلاق',
    print: 'طباعة',
    export: 'تصدير',
    exportBackup: 'تصدير نسخة احتياطية',
    import: 'استيراد',
    importBackup: 'استيراد نسخة احتياطية',
    reset: 'استعادة',
    resetDefaultData: 'استعادة البيانات الافتراضية',
    confirmResetMsg: 'هل أنت متأكد من استعادة البيانات النموذجية الافتراضية؟',
    confirmDeleteMsg: 'هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.',
    loading: 'جاري التحميل...',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ',
    clear: 'مسح',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء التحديد',
    total: 'الإجمالي',
    quantity: 'الكمية',
    price: 'السعر',
    costPrice: 'سعر التكلفة',
    salePrice: 'سعر البيع',
    profit: 'الربح',
    profitMargin: 'هامش الربح',
    notes: 'ملاحظات',
    date: 'التاريخ',
    status: 'الحالة',
    completed: 'مكتملة',
    pending: 'معلقة',
    cancelled: 'ملغاة',
    phone: 'رقم الهاتف',
    name: 'الاسم',
    barcode: 'الباركود',
    category: 'التصنيف',
    unit: 'الوحدة',
    piece: 'حبة',
    itemsCount: 'عدد الأصناف',
    units: 'وحدات',
    details: 'التفاصيل',
    noData: 'لا توجد بيانات',
    noMatchingData: 'لا توجد نتائج مطابقة',

    // Navigation
    navMainMenus: 'القوائم الرئيسية',
    navSectionOverview: 'نظرة عامة والتحكم',
    navSectionCatalog: 'تعريف البضاعة والباركود',
    navSectionSalesProcurement: 'عمليات البيع والتوريد اليومية',
    navSectionFinanceReports: 'المالية والحسابات والتقارير',
    navDashboard: 'لوحة التحكم الرئيسية',
    navDashboardSub: 'ملخص المبيعات، الديون، والمخزون',
    navItems: 'قائمة الأصناف والمخزون',
    navItemsSub: 'إدارة الأسعار والكميات',
    navStickers: 'استيكرات وملصقات الباركود',
    navStickersSub: 'طباعة الباركود والأسعار',
    navTransactions: 'الحركات ونقاط البيع (POS)',
    navTransactionsSub: 'كاشير بيع سريع ومسح باركود',
    navOrderGoods: 'توريد البضاعة والمشتريات',
    navOrderGoodsSub: 'طلبيات الموردين وفواتير الشراء',
    navAccounts: 'جدول الحسابات والأرصدة',
    navAccountsSub: 'الخزينة • البنك • الشبكة',
    navDebts: 'قائمة الديون وسندات السداد',
    navDebtsSub: 'العملاء والموردين والذمم',
    navDailyReports: 'التقارير اليومية للمبيعات',
    navDailyReportsSub: 'تقرير يومي لكل كاشير ومبيعات',
    navSettings: 'الإعدادات',
    quickAddItem: 'إضافة صنف سريع',
    quickOrderGoods: 'طلب وتوريد بضاعة',
    expandMenu: 'توسيع القائمة',
    collapseMenu: 'تصغير القائمة',
    openMainMenu: 'فتح القائمة الرئيسية',

    // Dashboard View
    dashboardTitle: 'لوحة التحكم والمؤشرات الرئيسية',
    dashboardSubtitle: 'نظرة عامة فورية على أداء المتجر، المبيعات اليومية، الديون والمخزون الحرج',
    todaySales: 'إجمالي مبيعات اليوم',
    todaySalesCount: 'عدد فواتير اليوم',
    todayProfitEst: 'الربح التقديري لليوم',
    totalDebtsDue: 'إجمالي الديون المستحقة',
    customerDebtsDue: 'ديون العملاء (آجل)',
    supplierDebtsDue: 'مستحقات الموردين',
    personalLoansDue: 'سلفيات شخصية',
    debtorsCount: 'عدد المدينين القائمين',
    lowStockAlerts: 'أصناف أوشكت على النفاد',
    outOfStockAlerts: 'أصناف نفدت بالكامل',
    safeStock: 'المخزون بوضع آمن',
    salesTrend7Days: 'منحنى المبيعات لآخر 7 أيام',
    paymentMethodsDistribution: 'توزيع طرق الدفع اليومية',
    inventoryValueCost: 'قيمة المخزون (تكلفة)',
    inventoryValueSale: 'قيمة المخزون (سعر البيع)',
    criticalStockTitle: 'تنبيهات الأصناف الحرجة المطلوب طلبها فوراً',
    recentTransactionsToday: 'أحدث فواتير وحركات مبيعات اليوم',
    quickActions: 'إجراءات سريعة ومباشرة',
    newSaleInvoice: 'فاتورة بيع جديدة',
    manageDebts: 'إدارة الديون والسداد',
    reorderGoods: 'طلب وتوريد بضاعة',
    viewAllItems: 'عرض كافة الأصناف',
    viewAllTransactions: 'عرض كافة الحركات',
    noSalesToday: 'لا توجد مبيعات مسجلة لليوم حتى الآن',
    noLowStockItems: 'المخزون ممتاز، لا توجد أصناف أوشكت على النفاد حالياً',
    cashRegisterBalance: 'رصيد الخزينة والنقدية المتاحة',

    // Items View
    itemsListTitle: 'قائمة الأصناف والمخزون',
    totalRegisteredItems: 'إجمالي الأصناف المسجلة',
    scanBarcodeCamera: 'مسح باركود بالكاميرا',
    scanBarcodeCameraDesc: 'مسح الباركود عبر كاميرا الجوال للبحث عن الصنف وعرض تفاصيله وسعره',
    addNewItem: 'إضافة صنف جديد',
    totalIncomeRevenue: 'إجمالي الدخل (المبيعات)',
    totalSalesRegistered: 'إجمالي المبيعات المسجلة',
    netSalesProfit: 'صافي أرباح المبيعات',
    stockMargin: 'هامش بضاعة المخزن',
    stockCapitalCost: 'قيمة المخزون (رأس المال)',
    totalStockUnitsInStore: 'إجمالي القطع بالمخزن',
    lowStockItems: 'النواقص وقاربت على النفاد',
    shortagesCount: 'صنف ناقص',
    showShortagesOnly: 'عرض النواقص',
    cancelShortageFilter: 'إلغاء الفلتر',
    needRestock: 'تحتاج إعادة طلب وتوريد للمخزن',
    allStockAdequate: 'جميع الأصناف متوفرة بمخزون كافٍ',
    itemNameAndCategory: 'اسم الصنف والتصنيف',
    quantityInStore: 'الكمية بالمخزن',
    totalQuantityValue: 'إجمالي قيمة الكمية',
    costTotal: 'تكلفة',
    showingItemsCount: 'يتم عرض',
    autoStockUpdateNotice: 'حساب إجمالي سعر الكمية وتحديث المخزون يتم بشكل آلي',
    printSticker: 'طباعة استيكر',
    editItem: 'تعديل الصنف',
    deleteItem: 'حذف الصنف',
    lowStockWarning: 'تنبيه: قارب على النفاد',
    tableBarcode: 'الباركود',
    tableNameCategory: 'اسم الصنف والتصنيف',
    tableStockQty: 'الكمية بالمخزن',
    tableCostPrice: 'سعر التكلفة',
    tableSalePrice: 'سعر البيع',
    tableTotalValue: 'إجمالي القيمة',
    tableActions: 'الإجراءات',
    itemActivityTracking: 'تتبع حالة الصنف وآخر حركة',
    lastSaleLabel: 'آخر بيع',
    lastPurchaseLabel: 'آخر توريد',
    noSalesYet: 'لا توجد مبيعات بعد',
    noPurchasesYet: 'لا يوجد توريد مسجل',
    viewMovementHistory: 'سجل حركات الصنف الكامل',
    fastMoving: 'بيع حديث',
    activeMoving: 'حركة نشطة',
    stagnantItem: 'صنف راكد',
    newItem: 'صنف جديد',
    awaitingSupply: 'بانتظار شحنة',
    filterAllMovements: 'جميع حركات الأصناف',
    filterStagnant: 'الأصناف الراكدة (تنبيه الركود)',
    filterRecentSales: 'حديثة البيع (خلال أسبوع)',
    filterAwaitingSupply: 'بانتظار وصول شحنة',
    sortByLastSale: 'تاريخ آخر بيع',
    sortByLastPurchase: 'تاريخ آخر شراء',

    // POS / Transactions View
    posTitle: 'شاشة نقاط البيع والحركات (POS)',
    posCartTitle: 'سلة الحركة والمبيعات',
    cartEmpty: 'السلة فارغة حالياً',
    cartEmptyDesc: 'قم بمسح الباركود بالكاميرا أو اختيار الأصناف لإضافتها إلى السلة',
    quickSearchItems: 'ابحث عن صنف لإضافته...',
    scanOrEnterBarcode: 'امسح الباركود أو أدخل الرقم...',
    paymentType: 'نوع العملية',
    cashSale: 'بيع نقدي (كاش)',
    creditSale: 'بيع آجل (على الحساب)',
    cashPurchase: 'شراء / توريد نقدي',
    orderGoodsCash: 'طلب بضاعة نقداً',
    orderGoodsCredit: 'طلب بضاعة آجلاً',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقداً (كاش)',
    bankTransfer: 'تحويل بنكي',
    cardNetwork: 'شبكة / بطاقة',
    customerOrSupplierName: 'اسم العميل / المورد',
    customerName: 'اسم العميل',
    supplierName: 'اسم المورد',
    personName: 'الاسم',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    tax: 'الضريبة',
    grandTotal: 'المبلغ الإجمالي',
    amountPaid: 'المبلغ المدفوع',
    remainingDebtAmount: 'المبلغ المتبقي (آجل)',
    completeTransaction: 'إتمام العملية وطباعة الفاتورة',
    recentTransactions: 'سجل العمليات والفواتير السابقة',
    invoiceNumber: 'رقم الفاتورة',
    time: 'الوقت',
    printReceipt: 'طباعة الفاتورة',
    viewReceipt: 'عرض الفاتورة',

    // Order Goods / Purchases View
    orderGoodsTitle: 'توريد البضاعة والمشتريات',
    orderGoodsSubtitle: 'تسجيل طلبيات وشراء البضاعة من الموردين نقداً أو بالآجل',
    orderGoodsCashBtn: 'طلب وتوريد بضاعة (نقد)',
    orderGoodsCreditBtn: 'طلب وتوريد بضاعة (آجل)',
    orderGoodsModalTitle: 'طلب وتوريد كميات للمخزن',
    selectItemToOrder: 'اختر الصنف المطلوب توريده',
    orderQuantity: 'الكمية المطلوبة',
    supplierCostPrice: 'سعر التكلفة من المورد',
    supplierNameInput: 'اسم المورد أو الشركة',
    supplierPhoneInput: 'هاتف المورد',
    orderNotes: 'ملاحظات التوريد',
    submitOrder: 'تأكيد التوريد وإيداع البضاعة',
    orderHistory: 'سجل التوريدات والمشتريات',

    // Accounts & Balances View
    accountsTitle: 'جدول الحسابات والأرصدة المالية',
    accountsSubtitle: 'متابعة السيولة النقدية، الحساب البنكي، والمدفوعات الإلكترونية',
    treasuryCash: 'الخزينة النقدية (الكاش)',
    bankAccount: 'الحساب البنكي (التحويلات)',
    posCardAccount: 'المدفوعات الإلكترونية (الشبكة)',
    customerDebtsReceivable: 'ديون العملاء المستحقة لنا',
    supplierDebtsPayable: 'مستحقات الموردين علينا',
    financialOverview: 'نظرة عامة على التدفقات المالية',
    cashFlowSummary: 'ملخص حركة الأموال',
    totalInflows: 'إجمالي المقبوضات',
    totalOutflows: 'إجمالي المدفوعات',
    netLiquidity: 'صافي السيولة المتوفرة',

    // Debts & Loans View
    debtsTitle: 'إدارة الديون وسندات السداد والسلف',
    debtsSubtitle: 'متابعة ديون العملاء، التزامات الموردين، وسلف الموظفين',
    customersDebtsTab: 'ديون العملاء (آجل)',
    suppliersDebtsTab: 'مستحقات الموردين',
    personalLoansTab: 'السلف الشخصية والنقدية',
    recordNewLoan: 'تسجيل سلفة نقدية جديدة',
    recordPayment: 'تسجيل سند سداد دفعة',
    totalRemainingDebts: 'إجمالي الديون المتبقية',
    totalPaidSoFar: 'إجمالي المسدد حتى الآن',
    accumulatedDebt: 'إجمالي الدين المسجل',
    paymentHistory: 'سجل سندات السداد',
    loanHistory: 'سجل السلف والمسحوبات',
    payAmount: 'المبلغ المراد سداده',
    loanAmount: 'مبلغ السلفة',
    paymentSource: 'مصدر المبلغ',
    debtorName: 'اسم الشخص / العميل',
    receiptNumber: 'رقم السند',
    recordedBy: 'المسجل بواسطة',

    // Daily & Monthly Reports View
    dailyReportsTitle: 'التقارير اليومية والشهرية للمبيعات',
    dailyReportsSubtitle: 'ملخص الأداء المالي، إجمالي المبيعات، والأرباح المحققة مع خيارات التصدير والمشاركة',
    selectReportDate: 'اختر تاريخ التقرير',
    filterByCashier: 'تصفية حسب الكاشير',
    allCashiers: 'جميع الكاشيرات',
    dailyTotalSales: 'إجمالي مبيعات اليوم',
    dailyNetProfits: 'صافي أرباح اليوم',
    dailyTransactionsCount: 'عدد عمليات اليوم',
    salesByPaymentMethod: 'المبيعات حسب طريقة الدفع',
    topSellingItems: 'الأصناف الأكثر مبيعاً',
    hourlySalesBreakdown: 'توزيع المبيعات على مدار اليوم',
    printDailyReport: 'طباعة تقرير المبيعات',
    dailyReportTab: '📊 التقرير اليومي',
    monthlyReportTab: '🗓️ التقرير الشهري',
    perPersonReportTab: '👤 تقرير كل موظف (كاشير)',
    exportExcelBtn: 'تصدير إلى Excel (XLSX)',
    exportPdfBtn: 'تصدير إلى PDF',
    shareReportBtn: 'مشاركة التقرير',
    shareReportCopied: 'تم نسخ ملخص التقرير للحافظة لمشاركته عبر واتساب والتطبيقات!',
    selectMonthLabel: 'اختر الشهر:',
    monthSummaryTitle: 'ملخص مبيعات شهر',
    daySummaryTitle: 'ملخص مبيعات يوم',
    exportOptionsTitle: 'تصدير ومشاركة التقرير',
    exportOptionsDesc: 'تصدير بيانات التقرير بتنسيق Excel أو PDF لمشاركتها مع الإدارة أو المحاسب عبر واتساب والبريد الإلكتروني',

    // Stickers View
    stickersTitle: 'طباعة استيكرات وملصقات الباركود',
    stickersSubtitle: 'تصميم وطباعة ملصقات الأسعار والباركود للطابعات الحرارية والعادية',
    selectItemForSticker: 'اختر الصنف لطباعة استيكرات له',
    stickerCount: 'عدد الملصقات المطلوبة',
    labelSize: 'مقاس الملصق',
    showStoreNameOnSticker: 'إظهار اسم المتجر',
    showPriceOnSticker: 'إظهار السعر',
    showBarcodeTextOnSticker: 'إظهار أرقام الباركود',
    showItemNameOnSticker: 'إظهار اسم الصنف',
    printStickersNow: 'طباعة الملصقات الآن',
    previewStickers: 'معاينة الملصقات',

    // Modals & Scanner
    modalAddItemTitle: 'إضافة صنف جديد للمخزن',
    modalEditItemTitle: 'تعديل بيانات الصنف',
    itemBarcodeLabel: 'رقم الباركود',
    itemNameLabel: 'اسم الصنف',
    itemCategoryLabel: 'التصنيف / القسم',
    itemCostPriceLabel: 'سعر التكلفة',
    itemSalePriceLabel: 'سعر البيع',
    itemQuantityLabel: 'الكمية المتوفرة بالمخزن',
    itemMinStockLabel: 'حد التنبيه عند نقص الكمية',
    itemUnitLabel: 'الوحدة (حبة، كرتون، كيلو...)',
    itemNotesLabel: 'ملاحظات إضافية',
    saveItemBtn: 'حفظ الصنف',
    generateBarcode: 'توليد باركود تلقائي',
    cameraScannerTitle: 'مسح الباركود بكاميرا الجوال',
    cameraLookingForBarcode: 'وجه الكاميرا نحو الباركود للمسح التلقائي',
    flashToggle: 'تشغيل / إيقاف الفلاش',
    switchCamera: 'تبديل الكاميرا',
    barcodeNotFound: 'لم يتم العثور على صنف بهذا الباركود',
    addNewItemWithThisBarcode: 'إضافة صنف جديد بهذا الباركود',

    // Settings Modal
    settingsTitle: 'إعدادات النظام والمتجر',
    storeInformation: 'بيانات المتجر والنشاط',
    storeNameLabel: 'اسم المتجر / النشاط',
    storePhoneLabel: 'رقم الهاتف / الجوال',
    taxNumberLabel: 'الرقم الضريبي (إن وجد)',
    addressLabel: 'العنوان / الموقع',
    currencySettingLabel: 'رمز العملة الافتراضية',
    footerNoteLabel: 'ملاحظة أسفل الفواتير',
    backupAndRestore: 'النسخ الاحتياطي واستعادة البيانات',
    dangerZone: 'منطقة الخطر وإعادة التعيين',
    clearAllDataBtn: 'مسح جميع البيانات والبدء من الصفر',
    clearAllConfirmMsg: 'تحذير: سيتم حذف جميع الأصناف، الفواتير، والديون نهائياً. هل أنت متأكد؟',

    // Cloud & Multi-Tenant Security
    cloudSyncTitle: 'المزامنة السحابية والحماية',
    cloudSynced: 'متصل ومتزامن مع السحابة',
    cloudSyncing: 'جارٍ المزامنة وحفظ البيانات...',
    cloudOffline: 'وضع العمل السريع (Offline)',
    cloudError: 'تعذر الاتصال بالسحابة',
    loginTitle: 'تسجيل الدخول للنظام المحاسبي',
    loginSubtitle: 'حماية بيانات المتجر وعزل الحسابات بأعلى معايير الأمان العالمية',
    loginWithGoogle: 'المتابعة بحساب Google',
    loginWithEmail: 'تسجيل الدخول بالبريد الإلكتروني',
    createAccount: 'إنشاء حساب تاجر جديد',
    alreadyHaveAccount: 'لديك حساب بالفعل؟ تسجيل الدخول',
    dontHaveAccount: 'ليس لديك حساب؟ إنشاء حساب جديد',
    emailPlaceholder: 'name@example.com',
    passwordPlaceholder: 'كلمة المرور (6 خانات فأكثر)',
    storeNamePlaceholder: 'اسم المتجر أو المؤسسة التجارية',
    displayNamePlaceholder: 'اسمك الكامل أو اسم المدير',
    signInBtn: 'دخول إلى متجري',
    signUpBtn: 'تسجيل حساب جديد وتجهيز المتجر',
    signOutBtn: 'تسجيل الخروج',
    roleOwner: 'مالك المتجر (صلاحيات كاملة)',
    roleManager: 'مدير العمليات',
    roleCashier: 'كاشير مبيعات',
    accountSecurityNote: 'بيانات هذا المتجر مشفرة ومعزولة سحابياً وخاصة بك فقط ولا يمكن لأي مستخدم آخر الوصول إليها.',

    // Cloud Backups & Auto-Protection
    cloudBackupsTitle: 'النسخ الاحتياطي السحابي وحماية البيانات',
    cloudBackupsSubtitle: 'حفظ نسخ كاملة ومشفرة في Firebase لضمان عدم ضياع أي فاتورة أو صنف عند تبديل الأجهزة أو فقدان الاتصال',
    createManualBackupBtn: 'إنشاء نسخة احتياطية سحابية الآن',
    creatingBackup: 'جارٍ إنشاء النسخة وحفظها في السحابة...',
    backupSuccessMsg: 'تم أخذ النسخة الاحتياطية السحابية وتأمينها بنجاح!',
    autoBackupSettings: 'النسخ الاحتياطي التلقائي',
    autoBackupEnabledLabel: 'تفعيل الحفظ التلقائي في السحابة',
    autoBackupIntervalLabel: 'تكرار النسخ التلقائي كل',
    min15: '15 دقيقة',
    min30: '30 دقيقة',
    hour1: 'ساعة واحدة',
    lastBackupLabel: 'آخر نسخة احتياطية:',
    noBackupsFound: 'لا توجد نسخ احتياطية سحابية بعد. قم بإنشاء نسختك الأولى لتأمين متجرك.',
    restoreBackupBtn: 'استعادة هذه النسخة',
    restoringBackup: 'جارٍ استعادة البيانات وتحديث المخزون...',
    restoreSuccessMsg: 'تمت استعادة النسخة الاحتياطية بنجاح وتحديث كافة السجلات!',
    restoreConfirmTitle: 'تأكيد استعادة النسخة الاحتياطية',
    restoreConfirmDesc: 'سيتم استبدال البيانات الحالية بالبيانات الموجودة في هذه النسخة الاحتياطية. هل أنت متأكد؟',
    deleteBackupBtn: 'حذف النسخة',
    backupTypeManual: 'نسخة يدوية',
    backupTypeAuto: 'نسخة تلقائية دورية',
    downloadBackupJSON: 'تحميل ملف النسخة (JSON)',
    deviceSwitchReady: 'جاهز لتبديل الأجهزة والعمل من أي هاتف/كمبيوتر',
    deviceSwitchReadyDesc: 'بمجرد تسجيل الدخول بحسابك من أي جهاز جديد، ستجد جميع أصنافك وفواتيرك وديونك محفوظة فورياً.',
    manualJsonBackupTitle: 'النسخ الاحتياطي اليدوي لقاعدة البيانات (JSON)',
    manualJsonBackupSubtitle: 'تصدير وتأمين نسخة كاملة لقاعدة بيانات المتجر كملف JSON محلي أو استعادتها لضمان حماية بياناتك بنسبة 100%.',
    exportDatabaseJsonBtn: 'تصدير وتنزيل نسخة JSON',
    importDatabaseJsonBtn: 'استيراد واستعادة من ملف JSON',
    dragDropJsonPrompt: 'اسحب وأفلت ملف النسخة (.json) هنا، أو انقر للاختيار من جهازك',
    databaseBackupSecuredMsg: 'تم تصدير وتنزيل نسخة احتياطية يدوية شاملة لقاعدة البيانات بصيغة JSON بنجاح!',
    databaseRestoredSuccessMsg: 'تمت استعادة قاعدة البيانات بنجاح وتحديث كافة المنتجات والفواتير والديون!',
    invalidJsonFileMsg: 'الملف المحدد غير صالح أو لا يحتوي على بنية بيانات فلو اب الصحيحة.',
    restoreModeReplace: 'استبدال كامل شامل (يوصى به لجهاز جديد)',
    restoreModeMerge: 'دمج ذكي مع البيانات الحالية (الحفاظ على كافة البيانات)',
    databaseSnapshotSummary: 'ملخص محتويات ملف النسخة الاحتياطية',

    // Reorder & Low Stock Alerts
    reorderAlertsTitle: 'تنبيهات حد الطلب والمخزون الحرج',
    reorderAlertsSubtitle: 'الأصناف التي وصل مخزونها إلى حد الطلب المحدد أو أقل وتحتاج إلى إعادة توريد فورية',
    itemsReachedReorder: 'أصناف وصلت لحد الطلب',
    itemsNeedReorderCount: 'أصناف تحتاج إعادة طلب',
    noReorderAlerts: 'المخزون ممتاز! لا توجد أصناف وصلت لحد الطلب في الوقت الحالي.',
    reorderPoint: 'حد الطلب',
    currentStock: 'الرصيد الحالي',
    deficitQuantity: 'الكمية المطلوبة لتغطية العجز',
    quickReorder: 'طلب بضاعة الآن',
    reorderAllDeficitItems: 'طلب توريد كافة الأصناف الناقصة (تحويل لطلب البضاعة)',
    reorderAlertBanner: 'تنبيه مخزون: {count} أصناف وصلت لحد الطلب أو نفدت تماماً',
    viewAllLowStock: 'عرض جميع الأصناف المنخفضة',
    stockStatusCritical: 'نفد المخزون بالكامل (0)',
    stockStatusWarning: 'وصل لحد الطلب الأدنى',
    stockStatusGood: 'مخزون وفير',
    outOfStock: 'نفد من المخزن',
    lowStockBadge: 'حد الطلب',

    // Multi-Currency & Exchange Rates
    multiCurrencyTitle: 'تعدد العملات وأسعار الصرف',
    multiCurrencySubtitle: 'إدارة العملات المقبولة وأسعار الصرف وتحويل المبالغ لحظياً لتسهيل التعاملات في مختلف الدول',
    baseCurrency: 'العملة الأساسية للمتجر',
    baseCurrencyDesc: 'العملة الرسمية المعتمدة لتقييم المخزون وحساب الأرباح والتقارير المحاسبية',
    secondaryDisplayCurrency: 'العملة الثانوية للعرض',
    secondaryDisplayCurrencyDesc: 'تظهر بجانب السعر الأساسي في الفواتير والشاشات لتسهيل التعامل مع الزبائن والسياح',
    showDualCurrencyOnReceipts: 'إظهار السعر المزدوج بالعملة الثانوية في الإيصالات والفواتير',
    fetchLiveRates: 'تحديث أسعار الصرف الحية عبر الإنترنت',
    fetchingRates: 'جارٍ جلب أسعار الصرف العالمية المحدثة...',
    ratesUpdatedSuccess: 'تم تحديث أسعار الصرف الحية بنجاح!',
    ratesUpdatedFallback: 'تم ضبط أسعار الصرف المرجعية المعيارية بدقة عالية',
    exchangeRatesTable: 'جدول أسعار الصرف بالنسبة للعملة الأساسية',
    exchangeRateLabel: 'سعر الصرف',
    inverseRateLabel: 'السعر العكسي',
    customRate: 'سعر يدوي مخصص',
    resetToMarketRate: 'استعادة السعر العالمي',
    currencyConverterTitle: 'حاسبة وتحويل العملات الفورية',
    currencyConverterDesc: 'حساب وتحويل أي مبلغ فوري بين مختلف العملات بأسعار الصرف المعتمدة',
    amountToConvert: 'المبلغ المراد تحويله',
    fromCurrency: 'من عملة',
    toCurrency: 'إلى عملة',
    convertedResult: 'المبلغ بعد التحويل',
    rateLastUpdated: 'آخر تحديث لأسعار الصرف:',
    payWithOtherCurrency: 'الدفع بعملة أخرى مع تحويل فوري',
    paymentCurrency: 'عملة السداد المستلمة',
    equivalentInBase: 'المعادل بالعملة الأساسية للمتجر',
    tenderedAmount: 'المبلغ المستلم بالعملة الأجنبية',
    changeDue: 'المتبقي كباقي للعميل',
    enabledCurrencies: 'العملات الإضافية المفعلة',
  },

  en: {
    // General
    appName: 'FlowApp',
    appSubtitle: 'Inventory & POS Management System',
    verticalDashboard: 'Vertical Dashboard',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    switchLanguage: 'Switch Language',
    currency: 'Currency',
    activeCurrency: 'Active Currency',
    advancedSettings: 'Advanced Settings',
    cashier: 'Cashier',
    activeEmployee: 'Active Staff',
    cashRegister: 'Cash Register',
    cashInHand: 'Cash in Hand',
    cashBalance: 'Cash Balance',
    bankBalance: 'Bank Balance',
    cardBalance: 'Card / POS Balance',
    search: 'Search',
    searchPlaceholder: 'Search by name, barcode, or category...',
    filter: 'Filter',
    allCategories: 'All Categories',
    actions: 'Actions',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    print: 'Print',
    export: 'Export',
    exportBackup: 'Export Backup',
    import: 'Import',
    importBackup: 'Import Backup',
    reset: 'Reset',
    resetDefaultData: 'Reset to Sample Data',
    confirmResetMsg: 'Are you sure you want to reset to default sample data?',
    confirmDeleteMsg: 'Are you sure you want to delete? This action cannot be undone.',
    loading: 'Loading...',
    success: 'Operation completed successfully',
    error: 'An error occurred',
    clear: 'Clear',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    total: 'Total',
    quantity: 'Quantity',
    price: 'Price',
    costPrice: 'Cost Price',
    salePrice: 'Sale Price',
    profit: 'Profit',
    profitMargin: 'Profit Margin',
    notes: 'Notes',
    date: 'Date',
    status: 'Status',
    completed: 'Completed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    phone: 'Phone Number',
    name: 'Name',
    barcode: 'Barcode',
    category: 'Category',
    unit: 'Unit',
    piece: 'Pcs',
    itemsCount: 'Items Count',
    units: 'Units',
    details: 'Details',
    noData: 'No Data Available',
    noMatchingData: 'No matching items found',

    // Navigation
    navMainMenus: 'Main Menus',
    navSectionOverview: 'Overview & Control',
    navSectionCatalog: 'Catalog & Barcode',
    navSectionSalesProcurement: 'Daily Sales & Purchasing',
    navSectionFinanceReports: 'Finance, Accounts & Reports',
    navDashboard: 'Dashboard',
    navDashboardSub: 'Sales, debts & stock summary',
    navItems: 'Items & Inventory',
    navItemsSub: 'Manage stock & prices',
    navStickers: 'Barcode Labels',
    navStickersSub: 'Print barcodes & price tags',
    navTransactions: 'Transactions & POS',
    navTransactionsSub: 'Fast sales cashier & scanner',
    navOrderGoods: 'Goods Supply & Orders',
    navOrderGoodsSub: 'Supplier orders & purchases',
    navAccounts: 'Accounts & Balances',
    navAccountsSub: 'Cash • Bank • Card',
    navDebts: 'Debts & Repayments',
    navDebtsSub: 'Customers, suppliers & loans',
    navDailyReports: 'Daily Sales Reports',
    navDailyReportsSub: 'Daily cashier sales & reports',
    navSettings: 'Settings',
    quickAddItem: 'Quick Add Item',
    quickOrderGoods: 'Order & Supply Goods',
    expandMenu: 'Expand Menu',
    collapseMenu: 'Collapse Menu',
    openMainMenu: 'Open Main Menu',

    // Dashboard View
    dashboardTitle: 'Main Dashboard & Key Indicators',
    dashboardSubtitle: 'Live overview of store performance, daily sales, debts and critical inventory',
    todaySales: "Today's Total Sales",
    todaySalesCount: "Today's Invoices Count",
    todayProfitEst: "Today's Estimated Profit",
    totalDebtsDue: 'Total Outstanding Debts',
    customerDebtsDue: 'Customer Debts (Credit)',
    supplierDebtsDue: 'Supplier Dues',
    personalLoansDue: 'Personal Loans',
    debtorsCount: 'Active Debtors Count',
    lowStockAlerts: 'Low Stock Items',
    outOfStockAlerts: 'Out of Stock Items',
    safeStock: 'Stock is in Safe Level',
    salesTrend7Days: 'Sales Trend (Last 7 Days)',
    paymentMethodsDistribution: "Today's Payment Methods Distribution",
    inventoryValueCost: 'Inventory Value (Cost)',
    inventoryValueSale: 'Inventory Value (Sale Price)',
    criticalStockTitle: 'Critical Items to Reorder Immediately',
    recentTransactionsToday: "Today's Recent Sales & Invoices",
    quickActions: 'Quick Actions',
    newSaleInvoice: 'New Sale (POS)',
    manageDebts: 'Manage Debts',
    reorderGoods: 'Order & Supply Goods',
    viewAllItems: 'View All Items',
    viewAllTransactions: 'View All Transactions',
    noSalesToday: 'No sales recorded for today yet',
    noLowStockItems: 'Inventory is healthy, no items are currently running low',
    cashRegisterBalance: 'Available Cash & Vault Balance',

    // Items View
    itemsListTitle: 'Items & Inventory List',
    totalRegisteredItems: 'Total Registered Items',
    scanBarcodeCamera: 'Scan Barcode with Camera',
    scanBarcodeCameraDesc: 'Scan barcode via mobile camera to lookup item details and price',
    addNewItem: 'Add New Item',
    totalIncomeRevenue: 'Total Revenue (Sales)',
    totalSalesRegistered: 'Total Recorded Sales',
    netSalesProfit: 'Net Sales Profit',
    stockMargin: 'Stock Margin',
    stockCapitalCost: 'Inventory Value (Cost)',
    totalStockUnitsInStore: 'Total Stock Units in Store',
    lowStockItems: 'Low Stock & Depleted',
    shortagesCount: 'low stock items',
    showShortagesOnly: 'Show Shortages',
    cancelShortageFilter: 'Clear Filter',
    needRestock: 'Needs restocking from suppliers',
    allStockAdequate: 'All items have sufficient stock',
    itemNameAndCategory: 'Item Name & Category',
    quantityInStore: 'Stock Quantity',
    totalQuantityValue: 'Total Stock Value',
    costTotal: 'Cost',
    showingItemsCount: 'Showing',
    autoStockUpdateNotice: 'Stock calculations and inventory value update automatically',
    printSticker: 'Print Sticker',
    editItem: 'Edit Item',
    deleteItem: 'Delete Item',
    lowStockWarning: 'Warning: Low Stock',
    tableBarcode: 'Barcode',
    tableNameCategory: 'Item Name & Category',
    tableStockQty: 'Stock Qty',
    tableCostPrice: 'Cost Price',
    tableSalePrice: 'Sale Price',
    tableTotalValue: 'Total Value',
    tableActions: 'Actions',
    itemActivityTracking: 'Status & Activity Tracking',
    lastSaleLabel: 'Last Sale',
    lastPurchaseLabel: 'Last Purchase',
    noSalesYet: 'No sales recorded',
    noPurchasesYet: 'No supply recorded',
    viewMovementHistory: 'Item Movement History',
    fastMoving: 'Recent Sale',
    activeMoving: 'Active',
    stagnantItem: 'Stagnant Item',
    newItem: 'New Item',
    awaitingSupply: 'Awaiting Delivery',
    filterAllMovements: 'All Movement Statuses',
    filterStagnant: 'Stagnant (Slow Moving)',
    filterRecentSales: 'Recently Sold (Last 7d)',
    filterAwaitingSupply: 'Awaiting Delivery',
    sortByLastSale: 'Last Sale Date',
    sortByLastPurchase: 'Last Purchase Date',

    // POS / Transactions View
    posTitle: 'Point of Sale & Transactions (POS)',
    posCartTitle: 'Cart & Active Order',
    cartEmpty: 'Cart is currently empty',
    cartEmptyDesc: 'Scan barcode using camera or select items to add them to cart',
    quickSearchItems: 'Search item to add...',
    scanOrEnterBarcode: 'Scan barcode or enter code...',
    paymentType: 'Transaction Type',
    cashSale: 'Cash Sale',
    creditSale: 'Credit Sale (On Account)',
    cashPurchase: 'Cash Purchase / Inward',
    orderGoodsCash: 'Order Goods (Cash)',
    orderGoodsCredit: 'Order Goods (Credit)',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    bankTransfer: 'Bank Transfer',
    cardNetwork: 'Card / Network',
    customerOrSupplierName: 'Customer / Supplier Name',
    customerName: 'Customer Name',
    supplierName: 'Supplier Name',
    personName: 'Name',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    grandTotal: 'Grand Total',
    amountPaid: 'Amount Paid',
    remainingDebtAmount: 'Remaining Debt (Due)',
    completeTransaction: 'Complete Transaction & Print Receipt',
    recentTransactions: 'Recent Transactions & Invoices',
    invoiceNumber: 'Invoice #',
    time: 'Time',
    printReceipt: 'Print Receipt',
    viewReceipt: 'View Receipt',

    // Order Goods / Purchases View
    orderGoodsTitle: 'Goods Supply & Orders',
    orderGoodsSubtitle: 'Record purchase orders and goods delivery in cash or credit',
    orderGoodsCashBtn: 'Order Goods (Cash)',
    orderGoodsCreditBtn: 'Order Goods (Credit)',
    orderGoodsModalTitle: 'Order Stock to Inventory',
    selectItemToOrder: 'Select Item to Order',
    orderQuantity: 'Order Quantity',
    supplierCostPrice: 'Supplier Cost Price',
    supplierNameInput: 'Supplier / Company Name',
    supplierPhoneInput: 'Supplier Phone',
    orderNotes: 'Supply Notes',
    submitOrder: 'Confirm & Deposit into Stock',
    orderHistory: 'Supply & Purchase History',

    // Accounts & Balances View
    accountsTitle: 'Accounts & Financial Balances',
    accountsSubtitle: 'Monitor cash in hand, bank balance, and electronic POS payments',
    treasuryCash: 'Cash in Hand (Treasury)',
    bankAccount: 'Bank Account (Transfers)',
    posCardAccount: 'POS & Card Payments',
    customerDebtsReceivable: 'Customer Receivables Due',
    supplierDebtsPayable: 'Supplier Payables Due',
    financialOverview: 'Financial Cashflow Overview',
    cashFlowSummary: 'Cash Flow Summary',
    totalInflows: 'Total Inflows',
    totalOutflows: 'Total Outflows',
    netLiquidity: 'Net Available Liquidity',

    // Debts & Loans View
    debtsTitle: 'Debts, Repayments & Cash Loans',
    debtsSubtitle: 'Track customer balances, supplier obligations, and staff loans',
    customersDebtsTab: 'Customer Debts (Credit)',
    suppliersDebtsTab: 'Supplier Payables',
    personalLoansTab: 'Personal & Cash Loans',
    recordNewLoan: 'Record New Cash Loan',
    recordPayment: 'Record Repayment Receipt',
    totalRemainingDebts: 'Total Remaining Debts',
    totalPaidSoFar: 'Total Paid So Far',
    accumulatedDebt: 'Total Recorded Debt',
    paymentHistory: 'Repayment Receipts History',
    loanHistory: 'Loan Advances History',
    payAmount: 'Payment Amount',
    loanAmount: 'Loan Amount',
    paymentSource: 'Payment Source',
    debtorName: 'Debtor / Contact Name',
    receiptNumber: 'Receipt #',
    recordedBy: 'Recorded By',

    // Daily Reports View
    dailyReportsTitle: 'Daily Sales Reports',
    dailyReportsSubtitle: 'Daily performance summary, total sales revenue, and net profit',
    selectReportDate: 'Select Report Date',
    filterByCashier: 'Filter by Cashier',
    allCashiers: 'All Cashiers',
    dailyTotalSales: 'Today\'s Total Sales',
    dailyNetProfits: 'Today\'s Net Profit',
    dailyTransactionsCount: 'Today\'s Transactions',
    salesByPaymentMethod: 'Sales by Payment Method',
    topSellingItems: 'Top Selling Items',
    hourlySalesBreakdown: 'Hourly Sales Breakdown',
    printDailyReport: 'Print Daily Sales Report',

    // Stickers View
    stickersTitle: 'Print Barcode Labels & Stickers',
    stickersSubtitle: 'Design and print price tags and barcode labels for thermal and standard printers',
    selectItemForSticker: 'Select Item to Print Labels',
    stickerCount: 'Number of Labels',
    labelSize: 'Label Size',
    showStoreNameOnSticker: 'Show Store Name',
    showPriceOnSticker: 'Show Price',
    showBarcodeTextOnSticker: 'Show Barcode Text',
    showItemNameOnSticker: 'Show Item Name',
    printStickersNow: 'Print Labels Now',
    previewStickers: 'Preview Labels',

    // Modals & Scanner
    modalAddItemTitle: 'Add New Item to Inventory',
    modalEditItemTitle: 'Edit Item Information',
    itemBarcodeLabel: 'Barcode Number',
    itemNameLabel: 'Item Name',
    itemCategoryLabel: 'Category / Department',
    itemCostPriceLabel: 'Cost Price',
    itemSalePriceLabel: 'Sale Price',
    itemQuantityLabel: 'Available Quantity in Stock',
    itemMinStockLabel: 'Low Stock Alert Threshold',
    itemUnitLabel: 'Unit (Piece, Box, Kg...)',
    itemNotesLabel: 'Additional Notes',
    saveItemBtn: 'Save Item',
    generateBarcode: 'Generate Random Barcode',
    cameraScannerTitle: 'Scan Barcode with Camera',
    cameraLookingForBarcode: 'Point camera at barcode for instant scanning',
    flashToggle: 'Toggle Flashlight',
    switchCamera: 'Switch Camera',
    barcodeNotFound: 'No item found with this barcode',
    addNewItemWithThisBarcode: 'Add New Item with this Barcode',

    // Settings Modal
    settingsTitle: 'System & Store Settings',
    storeInformation: 'Store & Business Information',
    storeNameLabel: 'Store / Business Name',
    storePhoneLabel: 'Phone / Mobile Number',
    taxNumberLabel: 'Tax ID (if applicable)',
    addressLabel: 'Address / Location',
    currencySettingLabel: 'Default Currency Symbol',
    footerNoteLabel: 'Invoice Footer Note',
    backupAndRestore: 'Backup & Restore Data',
    dangerZone: 'Danger Zone & Reset',
    clearAllDataBtn: 'Clear All Data & Start Fresh',
    clearAllConfirmMsg: 'Warning: All items, invoices, and debts will be permanently deleted. Are you sure?',

    // Cloud & Multi-Tenant Security
    cloudSyncTitle: 'Cloud Sync & Isolation',
    cloudSynced: 'Connected & Synced with Cloud',
    cloudSyncing: 'Syncing store data...',
    cloudOffline: 'Offline Fast Mode',
    cloudError: 'Could not connect to cloud',
    loginTitle: 'Secure Merchant Login',
    loginSubtitle: 'Enterprise-grade isolation and zero-lag point of sale system',
    loginWithGoogle: 'Continue with Google',
    loginWithEmail: 'Sign in with Email',
    createAccount: 'Register New Merchant Account',
    alreadyHaveAccount: 'Already have an account? Sign In',
    dontHaveAccount: "Don't have an account? Create one",
    emailPlaceholder: 'name@example.com',
    passwordPlaceholder: 'Password (min 6 characters)',
    storeNamePlaceholder: 'Store or Company Name',
    displayNamePlaceholder: 'Your Name or Manager Name',
    signInBtn: 'Sign In to Store',
    signUpBtn: 'Create Account & Setup Store',
    signOutBtn: 'Sign Out',
    roleOwner: 'Store Owner (Full Access)',
    roleManager: 'Operations Manager',
    roleCashier: 'Sales Cashier',
    accountSecurityNote: 'Your store records are cryptographically isolated and secure. Only your authenticated user account has access.',

    // Cloud Backups & Auto-Protection
    cloudBackupsTitle: 'Cloud Backups & Data Protection',
    cloudBackupsSubtitle: 'Store complete encrypted snapshots in Firebase to prevent data loss across devices or during connectivity drops',
    createManualBackupBtn: 'Create Cloud Backup Now',
    creatingBackup: 'Creating snapshot and uploading to cloud...',
    backupSuccessMsg: 'Cloud backup snapshot created and secured successfully!',
    autoBackupSettings: 'Automatic Cloud Backup',
    autoBackupEnabledLabel: 'Enable periodic auto-backup to Firebase',
    autoBackupIntervalLabel: 'Auto-backup frequency',
    min15: '15 minutes',
    min30: '30 minutes',
    hour1: '1 hour',
    lastBackupLabel: 'Last backup created:',
    noBackupsFound: 'No cloud backups found yet. Create your first snapshot to secure your store.',
    restoreBackupBtn: 'Restore This Backup',
    restoringBackup: 'Restoring data and synchronizing inventory...',
    restoreSuccessMsg: 'Backup restored successfully! All records have been updated.',
    restoreConfirmTitle: 'Confirm Backup Restoration',
    restoreConfirmDesc: 'Current store records will be replaced with data from this snapshot. Are you sure you want to proceed?',
    deleteBackupBtn: 'Delete Snapshot',
    backupTypeManual: 'Manual Snapshot',
    backupTypeAuto: 'Scheduled Auto-Backup',
    downloadBackupJSON: 'Download Backup JSON File',
    deviceSwitchReady: 'Ready for device switching (Phones, Tablets & PCs)',
    deviceSwitchReadyDesc: 'Logging in from any new device will instantly retrieve and synchronize your full store inventory, sales, and debts.',
    manualJsonBackupTitle: 'Manual Database Backup (JSON)',
    manualJsonBackupSubtitle: 'Export and secure a complete store database snapshot as a local JSON file or restore it anytime with 100% data assurance.',
    exportDatabaseJsonBtn: 'Export Database JSON',
    importDatabaseJsonBtn: 'Import & Restore from JSON',
    dragDropJsonPrompt: 'Drag and drop backup file (.json) here, or click to select from your device',
    databaseBackupSecuredMsg: 'Complete database JSON backup exported and secured successfully!',
    databaseRestoredSuccessMsg: 'Database restored successfully! Products, sales, and debts are up to date.',
    invalidJsonFileMsg: 'The selected file is invalid or does not match the FlowApp store database format.',
    restoreModeReplace: 'Full Replace (Recommended for fresh setup/new device)',
    restoreModeMerge: 'Smart Merge with current data (Keeps all records intact)',
    databaseSnapshotSummary: 'Backup Snapshot Contents Summary',

    // Reorder & Low Stock Alerts
    reorderAlertsTitle: 'Reorder Point & Stock Alerts',
    reorderAlertsSubtitle: 'Items where current inventory has dropped to or below the designated reorder limit and need restocking',
    itemsReachedReorder: 'Items at or below reorder limit',
    itemsNeedReorderCount: 'Items Requiring Reorder',
    noReorderAlerts: 'Inventory is healthy! No items have reached the reorder point.',
    reorderPoint: 'Reorder Point',
    currentStock: 'Current Stock',
    deficitQuantity: 'Deficit Quantity',
    quickReorder: 'Reorder Now',
    reorderAllDeficitItems: 'Reorder All Deficit Items (Open Order Goods)',
    reorderAlertBanner: 'Stock Alert: {count} items reached reorder level or ran out of stock',
    viewAllLowStock: 'View All Low Stock Items',
    stockStatusCritical: 'Out of Stock (0)',
    stockStatusWarning: 'Reached Reorder Limit',
    stockStatusGood: 'Well Stocked',
    outOfStock: 'Out of Stock',
    lowStockBadge: 'Reorder Level',

    // Multi-Currency & Exchange Rates
    multiCurrencyTitle: 'Multi-Currency & Exchange Rates',
    multiCurrencySubtitle: 'Manage accepted currencies, live exchange rates, and instant cross-currency conversions for international and local operations',
    baseCurrency: 'Base Store Currency',
    baseCurrencyDesc: 'The primary accounting currency used for store inventory valuation, profits, and financial reporting',
    secondaryDisplayCurrency: 'Secondary Display Currency',
    secondaryDisplayCurrencyDesc: 'Shown alongside the base price on sales receipts and POS displays for foreign customers and tourists',
    showDualCurrencyOnReceipts: 'Show dual-currency total on invoices and printed receipts',
    fetchLiveRates: 'Update Live Exchange Rates Online',
    fetchingRates: 'Fetching live global exchange rates...',
    ratesUpdatedSuccess: 'Exchange rates updated successfully!',
    ratesUpdatedFallback: 'High-precision standard benchmark exchange rates applied',
    exchangeRatesTable: 'Exchange Rates vs Base Currency',
    exchangeRateLabel: 'Exchange Rate',
    inverseRateLabel: 'Inverse Rate',
    customRate: 'Custom Manual Rate',
    resetToMarketRate: 'Reset to Market Rate',
    currencyConverterTitle: 'Instant Currency Converter Calculator',
    currencyConverterDesc: 'Convert any amount between supported currencies using active store exchange rates',
    amountToConvert: 'Amount to Convert',
    fromCurrency: 'From Currency',
    toCurrency: 'To Currency',
    convertedResult: 'Converted Amount',
    rateLastUpdated: 'Rates last updated:',
    payWithOtherCurrency: 'Pay with Foreign Currency (Instant Convert)',
    paymentCurrency: 'Tendered Currency',
    equivalentInBase: 'Equivalent in Base Currency',
    tenderedAmount: 'Tendered Amount',
    changeDue: 'Change Due',
    enabledCurrencies: 'Enabled Additional Currencies',

    // Daily & Monthly Reports Export
    dailyReportTab: '📊 Daily Report',
    monthlyReportTab: '🗓️ Monthly Report',
    perPersonReportTab: '👤 Per Person Report',
    exportExcelBtn: 'Export to Excel (XLSX)',
    exportPdfBtn: 'Export to PDF',
    shareReportBtn: 'Share Report',
    shareReportCopied: 'Report summary copied to clipboard for WhatsApp and app sharing!',
    selectMonthLabel: 'Select Month:',
    monthSummaryTitle: 'Monthly Sales Summary for',
    daySummaryTitle: 'Daily Sales Summary for',
    exportOptionsTitle: 'Export & Share Report',
    exportOptionsDesc: 'Export report data to Excel or PDF format to share with management or accountants via WhatsApp and Email',
  },
};
