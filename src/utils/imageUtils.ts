/**
 * High-performance browser-side image compression and sanitization utilities
 * Prevents localStorage quota exhaustion and UI thread freezing.
 */

export const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60';

/**
 * Compresses an image File or Blob via Canvas to a lightweight JPEG DataURL.
 * Downscales dimensions to maxDim (e.g. 350px) and applies JPEG compression.
 * Typical output size: 10KB - 25KB (safe for localStorage).
 */
export const compressImageFile = (
  file: File | Blob,
  maxDim = 350,
  quality = 0.65
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(DEFAULT_PRODUCT_IMAGE);
    }

    const reader = new FileReader();
    reader.onerror = (err) => {
      console.error('FileReader failed to read image file:', err);
      reject(err);
    };

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        return resolve(DEFAULT_PRODUCT_IMAGE);
      }

      const img = new Image();
      img.onerror = (err) => {
        console.error('Image element failed to decode image:', err);
        // If loading failed, fallback safely
        resolve(DEFAULT_PRODUCT_IMAGE);
      };

      img.onload = () => {
        try {
          let width = img.width || 300;
          let height = img.height || 300;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.warn('Canvas 2D context not available; using fallback image');
            return resolve(DEFAULT_PRODUCT_IMAGE);
          }

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          console.log(
            `Image compressed successfully: original ${(file.size / 1024).toFixed(1)} KB -> compressed ${(compressed.length / 1024).toFixed(1)} KB`
          );
          resolve(compressed);
        } catch (e) {
          console.error('Canvas compression error:', e);
          resolve(DEFAULT_PRODUCT_IMAGE);
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Compresses an existing Data URL if it is excessively large.
 */
export const compressDataUrl = (
  dataUrl: string,
  maxDim = 350,
  quality = 0.65
): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl || DEFAULT_PRODUCT_IMAGE);
    }

    // If already lightweight (< 40KB), no need to re-compress
    if (dataUrl.length < 40000) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onerror = () => {
      resolve(DEFAULT_PRODUCT_IMAGE);
    };

    img.onload = () => {
      try {
        let width = img.width || 300;
        let height = img.height || 300;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_PRODUCT_IMAGE);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        console.log(`DataURL re-compressed: ${dataUrl.length} chars -> ${compressed.length} chars`);
        resolve(compressed);
      } catch (err) {
        console.error('Error re-compressing dataUrl:', err);
        resolve(DEFAULT_PRODUCT_IMAGE);
      }
    };

    img.src = dataUrl;
  });
};

/**
 * Guarantees that any image string stored into state or localStorage
 * is safe and will never trigger QuotaExceededError or UI freeze.
 */
export const sanitizeProductImage = (
  rawImage?: string,
  fallback = DEFAULT_PRODUCT_IMAGE
): string => {
  if (!rawImage || typeof rawImage !== 'string') {
    return fallback;
  }
  const trimmed = rawImage.trim();
  if (!trimmed) {
    return fallback;
  }

  // If it's a standard web URL (http:// or https://), it takes minimal storage (a few bytes)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // If it's a data URL, verify it's not excessively huge (> 90KB)
  if (trimmed.startsWith('data:image')) {
    if (trimmed.length > 90000) {
      console.warn('Image DataURL too large for localStorage quota (>90KB). Falling back to standard image URL.');
      return fallback;
    }
    return trimmed;
  }

  return fallback;
};
