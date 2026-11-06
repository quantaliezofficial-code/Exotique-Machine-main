import React, { useEffect, useRef, useState } from 'react';
import { isOptimisable, isUnsplash, placeholder, srcSet, variant } from '../../lib/images';

interface PictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string | undefined | null;
  alt: string;
  /** CSS sizes hint, e.g. "(min-width: 1024px) 50vw, 100vw". */
  sizes?: string;
  /** Above-the-fold images: eager + high fetch priority. Everything else lazy-loads. */
  priority?: boolean;
  /** Width used for the fallback src (browsers without srcset support). */
  fallbackWidth?: number;
  /** Limit the srcset (e.g. a dimmed background never needs 2560 px). */
  widths?: readonly number[];
  /** Optional data-URI placeholder from the media library (otherwise /media/w32). */
  blurDataUrl?: string | null;
  className?: string;
  wrapperClassName?: string;
}

/**
 * <picture> with AVIF → WebP → original fallback, responsive srcset, lazy loading and a
 * blur-in placeholder. The placeholder is a 32 px image scaled up behind the real one;
 * the real image fades in once decoded (no fade when the user prefers reduced motion).
 */
export default function Picture({
  src, alt, sizes = '100vw', priority = false, fallbackWidth = 960, blurDataUrl, className = '',
  wrapperClassName = '', onLoad, widths, ...img
}: PictureProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    // Cached images can finish before React attaches onLoad.
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  if (!src) return null;
  if (failed) {
    // A missing file must not show a broken-image icon; keep the layout box instead.
    return (
      <span
        className={`em-pic bg-stone-200 ${wrapperClassName}`}
        {...(alt ? { role: 'img', 'aria-label': `${alt} (photo unavailable)` } : { 'aria-hidden': true })}
      />
    );
  }
  const optimisable = isOptimisable(src);
  const remote = isUnsplash(src);
  const blur = blurDataUrl || placeholder(src);
  const imgEl = (
    <img
      ref={ref}
      src={optimisable || remote ? variant(src, fallbackWidth) : src}
      {...(remote ? { srcSet: srcSet(src, 'webp', widths), sizes } : {})}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      // React 19 understands fetchPriority.
      fetchPriority={priority ? 'high' : 'auto'}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      onError={() => setFailed(true)}
      className={`${className} em-img ${loaded || priority ? 'em-img-loaded' : ''}`}
      {...img}
    />
  );

  return (
    <span
      className={`em-pic ${wrapperClassName}`}
      style={blur && !loaded ? { backgroundImage: `url("${blur}")` } : undefined}
    >
      {optimisable ? (
        <picture>
          <source type="image/avif" srcSet={srcSet(src, 'avif', widths)} sizes={sizes} />
          <source type="image/webp" srcSet={srcSet(src, 'webp', widths)} sizes={sizes} />
          {imgEl}
        </picture>
      ) : (
        imgEl
      )}
    </span>
  );
}
