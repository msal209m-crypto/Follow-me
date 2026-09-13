/**
 * Utility to manage low stock alerts dismissal/hiding states across the app.
 * Allows merchants to hide/snooze alerts they have already handled.
 */

const DISMISSED_ALERTS_KEY = 'flowapp_dismissed_alerts_v1';

export function getDismissedAlertIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function dismissAlertId(id: string): string[] {
  const current = getDismissedAlertIds();
  if (!current.includes(id)) {
    const updated = [...current, id];
    try {
      localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('flowapp:alerts-updated'));
    } catch (e) {
      console.warn('Failed to save dismissed alert to storage:', e);
    }
    return updated;
  }
  return current;
}

export function restoreAlertId(id: string): string[] {
  const current = getDismissedAlertIds();
  const updated = current.filter((item) => item !== id);
  try {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('flowapp:alerts-updated'));
  } catch (e) {
    console.warn('Failed to update dismissed alert storage:', e);
  }
  return updated;
}

export function dismissAllAlertIds(ids: string[]): string[] {
  const current = getDismissedAlertIds();
  const set = new Set([...current, ...ids]);
  const updated = Array.from(set);
  try {
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('flowapp:alerts-updated'));
  } catch (e) {
    console.warn('Failed to save all dismissed alerts:', e);
  }
  return updated;
}

export function restoreAllAlertIds(): string[] {
  try {
    localStorage.removeItem(DISMISSED_ALERTS_KEY);
    window.dispatchEvent(new CustomEvent('flowapp:alerts-updated'));
  } catch (e) {
    console.warn('Failed to clear dismissed alerts storage:', e);
  }
  return [];
}
