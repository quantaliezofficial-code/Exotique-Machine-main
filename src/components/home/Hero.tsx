import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Pause, Play } from 'lucide-react';
import type { HeroSlide } from '../../types';
import { Link } from '../../router';
import { srcSet, variant, isOptimisable } from '../../lib/images';
import { usePageVisible, usePrefersReducedMotion } from '../../lib/hooks';

const INTERVAL_MS = 7000;

function isInternal(url: string) {
  return url.startsWith('/') && !url.startsWith('//');
}

function HeroImage({ slide, priority }: { slide: HeroSlide; priority: boolean }) {
  const desktop = slide.desktopImage;
  const mobile = slide.mobileImage || desktop;
  const alt = slide.imageAlt || slide.title;
  const cls = 'absolute inset-0 h-full w-full object-cover';
  if (!isOptimisable(desktop)) {
    return <img src={desktop} alt={alt} className={cls} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} />;
  }
  return (
    <picture>
      {isOptimisable(mobile) && (
        <>
          <source media="(max-width: 767px)" type="image/avif" srcSet={srcSet(mobile, 'avif', [640, 960, 1280])} sizes="100vw" />
          <source media="(max-width: 767px)" type="image/webp" srcSet={srcSet(mobile, 'webp', [640, 960, 1280])} sizes="100vw" />
        </>
      )}
      <source type="image/avif" srcSet={srcSet(desktop, 'avif', [960, 1280, 1920])} sizes="100vw" />
      <source type="image/webp" srcSet={srcSet(desktop, 'webp', [960, 1280, 1920])} sizes="100vw" />
      <img
        src={variant(desktop, 1280)}
        alt={alt}
        className={cls}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        width={1920}
        height={1080}
        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
      />
    </picture>
  );
}

/**
 * Home hero, fully driven by Admin → Website → Hero slides. Crossfade is CSS only.
 * Autoplay pauses on hover/focus, in background tabs, when the visitor presses pause,
 * and never starts when they prefer reduced motion (WCAG 2.2.2).
 */
export default function Hero({ slides, heading }: { slides: HeroSlide[]; heading: string }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const playing = count > 1 && !reduced && !paused && !hovered && visible;
  // Only mount images that have been (or are about to be) shown: slide 1 now, the next
  // one shortly before it appears. Avoids downloading six hero photos up front.
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setMounted((m) => (m.has(index) && m.has((index + 1) % count) ? m : new Set([...m, index, (index + 1) % count])));
  }, [index, count]);

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [playing, index, count]);

  if (!count) return null;
  const go = (d: number) => setIndex((i) => (i + d + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured cars"
      className="relative isolate flex min-h-[78svh] flex-col justify-end overflow-hidden bg-stone-950 text-white md:min-h-[82svh]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setHovered(false)}
    >
      <div className="absolute inset-0 -z-10">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="fade-swap absolute inset-0"
            style={{ opacity: i === index ? 1 : 0 }}
            aria-hidden={i !== index}
          >
            {mounted.has(i) && <HeroImage slide={s} priority={i === 0} />}
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/55 to-stone-950/20" />
      </div>

      <div className="page-container w-full pb-10 pt-24 md:pb-14">
        <h1 className="eyebrow text-amber-300">{heading}</h1>
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            hidden={i !== index}
            className="mt-3 max-w-2xl fade-in"
          >
            {s.eyebrow && <p className="font-mono text-xs font-bold uppercase tracking-widest text-stone-300">{s.eyebrow}</p>}
            {/* The page h1 is the CMS homepage heading above; slide titles are h2. */}
            <h2 className="mt-1 text-3xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{s.title}</h2>
            {s.description && <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-200 sm:text-base">{s.description}</p>}
            {s.ctaLabel && s.ctaUrl && (
              <div className="mt-6">
                {isInternal(s.ctaUrl) ? (
                  <Link to={s.ctaUrl} className="btn btn-on-dark rounded-full px-6">
                    {s.ctaLabel}<ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <a href={s.ctaUrl} className="btn btn-on-dark rounded-full px-6" rel="noopener">
                    {s.ctaLabel}<ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}

        {count > 1 && (
          <div className="mt-8 flex items-center gap-2">
            <button type="button" onClick={() => go(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-stone-950" aria-label="Previous slide">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 px-1">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show slide ${i + 1}: ${s.title}`}
                  aria-current={i === index}
                  className="flex h-11 w-6 items-center justify-center"
                >
                  <span className={`block h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-amber-400' : 'w-2.5 bg-white/50'}`} />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => go(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-stone-950" aria-label="Next slide">
              <ChevronRight className="h-5 w-5" />
            </button>
            {!reduced && (
              <button type="button" onClick={() => setPaused((p) => !p)} className="ml-1 flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
