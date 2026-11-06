import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m as motion, useReducedMotion } from 'motion/react';
import { usePageVisible } from '../../lib/hooks';
import Spotlight from '../ui/Spotlight';

/**
 * Rotating brand grid from the previous home page. The tiles cycle through the brands
 * in stock a page at a time (blur-and-slide transition, staggered), so no brand shows twice. Clicking opens that brand's
 * page. Brands without an icon get a typographic wordmark. Stops cycling off-screen,
 * in background tabs and for visitors who prefer reduced motion.
 */
export interface BrandLogo {
  name: string;
  slug: string;
  count?: number;
  img?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const CYCLE_MS = 2200;

function Tile({ current, column, onPick }: { current: BrandLogo; column: number; onPick: (b: BrandLogo) => void }) {
  const Icon = current.img;
  return (
    <motion.button
      type="button"
      onClick={() => onPick(current)}
      aria-label={`Browse used ${current.name} cars${current.count ? ` (${current.count} in stock)` : ''}`}
      className="group relative h-24 w-[calc(50%-0.5rem)] rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-900/5 sm:h-28 sm:w-40 md:h-32 md:w-44"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: column * 0.08, duration: 0.5, ease: 'easeOut' }}
    >
      <Spotlight size={180} className="h-full w-full overflow-hidden rounded-[inherit]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={current.slug}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3"
            initial={{ y: '18%', opacity: 0, filter: 'blur(6px)' }}
            animate={{ y: '0%', opacity: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 260, damping: 22, delay: column * 0.07 } }}
            exit={{ y: '-18%', opacity: 0, filter: 'blur(6px)', transition: { duration: 0.25, ease: 'easeIn', delay: column * 0.07 } }}
          >
            {Icon ? (
              <Icon className="h-10 w-10 text-stone-500 transition-colors duration-300 group-hover:text-amber-700 md:h-12 md:w-12" aria-hidden />
            ) : (
              <span className="text-center text-base font-black uppercase leading-tight tracking-[0.12em] text-stone-600 transition-colors group-hover:text-amber-800 md:text-lg" aria-hidden>
                {current.name}
              </span>
            )}
            {Icon && <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-600 transition-colors group-hover:text-amber-800">{current.name}</span>}
            {current.count ? <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">{current.count} in stock</span> : null}
          </motion.span>
        </AnimatePresence>
      </Spotlight>
    </motion.button>
  );
}

export default function LogoCarousel({ brands, columns = 5, onPick }: { brands: BrandLogo[]; columns?: number; onPick: (b: BrandLogo) => void }) {
  const reduced = useReducedMotion();
  const visible = usePageVisible();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [tick, setTick] = useState(0);
  const cols = Math.max(1, Math.min(columns, brands.length));
  const pages = Math.ceil(brands.length / cols);
  const cycles = pages > 1;
  // Each tick shows the next page of brands, so the tiles on screen are always distinct.
  const shown = useMemo(() => {
    const start = (tick % Math.max(1, pages)) * cols;
    return Array.from({ length: cols }, (_, i) => brands[(start + i) % brands.length]);
  }, [brands, cols, pages, tick]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '100px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible || !inView || !cycles) return;
    const t = window.setInterval(() => setTick((x) => x + 1), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [reduced, visible, inView, cycles]);

  if (!brands.length) return null;
  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
      {shown.map((b, i) => <Tile key={i} current={b} column={i} onPick={onPick} />)}
    </div>
  );
}

const ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {};
export function iconForBrand(name: string) {
  if (!Object.keys(ICONS).length) {
    Object.assign(ICONS, {
      'mercedes-benz': MercedesIcon, mercedes: MercedesIcon, bmw: BMWIcon, audi: AudiIcon, porsche: PorscheIcon,
      toyota: ToyotaIcon, hyundai: HyundaiIcon, tesla: TeslaIcon, tata: TataIcon, 'tata motors': TataIcon,
      'land rover': LandRoverIcon, 'range rover': LandRoverIcon, lamborghini: LamborghiniIcon, mahindra: MahindraIcon,
      suzuki: SuzukiIcon, 'maruti suzuki': SuzukiIcon, maruti: SuzukiIcon,
    });
  }
  return ICONS[name.trim().toLowerCase()];
}

