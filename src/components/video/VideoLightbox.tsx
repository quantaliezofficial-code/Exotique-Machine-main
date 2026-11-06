import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, FileText } from 'lucide-react';
import type { VideoClip } from '../../types';
import { variant } from '../../lib/images';

export function formatDuration(s?: number): string {
  if (!s) return '';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

/**
 * Full-screen player for vertical clips. Opens with sound (the visitor tapped to open
 * it), arrows or swipe move between stories, Escape closes and focus returns to the card.
 */
export default function VideoLightbox({ clips, index, onIndex, onClose }: {
  clips: VideoClip[]; index: number; onIndex: (i: number) => void; onClose: () => void;
}) {
  const clip = clips[index];
  const video = useRef<HTMLVideoElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [showText, setShowText] = useState(false);
  const touch = useRef<number | null>(null);
  const many = clips.length > 1;
  const go = (d: number) => onIndex((index + d + clips.length) % clips.length);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => { document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  useEffect(() => {
    setShowText(false);
    video.current?.play().catch(() => { /* autoplay with sound refused: controls are visible */ });
  }, [index]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowRight') go(1);
      else if (many && e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const label = [clip.name, clip.car].filter(Boolean).join(' · ') || clip.title || 'Video';
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/[0.97] backdrop-blur-sm fade-in" role="dialog" aria-modal="true" aria-label={label}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}>
      <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close video"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-5 sm:top-5">
        <X className="h-5 w-5" />
      </button>
      {many && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous story"
            className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex md:left-8">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next story"
            className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex md:right-8">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <figure className="relative flex h-full max-h-[100dvh] w-full max-w-[min(100vw,calc((100dvh-7rem)*9/16))] flex-col justify-center px-0 sm:px-2">
        <video key={clip.src} ref={video} src={clip.src} poster={clip.poster ? variant(clip.poster, 960) : undefined}
          controls playsInline autoPlay preload="auto" controlsList="nodownload"
          className="max-h-[calc(100dvh-7rem)] w-full rounded-none bg-black object-contain sm:rounded-2xl"
          aria-label={label} />
        <figcaption className="mt-3 px-4 text-white sm:px-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {(clip.name || clip.title) && <p className="font-bold">{clip.name || clip.title}</p>}
              {(clip.car || clip.caption) && <p className="text-sm text-stone-300">{[clip.car, clip.caption].filter(Boolean).join(' — ')}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-stone-400">
              {clip.transcript && (
                <button type="button" onClick={() => setShowText((v) => !v)} aria-expanded={showText}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/20 px-3 text-white hover:bg-white/10">
                  <FileText className="h-3.5 w-3.5" aria-hidden />Transcript
                </button>
              )}
              {many && <span className="tabular-nums">{index + 1} / {clips.length}</span>}
            </div>
          </div>
          {showText && clip.transcript && (
            <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-stone-200">{clip.transcript}</p>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
