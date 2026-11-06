import React, { useEffect, useRef, useState } from 'react';
import { m as motion, useInView, useReducedMotion } from 'motion/react';

/** Fade-and-rise as a section scrolls into view (instant for reduced motion). */
export function Reveal({ children, delay = 0, className = '', as = 'div' }: { children: React.ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' }) {
  const reduced = useReducedMotion();
  const Comp = motion[as];
  if (reduced) return React.createElement(as, { className }, children);
  return (
    <Comp className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </Comp>
  );
}

/**
 * Counts up the leading number in a value ("70", "₹5.5L – ₹2.1Cr" counts the first
 * number only, keeping the rest of the text). Plain text for reduced motion.
 */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const m = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const [shown, setShown] = useState(m && !reduced ? `${m[1]}0${m[3]}` : value);
  useEffect(() => {
    if (!m || reduced || !inView) { setShown(value); return; }
    const target = parseFloat(m[2]);
    const decimals = (m[2].split('.')[1] || '').length;
    // Small rAF tween (ease-out-expo) instead of motion's animate(), keeping the
    // animation engine out of the first-load bundle.
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setShown(`${m[1]}${(target * e).toFixed(decimals)}${m[3]}`);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduced]);
  return (
    <span ref={ref}>
      <span aria-hidden>{shown}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
