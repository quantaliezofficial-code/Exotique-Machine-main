import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { HeroSlide, Vehicle } from '../../types';
import { api } from '../../services/api';
import { vehicleName } from '../../content';
import { carPath } from '../../lib/routes';
import { Field } from '../ui';
import Dialog from '../ui/Dialog';
import Picture from '../ui/Picture';
import { PanelHeader, StatusBadge, ConfirmDialog, ImageField, MoveButtons, moveItem, useAction, useAdmin, toLocalInput, fromLocalInput } from './ui';

export default function HeroManager({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [editing, setEditing] = useState<HeroSlide | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HeroSlide | null>(null);
  const { run, busy } = useAction();
  const load = () => api.admin.get<{ slides: HeroSlide[] }>('hero').then((r) => setSlides(r.slides));
  useEffect(() => { load(); }, []);

  const reorder = async (next: HeroSlide[]) => {
    setSlides(next);
    await run(() => api.admin.post('hero/reorder', { ids: next.map((s) => s.id) }), 'Order saved');
    onChange();
  };

  return (
    <div>
      <PanelHeader title="Hero slides" lead="The large rotating banner at the top of the home page. Only published slides inside their date window are shown. If none are published, the newest featured cars are shown instead."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add slide</button>} />
      {slides === null ? <p className="text-sm text-stone-500">Loading…</p> : slides.length === 0 ? (
        <p className="card p-6 text-sm text-stone-600">No slides yet.</p>
      ) : (
        <ul className="space-y-3">
          {slides.map((s, i) => (
            <li key={s.id} className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <Picture src={s.desktopImage} alt="" sizes="200px" className="h-20 w-36 rounded object-cover" wrapperClassName="h-20 w-36 shrink-0 rounded bg-stone-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-stone-900">{s.title}</p>
                <p className="text-xs text-stone-500">
                  <StatusBadge status={s.status} />{' '}
                  {s.startsAt || s.endsAt ? `${s.startsAt ? new Date(s.startsAt).toLocaleDateString() : '…'} → ${s.endsAt ? new Date(s.endsAt).toLocaleDateString() : '…'}` : 'Always'}
                  {s.updatedBy && ` · edited by ${s.updatedBy}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {can('cms:publish') && <MoveButtons first={i === 0} last={i === slides.length - 1} onUp={() => reorder(moveItem(slides, i, -1))} onDown={() => reorder(moveItem(slides, i, 1))} />}
                <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => setEditing(s)} aria-label={`Edit ${s.title}`}><Pencil className="h-4 w-4" /></button>
                <button className="flex h-9 w-9 items-center justify-center rounded text-red-700 hover:bg-red-50" onClick={() => setDeleting(s)} aria-label={`Delete ${s.title}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <HeroForm slide={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChange(); }} />}
      {deleting && (
        <ConfirmDialog title="Delete slide?" body={<>“{deleting.title}” will be removed. The image stays in the media library.</>} busy={busy}
          onClose={() => setDeleting(null)}
          onConfirm={async () => { if (await run(() => api.admin.del(`hero/${deleting.id}`), 'Slide deleted') !== undefined) { setDeleting(null); load(); onChange(); } }} />
      )}
    </div>
  );
}

function HeroForm({ slide, onClose, onSaved }: { slide: HeroSlide | null; onClose: () => void; onSaved: () => void }) {
  const { can } = useAdmin();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [f, setF] = useState({
    title: slide?.title || '', eyebrow: slide?.eyebrow || '', description: slide?.description || '', ctaLabel: slide?.ctaLabel || '',
    ctaUrl: slide?.ctaUrl || '', desktopImage: slide?.desktopImage || '', mobileImage: slide?.mobileImage || '', imageAlt: slide?.imageAlt || '',
    vehicleId: slide?.vehicleId || '', status: slide?.status || 'draft', startsAt: toLocalInput(slide?.startsAt), endsAt: toLocalInput(slide?.endsAt),
  });
  const { run, busy } = useAction();
  useEffect(() => { api.getAdminVehicles().then(setVehicles).catch(() => {}); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const linkCar = (id: string) => {
    const v = vehicles.find((x) => x.id === id);
    setF((p) => ({ ...p, vehicleId: id, ...(v && !p.ctaUrl ? { ctaUrl: carPath(v.id), ctaLabel: p.ctaLabel || `View ${v.brand} ${v.model}` } : {}),
      ...(v && !p.desktopImage && v.images?.[0] ? { desktopImage: v.images[0] } : {}) }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...f, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt), vehicleId: f.vehicleId || null,
      mobileImage: f.mobileImage || null, sortOrder: slide?.sortOrder ?? 999 };
    const r = await run(() => (slide ? api.admin.put(`hero/${slide.id}`, body) : api.admin.post('hero', body)), 'Slide saved');
    if (r !== undefined) onSaved();
  };

  return (
    <Dialog title={slide ? 'Edit slide' : 'New slide'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <Field label="Link to a car" optional hint="Fills the button and image from the car.">
          {(p) => <select {...p} className="field" value={f.vehicleId} onChange={(e) => linkCar(e.target.value)}>
            <option value="">No car</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)} {v.badge}</option>)}
          </select>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">{(p) => <input {...p} className="field" value={f.title} onChange={set('title')} required maxLength={200} />}</Field>
          <Field label="Small heading" optional>{(p) => <input {...p} className="field" value={f.eyebrow} onChange={set('eyebrow')} maxLength={120} />}</Field>
        </div>
        <Field label="Description" optional>{(p) => <textarea {...p} className="field min-h-20" value={f.description} onChange={set('description')} maxLength={1000} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" optional>{(p) => <input {...p} className="field" value={f.ctaLabel} onChange={set('ctaLabel')} maxLength={80} />}</Field>
          <Field label="Button link" optional hint="/cars/…, /offers, https://…">{(p) => <input {...p} className="field" value={f.ctaUrl} onChange={set('ctaUrl')} maxLength={300} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Desktop image" required folder="hero" value={f.desktopImage} onChange={(u) => setF((p) => ({ ...p, desktopImage: u || '' }))} hint="Landscape, at least 1200 px wide (1920 px ideal)." />
          <ImageField label="Mobile image" folder="hero" value={f.mobileImage} onChange={(u) => setF((p) => ({ ...p, mobileImage: u || '' }))} hint="Portrait or square crop for phones." />
        </div>
        <Field label="Image description (alt text)" optional hint="Describe the photo for screen readers and Google Images.">
          {(p) => <input {...p} className="field" value={f.imageAlt} onChange={set('imageAlt')} maxLength={300} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">{(p) => <select {...p} className="field" value={f.status} onChange={set('status')}>
            <option value="draft">Draft</option>{can('cms:publish') && <option value="published">Published</option>}<option value="archived">Archived</option>
          </select>}</Field>
          <Field label="Show from" optional>{(p) => <input {...p} type="datetime-local" className="field" value={f.startsAt} onChange={set('startsAt')} />}</Field>
          <Field label="Show until" optional>{(p) => <input {...p} type="datetime-local" className="field" value={f.endsAt} onChange={set('endsAt')} />}</Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !f.desktopImage}>{busy ? 'Saving…' : 'Save slide'}</button>
        </div>
      </form>
    </Dialog>
  );
}
