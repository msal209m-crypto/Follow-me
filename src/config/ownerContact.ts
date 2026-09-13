/**
 * FlowApp Official Owner & Licensing Support Configuration
 */

export const OWNER_CONTACT = {
  name: 'مالك ومطور تطبيق FlowApp',
  phoneRaw: '00966502063584',
  phoneInternational: '966502063584',
  phoneDisplay: '+966 50 206 3584',
  phoneLocal: '0502063584',
  email: 'msal209m@gmail.com',

  /**
   * Generates a direct WhatsApp click-to-chat URL with a pre-filled professional message
   */
  getWhatsAppUrl: (options?: {
    storeName?: string;
    planName?: string;
    price?: string;
    customNote?: string;
  }) => {
    const store = options?.storeName ? `\n🏪 متجر: ${options.storeName}` : '';
    const plan = options?.planName ? `\n💳 الباقة المطلوبة: ${options.planName}` : '';
    const price = options?.price ? ` (${options.price})` : '';
    const note = options?.customNote ? `\n📝 ملاحظة: ${options.customNote}` : '';

    const text = `السلام عليكم ورحمة الله،
أرغب في شراء كود تفعيل لباقة FlowApp Pro.${store}${plan}${price}${note}
يرجى التكرم بتزويدي برقم الحساب البنكي لتحويل المبلغ وإرسال كود التفعيل.`;

    return `https://wa.me/${OWNER_CONTACT.phoneInternational}?text=${encodeURIComponent(text)}`;
  },

  /**
   * Quick support / inquiries WhatsApp link
   */
  getSupportWhatsAppUrl: (query?: string) => {
    const text = query
      ? `السلام عليكم، بخصوص تطبيق FlowApp: ${query}`
      : `السلام عليكم، لدي استفسار بخصوص تطبيق كاشير وإدارة المبيعات FlowApp.`;
    return `https://wa.me/${OWNER_CONTACT.phoneInternational}?text=${encodeURIComponent(text)}`;
  },
};
