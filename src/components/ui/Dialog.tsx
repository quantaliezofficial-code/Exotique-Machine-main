import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal / drawer: focus moves in and is trapped, Escape closes, focus returns
 * to the opener, background scroll is locked.
 */
export default function Dialog({
  title, onClose, children, variant = 'modal', wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'modal' | 'drawer';
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () =>
      Array.from(panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ) || []);
    (focusables()[1] || focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const els = focusables();
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [onClose]);

  const drawer = variant === 'drawer';
  return (
    <div className={`fixed inset-0 z-[70] flex ${drawer ? 'justify-end' : 'items-end justify-center sm:items-center p-0 sm:p-4'}`}>
      <div className="absolute inset-0 bg-stone-950/60 fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[100dvh] w-full flex-col bg-white shadow-2xl fade-in ${
          drawer ? 'h-full max-w-md' : `${wide ? 'sm:max-w-3xl' : 'sm:max-w-md'} rounded-t-2xl sm:rounded-2xl max-h-[92dvh]`
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <h2 className="text-base font-bold text-stone-900">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
