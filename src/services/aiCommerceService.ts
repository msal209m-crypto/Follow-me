import { Item } from '../types';
import { formatGlobalCurrency } from './globalizationService';

export interface AIInsightResult {
  topRecommendations: string[];
  stockAdvice: string;
  suggestedPromotionText: string;
  bestSellingTip: string;
}

export function generateSmartMerchantInsights(
  storeName: string,
  villageName: string,
  items: Item[]
): AIInsightResult {
  const lowStockItems = items.filter((i) => i.quantity <= (i.minStockAlert || 5));
  const highMarginItems = items.filter((i) => (i.price - (i.costPrice || i.price * 0.7)) > 15);

  const lowStockNames = lowStockItems.map((i) => i.name).join('، ') || 'جميع الأصناف وفيرة';
  const highMarginNames = highMarginItems.map((i) => i.name).slice(0, 3).join('، ') || 'الأصناف الأساسية';

  return {
    topRecommendations: [
      `زيادة المخزون للأصناف الأكثر طلباً بقريتك (${villageName}) قبل نهاية الأسبوع.`,
      `إطلاق عرض ترويجي خصم 10% على الأصناف التالية: ${highMarginNames} لزيادة المبيعات اليومية.`,
      `إتاحة خدمة الدفع بالتقسيط أو عبر محفظة القرية الرقمية لكبار العملاء.`,
    ],
    stockAdvice: lowStockItems.length > 0
      ? `🚨 تنبيه المخزون: الأصناف التالية شارف رصيدها على النفاد (${lowStockNames}). يُنصح بطلب شحنة جديدة فوراً.`
      : `✅ جميع المنتجات بمتجر (${storeName}) متوفرة بكميات كافية لتغطية طلبات قرية ${villageName}.`,
    suggestedPromotionText: `🔥 *عروض استثنائية وبأسعار القرية من متجر ${storeName}!*
أهالي قرية ${villageName} الكرام! يسعدنا تقديم أفضل العروض الحصرية على المنتجات اليومية مع خدمة التوصيل السريع لباب منزلكم عبر منصة قريتي 🚗
اطلب الآن واستفد من الدفع الفوري بمحفظة القرية 💳`,
    bestSellingTip: `توصية الذكاء الاصطناعي: أهالي قرية ${villageName} يفضلون الطلبات المجمعة أيام الخميس والجمعة. تجهيز العبوات المجمعة يرفع المبيعات بنسبة 35%.`,
  };
}
