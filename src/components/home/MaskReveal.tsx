import React from 'react';
import { m as motion, useReducedMotion } from 'motion/react';

/**
 * Curtain reveal for headings: the text opens from the centre outwards with a clip-path
 * as it scrolls into view. Adapted from Originkit "Mask Text Reveal" (scroll-triggered
 * here, once). Screen readers and reduced-motion visitors get the plain text.
 */
export default function MaskReveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{children}</span>;
  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={{ clipPath: 'inset(0% 50% 0% 50%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, ease: 'easeInOut', delay }}
      style={{ willChange: 'clip-path' }}
    >
      {children}
    </motion.span>
  );
}
