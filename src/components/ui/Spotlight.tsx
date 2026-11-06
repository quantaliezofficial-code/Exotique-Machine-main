import React, { useEffect, useRef, type CSSProperties } from 'react';

/**
 * Pointer-following light with a lit edge ring. Adapted from 21st.dev "Spotlight"
 * (kevingirelli): no Radix Slot / cn dependency, colours from the site's accent token.
 * Only two CSS variables change per frame, so nothing re-renders. Touch input is
 * ignored; keyboard focus inside lights the surface where the pointer last was.
 */
const RING_MASK = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';
const LIGHT = 'pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 motion-reduce:transition-none group-focus-within/spotlight:opacity-100 group-hover/spotlight:opacity-100';

export interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Radius of the light, in px. */
  size?: number;
  /** Any CSS colour, including theme variables. */
  color?: string;
  /** Also light the part of the edge nearest the pointer. */
  ring?: boolean;
}

export default function Spotlight({ size = 320, color = 'var(--color-accent)', ring = true, className = '', children, onPointerMove, ...props }: SpotlightProps) {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const circle = `${size}px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%)`;
  const ringStyle: CSSProperties = {
    background: `radial-gradient(${circle}, color-mix(in oklab, ${color} 55%, transparent), transparent 60%)`,
    mask: RING_MASK, maskComposite: 'exclude', WebkitMask: RING_MASK, WebkitMaskComposite: 'xor',
  };
  return (
    <div
      data-slot="spotlight"
      className={`group/spotlight relative isolate ${className}`}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (e.pointerType === 'touch') return;
        const target = e.currentTarget;
        const { clientX, clientY } = e;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const b = target.getBoundingClientRect();
          target.style.setProperty('--spotlight-x', `${clientX - b.left}px`);
          target.style.setProperty('--spotlight-y', `${clientY - b.top}px`);
        });
      }}
      {...props}
    >
      <span aria-hidden className={LIGHT} style={{ background: `radial-gradient(${circle}, color-mix(in oklab, ${color} 12%, transparent), transparent 70%)` }} />
      {ring && <span aria-hidden className={`${LIGHT} -inset-px p-px`} style={ringStyle} />}
      {children}
    </div>
  );
}
