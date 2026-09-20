export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      window.focus();
    }
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err: any) {
        // If document is not focused or writeText fails, fallback to execCommand
        if (err?.name === 'NotAllowedError' || err?.message?.includes('focused') || err?.message?.includes('permission')) {
          console.warn('Clipboard writeText failed due to focus/permission, using execCommand fallback');
        } else {
          throw err;
        }
      }
    }

    // Fallback method using temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    return false;
  }
}
