import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, ExternalLink } from 'lucide-react';
import type { Offer, Vehicle } from '../../types';
import { api } from '../../services/api';
import { vehicleName } from '../../content';
import { offerPath } from '../../lib/routes';
import { Field } from '../ui';
import Dialog from '../ui/Dialog';
import { PanelHeader, StatusBadge, ConfirmDialog, ImageField, useAction, useAdmin, toLocalInput, fromLocalInput } from './ui';

export default function OffersManager({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const [list, setList] = useState<Offer[] | null>(null);
  const [editing, setEditing] = useState<Offer | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);
  const { run, busy } = useAction();
  const load = () => api.admin.get<{ offers: Offer[] }>('offers').then((r) => setList(r.offers));
  useEffect(() => { load(); }, []);
  const done = () => { load(); onChange(); };
  const setStatus = async (o: Offer, status: string) => { if (await run(() => api.admin.patch(`offers/${o.id}/status`, { status }), 'Status updated') !== undefined) done(); };

  return (
    <div>
      <PanelHeader title="Offers" lead="Every offer has a start and end date; it goes live and expires automatically. Expired offers stay readable at their link but are no longer promoted."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />New offer</button>} />
      {list === null ? <p className="text-sm text-stone-500">Loading…</p> : list.length === 0 ? <p className="card p-6 text-sm text-stone-600">No offers yet.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="p-3">Offer</th><th className="p-3">Status</th><th className="p-3">Dates</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="p-3"><p className="font-semibold text-stone-900">{o.title}</p><p className="text-xs text-stone-500">/offers/{o.slug}</p></td>
                  <td className="p-3"><StatusBadge status={o.effectiveStatus} /></td>
                  <td className="p-3 text-xs text-stone-600 whitespace-nowrap">{new Date(o.startsAt).toLocaleDateString()} → {new Date(o.endsAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {can('cms:publish') && (o.status === 'draft' || o.status === 'paused') && <button className="btn btn-primary btn-sm" onClick={() => setStatus(o, 'published')}>Publish</button>}
                      {can('cms:publish') && o.status === 'published' && <button className="btn btn-secondary btn-sm" onClick={() => setStatus(o, 'paused')}>Pause</button>}
                      <a href={offerPath(o.slug) + (o.effectiveStatus === 'live' || o.effectiveStatus === 'expired' ? '' : '?preview=1')} target="_blank" rel="noopener" className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" aria-label="Open"><ExternalLink className="h-4 w-4" /></a>
                      <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => setEditing(o)} aria-label={`Edit ${o.title}`}><Pencil className="h-4 w-4" /></button>
                      <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={async () => { if (await run(() => api.admin.post(`offers/${o.id}/duplicate`), 'Copied as draft') !== undefined) done(); }} aria-label={`Duplicate ${o.title}`}><Copy className="h-4 w-4" /></button>
                      <button className="flex h-9 w-9 items-center justify-center rounded text-red-700 hover:bg-red-50" onClick={() => setDeleting(o)} aria-label={`Delete ${o.title}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <OfferForm offer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); done(); }} />}
      {deleting && <ConfirmDialog title="Delete offer?" body={<>“{deleting.title}” and its page will be removed. Consider archiving instead to keep the link working.</>} busy={busy}
        onClose={() => setDeleting(null)} onConfirm={async () => { if (await run(() => api.admin.del(`offers/${deleting.id}`), 'Deleted') !== undefined) { setDeleting(null); done(); } }} />}
    </div>
  );
}

function OfferForm({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void }) {
  const { can } = useAdmin();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const now = new Date(); const later = new Date(); later.setDate(later.getDate() + 30);
  const [f, setF] = useState({
    title: offer?.title || '', slug: offer?.slug || '', summary: offer?.summary || '', description: offer?.description || '', terms: offer?.terms || '',
    vehicleId: offer?.vehicleId || '', discountType: offer?.discountType || 'none', discountValue: offer?.discountValue ? String(offer.discountValue) : '',
    image: offer?.image || '', ctaLabel: offer?.ctaLabel || '', startsAt: toLocalInput(offer?.startsAt || now.toISOString()),
    endsAt: toLocalInput(offer?.endsAt || later.toISOString()), status: offer?.status || 'draft', showOnHome: offer ? offer.showOnHome : true,
  });
  const { run, busy } = useAction();
  useEffect(() => { api.getAdminVehicles().then(setVehicles).catch(() => {}); }, []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...f, slug: f.slug || null, vehicleId: f.vehicleId || null, image: f.image || null,
      discountValue: f.discountValue ? Number(f.discountValue) : null, startsAt: fromLocalInput(f.startsAt), endsAt: fromLocalInput(f.endsAt),
      sortOrder: offer?.sortOrder ?? 0 };
    if (await run(() => (offer ? api.admin.put(`offers/${offer.id}`, body) : api.admin.post('offers', body)), 'Offer saved') !== undefined) onSaved();
  };
  return (
    <Dialog title={offer ? 'Edit offer' : 'New offer'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">{(p) => <input {...p} className="field" value={f.title} onChange={set('title')} required minLength={3} maxLength={200} />}</Field>
          <Field label="Page address" optional hint="Leave empty to create from the title">{(p) => <input {...p} className="field" value={f.slug} onChange={set('slug')} placeholder="festive-exchange-bonus" />}</Field>
        </div>
        <Field label="Short summary" optional hint="Shown on cards and in Google results (up to 300 characters)">{(p) => <input {...p} className="field" value={f.summary} onChange={set('summary')} maxLength={300} />}</Field>
        <Field label="Full description" optional>{(p) => <textarea {...p} className="field min-h-28" value={f.description} onChange={set('description')} />}</Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Benefit type">{(p) => <select {...p} className="field" value={f.discountType} onChange={set('discountType')}><option value="none">No amount</option><option value="fixed">Fixed amount (₹)</option><option value="percentage">Percentage</option></select>}</Field>
          {f.discountType !== 'none' && <Field label={f.discountType === 'fixed' ? 'Amount (₹)' : 'Percent'}>{(p) => <input {...p} type="number" className="field" value={f.discountValue} onChange={set('discountValue')} min={0} />}</Field>}
          <Field label="Applies to car" optional>{(p) => <select {...p} className="field" value={f.vehicleId} onChange={set('vehicleId')}><option value="">Any car</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)}</option>)}</select>}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Starts">{(p) => <input {...p} type="datetime-local" className="field" value={f.startsAt} onChange={set('startsAt')} required />}</Field>
          <Field label="Ends">{(p) => <input {...p} type="datetime-local" className="field" value={f.endsAt} onChange={set('endsAt')} required />}</Field>
          <Field label="Status">{(p) => <select {...p} className="field" value={f.status} onChange={set('status')}>
            <option value="draft">Draft</option>{can('cms:publish') && <><option value="published">Published</option><option value="paused">Paused</option></>}<option value="archived">Archived</option>
          </select>}</Field>
        </div>
        <ImageField label="Image" folder="offers" value={f.image} onChange={(u) => setF((p) => ({ ...p, image: u || '' }))} hint="At least 600 px wide." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" optional>{(p) => <input {...p} className="field" value={f.ctaLabel} onChange={set('ctaLabel')} maxLength={80} />}</Field>
          <label className="flex min-h-11 items-center gap-2.5 self-end text-sm"><input type="checkbox" checked={f.showOnHome} onChange={set('showOnHome')} className="h-4 w-4 accent-stone-900" />Show on the home page</label>
        </div>
        <Field label="Terms & conditions" optional>{(p) => <textarea {...p} className="field min-h-20" value={f.terms} onChange={set('terms')} />}</Field>
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save offer'}</button>
        </div>
      </form>
    </Dialog>
  );
}
