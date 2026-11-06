import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Upload, X, Crop as CropIcon } from 'lucide-react';
import type { Vehicle } from '../../types';
import { api } from '../../services/api';
import { formatPrice, vehicleName } from '../../content';
import { carPath } from '../../lib/routes';
import { PREMIUM_BRANDS, NON_PREMIUM_BRANDS, FUELS, TRANSMISSIONS, BODY_TYPES } from '../../constants';
import { Field } from '../ui';
import Dialog from '../ui/Dialog';
import Picture from '../ui/Picture';
import { PanelHeader, StatusBadge, ConfirmDialog, useAction, useAdmin, MoveButtons, moveItem } from './ui';
import CropDialog, { cropPreview, type CropSpec } from './CropDialog';

interface NewPhoto { file: File; url: string; crop: CropSpec | null; preview: string | null }

export default function InventoryManager({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const [list, setList] = useState<Vehicle[] | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const { run, busy } = useAction();

  const load = () => api.getAdminVehicles().then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => (list || []).filter((v) => {
    if (status === 'hidden' ? v.isPublished : status && v.status !== status) return false;
    return !q || `${v.brand} ${v.model} ${v.badge} ${v.id}`.toLowerCase().includes(q.toLowerCase());
  }), [list, q, status]);

  const remove = async () => {
    if (!deleting) return;
    const ok = await run(() => api.deleteVehicle(deleting.id), 'Car deleted');
    if (ok !== undefined) { setDeleting(null); load(); onChange(); }
  };

  return (
    <div>
      <PanelHeader title="Inventory" lead="Cars shown on the website. Hidden cars keep their page but are not listed; sold cars stay visible as sold."
        actions={can('inventory:create') && <button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add car</button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input type="search" className="field sm:max-w-xs" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cars" />
        <select className="field sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option><option value="available">Available</option><option value="reserved">Reserved</option>
          <option value="sold">Sold</option><option value="hidden">Hidden</option>
        </select>
      </div>
      {list === null ? <p className="text-sm text-stone-500">Loading…</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="p-3">Car</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3">Photos</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((v) => (
                <tr key={v.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Picture src={v.images?.[0]} alt="" sizes="80px" className="h-12 w-16 rounded object-cover" wrapperClassName="h-12 w-16 shrink-0 rounded bg-stone-100" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-stone-900">{vehicleName(v)}</p>
                        <p className="truncate text-xs text-stone-500">{v.badge} · {v.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatPrice(v.price)}</td>
                  <td className="p-3"><StatusBadge status={v.status} /> {!v.isPublished && <StatusBadge status="draft" />}</td>
                  <td className="p-3">{v.images?.length || 0}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <a href={carPath(v.id)} target="_blank" rel="noopener" className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" aria-label="Open public page"><ExternalLink className="h-4 w-4" /></a>
                      {can('inventory:edit') && <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => setEditing(v)} aria-label={`Edit ${vehicleName(v)}`}><Pencil className="h-4 w-4" /></button>}
                      {can('inventory:delete') && <button className="flex h-9 w-9 items-center justify-center rounded text-red-700 hover:bg-red-50" onClick={() => setDeleting(v)} aria-label={`Delete ${vehicleName(v)}`}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-stone-500">No cars match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChange(); }} />}
      {deleting && (
        <ConfirmDialog title="Delete this car?" onClose={() => setDeleting(null)} onConfirm={remove} busy={busy}
          body={<>“{vehicleName(deleting)}” will be removed from the website. Its photos are kept in the media library. To keep the page, mark the car as sold instead.</>} />
      )}
    </div>
  );
}

function VehicleForm({ vehicle, onClose, onSaved }: { vehicle: Vehicle | null; onClose: () => void; onSaved: () => void }) {
  const { can } = useAdmin();
  const v = vehicle;
  const [f, setF] = useState({
    brand: v?.brand || '', model: v?.model || '', badge: v?.badge || '', type: v?.type || '', category: v?.category || 'premium',
    lifestyle: v?.lifestyle || 'SUV', fuel: v?.fuel || 'Diesel', transmission: v?.transmission || 'Automatic',
    price: v?.price ? String(v.price) : '', emi: v?.emi ? String(v.emi) : '', seats: String(v?.seats || 5), engine: v?.engine || '',
    power: v?.power || '', mileage: v?.mileage || '', description: v?.description || '', features: (v?.features || []).join('\n'),
    year: v?.year ? String(v.year) : '', kmDriven: v?.kmDriven ? String(v.kmDriven) : '', owners: v?.owners ? String(v.owners) : '',
    registration: v?.registration || '', status: v?.status || 'available', isPublished: v ? !!v.isPublished : true,
  });
  const [images, setImages] = useState<string[]>(v?.images || []);
  // New photos, each with an optional crop (applied by the server; the original is kept).
  const [files, setFiles] = useState<NewPhoto[]>([]);
  const [cropping, setCropping] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => files.forEach((x) => URL.revokeObjectURL(x.url)), []); // eslint-disable-line react-hooks/exhaustive-deps
  const addFiles = (list: FileList | null) => {
    const added = Array.from(list || []).map((file) => ({ file, url: URL.createObjectURL(file), crop: null, preview: null }));
    setFiles((cur) => [...cur, ...added].slice(0, 20));
  };
  const removeFile = (i: number) => setFiles((cur) => {
    URL.revokeObjectURL(cur[i].url);
    return cur.filter((_, j) => j !== i);
  });
  const applyCrop = async (i: number, crop: CropSpec | null) => {
    const preview = crop ? await cropPreview(files[i].url, crop).catch(() => null) : null;
    setFiles((cur) => cur.map((x, j) => (j === i ? { ...x, crop, preview } : x)));
    setCropping(null);
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const canPrice = can('pricing:edit') || !v;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!f.brand.trim() || !f.model.trim() || !Number(f.price)) { setError('Brand, model and price are required.'); return; }
    const big = files.find((x) => x.file.size > 25 * 1024 * 1024);
    if (big) { setError(`${big.file.name} is larger than 25 MB.`); return; }
    const fd = new FormData();
    Object.entries(f).forEach(([k, val]) => {
      if (k === 'features') fd.append('features', JSON.stringify(String(val).split('\n').map((s) => s.trim()).filter(Boolean)));
      else if (k === 'isPublished') fd.append(k, val ? 'true' : 'false');
      else if ((k === 'price' || k === 'emi') && !canPrice) return;
      else if (val !== '') fd.append(k, String(val));
    });
    fd.append('imageUrls', JSON.stringify(images));
    if (v) fd.append('replaceImages', 'true');
    files.forEach((x) => fd.append('photos', x.file));
    if (files.some((x) => x.crop)) fd.append('photoCrops', JSON.stringify(files.map((x) => x.crop)));
    setBusy(true);
    try {
      if (v) await api.updateVehicle(v.id, fd); else await api.createVehicle(fd);
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  const brands = [...new Set([...PREMIUM_BRANDS, ...NON_PREMIUM_BRANDS, ...(f.brand ? [f.brand] : [])])].sort();
  const text = (k: keyof typeof f, label: string, opts: { hint?: string; optional?: boolean; type?: string; disabled?: boolean } = {}) => (
    <Field label={label} hint={opts.hint} optional={opts.optional}>
      {(p) => <input {...p} className="field" type={opts.type || 'text'} value={String(f[k])} onChange={set(k)} disabled={opts.disabled} />}
    </Field>
  );
  return (
    <Dialog title={v ? `Edit ${vehicleName(v)}` : 'Add a car'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Brand">
            {(p) => <><input {...p} className="field" list="em-brands" value={f.brand} onChange={set('brand')} required /><datalist id="em-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist></>}
          </Field>
          {text('model', 'Model')}
          {text('badge', 'Variant', { hint: 'e.g. xDrive30d M Sport', optional: true })}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {text('year', 'Year', { type: 'number', optional: true })}
          {text('kmDriven', 'Kilometres', { type: 'number', optional: true })}
          {text('owners', 'Owners', { type: 'number', optional: true })}
          {text('registration', 'Registration', { optional: true, hint: 'e.g. UP32' })}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {text('price', 'Price (₹ lakh)', { type: 'number', disabled: !canPrice, hint: canPrice ? undefined : 'Needs pricing permission' })}
          {text('emi', 'EMI (₹/month)', { type: 'number', optional: true, disabled: !canPrice, hint: 'Leave empty to calculate' })}
          <Field label="Status">
            {(p) => <select {...p} className="field" value={f.status} onChange={set('status')}><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select>}
          </Field>
          <Field label="Segment">
            {(p) => <select {...p} className="field" value={f.category} onChange={set('category')}><option value="premium">Premium</option><option value="non-premium">Non-premium</option></select>}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Body type">{(p) => <select {...p} className="field" value={f.lifestyle} onChange={set('lifestyle')}>{[...new Set([...BODY_TYPES, f.lifestyle])].map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          <Field label="Fuel">{(p) => <select {...p} className="field" value={f.fuel} onChange={set('fuel')}>{[...new Set([...FUELS, f.fuel])].map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          <Field label="Transmission">{(p) => <select {...p} className="field" value={f.transmission} onChange={set('transmission')}>{TRANSMISSIONS.map((x) => <option key={x}>{x}</option>)}</select>}</Field>
          {text('seats', 'Seats', { type: 'number' })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {text('engine', 'Engine', { optional: true })}
          {text('power', 'Power', { optional: true })}
          {text('mileage', 'Mileage / range', { optional: true })}
        </div>
        {text('type', 'Listing type', { optional: true, hint: 'e.g. Luxury SUV' })}
        <Field label="Description" optional>
          {(p) => <textarea {...p} className="field min-h-28" value={f.description} onChange={set('description')} maxLength={5000} />}
        </Field>
        <Field label="Features" optional hint="One per line">
          {(p) => <textarea {...p} className="field min-h-28" value={f.features} onChange={set('features')} />}
        </Field>

        <div>
          <span className="field-label">Photos</span>
          <p className="field-hint mb-3">The first photo is the cover. Use <b>Crop</b> on a new photo to trim or straighten it before saving (optional). Originals are kept untouched; location data is removed and fast WebP/AVIF versions are made automatically.</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.map((url, i) => (
              <li key={url} className="relative overflow-hidden rounded-lg border border-stone-200">
                <Picture src={url} alt="" sizes="140px" className="aspect-[4/3] w-full object-cover" wrapperClassName="aspect-[4/3] w-full" />
                <div className="flex items-center justify-between bg-white px-1">
                  <MoveButtons first={i === 0} last={i === images.length - 1} onUp={() => setImages(moveItem(images, i, -1))} onDown={() => setImages(moveItem(images, i, 1))} />
                  <button type="button" className="flex h-9 w-9 items-center justify-center text-red-700" onClick={() => setImages(images.filter((x) => x !== url))} aria-label="Remove photo"><X className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
            {files.map((x, i) => (
              <li key={x.url} className="relative overflow-hidden rounded-lg border border-dashed border-stone-300">
                <img src={x.preview || x.url} alt="" className="aspect-[4/3] w-full bg-stone-100 object-cover" />
                <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${x.crop ? 'bg-amber-700 text-white' : 'bg-white/90 text-stone-700'}`}>
                  {x.crop ? 'Cropped' : 'New'}
                </span>
                <div className="flex items-center justify-between bg-white px-1">
                  <button type="button" className="flex h-9 items-center gap-1 px-1.5 text-[11px] font-semibold text-stone-800 hover:text-stone-950"
                    onClick={() => setCropping(i)} aria-label={`Crop ${x.file.name}`}><CropIcon className="h-4 w-4" aria-hidden />Crop</button>
                  <button type="button" className="flex h-9 w-9 items-center justify-center text-red-700" onClick={() => removeFile(i)} aria-label="Remove new photo"><X className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => input.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-xs font-semibold text-stone-600 hover:border-stone-900">
                <Upload className="h-5 w-5" aria-hidden />Add photos
              </button>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </li>
          </ul>
        </div>

        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input type="checkbox" checked={f.isPublished} onChange={set('isPublished')} className="h-4 w-4 accent-stone-900" />
          Show this car on the website
        </label>
        {cropping !== null && files[cropping] && (
          <CropDialog src={files[cropping].url} fileName={files[cropping].file.name} initial={files[cropping].crop}
            defaultShape="16:10" onApply={(c) => applyCrop(cropping, c)} onClose={() => setCropping(null)} />
        )}
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? (files.length ? 'Uploading photos…' : 'Saving…') : 'Save car'}</button>
        </div>
      </form>
    </Dialog>
  );
}
