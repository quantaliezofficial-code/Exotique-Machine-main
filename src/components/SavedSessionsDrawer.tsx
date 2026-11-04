import React from 'react';
import { Heart, Trash2 } from 'lucide-react';
import Dialog from './ui/Dialog';
import Picture from './ui/Picture';
import { Link } from '../router';
import { useGarage } from '../garage';
import { useSite, formatPrice, vehicleName } from '../content';
import { carPath } from '../lib/routes';

/** "My garage": saved cars and requests sent from this device. */
export default function SavedSessionsDrawer({ onClose }: { onClose: () => void }) {
  const { favorites, toggleFavorite, requests, removeRequest } = useGarage();
  const { vehicles, vehiclesLoaded } = useSite();
  const saved = favorites.map((id) => vehicles.find((v) => v.id === id)).filter(Boolean) as typeof vehicles;
  const missing = vehiclesLoaded ? favorites.filter((id) => !vehicles.some((v) => v.id === id)) : [];

  return (
    <Dialog title="My garage" onClose={onClose} variant="drawer">
      <section aria-labelledby="garage-saved">
        <h3 id="garage-saved" className="eyebrow mb-3">Saved cars ({saved.length})</h3>
        {saved.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-5 text-sm text-stone-600">
            Tap the <Heart className="inline h-4 w-4 align-text-bottom" aria-label="heart" /> on any car to keep it here.
          </p>
        ) : (
          <ul className="space-y-3">
            {saved.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-lg border border-stone-200 p-2">
                <Picture src={v.images?.[0]} alt="" sizes="96px" className="h-14 w-20 rounded object-cover" wrapperClassName="h-14 w-20 shrink-0 rounded" />
                <div className="min-w-0 flex-1">
                  <Link to={carPath(v.id)} onClick={onClose} className="block truncate text-sm font-bold text-stone-900 hover:underline">
                    {vehicleName(v)}
                  </Link>
                  <p className="text-xs text-stone-600">{formatPrice(v.price)}{v.status === 'sold' ? ' · Sold' : ''}</p>
                </div>
                <button type="button" onClick={() => toggleFavorite(v.id)} className="flex h-11 w-11 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100" aria-label={`Remove ${vehicleName(v)}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <p className="mt-3 text-xs text-stone-500">
            {missing.length} saved car{missing.length > 1 ? 's are' : ' is'} no longer listed.{' '}
            <button type="button" className="underline" onClick={() => missing.forEach(toggleFavorite)}>Remove</button>
          </p>
        )}
      </section>

      <section aria-labelledby="garage-requests" className="mt-8">
        <h3 id="garage-requests" className="eyebrow mb-3">Your requests ({requests.length})</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-stone-600">Test drives, finance and service requests you send will be listed here.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r, i) => (
              <li key={r.reference || i} className="flex items-start justify-between gap-3 rounded-lg border border-stone-200 p-3 text-sm">
                <div>
                  <p className="font-bold text-stone-900">{r.kind}: {r.label}</p>
                  <p className="text-xs text-stone-600">
                    {r.date ? `For ${r.date} · ` : ''}Sent {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    {r.reference && <> · Ref <span className="font-mono">{r.reference}</span></>}
                  </p>
                </div>
                <button type="button" onClick={() => removeRequest(r.reference)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Remove from this list">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-stone-500">
          This list is stored only on this device. To change or cancel a request, call or WhatsApp the showroom with your reference.
        </p>
      </section>
    </Dialog>
  );
}
