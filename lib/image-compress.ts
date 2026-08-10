/**
 * Client-side image compression before upload.
 * Resizes images to max 1920px width/height and compresses to JPEG/WebP.
 * Reduces upload size and storage costs significantly.
 */

const MAX_DIMENSION = 1920;
const QUALITY = 0.82;

/**
 * Compress an image file if it exceeds MAX_DIMENSION.
 * Returns the original file if it's not an image or already small enough.
 */
export async function compressImage(file: File): Promise<File> {
  // Only process images
  if (!file.type.startsWith("image/")) return file;

  // Skip SVGs and GIFs (animated)
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  // Skip small files (< 200KB)
  if (file.size < 200 * 1024) return file;

  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // Skip if already within bounds
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;
      if (width > height) {
        newWidth = MAX_DIMENSION;
        newHeight = Math.round((height / width) * MAX_DIMENSION);
      } else {
        newHeight = MAX_DIMENSION;
        newWidth = Math.round((width / height) * MAX_DIMENSION);
      }

      // Draw to canvas
      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to blob
      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Compression didn't help, return original
            resolve(file);
            return;
          }

          // Preserve original filename with correct extension
          const ext = outputType === "image/png" ? ".png" : ".jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const newFile = new File([blob], `${baseName}${ext}`, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        outputType,
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}
