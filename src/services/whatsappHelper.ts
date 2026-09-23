import { formatGlobalCurrency } from './globalizationService';

export interface WhatsAppOrderDetails {
  orderId: string;
  storeName: string;
  customerName: string;
  customerPhone?: string;
  villageName: string;
  items: { name: string; quantity: number; price: number }[];
  totalPrice: number;
  paymentMethodName?: string;
  coords?: { lat: number; lng: number } | null;
  merchantPhone?: string;
  driverPhone?: string;
}

/**
 * Generate formatted WhatsApp message text with receipt details and Google Maps location pin
 */
export function generateWhatsAppOrderText(details: WhatsAppOrderDetails): string {
  const itemsFormatted = details.items
    .map((item, idx) => `  ${idx + 1}. ${item.name} (الكمية: ${item.quantity}) - ${formatGlobalCurrency(item.price * item.quantity)}`)
    .join('\n');

  const mapPinLink = details.coords
    ? `https://www.google.com/maps?q=${details.coords.lat},${details.coords.lng}`
    : `موقع القرية المحدد: ${details.villageName}`;

  return `
🛍️ *فاتورة طلب جديدة من منصة قريتي*
------------------------------------
📌 *رقم الطلب:* #${details.orderId}
🏪 *المتجر:* ${details.storeName}
👤 *اسم العميل:* ${details.customerName}
📍 *القرية / المنطقة:* ${details.villageName}
💳 *طريقة الدفع:* ${details.paymentMethodName || 'نقداً عند الاستلام'}

🛒 *قائمة الأصناف والمنتجات:*
${itemsFormatted}

💰 *الإجمالي المستحق:* ${formatGlobalCurrency(details.totalPrice)}

📍 *موقع تسليم العميل على الخريطة:*
${mapPinLink}

------------------------------------
تطبيق قريتي - التجارة المحلية الذكية 🚀
`.trim();
}

/**
 * Generate ready wa.me URL
 */
export function generateWhatsAppOrderLink(phone: string, details: WhatsAppOrderDetails): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const messageText = generateWhatsAppOrderText(details);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}
