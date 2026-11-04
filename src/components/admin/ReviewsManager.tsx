import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Star } from 'lucide-react';
import type { Review } from '../../types';
import { api } from '../../services/api';
import { Field } from '../ui';
import Dialog from '../ui/Dialog';
import { PanelHeader, StatusBadge, ConfirmDialog, ImageField, useAction, useAdmin } from './ui';

export default function ReviewsManager({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [list, setList] = useState<Review[] | null>(null);
  const [editing, setEditing] = useState<Review | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const { run, busy } = useAction();
  const load = () => api.admin.get<{ reviews: Review[] }>(`reviews${status ? `?status=${status}` : ''}`).then((r) => setList(r.reviews));
  useEffect(() => { setList(null); load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = () => { load(); onChange(); };
  const moderate = async (r: Review, patch: { status?: string; isFeatured?: boolean }) => {
    if (await run(() => api.admin.patch(`reviews/${r.id}/moderate`, patch), 'Saved') !== undefined) done();
  };

  return (
    <div>
      <PanelHeader title="Reviews" lead="Customer reviews submitted on the website wait here until approved. You can also add reviews you received in person or on Google — only add real reviews, with the customer's permission."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add review</button>} />
      <div role="tablist" className="mb-4 flex gap-1">
        {(['pending', 'approved', 'rejected', ''] as const).map((s) => (
          <button key={s || 'all'} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`chip ${status === s ? 'chip-active' : ''}`}>{s || 'All'}</button>
        ))}
      </div>
      {list === null ? <p className="text-sm text-stone-500">Loading…</p> : list.length === 0 ? <p className="card p-6 text-sm text-stone-600">No reviews here.</p> : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-stone-900">{r.customerName}</p>
                {r.customerTitle && <p className="text-xs text-stone-500">{r.customerTitle}</p>}
                <StatusBadge status={r.status} />
                {r.isFeatured && <span className="badge bg-amber-100 text-amber-900">Featured</span>}
                {r.rating ? <span className="flex items-center gap-0.5 text-xs text-stone-600"><Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />{r.rating}</span> : null}
                <span className="text-xs text-stone-500">· {r.source}{r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString()}` : ''}</span>
              </div>
              <p className="mt-2 text-sm text-stone-700">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {can('cms:publish') && r.status !== 'approved' && <button className="btn btn-primary btn-sm" onClick={() => moderate(r, { status: 'approved' })}><Check className="h-4 w-4" aria-hidden />Approve</button>}
                {can('cms:publish') && r.status !== 'rejected' && <button className="btn btn-secondary btn-sm" onClick={() => moderate(r, { status: 'rejected' })}><X className="h-4 w-4" aria-hidden />Reject</button>}
                {can('cms:publish') && r.status === 'approved' && <button className="btn btn-ghost btn-sm" onClick={() => moderate(r, { isFeatured: !r.isFeatured })}>{r.isFeatured ? 'Unfeature' : 'Feature first'}</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" aria-hidden />Edit</button>
                <button className="btn btn-ghost btn-sm text-red-700" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4" aria-hidden />Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ReviewEditor review={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); done(); }} />}
      {deleting && <ConfirmDialog title="Delete review?" body={`The review by ${deleting.customerName} will be deleted.`} busy={busy} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (await run(() => api.admin.del(`reviews/${deleting.id}`), 'Deleted') !== undefined) { setDeleting(null); done(); } }} />}
    </div>
  );
}

function ReviewEditor({ review, onClose, onSaved }: { review: Review | null; onClose: () => void; onSaved: () => void }) {
  const { can } = useAdmin();
  const [f, setF] = useState({
    customerName: review?.customerName || '', customerTitle: review?.customerTitle || '', rating: review?.rating ? String(review.rating) : '',
    body: review?.body || '', photo: review?.photo || '', source: review?.source || 'in-store', sourceUrl: review?.sourceUrl || '',
    reviewDate: review?.reviewDate?.slice(0, 10) || '', status: review?.status || 'pending', isFeatured: !!review?.isFeatured,
  });
  const { run, busy } = useAction();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...f, rating: f.rating ? Number(f.rating) : null, photo: f.photo || null, sourceUrl: f.sourceUrl || null,
      reviewDate: f.reviewDate ? new Date(f.reviewDate).toISOString() : null, sortOrder: review?.sortOrder ?? 0 };
    if (await run(() => (review ? api.admin.put(`reviews/${review.id}`, body) : api.admin.post('reviews', body)), 'Review saved') !== undefined) onSaved();
  };
  return (
    <Dialog title={review ? 'Edit review' : 'Add review'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name">{(p) => <input {...p} className="field" value={f.customerName} onChange={set('customerName')} required maxLength={120} />}</Field>
          <Field label="Customer detail" optional hint="e.g. BMW X1 owner, Lucknow">{(p) => <input {...p} className="field" value={f.customerTitle} onChange={set('customerTitle')} maxLength={160} />}</Field>
        </div>
        <Field label="Review">{(p) => <textarea {...p} className="field min-h-28" value={f.body} onChange={set('body')} required maxLength={3000} />}</Field>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Rating" optional>{(p) => <select {...p} className="field" value={f.rating} onChange={set('rating')}><option value="">None</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>}</Field>
          <Field label="Source">{(p) => <select {...p} className="field" value={f.source} onChange={set('source')}>{['in-store', 'google', 'website', 'whatsapp', 'other'].map((s) => <option key={s}>{s}</option>)}</select>}</Field>
          <Field label="Date" optional>{(p) => <input {...p} type="date" className="field" value={f.reviewDate} onChange={set('reviewDate')} />}</Field>
          <Field label="Status">{(p) => <select {...p} className="field" value={f.status} onChange={set('status')}>
            <option value="pending">Pending</option>{can('cms:publish') && <option value="approved">Approved</option>}<option value="rejected">Rejected</option>
          </select>}</Field>
        </div>
        <Field label="Link to the original review" optional hint="e.g. the Google review URL">{(p) => <input {...p} className="field" value={f.sourceUrl} onChange={set('sourceUrl')} placeholder="https://" />}</Field>
        <ImageField label="Customer photo" folder="reviews" value={f.photo} onChange={(u) => setF((p) => ({ ...p, photo: u || '' }))} hint="Only with the customer's permission." />
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save review'}</button>
        </div>
      </form>
    </Dialog>
  );
}
