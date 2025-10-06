/**
 * Lazy loading image component with blur-up placeholder
 * Defers loading offscreen images until they're needed
 */

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: (string | undefined)[]) {
  return twMerge(clsx(inputs))
}

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'loading'> {
  src: string
  alt: string
  /** Blur placeholder while loading */
  blurhash?: string
  /** Fallback if image fails to load */
  fallback?: React.ReactNode
  /** Aspect ratio to maintain during load (e.g., "16/9") */
  aspectRatio?: string
  /** Intersection observer root margin (default: "50px") */
  rootMargin?: string
}

export function LazyImage({
  src,
  alt,
  blurhash,
  fallback,
  aspectRatio,
  rootMargin = '50px',
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Don't use IntersectionObserver if image is already loaded
    if (isLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [isLoaded, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
    setHasError(false)
  }

  const handleError = () => {
    setHasError(true)
    setIsLoaded(false)
  }

  // Show fallback if error occurred
  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden bg-gray-100', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Blur placeholder */}
      {!isLoaded && blurhash && (
        <div
          className="absolute inset-0 bg-gray-200 blur-sm"
          style={{
            backgroundImage: `url(${blurhash})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !blurhash && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}

      {/* Error fallback */}
      {hasError && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Optimized thumbnail component for lists
 */
interface ThumbnailProps {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  rounded?: boolean
}

export function Thumbnail({ src, alt, size = 'md', rounded = false }: ThumbnailProps) {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={cn(sizes[size], rounded ? 'rounded-full' : '', 'flex-shrink-0')}
      aspectRatio="1/1"
      rootMargin="100px"
    />
  )
}

/**
 * Photo grid component with lazy loading
 */
interface PhotoGridProps {
  photos: Array<{ url: string; alt?: string; id: string }>
  columns?: 2 | 3 | 4
  onPhotoClick?: (photoId: string) => void
}

export function PhotoGrid({ photos, columns = 3, onPhotoClick }: PhotoGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {photos.map((photo) => (
        <button
          key={photo.id}
          onClick={() => onPhotoClick?.(photo.id)}
          className="group relative overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-transform hover:scale-105"
        >
          <LazyImage
            src={photo.url}
            alt={photo.alt || 'Photo'}
            aspectRatio="4/3"
            className="w-full"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
        </button>
      ))}
    </div>
  )
}
