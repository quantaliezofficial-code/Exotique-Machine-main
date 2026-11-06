import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, m as motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronRight, Pause, Play } from 'lucide-react';
import type { HeroSlide } from '../../types';
import { Link, useRouter } from '../../router';
import { variant } from '../../lib/images';
import { usePageVisible } from '../../lib/hooks';
import Picture from '../ui/Picture';
import ArrowRevealButton from '../ui/ArrowRevealButton';

const INTERVAL_MS = 8000;
const EASE = [0.16, 1, 0.3, 1] as const;
const CARD_SIZES = '(min-width: 1024px) 840px, (min-width: 768px) 680px, (min-width: 640px) 480px, 92vw';

const isInternal = (url: string) => url.startsWith('/') && !url.startsWith('//');

/**
 * Home hero — the design from the previous site, now driven by Admin → Website → Hero.
 * Dimmed full-bleed photo, oversized watermark, a floating showcase card with a gentle
 * pointer tilt, the story block and a thumbnail switcher.
 * Autoplay pauses on hover/focus, in background tabs, with the pause button, and never
 * runs when the visitor prefers reduced motion.
 */
export default function Hero({ slides, heading }: { slides: HeroSlide[]; heading: string }) {
  const { navigate } = useRouter();
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const slide = slides[Math.min(index, count - 1)];
  const playing = count > 1 && !reduced && !paused && !hovered && visible;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [playing, index, count]);

  // Warm the next slide's photos so the change is instant.
  useEffect(() => {
    if (count < 2) return;
    const next = slides[(index + 1) % count];
    const img = new Image();
    img.src = variant(next.desktopImage, 1280);
  }, [index, count, slides]);

  // Pointer tilt for the showcase card (desktop pointers only).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, [-1, 1], [-6, 6]), { stiffness: 120, damping: 18 });
  const rotX = useSpring(useTransform(my, [-1, 1], [5, -5]), { stiffness: 120, damping: 18 });
  const bgX = useSpring(useTransform(mx, [-1, 1], [12, -12]), { stiffness: 80, damping: 20 });
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);
  const openSlide = () => {
    if (!slide.ctaUrl) return;
    if (isInternal(slide.ctaUrl)) navigate(slide.ctaUrl);
    else window.location.assign(slide.ctaUrl);
  };

  if (!count || !slide) return null;
  const watermark = (slide.watermark || slide.title).toUpperCase();
  const brand = slide.eyebrow || '';

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured cars"
      className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-between overflow-hidden bg-stone-950 text-white lg:min-h-[calc(100svh-5rem)]"
      onPointerMove={onMove}
      onPointerLeave={() => { reset(); setHovered(false); }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHovered(false)}
    >
      {/* Edge-to-edge photographic background */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="absolute inset-[-24px]"
            style={{ x: bgX }}
          >
            <Picture
              src={slide.mobileImage || slide.desktopImage}
              alt=""
              sizes="100vw"
              widths={[960, 1280, 1920]}
              priority={index === 0}
              className="h-full w-full object-cover brightness-[0.4] contrast-[1.05] saturate-[0.95]"
              wrapperClassName="h-full w-full"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/10 to-stone-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(12,10,9,0.55)_100%)]" />
      </div>

      {/* Oversized watermark */}
      <div className="pointer-events-none absolute inset-x-0 top-[22%] z-0 select-none overflow-hidden text-center md:top-[26%]" aria-hidden>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={slide.id}
            initial={{ opacity: 0, scale: 1.12, y: 30 }}
            animate={{ opacity: 0.12, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -24 }}
            transition={{ duration: 1.1, ease: EASE }}
            className="whitespace-nowrap text-[17vw] font-black uppercase leading-none tracking-[0.12em] text-white sm:text-[14vw] lg:text-[11vw]"
          >
            {watermark}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-grow flex-col justify-between px-4 sm:px-10 lg:px-16">
        <h1 className="pt-6 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300/90 sm:pt-10">{heading}</h1>

        {/* Floating showcase card */}
        <div className="flex flex-grow items-center justify-center py-5 sm:py-8 [perspective:1400px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              type="button"
              key={slide.id}
              onClick={openSlide}
              initial={{ opacity: 0, scale: 0.94, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.04, y: -30 }}
              transition={{ duration: 0.9, ease: EASE }}
              style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}
              className="group relative block aspect-[16/10] w-full max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-stone-900/40 text-left shadow-[0_32px_80px_rgba(0,0,0,0.65)] sm:max-w-[480px] md:max-w-[680px] md:rounded-3xl lg:max-w-[840px]"
              aria-label={`${brand ? `${brand} ` : ''}${slide.imageAlt || slide.title}${slide.ctaLabel ? ` – ${slide.ctaLabel}` : ''}`}
            >
              <Picture
                src={slide.desktopImage}
                alt={slide.imageAlt || slide.title}
                sizes={CARD_SIZES}
                priority={index === 0}
                className="h-full w-full scale-[1.02] object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                wrapperClassName="h-full w-full"
                width={1680}
                height={1050}
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/10" />
              {/* moving sheen on hover */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              <span className="absolute bottom-4 left-5 md:bottom-6 md:left-8">
                {brand && (
                  <span className="mb-2 inline-block rounded bg-amber-500 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-stone-950">
                    {brand}
                  </span>
                )}
                <span className="block text-lg font-bold tracking-tight text-white md:text-xl">{slide.imageAlt || slide.title}</span>
              </span>
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Story block + thumbnails */}
        <div className="mt-auto grid w-full grid-cols-1 items-end gap-6 pb-8 md:pb-12 lg:grid-cols-12">
          <div className="max-w-xl lg:col-span-7" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">{slide.title}</h2>
                {slide.description && <p className="hidden text-sm font-light leading-relaxed text-stone-300 sm:block md:text-base">{slide.description}</p>}
                {slide.ctaLabel && slide.ctaUrl && (
                  <ArrowRevealButton to={slide.ctaUrl} tone="light">{slide.ctaLabel}</ArrowRevealButton>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {count > 1 && (
            <div className="flex items-center justify-start lg:col-span-5 lg:justify-end">
              <div className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 shadow-xl backdrop-blur-md sm:gap-3 sm:px-4">
                <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-white hover:text-stone-950" aria-label="Previous slide">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Show slide ${i + 1}: ${s.title}`}
                      aria-current={i === index}
                      className={`relative h-9 w-14 shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${i === index ? 'scale-110 ring-2 ring-amber-400' : 'opacity-50 hover:opacity-90'}`}
                    >
                      <img src={variant(s.desktopImage, 320)} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" width={56} height={36} />
                      {i === index && playing && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-amber-400" style={{ animation: `em-progress ${INTERVAL_MS}ms linear forwards` }} />
                      )}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => go(1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-white hover:text-stone-950" aria-label="Next slide">
                  <ChevronRight className="h-4 w-4" />
                </button>
                {!reduced && (
                  <button type="button" onClick={() => setPaused((p) => !p)} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 sm:flex" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
