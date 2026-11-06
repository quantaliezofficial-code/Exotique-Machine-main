import React, { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from '../../router';
import { variant } from '../../lib/images';

export interface FlowingItem { label: string; image: string; link: string }

/**
 * "Discover by Lifestyle" hover rows from the previous home page (no GSAP: CSS
 * transforms only). On hover, an accent band slides in from the edge the pointer
 * entered, carrying a scrolling marquee of the label and the photo. On touch screens
 * each row shows its photo inline instead. Rows: Admin → Settings → Home page →
 * Collections.
 */
export default function FlowingMenu({ items }: { items: FlowingItem[] }) {
  return (
    <nav aria-label="Collections" className="w-full border-y border-stone-200">
      <ul>
        {items.map((it, i) => <Row key={it.label + i} item={it} first={i === 0} />)}
      </ul>
    </nav>
  );
}

function Row({ item, first }: { item: FlowingItem; first: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const [state, setState] = useState<{ on: boolean; from: 'top' | 'bottom' }>({ on: false, from: 'bottom' });
  const edge = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return e.clientY - r.top < r.height / 2 ? 'top' : 'bottom';
  };
  const img = variant(item.image, 640);
  const hiddenY = state.from === 'top' ? '-101%' : '101%';
  const parts = Array.from({ length: 6 });
  return (
    <li ref={ref} className={`relative overflow-hidden ${first ? '' : 'border-t border-stone-200'}`}>
      <Link
        to={item.link}
        className="group relative z-10 flex h-24 items-center justify-between gap-4 px-4 text-stone-900 sm:h-28 sm:justify-center md:h-32"
        onPointerEnter={(e) => e.pointerType === 'mouse' && setState({ on: true, from: edge(e) })}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setState({ on: false, from: edge(e) })}
        onFocus={() => setState({ on: true, from: 'bottom' })}
        onBlur={() => setState((s) => ({ ...s, on: false }))}
      >
        <span className="text-2xl font-semibold uppercase tracking-tight sm:text-4xl md:text-5xl">{item.label}</span>
        {/* Touch screens: photo shown inline */}
        <span className="flex items-center gap-3 [@media(hover:hover)]:hidden">
          <img src={img} alt="" className="h-14 w-24 rounded-full object-cover" loading="lazy" decoding="async" width={96} height={56} />
          <ArrowUpRight className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />
        </span>
      </Link>
      {/* Hover band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 hidden overflow-hidden bg-[var(--color-accent)] [@media(hover:hover)]:block"
        style={{ transform: `translateY(${state.on ? '0%' : hiddenY})`, transition: 'transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)' }}
      >
        <div
          className="flex h-full items-center"
          style={{ transform: `translateY(${state.on ? '0%' : state.from === 'top' ? '101%' : '-101%'})`, transition: 'transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)' }}
        >
          <div className="flex w-max items-center" style={{ animation: 'em-marquee 18s linear infinite', animationPlayState: state.on ? 'running' : 'paused' }}>
            {[0, 1].map((half) => (
              <div key={half} className="flex shrink-0 items-center">
                {parts.map((_, i) => (
                  <span key={i} className="flex shrink-0 items-center">
                    <span className="whitespace-nowrap px-[1vw] text-2xl uppercase leading-none text-white sm:text-4xl md:text-5xl">{item.label}</span>
                    <span className="mx-[2vw] my-6 h-16 w-48 shrink-0 rounded-full bg-cover bg-center md:h-20 md:w-56" style={{ backgroundImage: `url("${img}")` }} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
