import React, { Suspense, lazy, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Spinner } from '../ui';
import { useAdmin } from './ui';
import type { AdminPermission } from '../../types';

const HeroManager = lazy(() => import('./HeroManager'));
const ShowcaseManager = lazy(() => import('./ShowcaseManager'));
const ReviewsManager = lazy(() => import('./ReviewsManager'));
const OffersManager = lazy(() => import('./OffersManager'));
const MediaLibrary = lazy(() => import('./MediaLibrary'));
const SettingsManager = lazy(() => import('./SettingsManager'));

const SECTIONS: { id: string; label: string; perm: AdminPermission }[] = [
  { id: 'hero', label: 'Hero slides', perm: 'cms:hero' },
  { id: 'showcase', label: 'Featured cars', perm: 'cms:showcase' },
  { id: 'offers', label: 'Offers', perm: 'cms:offers' },
  { id: 'reviews', label: 'Reviews', perm: 'cms:reviews' },
  { id: 'media', label: 'Media library', perm: 'cms:media' },
  { id: 'settings', label: 'Settings & SEO', perm: 'cms:settings' },
];

/** Admin → Website: everything visitors see on the public pages. */
export default function CmsPanel({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const visible = SECTIONS.filter((s) => can(s.perm));
  const [active, setActive] = useState(visible[0]?.id);
  const publish = can('cms:publish');
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Website sections" className="flex gap-1 overflow-x-auto rounded-lg bg-stone-100 p-1 no-scrollbar">
          {visible.map((s) => (
            <button key={s.id} role="tab" type="button" aria-selected={active === s.id} onClick={() => setActive(s.id)}
              className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold ${active === s.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <a href="/?preview=1" target="_blank" rel="noopener" className="btn btn-secondary btn-sm"><ExternalLink className="h-4 w-4" aria-hidden />Preview drafts</a>
      </div>
      {!publish && (
        <p className="form-alert mb-6 border-sky-200 bg-sky-50 text-sky-900">
          You can create and edit drafts. Someone with publishing rights makes them live.
        </p>
      )}
      <Suspense fallback={<Spinner />}>
        {active === 'hero' && <HeroManager onChange={onChange} />}
        {active === 'showcase' && <ShowcaseManager onChange={onChange} />}
        {active === 'offers' && <OffersManager onChange={onChange} />}
        {active === 'reviews' && <ReviewsManager onChange={onChange} />}
        {active === 'media' && <MediaLibrary />}
        {active === 'settings' && <SettingsManager onChange={onChange} />}
      </Suspense>
    </div>
  );
}
