import React from 'react';
import ScrollVelocityJs from '../reactbits/ScrollVelocity.jsx';
import ScrollStackJs, { ScrollStackItem as ScrollStackItemJs } from '../reactbits/ScrollStack.jsx';
import '../reactbits/ScrollVelocity.css';
import '../reactbits/ScrollStack.css';
import Picture from '../ui/Picture';
import type { HomeSection } from '../../types';

// The React Bits files are plain JS with optional props; give them loose prop types here.
type Loose = React.FC<Record<string, unknown> & { children?: React.ReactNode }>;
const ScrollVelocity = ScrollVelocityJs as unknown as Loose;
const ScrollStack = ScrollStackJs as unknown as Loose;
const ScrollStackItem = ScrollStackItemJs as unknown as Loose;

/**
 * Moving text band (React Bits "Scroll Velocity"): giant type that drifts and speeds up,
 * leaning with the scroll. Decorative: screen readers get each line once.
 * Content: Admin → Settings → Home page → Moving text band.
 */
export function VelocityBand({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <section aria-label="Showroom promise" className="em-band overflow-hidden bg-stone-950">
      <ul className="sr-only">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <div aria-hidden>
        <ScrollVelocity
          texts={lines}
          velocity={55}
          numCopies={4}
          fadeEdges
          skewWithVelocity={6}
          outlineAlternate
          separator="  ✦  "
          parallaxClassName="rbv-parallax"
          scrollerClassName="rbv-scroller"
          className="font-black uppercase tracking-tight text-stone-100 [font-size:clamp(2.5rem,8vw,6rem)] [line-height:1.1]"
        />
      </div>
    </section>
  );
}

export interface WhyCard { title: string; text: string; image: string }

/**
 * "Why buy from us" stacking cards (React Bits "Scroll Stack"): full-width photo cards pin
 * under the header and pile up as the visitor scrolls. Normal page scrolling (no scroll
 * hijacking). Content: Admin → Settings → Home page → Why buy from us.
 */
export function WhyUs({ cards, heading }: { section?: HomeSection; cards: WhyCard[]; heading: React.ReactNode }) {
  if (!cards.length) return null;
  const total = String(cards.length).padStart(2, '0');
  return (
    <section className="em-section bg-stone-100/70" aria-labelledby="home-whyus" id="why-buy-from-us">
      <div className="page-container">{heading}</div>
      <ScrollStack useWindowScroll smoothScroll={false} itemDistance={120} itemStackDistance={28} stackPosition="16%" baseScale={0.9} dimAmount={0.22}>
        {cards.map((c, i) => (
          <ScrollStackItem key={c.title + i} itemClassName="mx-auto !h-auto min-h-[20rem] max-w-5xl !p-0 overflow-hidden grid md:grid-cols-[1.1fr_1fr] !bg-white !text-stone-900">
            <div className="relative min-h-[12rem] bg-stone-200 md:min-h-full">
              {c.image && <Picture src={c.image} alt="" sizes="(min-width: 768px) 560px, 92vw" widths={[640, 960, 1280, 1920]} className="h-full w-full object-cover" wrapperClassName="absolute inset-0 h-full w-full" />}
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-3 p-6 md:p-10">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">{String(i + 1).padStart(2, '0')} / {total}</p>
              <h3 className="text-2xl font-black uppercase leading-tight tracking-tight md:text-3xl">{c.title}</h3>
              {c.text && <p className="text-sm leading-relaxed text-stone-600 md:text-base">{c.text}</p>}
            </div>
          </ScrollStackItem>
        ))}
      </ScrollStack>
    </section>
  );
}
