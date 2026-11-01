'use client';

import React, { useRef } from 'react';
import { useScroll, useTransform, motion } from 'motion/react';

interface Image {
  src: string;
  alt?: string;
  title?: string;
  desc?: string;
}

interface ZoomParallaxProps {
  /** Array of images to be displayed in the parallax effect max 7 images */
  images: Image[];
}

export function ZoomParallax({ images }: ZoomParallaxProps) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start 30%', 'end 5%'],
  });

  // Map the zoom animation to complete aggressively between 0% and 25% of the scroll timeline.
  // This ensures the animation starts precisely when the top of the section hits 15% of the screen (its sticky point)
  // and completes smoothly as the user continues scrolling.
  const scaleCenter = useTransform(scrollYProgress, [0, 0.25], [0.95, 1.4]);
  const scale4 = useTransform(scrollYProgress, [0, 0.25], [1, 4.5]);
  const scale5 = useTransform(scrollYProgress, [0, 0.25], [1, 5.5]);
  const scale6 = useTransform(scrollYProgress, [0, 0.25], [1, 6.5]);
  const scale8 = useTransform(scrollYProgress, [0, 0.25], [1, 8.5]);
  const scale9 = useTransform(scrollYProgress, [0, 0.25], [1, 9.5]);

  const scales = [scale4, scale5, scale6, scale5, scale6, scale8, scale9];

  return (
    <div ref={container} className="relative h-[75vh] overflow-hidden">
      <div className="sticky top-20 h-[55vh] overflow-hidden flex items-center justify-center">
        {images.map(({ src, alt, title, desc }, index) => {
          if (index === 0) {
            return (
              <motion.div
                key={index}
                style={{ scale: scaleCenter }}
                className="absolute top-0 flex h-full w-full items-center justify-center z-20 pointer-events-none"
              >
                <div className="relative h-[28vh] w-[25vw] min-h-[220px] min-w-[200px] md:h-[32vh] md:w-[26vw] rounded-2xl overflow-hidden shadow-2xl border border-stone-200 bg-white/95 backdrop-blur-md flex flex-col justify-between p-5 text-left pointer-events-auto">
                  {/* Background image with a soft light watermark overlay */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={src || '/placeholder.svg'}
                      alt={alt || `Parallax image ${index + 1}`}
                      className="h-full w-full object-cover opacity-10 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white" />
                  </div>

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    {/* Card Header */}
                    <div>
                      <span className="text-[6px] md:text-[8px] font-mono uppercase tracking-widest font-black text-stone-500 block mb-1">
                        CONCIERGE HUB
                      </span>
                      <h3 className="text-xs md:text-lg font-black text-stone-900 uppercase tracking-tight leading-none">
                        Our Bespoke Suite
                      </h3>
                      <p className="text-[7px] md:text-[10px] text-stone-500 font-light mt-0.5">
                        A full portfolio of elite-tier concierge services.
                      </p>
                    </div>

                    {/* Summary of services */}
                    <div className="my-3 space-y-1.5 md:space-y-2">
                      <div className="flex items-center space-x-2 text-stone-800">
                        <span className="text-[7px] md:text-[9px] text-amber-600">✦</span>
                        <span className="text-[8px] md:text-xs font-mono font-bold uppercase tracking-wider">Tailored Cabin Craft</span>
                      </div>
                      <div className="flex items-center space-x-2 text-stone-800">
                        <span className="text-[7px] md:text-[9px] text-amber-600">✦</span>
                        <span className="text-[8px] md:text-xs font-mono font-bold uppercase tracking-wider">Enclosed Transportation</span>
                      </div>
                      <div className="flex items-center space-x-2 text-stone-800">
                        <span className="text-[7px] md:text-[9px] text-amber-600">✦</span>
                        <span className="text-[8px] md:text-xs font-mono font-bold uppercase tracking-wider">24/7 VIP Concierge</span>
                      </div>
                      <div className="flex items-center space-x-2 text-stone-800">
                        <span className="text-[7px] md:text-[9px] text-amber-600">✦</span>
                        <span className="text-[8px] md:text-xs font-mono font-bold uppercase tracking-wider">Elite Track-Day Events</span>
                      </div>
                    </div>

                    {/* Card Footer / Seal */}
                    <div className="flex items-center justify-between border-t border-stone-200/80 pt-2">
                      <span className="text-[5px] md:text-[7px] font-mono text-stone-400 uppercase tracking-widest">
                        MEMBERSHIP STATUS
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[5px] md:text-[7px] text-emerald-700 font-bold uppercase tracking-widest animate-pulse">
                        ACTIVE ACCESS
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }

          const scale = scales[index % scales.length];

          return (
            <motion.div
              key={index}
              style={{ scale }}
              className={`absolute top-0 flex h-full w-full items-center justify-center ${
                index === 1 ? '[&>div]:!-top-[25vh] [&>div]:!left-[8vw] [&>div]:!h-[28vh] [&>div]:!w-[32vw]' : ''
              } ${
                index === 2 ? '[&>div]:!-top-[8vh] [&>div]:!-left-[22vw] [&>div]:!h-[38vh] [&>div]:!w-[22vw]' : ''
              } ${
                index === 3 ? '[&>div]:!left-[25vw] [&>div]:!h-[22vh] [&>div]:!w-[22vw]' : ''
              } ${
                index === 4 ? '[&>div]:!top-[25vh] [&>div]:!left-[4vw] [&>div]:!h-[22vh] [&>div]:!w-[18vw]' : ''
              } ${
                index === 5 ? '[&>div]:!top-[25vh] [&>div]:!-left-[20vw] [&>div]:!h-[22vh] [&>div]:!w-[28vw]' : ''
              } ${
                index === 6 ? '[&>div]:!top-[20vh] [&>div]:!left-[22vw] [&>div]:!h-[15vh] [&>div]:!w-[15vw]' : ''
              }`}
            >
              <div className="relative h-[22vh] w-[22vw] rounded-2xl overflow-hidden shadow-md border border-stone-200/50 bg-white group">
                <img
                  src={src || '/placeholder.svg'}
                  alt={alt || `Parallax image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Clean glassmorphism white label at the bottom of off-center cards */}
                {(title || desc) && (
                  <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-100 p-2 text-left pointer-events-none">
                    {title && <h4 className="text-[7px] md:text-[9px] font-mono font-bold text-stone-900 uppercase tracking-wider">{title}</h4>}
                    {desc && <p className="text-[6px] md:text-[8px] text-stone-500 font-light leading-none mt-0.5 line-clamp-1">{desc}</p>}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ZoomParallax;
