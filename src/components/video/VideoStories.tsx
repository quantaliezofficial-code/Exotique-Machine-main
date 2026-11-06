import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import type { VideoClip } from '../../types';
import Picture from '../ui/Picture';
import VideoLightbox, { formatDuration } from './VideoLightbox';

/**
 * Customer video stories as vertical "reel" cards. Phones: swipe through; desktop: a
 * row of up to four. Hovering a card plays a silent preview (not with reduced motion);
 * tapping opens the full player with sound.
 */
export default function VideoStories({ clips, className = '', fallback = 'Customer story' }: { clips: VideoClip[]; className?: string; fallback?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!clips.length) return null;
  return (
    <>
      <ul className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:grid sm:overflow-visible sm:px-0 ${
        clips.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : clips.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} ${className}`}>
        {clips.map((c, i) => (
          <li key={c.src} className="w-[68%] shrink-0 snap-center sm:w-auto">
            <StoryCard clip={c} fallback={fallback} onOpen={() => setOpen(i)} />
          </li>
        ))}
      </ul>
      {open !== null && <VideoLightbox clips={clips} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

function StoryCard({ clip, onOpen, fallback }: { clip: VideoClip; onOpen: () => void; fallback: string }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const preview = useRef<HTMLVideoElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const start = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse') return;
    setPreviewing(true);
    requestAnimationFrame(() => preview.current?.play().catch(() => setPreviewing(false)));
  };
  const stop = () => {
    preview.current?.pause();
    setPreviewing(false);
  };
  const who = clip.name || clip.title || fallback;
  return (
    <button type="button" onClick={onOpen} onPointerEnter={start} onPointerLeave={stop}
      aria-label={`Play video: ${[who, clip.car].filter(Boolean).join(', ')}${clip.duration ? ` (${formatDuration(clip.duration)})` : ''}`}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-stone-900 text-left shadow-lg shadow-stone-900/10 ring-1 ring-stone-900/5 transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
      {clip.poster && (
        <Picture src={clip.poster} alt="" sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 68vw" widths={[320, 640, 960]}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" wrapperClassName="absolute inset-0" />
      )}
      {previewing && (
        <video ref={preview} src={clip.src} muted loop playsInline preload="metadata" aria-hidden tabIndex={-1}
          className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/10 to-stone-950/20" aria-hidden />
      {clip.duration ? (
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[11px] font-semibold text-white backdrop-blur-sm tabular-nums" aria-hidden>
          {formatDuration(clip.duration)}
        </span>
      ) : null}
      <span className={`absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-600 group-hover:border-amber-500 ${previewing ? 'opacity-0' : ''}`} aria-hidden>
        <Play className="ml-1 h-7 w-7 fill-current" />
      </span>
      <span className="absolute inset-x-0 bottom-0 p-4 text-white" aria-hidden>
        <span className="block text-base font-bold leading-tight">{who}</span>
        {clip.car && <span className="mt-0.5 block font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-400">{clip.car}</span>}
        {clip.caption && <span className="mt-1.5 line-clamp-2 block text-xs leading-snug text-stone-200">{clip.caption}</span>}
      </span>
    </button>
  );
}
