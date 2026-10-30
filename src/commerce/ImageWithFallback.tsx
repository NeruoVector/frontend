import { useState } from 'react'
import { isDisplayableImageUrl } from './models'

type Props = {
  src: string | null | undefined
  alt: string
  className: string
  fallbackClassName: string
  fallbackLabel: string
  fallbackText: string
  loading?: 'eager' | 'lazy'
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackLabel,
  fallbackText,
  loading = 'lazy',
}: Props) {
  const [failed, setFailed] = useState(false)
  if (failed || !isDisplayableImageUrl(src)) {
    return <div className={fallbackClassName} role="img" aria-label={fallbackLabel}>{fallbackText}</div>
  }
  return <img className={className} src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
}
