import React from 'react';
import { Heart, Fuel, Gauge, Users } from 'lucide-react';
import type { Vehicle } from '../../types';
import { Link } from '../../router';
import { carPath } from '../../lib/routes';
import { formatPrice, vehicleName } from '../../content';
import { preloadImage } from '../../lib/images';
import Picture from './Picture';

interface Props {
  vehicle: Vehicle;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  priority?: boolean;
  compare?: { checked: boolean; disabled: boolean; onChange: () => void };
  sizes?: string;
}

const STATUS_BADGE: Record<string, string> = {
  reserved: 'bg-amber-100 text-amber-900',
  sold: 'bg-stone-900 text-white',
};

/** The one vehicle card used on the home page, inventory and brand pages. */
export default function VehicleCard({ vehicle: v, isFavorite, onToggleFavorite, priority, compare, sizes }: Props) {
  const name = vehicleName(v);
  const img = v.cardImage || v.images?.[0];
  const km = v.kmDriven ? `${Math.round(v.kmDriven / 1000)}k km` : null;
  return (
    <article className="card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-stone-900/5">
      <div className="relative aspect-[16/10] bg-stone-200">
        <Picture
          src={img}
          alt={`${name} ${v.badge || ''}`.trim()}
          sizes={sizes || '(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw'}
          priority={priority}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          wrapperClassName="h-full w-full"
          width={640}
          height={400}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {v.showcaseLabel && <span className="badge bg-[var(--color-accent)] text-white">{v.showcaseLabel}</span>}
          {v.status && STATUS_BADGE[v.status] && <span className={`badge ${STATUS_BADGE[v.status]}`}>{v.status}</span>}
        </div>
        {onToggleFavorite && (
          <button
            type="button"
            onClick={() => onToggleFavorite(v.id)}
            aria-pressed={!!isFavorite}
            aria-label={isFavorite ? `Remove ${name} from saved cars` : `Save ${name}`}
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm hover:bg-white"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-600 text-red-600' : ''}`} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-stone-500">{v.brand}</p>
        <h3 className="mt-0.5 text-base font-bold leading-snug text-stone-900">
          <Link
            to={carPath(v.id)}
            onMouseEnter={() => preloadImage(v.images?.[0], 1280)}
            onFocus={() => preloadImage(v.images?.[0], 1280)}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {name}
          </Link>
        </h3>
        {v.badge && v.badge !== v.model && <p className="text-xs text-stone-600 truncate">{v.badge}</p>}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          <li className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" aria-hidden />{v.fuel}</li>
          <li className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" aria-hidden />{km || v.transmission}</li>
          {v.seats ? <li className="flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden />{v.seats} seats</li> : null}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-black text-stone-900">{formatPrice(v.price)}</p>
            {v.emi > 0 && v.status !== 'sold' && (
              <p className="text-[11px] text-stone-500">EMI from ₹{v.emi.toLocaleString('en-IN')}/mo*</p>
            )}
          </div>
          {compare && (
            <label className="relative z-10 flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={compare.checked}
                disabled={compare.disabled && !compare.checked}
                onChange={compare.onChange}
                className="h-4 w-4 accent-stone-900"
              />
              Compare
            </label>
          )}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="aspect-[16/10] animate-pulse bg-stone-200" />
      <div className="space-y-2 p-5">
        <div className="h-3 w-16 animate-pulse rounded bg-stone-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-stone-200" />
        <div className="h-6 w-24 animate-pulse rounded bg-stone-200 mt-4" />
      </div>
    </div>
  );
}
