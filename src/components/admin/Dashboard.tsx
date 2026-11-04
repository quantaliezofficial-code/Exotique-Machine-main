import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { PanelHeader, useAdmin } from './ui';

interface Summary {
  heroSlides: Record<string, number>;
  showcase: number;
  reviews: Record<string, number>;
  offers: Record<string, number>;
  media: number;
  vehicles: { published: number; unpublished: number; sold: number };
  leads?: { enquiries: number; finance: number; testDrives: number; service: number };
  settingsWithUnpublishedChanges: string[];
}

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user, can } = useAdmin();
  const [s, setS] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.admin.get<Summary>('cms/summary').then(setS).catch((e) => setError(e.message)); }, []);

  const tile = (label: string, value: React.ReactNode, tab?: string, note?: string) => (
    <button type="button" disabled={!tab} onClick={() => tab && onNavigate(tab)}
      className="card p-5 text-left transition-colors enabled:hover:border-stone-900 disabled:cursor-default">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-stone-900">{value}</p>
      {note && <p className="mt-1 text-xs text-stone-600">{note}</p>}
    </button>
  );

  return (
    <div>
      <PanelHeader title={`Welcome, ${user.name || user.username}`} lead="What needs attention today." />
      {error && <p className="form-alert form-alert-error">{error}</p>}
      {s && (
        <div className="space-y-8">
          {s.leads && (
            <section>
              <h3 className="eyebrow mb-3">New leads</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {tile('Enquiries', s.leads.enquiries, 'leads', 'new')}
                {tile('Test drives', s.leads.testDrives, 'leads', 'scheduled')}
                {tile('Finance', s.leads.finance, 'leads', 'pending')}
                {tile('Service', s.leads.service, 'leads', 'pending')}
              </div>
            </section>
          )}
          <section>
            <h3 className="eyebrow mb-3">Website</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tile('Cars live', s.vehicles.published, can('inventory:view') ? 'inventory' : undefined, `${s.vehicles.unpublished} hidden · ${s.vehicles.sold} sold`)}
              {tile('Reviews to check', s.reviews.pending || 0, 'website', `${s.reviews.approved || 0} published`)}
              {tile('Live offers', s.offers.live || 0, 'website', `${s.offers.scheduled || 0} scheduled · ${s.offers.draft || 0} drafts`)}
              {tile('Hero slides', s.heroSlides.published || 0, 'website', `${s.heroSlides.draft || 0} drafts`)}
            </div>
            {s.settingsWithUnpublishedChanges.length > 0 && (
              <p className="form-alert mt-4 border-amber-200 bg-amber-50 text-amber-900">
                Unpublished settings changes: {s.settingsWithUnpublishedChanges.join(', ')}. Publish them in Website → Settings.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
