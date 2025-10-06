/**
 * Hook for handling image uploads with automatic compression
 */

import { useState, useCallback } from 'react'
import { compressImage, validateImageFile, CompressionOptions, CompressionResult, formatFileSize } from '../utils/imageCompression'
import toast from 'react-hot-toast'

export interface ImageUploadState {
  isUploading: boolean
  progress: number
  error: string | null
  compressedFile: File | null
  compressionResult: CompressionResult | null
}

export interface UseImageUploadOptions {
  /** Compression options */
  compression?: CompressionOptions
  /** Auto-compress before upload (default: true) */
  autoCompress?: boolean
  /** Show toast notifications (default: true) */
  showToast?: boolean
  /** Validate file before processing (default: true) */
  validateFile?: boolean
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    compression = {},
    autoCompress = true,
    showToast = true,
    validateFile: shouldValidate = true,
  } = options

  const [state, setState] = useState<ImageUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    compressedFile: null,
    compressionResult: null,
  })

  /**
   * Process a single image file
   */
  const processImage = useCallback(
    async (file: File): Promise<CompressionResult | null> => {
      setState((prev) => ({ ...prev, isUploading: true, error: null, progress: 0 }))

      try {
        // Validate file
        if (shouldValidate) {
          const validation = validateImageFile(file)
          if (!validation.valid) {
            throw new Error(validation.error)
          }
        }

        setState((prev) => ({ ...prev, progress: 25 }))

        // Compress if enabled
        let result: CompressionResult
        if (autoCompress) {
          result = await compressImage(file, compression)
          setState((prev) => ({ ...prev, progress: 75 }))

          // Show compression stats
          if (showToast && result.compressionRatio < 0.9) {
            const savedPercentage = Math.round((1 - result.compressionRatio) * 100)
            toast.success(
              `Image compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${savedPercentage}% smaller)`,
              { duration: 3000 }
            )
          }
        } else {
          result = {
            file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 1,
            width: 0,
            height: 0,
          }
        }

        setState({
          isUploading: false,
          progress: 100,
          error: null,
          compressedFile: result.file,
          compressionResult: result,
        })

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process image'
        setState({
          isUploading: false,
          progress: 0,
          error: errorMessage,
          compressedFile: null,
          compressionResult: null,
        })

        if (showToast) {
          toast.error(errorMessage)
        }

        return null
      }
    },
    [autoCompress, compression, shouldValidate, showToast]
  )

  /**
   * Process multiple image files
   */
  const processImages = useCallback(
    async (files: File[]): Promise<CompressionResult[]> => {
      setState((prev) => ({ ...prev, isUploading: true, error: null, progress: 0 }))

      const results: CompressionResult[] = []
      const total = files.length

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]

          // Validate
          if (shouldValidate) {
            const validation = validateImageFile(file)
            if (!validation.valid) {
              if (showToast) {
                toast.error(`${file.name}: ${validation.error}`)
              }
              continue
            }
          }

          // Compress
          const result = autoCompress
            ? await compressImage(file, compression)
            : {
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 1,
                width: 0,
                height: 0,
              }

          results.push(result)

          // Update progress
          setState((prev) => ({
            ...prev,
            progress: Math.round(((i + 1) / total) * 100),
          }))
        }

        // Show summary
        if (showToast && autoCompress && results.length > 0) {
          const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0)
          const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0)
          const savedPercentage = Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100)

          if (savedPercentage > 10) {
            toast.success(
              `${results.length} images compressed: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalCompressed)} (${savedPercentage}% smaller)`,
              { duration: 4000 }
            )
          }
        }

        setState((prev) => ({
          ...prev,
          isUploading: false,
          progress: 100,
          error: null,
        }))

        return results
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process images'
        setState({
          isUploading: false,
          progress: 0,
          error: errorMessage,
          compressedFile: null,
          compressionResult: null,
        })

        if (showToast) {
          toast.error(errorMessage)
        }

        return results
      }
    },
    [autoCompress, compression, shouldValidate, showToast]
  )

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      compressedFile: null,
      compressionResult: null,
    })
  }, [])

  return {
    ...state,
    processImage,
    processImages,
    reset,
  }
}
