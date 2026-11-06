import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, ArrowUp, ArrowDown, Film } from 'lucide-react';
import type { AdminPermission, AdminUser, MediaAsset, VideoClip } from '../../types';
import { api } from '../../services/api';
import Dialog from '../ui/Dialog';
import CropDialog, { type CropSpec } from './CropDialog';
import Picture from '../ui/Picture';

// ------------------------------------------------------------------ session
export const AdminContext = createContext<{ user: AdminUser; can: (p: AdminPermission) => boolean } | null>(null);
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin outside admin');
  return ctx;
}
export function canFor(user: AdminUser | null) {
  return (p: AdminPermission) => !!user && (user.role === 'superadmin' || (user.permissions || []).includes(p));
}

// ------------------------------------------------------------------ toasts
type Toast = { id: number; kind: 'ok' | 'error'; text: string };
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {});
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex max-w-sm flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg ${t.kind === 'error' ? 'bg-red-700 text-white' : 'bg-stone-900 text-white'}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Run an admin action with consistent success/error feedback. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast('ok', ok);
      return r;
    } catch (e: any) {
      toast('error', e?.message || 'Something went wrong');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return { run, busy };
}

// ------------------------------------------------------------------ layout bits
export function PanelHeader({ title, lead, actions }: { title: string; lead?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-stone-900">{title}</h2>
        {lead && <p className="mt-1 max-w-2xl text-sm text-stone-600">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-100 text-emerald-900', live: 'bg-emerald-100 text-emerald-900', approved: 'bg-emerald-100 text-emerald-900',
  available: 'bg-emerald-100 text-emerald-900', active: 'bg-emerald-100 text-emerald-900',
  draft: 'bg-stone-200 text-stone-800', pending: 'bg-amber-100 text-amber-900', scheduled: 'bg-sky-100 text-sky-900',
  reserved: 'bg-amber-100 text-amber-900', paused: 'bg-amber-100 text-amber-900',
  expired: 'bg-stone-200 text-stone-600', archived: 'bg-stone-200 text-stone-600', sold: 'bg-stone-900 text-white',
  rejected: 'bg-red-100 text-red-900', deactivated: 'bg-red-100 text-red-900', new: 'bg-sky-100 text-sky-900',
};
export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  return <span className={`badge ${STATUS_STYLES[status] || 'bg-stone-200 text-stone-800'}`}>{status}</span>;
}

export function MoveButtons({ onUp, onDown, first, last }: { onUp: () => void; onDown: () => void; first: boolean; last: boolean }) {
  return (
    <span className="inline-flex">
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100 disabled:opacity-30" disabled={first} onClick={onUp} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
      <button type="button" className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100 disabled:opacity-30" disabled={last} onClick={onDown} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
    </span>
  );
}

export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list];
  const j = index + delta;
  if (j < 0 || j >= next.length) return list;
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function ConfirmDialog({ title, body, confirmLabel = 'Delete', onConfirm, onClose, busy }: {
  title: string; body: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean;
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <div className="text-sm text-stone-700">{body}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Dialog>
  );
}

