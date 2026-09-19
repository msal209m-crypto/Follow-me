import introJs from 'intro.js';
import 'intro.js/introjs.css';
import 'intro.js/introjs-rtl.css';

export interface TourOptions {
  language: string;
  activeMerchantId?: string | null;
  storeName?: string;
  onNavigateToTab?: (tab: string) => void;
  onOpenAddItem?: () => void;
  onOpenSettings?: () => void;
}

export const getTourStorageKey = (merchantId?: string | null): string => {
  return merchantId ? `qaryati_onboarding_tour_${merchantId}` : 'qaryati_onboarding_tour_default';
};

export const hasCompletedTour = (merchantId?: string | null): boolean => {
  try {
    const key = getTourStorageKey(merchantId);
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

export const markTourCompleted = (merchantId?: string | null): void => {
  try {
    const key = getTourStorageKey(merchantId);
    localStorage.setItem(key, 'true');
  } catch (e) {
    console.warn('Failed to save tour completion flag', e);
  }
};

export const resetTourStatus = (merchantId?: string | null): void => {
  try {
    const key = getTourStorageKey(merchantId);
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Failed to reset tour status', e);
  }
};

/**
 * Attaches touch gesture handling to allow the mobile bottom-sheet tooltip
 * to be smoothly dragged and swiped down to dismiss, matching native mobile UX.
 */
const setupMobileSwipeToDismiss = (introInstance: any, onDismiss: () => void): void => {
  if (typeof window === 'undefined' || window.innerWidth >= 640) return;

  const tooltip = document.querySelector<HTMLElement>('.introjs-tooltip');
  if (!tooltip || tooltip.dataset.swipeHandlerAttached === 'true') return;

  tooltip.dataset.swipeHandlerAttached = 'true';

  let startY = 0;
  let currentY = 0;
  let startTime = 0;
  let isDragging = false;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startY = touch.clientY;
    currentY = touch.clientY;
    startTime = Date.now();
    isDragging = false;
    tooltip.style.transition = 'none';
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    currentY = touch.clientY;
    const deltaY = currentY - startY;

    // Check if the user is scrolling text inside .introjs-tooltiptext
    const textEl = tooltip.querySelector<HTMLElement>('.introjs-tooltiptext');
    const isTextScrolled = textEl && textEl.scrollTop > 0;

    // Only initiate sheet drag downwards if the internal text container is at top
    if (deltaY > 0 && !isTextScrolled) {
      isDragging = true;
      const resistanceDeltaY = Math.max(0, deltaY);
      tooltip.style.transform = `translateY(${resistanceDeltaY}px)`;
      tooltip.style.opacity = `${Math.max(0.3, 1 - resistanceDeltaY / 360)}`;
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) {
      tooltip.style.transform = '';
      tooltip.style.opacity = '';
      return;
    }

    const deltaY = currentY - startY;
    const deltaTime = Math.max(1, Date.now() - startTime);
    const velocity = deltaY / deltaTime; // px per millisecond

    // Dismiss if dragged down by > 65px or flicked down rapidly (velocity > 0.4px/ms)
    if (deltaY > 65 || (deltaY > 20 && velocity > 0.4)) {
      tooltip.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out';
      tooltip.style.transform = 'translateY(100%)';
      tooltip.style.opacity = '0';

      setTimeout(() => {
        try {
          introInstance.exit(true);
        } catch {
          // Ignore
        }
        onDismiss();
      }, 190);
    } else {
      // Spring back up smoothly
      tooltip.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease-out';
      tooltip.style.transform = 'translateY(0)';
      tooltip.style.opacity = '1';

      setTimeout(() => {
        tooltip.style.transition = '';
        tooltip.style.transform = '';
        tooltip.style.opacity = '';
      }, 230);
    }

    isDragging = false;
  };

  tooltip.addEventListener('touchstart', onTouchStart, { passive: true });
  tooltip.addEventListener('touchmove', onTouchMove, { passive: false });
  tooltip.addEventListener('touchend', onTouchEnd, { passive: true });
  tooltip.addEventListener('touchcancel', onTouchEnd, { passive: true });
};

export const startMerchantOnboardingTour = (options: TourOptions): void => {
  const { language, activeMerchantId, storeName } = options;
  const isAr = language === 'ar';

  const intro = introJs();

  // Define steps with fallback to visible elements
  const steps: any[] = [
    {
      title: isAr ? 'مرحباً بك في لوحة تحكم متجرك! 🎉' : 'Welcome to Your Store Dashboard! 🎉',
      intro: isAr
        ? `أهلاً بك في متجر <strong>${storeName || 'متجرك الجديد'}</strong>! سنأخذك في جولة سريعة وموجزة لنتعرف معاً على كيفية ضبط إعدادات متجرك، وإضافة أول صنف، واستقبال مبيعاتك وطلبات التوصيل بسهولة.`
        : `Welcome to <strong>${storeName || 'Your Store'}</strong>! We will take you on a quick walkthrough to show how to configure your store, add your first product, and manage sales & deliveries.`,
    },
    {
      element: '#top-btn-settings',
      title: isAr ? '⚙️ إعدادات المتجر والفواتير' : '⚙️ Store & Invoice Settings',
      intro: isAr
        ? 'من هنا يمكنك ضبط بيانات متجرك الأساسية: تغيير اسم المتجر، رقم التواصل، الشعار، العملة الافتراضية، وضبط نسبة الضريبة وترويسة فواتير البيع.'
        : 'Configure your primary store details here: store name, phone, logo, default currency, tax rate, and receipt headers.',
      position: 'bottom',
    },
    {
      element: '#dashboard-btn-add-item',
      title: isAr ? '📦 إضافة أول صنف للمخزون' : '📦 Add Your First Product',
      intro: isAr
        ? 'الخطوة الأهم! اضغط هنا لإدخال أول صنف لمتجرك: اكتب اسم المنتج، وامسح الباركود، وحدد سعر الشراء وسعر البيع وكمية المخزون الافتتاحية.'
        : 'The most important step! Click here to add your first product: name, barcode scan, cost price, sell price, and initial stock.',
      position: 'bottom',
    },
    {
      element: '#tab-merchant-pos',
      title: isAr ? '🛒 نقطة البيع والكاشير (POS)' : '🛒 Point of Sale (POS)',
      intro: isAr
        ? 'شاشة الكاشير السريعة لإتمام عمليات البيع بالباركود، وإصدار الفواتير النقدية والآجلة، وطباعة إيصالات الدفع الحرارية ومتابعة السلة.'
        : 'Fast cashier terminal for scanning barcodes, issuing cash & credit invoices, thermal receipt printing, and live cart tracking.',
      position: 'bottom',
    },
    {
      element: '#top-merchant-delivery-orders-btn',
      title: isAr ? '🚚 طلبات التوصيل من متجر القرية' : '🚚 Village Delivery Orders',
      intro: isAr
        ? 'تستقبل هنا طلبات الشراء المباشرة التي يرسلها أهالي القرية من صفحة تصفح المتاجر، لتجهيزها وإسنادها إلى سائقي التوصيل المتاحين.'
        : 'Receive direct orders placed by village residents from the public directory to prepare and assign to drivers.',
      position: 'bottom',
    },
    {
      element: '#tab-merchant-reports',
      title: isAr ? '📊 التقارير اليومية والحسابات' : '📊 Daily Reports & Finance',
      intro: isAr
        ? 'اطّلع على تقرير Z اليومي، صافي أرباح المبيعات، حركات الصندوق، وسجل ديون العملاء والموردين والسلف المالية بدقة متناهية.'
        : 'View your daily Z-reports, net profits, cash register balance, customer debts, and supplier balances with accuracy.',
      position: 'bottom',
    },
    {
      element: '#top-btn-tour',
      title: isAr ? '🧭 إعادة الجولة في أي وقت' : '🧭 Restart Tour Anytime',
      intro: isAr
        ? 'أنت الآن جاهز تماماً لبدء عملك! وإذا احتجت أي تذكير، يمكنك الضغط على هذا الزر في أي وقت لإعادة تشغيل هذه الجولة التعريفية.'
        : 'You are now ready to operate! If you need any reminder, you can click this Tour button anytime to restart the walkthrough.',
      position: 'bottom',
    },
  ];

  // Filter steps: include steps without element (welcome) or whose element currently exists in DOM
  const activeSteps = steps.filter((step) => {
    if (!step.element) return true;
    const el = document.querySelector(step.element);
    return !!el;
  });

  intro.setOptions({
    steps: activeSteps,
    nextLabel: isAr ? 'التالي ←' : 'Next →',
    prevLabel: isAr ? '→ السابق' : '← Back',
    doneLabel: isAr ? 'ابدأ الآن ✓' : 'Get Started ✓',
    skipLabel: isAr ? 'تخطي ✕' : 'Skip ✕',
    showProgress: true,
    showBullets: true,
    exitOnOverlayClick: false,
    exitOnEsc: true,
    keyboardNavigation: true,
    tooltipClass: 'custom-introjs-tooltip',
    highlightClass: 'custom-introjs-highlight',
    scrollToElement: true,
    scrollPadding: typeof window !== 'undefined' && window.innerWidth < 640 ? 250 : 120,
    helperElementPadding: 8,
    autoPosition: true,
    positionPrecedence: ['bottom', 'top', 'right', 'left'],
  });

  intro.onbeforechange((targetElement) => {
    // If the step is targeting the dashboard button, make sure we are on the dashboard
    if (targetElement && targetElement.id === 'dashboard-btn-add-item') {
      options.onNavigateToTab?.('dashboard');
    }

    // On mobile screens, scroll target elements toward the upper viewport to avoid bottom-sheet overlap
    if (targetElement && typeof targetElement.scrollIntoView === 'function') {
      try {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: isMobile ? 'start' : 'center',
          inline: 'center',
        });
      } catch {
        // Fallback for older browsers
      }
    }
    return true;
  });

  intro.onafterchange(() => {
    // Re-attach or refresh touch gesture handling on the active step tooltip
    setupMobileSwipeToDismiss(intro, () => markTourCompleted(activeMerchantId));
  });

  intro.oncomplete(() => {
    markTourCompleted(activeMerchantId);
  });

  intro.onexit(() => {
    markTourCompleted(activeMerchantId);
  });

  intro.start();

  // Attach touch gesture handling for the initial step
  setTimeout(() => {
    setupMobileSwipeToDismiss(intro, () => markTourCompleted(activeMerchantId));
  }, 60);
};
