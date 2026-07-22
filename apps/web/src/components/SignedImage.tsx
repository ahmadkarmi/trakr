/**
 * Renders an image stored in a private Storage bucket by resolving its object
 * path to a short-lived signed URL (see utils/signedUrls). Drop-in for both the
 * raw <img> photo sites and the LazyImage galleries. Values that are already
 * data:/blob:/http URLs pass through untouched.
 */
import { ImgHTMLAttributes } from 'react'
import { useSignedUrl } from '../utils/signedUrls'
import { LazyImage } from './LazyImage'

interface SignedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  bucket: string
  /** Stored object path (or a pass-through data:/blob:/http URL). */
  path?: string | null
  alt: string
  /** Render through LazyImage (blur-up + intersection observer) instead of a bare <img>. */
  lazy?: boolean
  /** LazyImage aspect ratio (ignored when lazy is false). */
  aspectRatio?: string
}

export function SignedImage({ bucket, path, alt, lazy, aspectRatio, className, ...rest }: SignedImageProps) {
  const src = useSignedUrl(bucket, path)

  if (!src) {
    // Not yet resolved (or unsignable). Keep layout stable with a neutral box.
    return <div className={className} aria-busy aria-label={alt} />
  }

  if (lazy) {
    return <LazyImage src={src} alt={alt} className={className} aspectRatio={aspectRatio} {...rest} />
  }
  return <img src={src} alt={alt} className={className} {...rest} />
}
