import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Trash2, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import type { MediaAsset } from '../../types';
import { api, ApiError } from '../../services/api';
import Dialog from '../ui/Dialog';
import Picture from '../ui/Picture';
import CropDialog, { type CropSpec } from './CropDialog';
import { PanelHeader, useAction, useToast, formatBytes } from './ui';

const FOLDERS = ['general', 'hero', 'offers', 'reviews', 'vehicles', 'brand'];

export default function MediaLibrary() {
  const [folder, setFolder] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<MediaAsset[] | null>(null);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [uploadFolder, setUploadFolder] = useState('general');
  const { run, busy } = useAction();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ with_usage: 'true' });
    if (folder) qs.set('folder', folder);
    if (q) qs.set('q', q);
    return api.admin.get<{ media: MediaAsset[] }>(`media?${qs}`).then((r) => setItems(r.media));
  }, [folder, q]);
  useEffect(() => { const t = window.setTimeout(load, 200); return () => window.clearTimeout(t); }, [load]);

  // One photo: offer the optional crop step first. Several: upload straight away.
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const choose = (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length === 1) setPending({ file: files[0], url: URL.createObjectURL(files[0]) });
    else upload(Array.from(files));
  };
  const closeCrop = () => { if (pending) URL.revokeObjectURL(pending.url); setPending(null); };
  const upload = async (files: File[], crop: CropSpec | null = null) => {
    closeCrop();
    const fd = new FormData();
    files.slice(0, 20).forEach((f) => fd.append('files', f));
    fd.append('folder', uploadFolder);
    if (crop) fd.append('crops', JSON.stringify([crop]));
    const r = await run(() => api.admin.upload<{ media: MediaAsset[] }>('media/upload', fd));
    if (r) {
      const dup = r.media.filter((m) => m.duplicate).length;
      load();
      // Variants are generated in the background; refresh once they are likely ready.
      window.setTimeout(load, 8000);
      toast('ok', dup ? `${r.media.length - dup} uploaded, ${dup} already in the library (reused)` : `${r.media.length} uploaded`);
    }
  };

  return (
    <div>
      <PanelHeader title="Media library" lead="Every uploaded image. The original file is kept untouched in private storage; visitors get resized WebP and AVIF versions with location data removed."
        actions={
          <div className="flex gap-2">
            <select className="field min-h-11 w-auto" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} aria-label="Upload to folder">
              {FOLDERS.map((f) => <option key={f}>{f}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}><Upload className="h-4 w-4" aria-hidden />{busy ? 'Uploading…' : 'Upload'}</button>
            <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { choose(e.target.files); e.target.value = ''; }} />
          </div>
        } />
      {pending && (
        <CropDialog src={pending.url} fileName={pending.file.name} onApply={(c) => upload([pending.file], c)}
          onSkip={() => upload([pending.file])} skipLabel="Upload without cropping" onClose={closeCrop} />
      )}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="search" className="field sm:max-w-xs" placeholder="Search file name or description" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search media" />
        <div className="flex flex-wrap gap-1">
          {['', ...FOLDERS].map((f) => <button key={f || 'all'} className={`chip ${folder === f ? 'chip-active' : ''}`} onClick={() => setFolder(f)}>{f || 'All'}</button>)}
        </div>
      </div>
      {items === null ? <p className="text-sm text-stone-500">Loading…</p> : items.length === 0 ? <p className="card p-6 text-sm text-stone-600">No images.</p> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setSelected(m)} className="block w-full overflow-hidden rounded-lg border border-stone-200 bg-white text-left hover:border-stone-900">
                <Picture src={m.url} alt={m.alt || ''} sizes="220px" blurDataUrl={m.placeholder} className="aspect-[4/3] w-full object-cover" wrapperClassName="aspect-[4/3] w-full" />
                <span className="block px-2 py-1.5">
                  <span className="block truncate text-xs font-semibold text-stone-800">{m.originalName || m.filename}</span>
                  <span className="flex items-center gap-1 text-[11px] text-stone-500">
                    {m.width}×{m.height} · {m.usage?.length ? `used ${m.usage.length}×` : 'unused'}
                    {!m.variantsReady && <span className="text-amber-700">· optimising</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <MediaDetail media={selected} onClose={() => setSelected(null)} onChanged={() => { load(); }} />}
    </div>
  );
}

