import React from 'react'
import clsx from 'clsx'
import { useTheme } from '../contexts/ThemeContext'

interface BrandLogoProps {
  compact?: boolean
  onDark?: boolean
  className?: string
}

const BrandLogo: React.FC<BrandLogoProps> = ({ compact, onDark, className }) => {
  const { resolvedTheme } = useTheme()
  const effectiveOnDark = typeof onDark === 'boolean' ? onDark : resolvedTheme === 'dark'
  const src = effectiveOnDark ? '/icons/TrakrLogoDarkMode.svg' : '/icons/TrakrLogoLightMode.svg'

  return (
    <img
      src={src}
      alt="Trakr"
      className={clsx(
        // Default: slightly smaller (10% reduction) responsive sizing
        'h-9 sm:h-[2.475rem] w-auto',
        // Compact sidebar: proportionally reduced variant
        compact && 'h-[2.025rem] sm:h-9',
        // Allow callers to override size
        className,
      )}
    />
  )
}

export default BrandLogo
