import React, { useEffect, useRef, useState } from 'react';

/**
 * A border with a light travelling around it, to draw the eye to featured content.
 * Adapted from 21st.dev "Animated Border" (kevingirelli): one rotating layer
 * (transform only), paused off-screen, still for prefers-reduced-motion.
 * Set the radius with `className`; the inner surface follows it.
 */
export interface AnimatedBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seconds per lap. */
  duration?: number;
  /** Colour of the light. */
  color?: string;
  /** Border width in px. */
  width?: number;
  /** Classes for the inner surface that holds the content. */
  contentClassName?: string;
}

export default function AnimatedBorder({ duration = 6, color = 'var(--color-accent)', width = 1, className = '', contentClassName = '', style, children, ...props }: AnimatedBorderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-slot="animated-border" className={`relative isolate overflow-hidden rounded-2xl bg-stone-200/80 ${className}`} style={{ padding: width, ...style }} {...props}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -ml-[100%] -mt-[100%] aspect-square w-[200%] animate-spin motion-reduce:animate-none"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 62%, ${color} 82%, transparent 96%)`,
          animationDuration: `${duration}s`,
          animationPlayState: inView ? 'running' : 'paused',
        }}
      />
      <div className={`relative h-full rounded-[inherit] ${contentClassName}`}>{children}</div>
    </div>
  );
}
