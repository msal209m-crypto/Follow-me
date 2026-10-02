/**
 * Centralized Authentication Error Handler & Debounce Utility
 * خدمة معالجة أخطاء المصادقة المركزية والحماية من الطلبات المتكررة
 */

export interface AuthErrorResult {
  code: string;
  message: string;
  isRateLimit: boolean;
  isCredentialError: boolean;
  isNetworkError: boolean;
  retryAfterSeconds?: number;
}

/**
 * Standardizes and translates authentication errors from Supabase, Firebase, or RBAC
 * into friendly, unambiguous Arabic messages with actionable guidance.
 */
export function handleAuthError(error: unknown, fallbackMessage?: string): AuthErrorResult {
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: fallbackMessage || 'حدث خطأ غير متوقع أثناء معالجة الطلب، يرجى المحاولة لاحقاً.',
      isRateLimit: false,
      isCredentialError: false,
      isNetworkError: false,
    };
  }

  const rawMessage = typeof error === 'string' 
    ? error 
    : (error as any)?.message || (error as any)?.error_description || String(error);

  const rawCode = (error as any)?.code || (error as any)?.status || '';
  const lowerMsg = rawMessage.toLowerCase();
  const lowerCode = String(rawCode).toLowerCase();

  // 1. Rate Limiting & Too Many Requests
  if (
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('rate_limit') ||
    lowerMsg.includes('too many requests') ||
    lowerMsg.includes('over_email_send_rate_limit') ||
    lowerMsg.includes('429') ||
    lowerCode.includes('too-many-requests') ||
    lowerCode === '429'
  ) {
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'تم إرسال طلبات متكررة في وقت قصير. تم تطبيق حماية ضد التكرار، يرجى الانتظار قليلاً (دقيقة واحدة) قبل المحاولة مرة أخرى.',
      isRateLimit: true,
      isCredentialError: false,
      isNetworkError: false,
      retryAfterSeconds: 60,
    };
  }

  // 2. Duplicate Account / User Already Exists
  if (
    lowerMsg.includes('user already registered') ||
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('user_already_exists') ||
    lowerCode.includes('email-already-in-use') ||
    lowerCode.includes('phone-already-in-use')
  ) {
    return {
      code: 'USER_ALREADY_EXISTS',
      message: 'رقم الجوال أو البريد مسجل مسبقاً في النظام. يمكنك تسجيل الدخول مباشرة أو استعادة كلمة المرور.',
      isRateLimit: false,
      isCredentialError: true,
      isNetworkError: false,
    };
  }

  // 3. Invalid Credentials / Wrong Password
  if (
    lowerMsg.includes('invalid login credentials') ||
    lowerMsg.includes('invalid_grant') ||
    lowerCode.includes('wrong-password') ||
    lowerCode.includes('invalid-credential') ||
    lowerCode.includes('user-not-found')
  ) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الجوال المسجل وكلمة المرور.',
      isRateLimit: false,
      isCredentialError: true,
      isNetworkError: false,
    };
  }

  // 4. Password Policy
  if (
    lowerMsg.includes('password') &&
    (lowerMsg.includes('short') || lowerMsg.includes('least') || lowerMsg.includes('characters'))
  ) {
    return {
      code: 'WEAK_PASSWORD',
      message: 'كلمة المرور قصيرة، يجب أن تتكون من 4 خانات على الأقل.',
      isRateLimit: false,
      isCredentialError: true,
      isNetworkError: false,
    };
  }

  // 5. Network / Offline / Timeout
  if (
    lowerMsg.includes('network') ||
    lowerMsg.includes('fetch') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('offline') ||
    lowerCode.includes('network-request-failed')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.',
      isRateLimit: false,
      isCredentialError: false,
      isNetworkError: true,
    };
  }

  // Fallback
  return {
    code: String(rawCode || 'AUTH_ERROR'),
    message: rawMessage || fallbackMessage || 'فشلت عملية المصادقة، يرجى المحاولة مرة أخرى.',
    isRateLimit: false,
    isCredentialError: false,
    isNetworkError: false,
  };
}

/**
 * Returns a clean Arabic error message string from any auth error
 */
export function formatAuthErrorMessage(error: unknown, fallbackMessage?: string): string {
  return handleAuthError(error, fallbackMessage).message;
}

// Global active locks for Debouncing
const activeAuthLocks = new Map<string, number>();

/**
 * Wraps an asynchronous authentication or registration function with strict Debounce protection.
 * Prevents multiple concurrent executions and enforces a cooldown window between submissions.
 * 
 * @param lockKey Unique identifier for the action (e.g. 'merchant-register', 'driver-login')
 * @param action The async function to execute
 * @param cooldownMs Cooldown period in milliseconds (default: 1800ms)
 */
export async function withAuthDebounce<T>(
  lockKey: string,
  action: () => Promise<T>,
  cooldownMs: number = 1800
): Promise<{ success: boolean; result?: T; error?: string }> {
  const now = Date.now();
  const lastExecution = activeAuthLocks.get(lockKey) || 0;

  if (now - lastExecution < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - (now - lastExecution)) / 1000);
    return {
      success: false,
      error: `يرجى الانتظار ${remainingSeconds} ثانية قبل إعادة الضغط لمنع إرسال طلبات متكررة.`,
    };
  }

  activeAuthLocks.set(lockKey, now);

  try {
    const result = await action();
    return { success: true, result };
  } catch (err) {
    const parsed = handleAuthError(err);
    return { success: false, error: parsed.message };
  } finally {
    // Keep lock active for the full cooldown period
    setTimeout(() => {
      activeAuthLocks.delete(lockKey);
    }, cooldownMs);
  }
}

/**
 * Creates a debounced version of any function for UI event handlers
 */
export function createDebouncedHandler<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number = 1500
): (...args: Parameters<T>) => void {
  let timer: any = null;
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall < delayMs) {
      return;
    }
    lastCall = now;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, 50);
  };
}
