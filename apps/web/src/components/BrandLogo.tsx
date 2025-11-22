import React from 'react'
import clsx from 'clsx'

interface BrandLogoProps {
  compact?: boolean
  onDark?: boolean
  className?: string
}

const BrandLogo: React.FC<BrandLogoProps> = ({ compact, onDark, className }) => {
  const src = onDark ? '/icons/TrakrLogoDarkMode.svg' : '/icons/TrakrLogoLightMode.svg'

  return (
    <img
      src={src}
      alt="Trakr"
      className={clsx(
        // Default: slightly larger logo everywhere
        'h-10 sm:h-11 w-auto',
        // Compact sidebar: slightly smaller variant
        compact && 'h-9 sm:h-10',
        // Allow callers to override size
        className,
      )}
    />
  )
}

export default BrandLogo