function MediaDetail({ media, onClose, onChanged }: { media: MediaAsset; onClose: () => void; onChanged: () => void }) {
  const [m, setM] = useState(media);
  const [alt, setAlt] = useState(media.alt || '');
  const [usage, setUsage] = useState(media.usage || []);
  const [error, setError] = useState('');
  const { run, busy } = useAction();
  const replaceInput = useRef<HTMLInputElement>(null);
  const saving = m.originalBytes && m.sizeBytes ? Math.round((1 - m.sizeBytes / m.originalBytes) * 100) : null;

  const saveAlt = async () => {
    const r = await run(() => api.admin.patch<{ media: MediaAsset }>(`media/${m.id}`, { alt }), 'Description saved');
    if (r) { setM(r.media); onChanged(); }
  };
  const replace = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const fd = new FormData();
    fd.append('file', files[0]);
    const r = await run(() => api.admin.upload<{ media: MediaAsset; updatedReferences: number }>(`media/${m.id}/replace`, fd),
      'Image replaced everywhere it was used');
    if (r) { setM(r.media); onChanged(); }
  };
  const remove = async () => {
    setError('');
    try {
      await api.admin.del(`media/${m.id}`);
      onChanged();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setUsage(((e.detail as any)?.usage) || usage);
        setError('This image is still used. Remove it from the places below first.');
      } else setError((e as Error).message);
    }
  };

  return (
    <Dialog title={m.originalName || m.filename} onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <Picture src={m.url} alt={m.alt || ''} sizes="400px" blurDataUrl={m.placeholder} className="w-full rounded-lg object-contain" wrapperClassName="rounded-lg bg-stone-100" />
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-stone-700">
            <dt className="text-stone-500">Size</dt><dd>{m.width}×{m.height}</dd>
            <dt className="text-stone-500">Original upload</dt><dd>{formatBytes(m.originalBytes)}</dd>
            <dt className="text-stone-500">Public master</dt><dd>{formatBytes(m.sizeBytes)}{saving && saving > 0 ? ` (−${saving}%)` : ''}</dd>
            <dt className="text-stone-500">Folder</dt><dd>{m.folder}</dd>
            <dt className="text-stone-500">Uploaded by</dt><dd>{m.uploadedBy || '—'}</dd>
          </dl>
          <p className="flex items-center gap-2 text-xs text-emerald-800"><ShieldCheck className="h-4 w-4" aria-hidden />{m.originalPreserved ? 'Original kept in private storage' : 'Uploaded before preservation existed'}</p>
          <p className="flex items-center gap-2 text-xs text-stone-700"><Zap className="h-4 w-4" aria-hidden />{m.variantsReady ? 'WebP & AVIF versions ready (320–1920 px)' : 'Optimised versions are being generated'}</p>
          <div>
            <label className="field-label" htmlFor="media-alt">Description (alt text)</label>
            <div className="flex gap-2">
              <input id="media-alt" className="field" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />
              <button className="btn btn-secondary shrink-0" onClick={saveAlt} disabled={busy || alt === (m.alt || '')}>Save</button>
            </div>
          </div>
          <div>
            <p className="field-label">Used in</p>
            {usage.length ? (
              <ul className="space-y-1 text-xs text-stone-700">{usage.map((u) => <li key={`${u.type}-${u.id}`}>{u.type}: {u.label}{u.status ? ` (${u.status})` : ''}</li>)}</ul>
            ) : <p className="text-xs text-stone-500">Not used anywhere.</p>}
          </div>
          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-4">
            <button className="btn btn-secondary btn-sm" onClick={() => replaceInput.current?.click()} disabled={busy}><RefreshCw className="h-4 w-4" aria-hidden />Replace file</button>
            <input ref={replaceInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { replace(e.target.files); e.target.value = ''; }} />
            <button className="btn btn-ghost btn-sm text-red-700" onClick={remove} disabled={busy || usage.length > 0}><Trash2 className="h-4 w-4" aria-hidden />Delete</button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
