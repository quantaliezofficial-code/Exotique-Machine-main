import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import type { ShowcaseItem, Vehicle } from '../../types';
import { api } from '../../services/api';
import { vehicleName, formatPrice } from '../../content';
import Picture from '../ui/Picture';
import { PanelHeader, MoveButtons, moveItem, useAction } from './ui';

export default function ShowcaseManager({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<ShowcaseItem[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pick, setPick] = useState('');
  const { run, busy } = useAction();
  const load = () => api.admin.get<{ items: ShowcaseItem[] }>('featured-vehicles').then((r) => setItems(r.items));
  useEffect(() => { load(); api.getAdminVehicles().then(setVehicles).catch(() => {}); }, []);
  const available = useMemo(() => vehicles.filter((v) => v.isPublished && v.status !== 'sold' && !items?.some((i) => i.vehicleId === v.id)), [vehicles, items]);

  const done = () => { load(); onChange(); };
  const add = async () => { if (pick && await run(() => api.admin.post('featured-vehicles', { vehicleId: pick }), 'Added') !== undefined) { setPick(''); done(); } };
  const update = async (it: ShowcaseItem, patch: Partial<ShowcaseItem>) => {
    const body = { vehicleId: it.vehicleId, sortOrder: it.sortOrder, isVisible: it.isVisible, label: it.label, cardImage: it.cardImage, ...patch };
    if (await run(() => api.admin.put(`featured-vehicles/${it.id}`, body), 'Saved') !== undefined) done();
  };
  const reorder = async (next: ShowcaseItem[]) => { setItems(next); await run(() => api.admin.post('featured-vehicles/reorder', { ids: next.map((i) => i.id) })); onChange(); };

  return (
    <div>
      <PanelHeader title="Featured cars" lead="Cars shown in the home page showcase, in this order. When the list is empty the site picks premium cars with studio photos automatically. Sold cars are hidden automatically." />
      <div className="card mb-4 flex flex-col gap-2 p-3 sm:flex-row">
        <select className="field" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Car to feature">
          <option value="">Choose a car to feature…</option>
          {available.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)} {v.badge} — {formatPrice(v.price)}</option>)}
        </select>
        <button className="btn btn-primary shrink-0" disabled={!pick || busy} onClick={add}>Add to showcase</button>
      </div>
      {items === null ? <p className="text-sm text-stone-500">Loading…</p> : items.length === 0 ? (
        <p className="card p-6 text-sm text-stone-600">Nothing featured yet — the automatic selection is being used.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={it.id} className={`card flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${it.isVisible ? '' : 'opacity-60'}`}>
              <Picture src={it.cardImage || it.vehicle?.images?.[0]} alt="" sizes="120px" className="h-14 w-20 rounded object-cover" wrapperClassName="h-14 w-20 shrink-0 rounded bg-stone-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-stone-900">{it.vehicle ? vehicleName(it.vehicle) : `${it.vehicleId} (missing)`}</p>
                <input className="field mt-1 min-h-9 py-1 text-xs" placeholder="Badge text, e.g. Just arrived (optional)" defaultValue={it.label || ''} maxLength={80}
                  onBlur={(e) => e.target.value !== (it.label || '') && update(it, { label: e.target.value || null })} aria-label="Badge text" />
              </div>
              <div className="flex items-center gap-1">
                <MoveButtons first={i === 0} last={i === items.length - 1} onUp={() => reorder(moveItem(items, i, -1))} onDown={() => reorder(moveItem(items, i, 1))} />
                <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => update(it, { isVisible: !it.isVisible })} aria-label={it.isVisible ? 'Hide' : 'Show'}>
                  {it.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded text-red-700 hover:bg-red-50" onClick={async () => { if (await run(() => api.admin.del(`featured-vehicles/${it.id}`), 'Removed') !== undefined) done(); }} aria-label="Remove from showcase"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
