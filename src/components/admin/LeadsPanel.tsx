import React, { useEffect, useMemo, useState } from 'react';
import { Download, Phone, MessageCircle } from 'lucide-react';
import type { LeadKind } from '../../types';
import { api } from '../../services/api';
import { whatsappLink } from '../../content';
import { PanelHeader, StatusBadge, useAction, useAdmin } from './ui';

type Lead = Record<string, any> & { id: string; status: string; createdAt?: string };
const KINDS: { id: LeadKind; label: string }[] = [
  { id: 'enquiries', label: 'Enquiries' }, { id: 'test-drives', label: 'Test drives' }, { id: 'finance', label: 'Finance' }, { id: 'service', label: 'Service' },
];

function describe(kind: LeadKind, l: Lead) {
  switch (kind) {
    case 'enquiries': return { name: l.name, phone: l.phone, detail: [l.vehicleInterest, l.message, l.email].filter(Boolean).join(' · '), source: l.source };
    case 'test-drives': return { name: l.name, phone: l.phone, detail: `${l.modelName} · ${l.date} ${l.time}${l.email ? ` · ${l.email}` : ''}${l.hasLicense ? '' : ' · no licence'}` };
    case 'finance': return { name: l.name, phone: l.phone, detail: `${l.model}${l.whatsappUpdates ? ' · WhatsApp OK' : ''}` };
    case 'service': return { name: l.customerName, phone: l.customerPhone, detail: `${l.serviceType} · ${l.vehicleModel} · ${l.preferredDate}${l.notes ? ` · ${l.notes}` : ''}` };
  }
}

/** Prevent CSV formula injection: cells starting with = + - @ are prefixed. */
function csvCell(v: unknown) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export default function LeadsPanel() {
  const { can } = useAdmin();
  const [data, setData] = useState<{ leads: Record<LeadKind, Lead[]>; statuses: string[] } | null>(null);
  const [kind, setKind] = useState<LeadKind>('enquiries');
  const [status, setStatus] = useState('');
  const { run } = useAction();
  const load = () => api.admin.get('leads').then(setData);
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => (data?.leads[kind] || []).filter((l) => !status || l.status === status), [data, kind, status]);
  const update = async (l: Lead, s: string) => { if (await run(() => api.admin.patch(`leads/${kind}/${l.id}`, { status: s }), 'Status updated') !== undefined) load(); };
  const exportCsv = () => {
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const csv = [keys.map(csvCell).join(','), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${kind}-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PanelHeader title="Leads" lead="Requests from the website. This is customers' personal data: use it only to respond to them."
        actions={<button className="btn btn-secondary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" aria-hidden />Export CSV</button>} />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button key={k.id} role="tab" aria-selected={kind === k.id} onClick={() => setKind(k.id)} className={`chip ${kind === k.id ? 'chip-active' : ''}`}>
              {k.label} <span className="font-mono text-[11px] opacity-70">{data?.leads[k.id]?.length ?? ''}</span>
            </button>
          ))}
        </div>
        <select className="field sm:w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>{data?.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {!data ? <p className="text-sm text-stone-500">Loading…</p> : rows.length === 0 ? <p className="card p-6 text-sm text-stone-600">Nothing here.</p> : (
        <ul className="space-y-2">
          {rows.map((l) => {
            const d = describe(kind, l);
            return (
              <li key={l.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">{d.name} <StatusBadge status={l.status} /></p>
                  <p className="text-sm text-stone-700">{d.detail}</p>
                  <p className="text-xs text-stone-500">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ''} · {l.id}{d.source ? ` · ${d.source}` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {d.phone && <a href={`tel:${d.phone}`} className="btn btn-secondary btn-sm"><Phone className="h-4 w-4" aria-hidden />{d.phone}</a>}
                  {d.phone && <a href={whatsappLink(d.phone.length === 10 ? `91${d.phone}` : d.phone)} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" aria-label="WhatsApp"><MessageCircle className="h-4 w-4 text-emerald-700" /></a>}
                  {can('leads:manage') && (
                    <select className="field min-h-9 w-auto py-1 text-sm" value={l.status} onChange={(e) => update(l, e.target.value)} aria-label="Change status">
                      {data.statuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
