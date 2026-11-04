import React, { useEffect, useState } from 'react';
import type { ActivityLog } from '../../types';
import { api } from '../../services/api';
import { PanelHeader } from './ui';

export default function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => api.getActivityLogs({ limit: 300, action: action || undefined, actor: actor || undefined }).then(setLogs).catch(() => setLogs([])), 250);
    return () => window.clearTimeout(t);
  }, [action, actor]);
  return (
    <div>
      <PanelHeader title="Activity log" lead="Sign-ins, account changes and inventory changes. Website content changes are also recorded with before/after values." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="field sm:max-w-xs" placeholder="Filter by action, e.g. LOGIN" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action filter" />
        <input className="field sm:max-w-xs" placeholder="Filter by username" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="User filter" />
      </div>
      {logs === null ? <p className="text-sm text-stone-500">Loading…</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">Action</th><th className="p-3">Details</th><th className="p-3">IP</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((l) => (
                <tr key={l.id} className={l.action.includes('FAILED') || l.action.includes('BLOCKED') || l.action.startsWith('SECURITY') ? 'bg-red-50/60' : ''}>
                  <td className="whitespace-nowrap p-3 text-xs text-stone-600">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-3">{l.actorUsername}</td>
                  <td className="p-3 font-mono text-xs">{l.action}</td>
                  <td className="p-3 text-xs text-stone-700">{[l.target, l.details].filter(Boolean).join(' — ')}</td>
                  <td className="p-3 font-mono text-xs text-stone-500">{l.ip}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-stone-500">No entries.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
