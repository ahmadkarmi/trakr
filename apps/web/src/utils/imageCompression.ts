/**
 * Image compression and optimization utilities
 * Reduces upload sizes and improves performance
 */

export interface CompressionOptions {
  /** Maximum width in pixels (default: 1920) */
  maxWidth?: number
  /** Maximum height in pixels (default: 1080) */
  maxHeight?: number
  /** JPEG quality 0-1 (default: 0.8) */
  quality?: number
  /** Output format (default: original format or 'image/jpeg') */
  format?: 'image/jpeg' | 'image/png' | 'image/webp'
  /** Maximum file size in MB (default: 2) */
  maxSizeMB?: number
}

export interface CompressionResult {
  file: File
  originalSize: number
  compressedSize: number
  compressionRatio: number
  width: number
  height: number
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = file.type.startsWith('image/png') ? 'image/png' : 'image/jpeg',
    maxSizeMB = 2,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          // Create canvas
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'))
                return
              }

              // Check if compression was successful
              const compressedSize = blob.size
              const originalSize = file.size

              // If compressed size is larger or similar, use original
              if (compressedSize >= originalSize * 0.9) {
                resolve({
                  file,
                  originalSize,
                  compressedSize: originalSize,
                  compressionRatio: 1,
                  width: img.width,
                  height: img.height,
                })
                return
              }

              // Check if still too large
              if (compressedSize > maxSizeMB * 1024 * 1024) {
                // Try again with lower quality
                if (quality > 0.5) {
                  compressImage(file, { ...options, quality: quality - 0.1 })
                    .then(resolve)
                    .catch(reject)
                  return
                }
              }

              // Create new file from blob
              const compressedFile = new File([blob], file.name, {
                type: format,
                lastModified: Date.now(),
              })

              resolve({
                file: compressedFile,
                originalSize,
                compressedSize,
                compressionRatio: compressedSize / originalSize,
                width,
                height,
              })
            },
            format,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Generate thumbnail from image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 200
): Promise<File> {
  return compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    format: 'image/jpeg',
  }).then((result) => {
    return new File([result.file], `thumb_${file.name}`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  })
}

/**
 * Batch compress multiple images
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = []

  for (let i = 0; i < files.length; i++) {
    const result = await compressImage(files[i], options)
    results.push(result)
    onProgress?.(i + 1, files.length)
  }

  return results
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'File must be an image',
    }
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be smaller than 10MB',
    }
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are supported',
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Calculate compression savings
 */
export function getCompressionStats(results: CompressionResult[]) {
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0)
  const savedBytes = totalOriginal - totalCompressed
  const savedPercentage = (savedBytes / totalOriginal) * 100

  return {
    totalOriginal,
    totalCompressed,
    savedBytes,
    savedPercentage,
    averageRatio: results.reduce((sum, r) => sum + r.compressionRatio, 0) / results.length,
  }
}
