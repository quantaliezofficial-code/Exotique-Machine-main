import React, { useRef } from 'react';
import { m as motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Link } from '../../router';
import Picture from '../ui/Picture';
import AnimatedBorder from '../ui/AnimatedBorder';

export interface ServiceTile { title: string; desc?: string; image?: string; link?: string }
export interface ServiceCenter { eyebrow?: string; title: string; text?: string; ctaLabel?: string; ctaUrl?: string }

// Position of each surrounding photo (same layout as the previous site).
const SLOTS = [
  'top-[-25vh] left-[8vw] h-[28vh] w-[32vw]',
  'top-[-8vh] left-[-22vw] h-[38vh] w-[22vw]',
  'left-[25vw] h-[22vh] w-[22vw]',
  'top-[25vh] left-[4vw] h-[22vh] w-[18vw]',
  'top-[25vh] left-[-20vw] h-[22vh] w-[28vw]',
  'top-[20vh] left-[22vw] h-[15vh] w-[15vw]',
];

/**
 * Scroll-driven zoom from the previous home page: a centre card with the service list,
 * surrounded by photos that zoom past as the visitor scrolls. Desktop only — on phones
 * and for reduced motion it becomes a swipeable row of the same service cards.
 * Content: Admin → Website → Settings → Home page → Services.
 */
export default function ZoomParallax({ center, items }: { center: ServiceCenter; items: ServiceTile[] }) {
  const reduced = useReducedMotion();
  const tiles = items.slice(0, 6);
  return (
    <>
      {!reduced && <div className="hidden lg:block"><Zoom center={center} tiles={tiles} /></div>}
      <div className={reduced ? '' : 'lg:hidden'}><Row center={center} tiles={items} /></div>
    </>
  );
}

function CenterCard({ center, tiles }: { center: ServiceCenter; tiles: ServiceTile[] }) {
  return (
    <AnimatedBorder width={1.5} duration={7} className="h-full w-full shadow-2xl" contentClassName="flex flex-col justify-between overflow-hidden bg-white p-6 text-left">
      <div>
        {center.eyebrow && <p className="font-mono text-[11px] font-black uppercase tracking-widest text-stone-500">{center.eyebrow}</p>}
        <h3 className="mt-1 text-xl font-black uppercase leading-none tracking-tight text-stone-900">{center.title}</h3>
        {center.text && <p className="mt-1.5 text-sm text-stone-600">{center.text}</p>}
      </div>
      <ul className="my-4 space-y-2">
        {tiles.slice(0, 5).map((t) => (
          <li key={t.title} className="flex items-center gap-2 text-stone-800">
            <span className="text-xs text-amber-600" aria-hidden>✦</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider">{t.title}</span>
          </li>
        ))}
      </ul>
      {center.ctaLabel && center.ctaUrl && (
        <Link to={center.ctaUrl} className="inline-flex items-center gap-1.5 self-start border-t border-stone-200 pt-3 text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] hover:underline">
          {center.ctaLabel}<ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </AnimatedBorder>
  );
}

function Zoom({ center, tiles }: { center: ServiceCenter; tiles: ServiceTile[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 30%', 'end 5%'] });
  const scaleCenter = useTransform(scrollYProgress, [0, 0.3], [0.95, 1.25]);
  const s4 = useTransform(scrollYProgress, [0, 0.3], [1, 4.5]);
  const s5 = useTransform(scrollYProgress, [0, 0.3], [1, 5.5]);
  const s6 = useTransform(scrollYProgress, [0, 0.3], [1, 6.5]);
  const s8 = useTransform(scrollYProgress, [0, 0.3], [1, 8.5]);
  const s9 = useTransform(scrollYProgress, [0, 0.3], [1, 9.5]);
  const scales = [s4, s5, s6, s5, s8, s9];
  return (
    <div ref={ref} className="relative h-[150vh]">
      <div className="sticky top-20 flex h-[calc(100vh-5rem)] items-center justify-center overflow-hidden">
        {tiles.map((t, i) => (
          <motion.div key={t.title + i} style={{ scale: scales[i] }} className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className={`group relative overflow-hidden rounded-2xl border border-stone-200/60 bg-stone-200 shadow-lg ${SLOTS[i]}`}>
              {t.image && <Picture src={t.image} alt="" sizes="34vw" widths={[960, 1280, 1920]} className="h-full w-full object-cover" wrapperClassName="h-full w-full" />}
              <div className="absolute inset-x-0 bottom-0 border-t border-stone-100 bg-white/95 p-2.5 text-left backdrop-blur-md">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-900">{t.title}</p>
                {t.desc && <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-600">{t.desc}</p>}
              </div>
            </div>
          </motion.div>
        ))}
        <motion.div style={{ scale: scaleCenter }} className="relative z-20 h-[40vh] min-h-[320px] w-[26vw] min-w-[300px]">
          <CenterCard center={center} tiles={tiles} />
        </motion.div>
      </div>
    </div>
  );
}

function Row({ center, tiles }: { center: ServiceCenter; tiles: ServiceTile[] }) {
  return (
    <div className="page-container">
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible md:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <>
              <div className="aspect-[4/3] overflow-hidden bg-stone-200">
                {t.image && <Picture src={t.image} alt="" sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 80vw" widths={[640, 960, 1280]}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" wrapperClassName="h-full w-full" />}
              </div>
              <div className="p-4">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900">{t.title}</p>
                {t.desc && <p className="mt-1 text-sm text-stone-600">{t.desc}</p>}
              </div>
            </>
          );
          return (
            <li key={t.title} className="w-[80%] shrink-0 snap-start sm:w-auto">
              {t.link ? <Link to={t.link} className="card group block h-full overflow-hidden">{body}</Link> : <div className="card group h-full overflow-hidden">{body}</div>}
            </li>
          );
        })}
      </ul>
      {center.ctaLabel && center.ctaUrl && (
        <div className="mt-4"><Link to={center.ctaUrl} className="btn btn-primary">{center.ctaLabel}<ArrowRight className="h-4 w-4" aria-hidden /></Link></div>
      )}
    </div>
  );
}
