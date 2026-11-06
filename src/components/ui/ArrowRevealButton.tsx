import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link } from '../../router';

/**
 * Pill CTA whose round arrow badge grows to fill the whole button on hover/focus while
 * the label turns white and the arrow nudges forward. Adapted from Originkit "Arrow
 * Reveal Button": Framer controls removed, CSS transitions instead of an animation
 * library (keeps it out of the first-load bundle), client-side routing for internal
 * links, keyboard focus triggers the same reveal, instant for reduced motion.
 */
type Tone = 'light' | 'dark' | 'accent';
const TONES: Record<Tone, { pill: string; text: string; badge: string }> = {
  light: { pill: '#ffffff', text: '#0c0a09', badge: '#b45309' },
  dark: { pill: '#1c1917', text: '#ffffff', badge: '#b45309' },
  accent: { pill: '#fffbeb', text: '#92400e', badge: '#b45309' },
};
const EASE = 'cubic-bezier(0.44, 0, 0.56, 1)';

export interface ArrowRevealButtonProps {
  to: string;
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  'aria-label'?: string;
}

export default function ArrowRevealButton({ to, children, tone = 'light', className = '', ...aria }: ArrowRevealButtonProps) {
  const t = TONES[tone];
  const pill = useRef<HTMLAnchorElement>(null);
  const [scale, setScale] = useState(8);
  const [on, setOn] = useState(false);
  const external = /^https?:\/\//.test(to);

  // Scale needed for the 36 px badge (centred 24 px from the right edge) to cover the pill.
  useLayoutEffect(() => {
    const p = pill.current;
    if (!p) return;
    const measure = () => {
      const w = p.offsetWidth, h = p.offsetHeight;
      const cx = w - 24, cy = h / 2;
      setScale((2 * Math.hypot(Math.max(cx, w - cx), cy) * 1.04) / 36);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(p);
    return () => ro.disconnect();
  }, []);

  const tr = (props: string) => props.split(',').map((x) => `${x.trim()} 460ms ${EASE}`).join(', ');
  const inner = (
    <>
      <span className="relative z-[3] whitespace-nowrap motion-reduce:!transition-none"
        style={{ color: on ? '#ffffff' : t.text, transform: on ? 'translateX(-6px)' : 'none', transition: tr('color, transform') }}>{children}</span>
      <span aria-hidden className="relative h-9 w-9 shrink-0">
        <span className="absolute inset-0 z-[2] rounded-full motion-reduce:!transition-none"
          style={{ background: t.badge, transform: `scale(${on ? scale : 1})`, transition: tr('transform') }} />
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18" className="absolute left-[9px] top-[9px] z-[4] text-white motion-reduce:!transition-none"
          style={{ transform: on ? 'translateX(3px)' : 'none', transition: tr('transform') }}>
          <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </>
  );
  const cls = `relative isolate inline-flex min-h-12 items-center gap-5 overflow-hidden rounded-full py-1.5 pl-6 pr-1.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-black/10 active:scale-[0.98] transition-transform ${className}`;
  const handlers = {
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && setOn(true),
    onPointerLeave: () => setOn(false),
    onFocus: () => setOn(true),
    onBlur: () => setOn(false),
  };
  return external ? (
    <a ref={pill} href={to} rel="noopener" className={cls} style={{ background: t.pill }} {...handlers} {...aria}>{inner}</a>
  ) : (
    <Link ref={pill} to={to} className={cls} style={{ background: t.pill }} {...handlers} {...aria}>{inner}</Link>
  );
}
