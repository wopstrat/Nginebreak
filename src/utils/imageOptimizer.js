import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getAdminSettings } from './adminAuth';

/**
 * Optimizes an image client-side without visible loss of quality:
 * - Saver mode: 1280px (~1MP, 50-80KB) for maximum storage savings on Supabase.
 * - Standard mode: 1920px (Full HD, 90-160KB) for 2K display crispness.
 */
export async function optimizeImage(file, options = {}) {
  const adminSettings = getAdminSettings();
  const isSaver = adminSettings.imageOptimizationMode !== 'standard';

  const maxDimension = options.maxDimension ?? (isSaver ? 1280 : 1920);
  const quality = options.quality ?? (isSaver ? 0.82 : 0.88);

  return new Promise((resolve, reject) => {
    // Reject SVG uploads to prevent Stored XSS vulnerabilities
    if (file.type === 'image/svg+xml' || file.name?.toLowerCase().endsWith('.svg')) {
      return reject(new Error('SVG format is not allowed for security reasons. Please upload JPG, PNG, or WebP images.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Scale proportionally if either dimension exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image crisp and clear
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Canvas to Blob conversion failed'));
            }

            const originalSize = file.size;
            const optimizedSize = blob.size;
            const savedPercent = Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100));

            resolve({
              blob,
              originalSize,
              optimizedSize,
              savedPercent,
              width,
              height,
              format: 'image/webp'
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes into human readable format (e.g. 1.2 MB or 95 KB)
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Uploads an optimized vehicle photo to Supabase Storage or local cache
 */
export async function uploadVehiclePhoto(file, vehicleId) {
  // Step 1: Optimize client-side
  const optimized = await optimizeImage(file);

  const fileName = `${vehicleId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;

  // Step 2: Upload to Supabase Storage bucket 'vehicle-media'
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('vehicle-media')
        .upload(fileName, optimized.blob, {
          contentType: 'image/webp',
          cacheControl: '31536000', // 1 year cache
          upsert: false
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage
          .from('vehicle-media')
          .getPublicUrl(fileName);

        return {
          url: publicData.publicUrl,
          path: fileName,
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          savedPercent: optimized.savedPercent,
          width: optimized.width,
          height: optimized.height
        };
      }
      console.warn('[Storage] Supabase bucket upload notice:', error?.message);
    } catch (err) {
      console.warn('[Storage] Upload fallback to local data URL:', err.message);
    }
  }

  // Fallback: Convert optimized blob to local Base64 URL so it works even offline
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        url: reader.result,
        path: fileName,
        originalSize: optimized.originalSize,
        optimizedSize: optimized.optimizedSize,
        savedPercent: optimized.savedPercent,
        width: optimized.width,
        height: optimized.height
      });
    };
    reader.readAsDataURL(optimized.blob);
  });
}