/** datetime-local <-> ISO helpers (local time in the form, UTC on the wire). */
export const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export function formatBytes(n?: number | null) {
  if (!n) return '—';
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

// ------------------------------------------------------------------ image picker
/**
 * Pick an image from the media library or upload a new one. Uploads go through the
 * server pipeline (original preserved, metadata stripped, WebP/AVIF variants generated).
 */
export function ImageField({ label, value, onChange, folder = 'general', hint, required }: {
  label: string; value: string | null | undefined; onChange: (url: string | null) => void; folder?: string; hint?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span className="field-label">{label}{required ? '' : <span className="normal-case font-medium tracking-normal text-stone-500"> (optional)</span>}</span>
      <div className="flex items-center gap-3">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
          {value ? <Picture src={value} alt="" sizes="128px" className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
            : <ImageIcon className="h-6 w-6 text-stone-500" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>{value ? 'Change' : 'Choose image'}</button>
          {value && !required && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Remove</button>}
        </div>
      </div>
      {hint && <p className="field-hint">{hint}</p>}
      {open && <MediaPicker folder={folder} onClose={() => setOpen(false)} onPick={(m) => { onChange(m.url); setOpen(false); }} />}
    </div>
  );
}

export function MediaPicker({ folder, onPick, onClose }: { folder: string; onPick: (m: MediaAsset) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaAsset[] | null>(null);
  const [filter, setFilter] = useState<string>(folder);
  const { run, busy } = useAction();
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await api.admin.get<{ media: MediaAsset[] }>(`media${filter ? `?folder=${filter}` : ''}`);
    setItems(r.media);
  }, [filter]);
  useEffect(() => { load().catch(() => setItems([])); }, [load]);

  // A chosen file first opens the (optional) crop step; then it is uploaded.
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const choose = (files: FileList | null) => {
    const file = files?.[0];
    if (file) setPending({ file, url: URL.createObjectURL(file) });
  };
  const upload = async (file: File, crop: CropSpec | null) => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
    const fd = new FormData();
    fd.append('files', file);
    fd.append('folder', folder);
    if (crop) fd.append('crops', JSON.stringify([crop]));
    const r = await run(() => api.admin.upload<{ media: MediaAsset[] }>('media/upload', fd), 'Uploaded');
    if (r?.media?.[0]) onPick(r.media[0]);
  };

  return (
    <Dialog title="Choose an image" onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload className="h-4 w-4" aria-hidden />{busy ? 'Uploading…' : 'Upload new'}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { choose(e.target.files); e.target.value = ''; }} />
        <select className="field w-auto min-h-9 py-1.5" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Folder">
          <option value="">All folders</option>
          {['general', 'hero', 'offers', 'reviews', 'vehicles', 'brand'].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <span className="text-xs text-stone-500">JPEG, PNG or WebP, up to 25 MB. You can crop before uploading. Originals are kept; visitors get optimised versions.</span>
      </div>
      {pending && (
        <CropDialog src={pending.url} fileName={pending.file.name} onApply={(c) => upload(pending.file, c)}
          onSkip={() => upload(pending.file, null)} skipLabel="Upload without cropping"
          onClose={() => { URL.revokeObjectURL(pending.url); setPending(null); }} />
      )}
      {items === null ? <p className="py-10 text-center text-sm text-stone-500">Loading…</p> : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-stone-500">No images in this folder yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m)} className="group block w-full overflow-hidden rounded-lg border border-stone-200 text-left hover:border-stone-900">
                <Picture src={m.url} alt={m.alt || ''} sizes="200px" blurDataUrl={m.placeholder} className="aspect-[4/3] w-full object-cover" wrapperClassName="aspect-[4/3] w-full" />
                <span className="block truncate px-2 py-1 text-[11px] text-stone-600">{m.width}×{m.height} · {m.originalName || m.filename}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

export function PasswordRules() {
  return <p className="field-hint">At least 10 characters, mixing three of: lower case, upper case, numbers, symbols.</p>;
}

// ------------------------------------------------------------------ video field
/**
 * Upload a video (MP4/MOV/WebM). The server keeps the original, makes a 720p web copy
 * without location data and picks a poster frame; the poster can be swapped for any image.
 */
export function VideoField({ label, value, onChange, hint }: {
  label: string; value: VideoClip | null | undefined; onChange: (v: VideoClip | null) => void; hint?: string;
}) {
  const { run, busy } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const r = await run(() => api.admin.upload<{ video: VideoClip }>('videos/upload', fd), 'Video ready');
    if (r?.video) onChange({ ...(value || {}), ...r.video, name: value?.name || '', caption: value?.caption || '', car: value?.car || '', transcript: value?.transcript || '', title: value?.title || '', description: value?.description || '' });
  };
  const mins = value?.duration ? `${Math.floor(value.duration / 60)}:${String(Math.round(value.duration % 60)).padStart(2, '0')}` : '';
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-start gap-3">
        <div className="flex aspect-[9/16] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-900">
          {value?.poster ? <Picture src={value.poster} alt="" sizes="96px" className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
            : <Film className="h-6 w-6 text-stone-400" aria-hidden />}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
              <Upload className="h-4 w-4" aria-hidden />{busy ? 'Uploading and optimising…' : value?.src ? 'Replace video' : 'Upload video'}
            </button>
            {value?.src && <a className="btn btn-ghost btn-sm" href={value.src} target="_blank" rel="noopener">Play</a>}
            {value?.src && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Remove</button>}
          </div>
          <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          <p className="field-hint">
            {value?.src ? `${mins}${value.width ? ` · ${value.width}×${value.height}` : ''}. ` : ''}
            MP4, MOV or WebM up to 300 MB and 5 minutes. It can take up to a minute: we make a fast web copy and keep your original.
            {hint ? ` ${hint}` : ''}
          </p>
        </div>
      </div>
      {value?.src && (
        <div className="mt-3">
          <ImageField label="Cover image" required value={value.poster} onChange={(u) => onChange({ ...value, poster: u || value.poster })}
            hint="Taken from the video automatically; choose another picture if you prefer." />
        </div>
      )}
    </div>
  );
}

interface BuiltinVideo { id: string; kind: 'intro' | 'story'; label: string; clip: VideoClip }
let builtinCache: Promise<BuiltinVideo[]> | null = null;

/**
 * Videos that ship with the website code (no upload needed). Lists the ones of this kind
 * not already in the list, with one-click Add and Add all. `kind` "any" offers every video.
 */
export function BuiltinVideos({ kind, used, room, onAdd }: {
  kind: 'intro' | 'story' | 'any'; used: VideoClip[]; room: number; onAdd: (clips: VideoClip[]) => void;
}) {
  const [all, setAll] = useState<BuiltinVideo[] | null>(null);
  useEffect(() => {
    builtinCache ??= api.admin.get<{ videos: BuiltinVideo[] }>('videos/builtin').then((r) => r.videos).catch(() => { builtinCache = null; return []; });
    let live = true;
    builtinCache.then((v) => live && setAll(v));
    return () => { live = false; };
  }, []);
  const inUse = new Set(used.map((c) => c.src));
  const free = (all || []).filter((v) => (kind === 'any' || v.kind === kind) && !inUse.has(v.clip.src));
  if (!free.length || room <= 0) return null;
  return (
    <div className="mt-3 rounded-lg bg-stone-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="field-label !mb-0">Built-in videos (no upload needed)</p>
        {free.length > 1 && room > 1 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => onAdd(free.slice(0, room).map((v) => v.clip))}>Add all</button>
        )}
      </div>
      <ul className="flex flex-wrap gap-3">
        {free.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => onAdd([v.clip])}
              className="group flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-1.5 pr-3 text-left text-sm hover:border-stone-400">
              <img src={v.clip.poster} alt="" className="h-14 w-8 rounded object-cover" loading="lazy" />
              <span><span className="block font-semibold text-stone-900">{v.label}</span>
                <span className="text-xs text-stone-500">{Math.floor((v.clip.duration || 0) / 60)}:{String(Math.round((v.clip.duration || 0) % 60)).padStart(2, '0')} · Add</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