// Brand SVG Icons
export const MercedesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <circle cx="50" cy="50" r="45" />
    <path d="M50 5 L50 50 L11 72.5 M50 50 L89 72.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BMWIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="50" cy="50" r="46" strokeWidth="3" />
    <circle cx="50" cy="50" r="30" strokeWidth="1.5" />
    <path d="M50 20 A30 30 0 0 1 80 50 L50 50 Z" fill="currentColor" fillOpacity="0.15" stroke="none" />
    <path d="M50 80 A30 30 0 0 1 20 50 L50 50 Z" fill="currentColor" fillOpacity="0.15" stroke="none" />
    <text x="50" y="14" fontFamily="sans-serif" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor">M</text>
    <text x="21" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" fill="currentColor" transform="rotate(-45 21 27)">B</text>
    <text x="79" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" fill="currentColor" transform="rotate(45 79 27)">W</text>
  </svg>
);

export const AudiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <circle cx="23" cy="20" r="14" />
    <circle cx="41" cy="20" r="14" />
    <circle cx="59" cy="20" r="14" />
    <circle cx="77" cy="20" r="14" />
  </svg>
);

export const PorscheIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M15 15 C15 15 50 5 50 5 C50 5 85 15 85 15 C85 50 78 85 50 115 C22 85 15 50 15 15 Z" fill="none" strokeLinejoin="round" />
    <path d="M22 28 L78 28" />
    <text x="50" y="23" fontFamily="sans-serif" fontSize="7" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="1.5">PORSCHE</text>
    <path d="M50 28 L50 110 M20 58 L80 58" strokeWidth="1.5" />
    <path d="M38 48 C38 48 50 43 50 43 C50 43 62 48 62 48 C62 60 59 75 50 85 C41 75 38 60 38 48 Z" fill="none" strokeWidth="1.5" />
    <circle cx="50" cy="62" r="3.5" fill="currentColor" />
  </svg>
);

export const ToyotaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <ellipse cx="50" cy="35" rx="45" ry="28" />
    <ellipse cx="50" cy="27" rx="28" ry="18" />
    <ellipse cx="50" cy="35" rx="10" ry="28" />
  </svg>
);

export const HyundaiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 65" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <ellipse cx="50" cy="32.5" rx="45" ry="28" transform="rotate(-12 50 32.5)" />
    <path d="M36 20 L42 45 M64 20 L58 45 M38 32 L60 32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
  </svg>
);

export const TeslaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M 10 15 C 35 22, 65 22, 90 15 C 80 25, 20 25, 10 15 Z" fill="currentColor" />
    <path d="M 14 28 C 36 33, 64 33, 86 28 C 82 34, 58 38, 56 42 L 56 82 C 56 86, 54 88, 50 88 C 46 88, 44 86, 44 82 L 44 42 C 42 38, 18 34, 14 28 Z" fill="currentColor" />
  </svg>
);

export const TataIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <circle cx="50" cy="50" r="45" />
    <path d="M30 45 C40 30, 60 30, 70 45 M50 33 L50 78" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
    <path d="M35 55 L50 33 L65 55" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
  </svg>
);

export const LandRoverIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <ellipse cx="60" cy="35" rx="55" ry="30" />
    <ellipse cx="60" cy="35" rx="50" ry="25" strokeDasharray="3 3" />
    <text x="60" y="39" fontFamily="sans-serif" fontSize="8" fontWeight="black" textAnchor="middle" fill="currentColor" letterSpacing="0.5">ROVER</text>
  </svg>
);

export const LamborghiniIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 110" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M10 10 L90 10 L80 85 L50 105 L20 85 Z" strokeLinejoin="round" />
    <path d="M35 45 L42 55 L50 48 L58 55 L65 45" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    <path d="M50 48 L50 80" strokeLinecap="round" strokeWidth="3" />
    <path d="M42 62 L58 62" strokeLinecap="round" strokeWidth="3" />
  </svg>
);

export const MahindraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M20 78 L50 22 L80 78" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M50 22 L50 78" strokeLinecap="round" />
    <path d="M35 55 L50 42 L65 55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SuzukiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <path d="M72 20 L28 20 C28 20 25 35 40 45 C55 55 72 55 72 55 C72 55 75 68 58 78 L25 78" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
