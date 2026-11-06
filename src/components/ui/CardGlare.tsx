import React from 'react';
import GlareHoverJs from '../reactbits/GlareHover.jsx';
import '../reactbits/GlareHover.css';

const GlareHover = GlareHoverJs as unknown as React.FC<Record<string, unknown> & { children?: React.ReactNode }>;

/**
 * A light streak that sweeps across a card on hover (tap on phones), like a reflection on
 * paint. React Bits "Glare Hover"; still for reduced motion. Wraps a `.card` element.
 */
export default function CardGlare({ children, className = '', radius = '0.75rem' }: { children: React.ReactNode; className?: string; radius?: string }) {
  return (
    <GlareHover
      borderRadius={radius}
      background="transparent"
      borderColor="transparent"
      glareColor="#ffffff"
      glareOpacity={0.4}
      glareSize={55}
      glareAngle={-40}
      transitionDuration={750}
      className={`em-glare ${className}`}
    >
      {children}
    </GlareHover>
  );
}
