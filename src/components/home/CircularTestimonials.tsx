import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m as motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Quote, Star } from 'lucide-react';
import { usePageVisible } from '../../lib/hooks';
import Picture from '../ui/Picture';

export interface TestimonialCard {
  id: string;
  quote: string;
  name: string;
  designation?: string | null;
  image?: string | null;
  rating?: number | null;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
}

function gapFor(width: number) {
  // Same curve as the original component, with a phone-friendly minimum.
  if (width < 420) return 34;
  const min = 1024, max = 1456;
  if (width <= min) return 60;
  if (width >= max) return Math.max(60, 86 + 0.06018 * (width - max));
  return 60 + 26 * ((width - min) / (max - min));
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

/**
 * The 3-card review carousel from the previous home page (centre card with the two
 * neighbours fanned behind it, quote revealed word by word). Every card comes from
 * Admin → Website → Reviews, so any number of reviews can be added or edited.
 * Autoplay pauses on hover/focus, in background tabs and for reduced motion; arrow
 * keys work while the carousel has focus.
 */
export default function CircularTestimonials({ items, autoplay = true, intervalMs = 6000 }: { items: TestimonialCard[]; autoplay?: boolean; intervalMs?: number }) {
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [width, setWidth] = useState(1200);
  const stage = useRef<HTMLDivElement>(null);
  const n = items.length;
  const current = items[Math.min(active, n - 1)];

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || reduced || held || stopped || !pageVisible || n < 2) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % n), intervalMs);
    return () => window.clearTimeout(t);
  }, [autoplay, reduced, held, stopped, pageVisible, n, active, intervalMs]);

  const next = useCallback(() => { setActive((a) => (a + 1) % n); setStopped(true); }, [n]);
  const prev = useCallback(() => { setActive((a) => (a - 1 + n) % n); setStopped(true); }, [n]);

  const style = (i: number): React.CSSProperties => {
    const gap = gapFor(width);
    const lift = gap * 0.8;
    const base: React.CSSProperties = { transition: reduced ? 'none' : 'all 0.8s cubic-bezier(.4,2,.3,1)' };
    if (i === active) return { ...base, zIndex: 3, opacity: 1, transform: 'translateX(0) translateY(0) scale(1) rotateY(0deg)' };
    if (n > 1 && i === (active - 1 + n) % n) {
      return { ...base, zIndex: 2, opacity: 1, transform: `translateX(-${gap}px) translateY(-${lift}px) scale(0.85) rotateY(15deg)` };
    }
    if (n > 2 && i === (active + 1) % n) {
      return { ...base, zIndex: 2, opacity: 1, transform: `translateX(${gap}px) translateY(-${lift}px) scale(0.85) rotateY(-15deg)` };
    }
    return { ...base, zIndex: 1, opacity: 0, pointerEvents: 'none', transform: 'scale(0.7)' };
  };

  const words = useMemo(() => (current?.quote || '').split(/\s+/), [current]);
  if (!n || !current) return null;

  return (
    <div
      className="w-full max-w-5xl"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHeld(false)}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer reviews"
      tabIndex={0}
    >
      <div className="grid grid-cols-1 items-center gap-12 px-2 sm:px-6 md:grid-cols-2 md:gap-20">
        {/* Fanned photo cards */}
        <div ref={stage} className="relative mx-auto mt-10 h-72 w-[78%] sm:h-96 md:mt-12 md:w-full" style={{ perspective: '1000px' }} aria-hidden>
          {items.map((t, i) => (
            <div key={t.id} className="absolute inset-0 overflow-hidden rounded-3xl border border-stone-200/60 bg-stone-900 shadow-xl" style={style(i)}>
              {t.image ? (
                <Picture src={t.image} alt="" sizes="(min-width: 768px) 480px, 78vw" widths={[640, 960, 1280]} loading="lazy"
                  className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_30%_20%,#b45309_0%,#1c1917_70%)] text-white">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full border border-white/25 bg-white/10 text-3xl font-black tracking-wider backdrop-blur">
                    {initials(t.name)}
                  </span>
                  <Quote className="h-8 w-8 text-amber-300/80" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="flex min-h-[18rem] flex-col justify-between text-left">
          <AnimatePresence mode="wait" initial={false}>
            <motion.figure
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              aria-live="polite"
            >
              <figcaption>
                <p className="text-2xl font-bold tracking-tight text-stone-900">{current.name}</p>
                {current.designation && <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[var(--color-accent)]">{current.designation}</p>}
                {current.rating ? (
                  <p className="mt-3 flex gap-0.5" aria-label={`${current.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} aria-hidden className={`h-4 w-4 ${i < (current.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
                    ))}
                  </p>
                ) : null}
              </figcaption>
              <blockquote className="mt-6 text-base italic leading-relaxed text-stone-700 sm:text-lg">
                {reduced ? current.quote : words.map((w, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    initial={{ filter: 'blur(10px)', opacity: 0, y: 5 }}
                    animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut', delay: Math.min(0.025 * i, 1.2) }}
                  >
                    {w}&nbsp;
                  </motion.span>
                ))}
              </blockquote>
              {current.sourceUrl && (
                <a href={current.sourceUrl} target="_blank" rel="noopener nofollow" className="mt-4 inline-block text-xs font-semibold text-stone-600 underline underline-offset-2">
                  Read on {current.sourceLabel || 'the original site'}
                </a>
              )}
            </motion.figure>
          </AnimatePresence>
          {n > 1 && (
            <div className="flex items-center gap-4 pt-10">
              <button type="button" onClick={prev} aria-label="Previous review"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-stone-50 shadow-md transition-all duration-300 hover:scale-105 hover:bg-[var(--color-accent)] active:scale-95">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={next} aria-label="Next review"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-stone-50 shadow-md transition-all duration-300 hover:scale-105 hover:bg-[var(--color-accent)] active:scale-95">
                <ArrowRight className="h-5 w-5" />
              </button>
              <span className="font-mono text-xs text-stone-500">{active + 1} / {n}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
