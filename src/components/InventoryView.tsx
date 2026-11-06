import React, { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X, Search, GitCompare } from 'lucide-react';
import type { Vehicle } from '../types';
import { useRouter, Link } from '../router';
import { useSite, formatPrice, vehicleName } from '../content';
import { useGarage } from '../garage';
import { brandSlug, carPath } from '../lib/routes';
import { usePageMeta } from '../lib/seo';
import { BUDGETS, FUELS, TRANSMISSIONS } from '../constants';
import { PageHeader, EmptyState } from './ui';
import VehicleCard, { VehicleCardSkeleton } from './ui/VehicleCard';
import Dialog from './ui/Dialog';
import ListingSummary from './ListingSummary';
import { api } from '../services/api';
import { readInitialData } from '../content';
import type { ListingInfo } from '../types';

const SORTS = {
  newest: { label: 'Newest listings', fn: (a: Vehicle, b: Vehicle) => (b.createdAt || '').localeCompare(a.createdAt || '') },
  'price-asc': { label: 'Price: low to high', fn: (a: Vehicle, b: Vehicle) => (a.price || 0) - (b.price || 0) },
  'price-desc': { label: 'Price: high to low', fn: (a: Vehicle, b: Vehicle) => (b.price || 0) - (a.price || 0) },
  year: { label: 'Year: newest first', fn: (a: Vehicle, b: Vehicle) => (b.year || 0) - (a.year || 0) },
  km: { label: 'Kilometres: lowest first', fn: (a: Vehicle, b: Vehicle) => (a.kmDriven ?? 1e9) - (b.kmDriven ?? 1e9) },
} as const;
type SortKey = keyof typeof SORTS;

interface Filters {
  brands: string[]; // slugs
  types: string[];
  fuels: string[];
  transmission: string;
  budget: number; // index into BUDGETS
  q: string;
  sort: SortKey;
  sold: boolean;
}

const PAGE = 24;

function readFilters(search: URLSearchParams, brandFromPath?: string): Filters {
  const list = (k: string) => (search.get(k) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const sort = (search.get('sort') || 'newest') as SortKey;
  return {
    brands: brandFromPath ? [brandFromPath] : list('brand'),
    types: list('type'),
    fuels: list('fuel'),
    transmission: search.get('trans') || '',
    budget: Math.min(Math.max(Number(search.get('budget')) || 0, 0), BUDGETS.length - 1),
    q: search.get('q') || '',
    sort: sort in SORTS ? sort : 'newest',
    sold: search.get('sold') === '1',
  };
}

function toQuery(f: Filters, brandFromPath?: string): string {
  const q = new URLSearchParams();
  if (!brandFromPath && f.brands.length) q.set('brand', f.brands.join(','));
  if (f.types.length) q.set('type', f.types.join(','));
  if (f.fuels.length) q.set('fuel', f.fuels.join(','));
  if (f.transmission) q.set('trans', f.transmission);
  if (f.budget) q.set('budget', String(f.budget));
  if (f.q) q.set('q', f.q);
  if (f.sort !== 'newest') q.set('sort', f.sort);
  if (f.sold) q.set('sold', '1');
  const s = q.toString();
  return s ? `?${s}` : '';
}

export default function InventoryView({ brandSlug: brandFromPath, collection }: { brandSlug?: string; collection?: string }) {
  const { vehicles, vehiclesLoaded, vehiclesError, refreshVehicles } = useSite();
  const { search, path, navigate } = useRouter();
  const { favorites, toggleFavorite } = useGarage();
  // Answer-first summary + facts for this listing (same text as the server-rendered page).
  const [info, setInfo] = useState<ListingInfo | null | undefined>(() => {
    // First page load: the server already embedded this listing's data.
    const first = readInitialData()?.listing as ListingInfo | undefined;
    const want = collection ? `/used-cars/${collection}` : brandFromPath ? `/brands/${brandFromPath}` : '/cars';
    return first && first.path === want ? first : undefined;
  });
  const isFiltered = !brandFromPath && !collection && search.toString().length > 0;
  useEffect(() => {
    let live = true;
    api.getListing({ brand: brandFromPath, collection }).then((d) => live && setInfo(d)).catch(() => live && setInfo(null));
    return () => { live = false; };
  }, [brandFromPath, collection]);
  const preset = collection ? info?.preset || null : null;
  const filters = useMemo(() => {
    const f = readFilters(search, brandFromPath);
    if (preset) {
      if (preset.types && !f.types.length) f.types = preset.types;
      if (preset.fuels && !f.fuels.length) f.fuels = preset.fuels;
      if (preset.transmission && !f.transmission) f.transmission = preset.transmission;
      if (preset.budget && !f.budget) f.budget = preset.budget;
    }
    return f;
  }, [search, brandFromPath, preset]);
  const [query, setQuery] = useState(filters.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [compare, setCompare] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    // Changing filters on a collection page, or brands on a brand page, moves to /cars.
    if (collection || (brandFromPath && patch.brands)) {
      navigate(`/cars${toQuery(next)}`, { keepScroll: true });
      return;
    }
    navigate(`${path}${toQuery(next, brandFromPath)}`, { replace: true, keepScroll: true });
    setShown(PAGE);
  };

  useEffect(() => {
    const t = window.setTimeout(() => query !== filters.q && update({ q: query }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const brandOptions = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; count: number }>();
    vehicles.forEach((v) => {
      if (v.status === 'sold') return;
      const s = brandSlug(v.brand);
      const e = m.get(s) || { slug: s, name: v.brand, count: 0 };
      e.count += 1;
      m.set(s, e);
    });
    return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [vehicles]);
  const typeOptions = useMemo(() => [...new Set(vehicles.map((v) => v.lifestyle).filter(Boolean))].sort(), [vehicles]);

  const results = useMemo(() => {
    const b = BUDGETS[filters.budget];
    const q = filters.q.toLowerCase();
    return vehicles
      .filter((v) => filters.sold || v.status !== 'sold')
      .filter((v) => !filters.brands.length || filters.brands.includes(brandSlug(v.brand)))
      .filter((v) => !filters.types.length || filters.types.includes(v.lifestyle))
      .filter((v) => !filters.fuels.length || filters.fuels.includes(v.fuel))
      .filter((v) => !filters.transmission || v.transmission === filters.transmission)
      .filter((v) => (v.price || 0) >= b.min && (v.price || 0) < b.max)
      .filter((v) => !q || `${v.year || ''} ${v.brand} ${v.model} ${v.badge} ${v.fuel} ${v.lifestyle}`.toLowerCase().includes(q))
      .sort(SORTS[filters.sort].fn);
  }, [vehicles, filters]);

  const brandName = brandFromPath ? brandOptions.find((b) => b.slug === brandFromPath)?.name
    || vehicles.find((v) => brandSlug(v.brand) === brandFromPath)?.brand : undefined;
  const title = collection ? (info?.title || 'Used cars for sale')
    : brandName ? `Used ${brandName} Cars for Sale in Lucknow` : 'Pre-Owned Luxury Cars for Sale in Lucknow';
  const listingPath = collection ? `/used-cars/${collection}` : brandFromPath ? `/brands/${brandFromPath}` : '/cars';
  usePageMeta(collection && !info ? null : {
    title,
    description: info?.summary?.slice(0, 158)
      || `Browse ${results.length} certified pre-owned ${brandName || 'luxury'} cars at Exotique Machines, Lucknow. Finance, trade-in and test drives available.`,
    path: listingPath,
    noindex: isFiltered || (collection ? info?.indexable === false : false),
  });

  const activeChips: { label: string; clear: () => void }[] = [
    ...(!brandFromPath ? filters.brands.map((s) => ({ label: brandOptions.find((b) => b.slug === s)?.name || s, clear: () => update({ brands: filters.brands.filter((x) => x !== s) }) })) : []),
    ...filters.types.map((t) => ({ label: t, clear: () => update({ types: filters.types.filter((x) => x !== t) }) })),
    ...filters.fuels.map((t) => ({ label: t, clear: () => update({ fuels: filters.fuels.filter((x) => x !== t) }) })),
    ...(filters.transmission ? [{ label: filters.transmission, clear: () => update({ transmission: '' }) }] : []),
    ...(filters.budget ? [{ label: BUDGETS[filters.budget].label, clear: () => update({ budget: 0 }) }] : []),
    ...(filters.q ? [{ label: `“${filters.q}”`, clear: () => { setQuery(''); update({ q: '' }); } }] : []),
  ];
  const clearAll = () => { setQuery(''); navigate(brandFromPath ? `/brands/${brandFromPath}` : '/cars', { replace: !collection, keepScroll: true }); };
  const toggleCompare = (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  const compared = compare.map((id) => vehicles.find((v) => v.id === id)).filter(Boolean) as Vehicle[];

  const filterPanel = (
    <FilterPanel
      filters={filters}
      brandOptions={brandOptions}
      typeOptions={typeOptions}
      lockBrand={!!brandFromPath}
      onChange={update}
    />
  );

  return (
    <div id="inventory-view">
      <PageHeader
        eyebrow={collection ? 'Used cars' : brandName ? brandName : 'Inventory'}
        title={title}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'All cars', to: brandFromPath || collection ? '/cars' : undefined },
          ...(brandName ? [{ label: brandName }] : collection && info ? [{ label: info.title.replace(/ in [A-Z][a-z]+$/, '') }] : [])]}
        lead={vehiclesLoaded ? `${results.length} car${results.length === 1 ? '' : 's'} match${results.length === 1 ? 'es' : ''} your search.` : 'Loading the showroom…'}
      />
      {info && !isFiltered && <ListingSummary info={info} current={listingPath} />}

      <div className="page-container py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search cars</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" aria-hidden />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by brand, model or type" className="field pl-9" />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary lg:hidden" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />Filters{activeChips.length ? ` (${activeChips.length})` : ''}
            </button>
            <label className="flex-1 sm:flex-none">
              <span className="sr-only">Sort by</span>
              <select className="field sm:w-56" value={filters.sort} onChange={(e) => update({ sort: e.target.value as SortKey })}>
                {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {activeChips.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
            {activeChips.map((c) => (
              <li key={c.label}>
                <button type="button" onClick={c.clear} className="chip chip-active" aria-label={`Remove filter ${c.label}`}>
                  {c.label}<X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
            <li><button type="button" onClick={clearAll} className="min-h-9 px-2 text-xs font-semibold text-stone-700 underline">Clear all</button></li>
          </ul>
        )}

        <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-24">{filterPanel}</div>
          </aside>

          <section aria-labelledby="inventory-results" aria-live="polite">
            <h2 id="inventory-results" className="sr-only">Cars for sale</h2>
            {!vehiclesLoaded ? (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <li key={i}><VehicleCardSkeleton /></li>)}
              </ul>
            ) : vehiclesError && !vehicles.length ? (
              <EmptyState title="We could not load the cars" body="Please check your connection and try again." action={<button className="btn btn-primary" onClick={refreshVehicles}>Try again</button>} />
            ) : results.length === 0 ? (
              <EmptyState title="No cars match these filters" body="Try removing a filter, or tell us what you are looking for and we will find it." action={<button className="btn btn-primary" onClick={clearAll}>Clear filters</button>} />
            ) : (
              <>
                <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {results.slice(0, shown).map((v, i) => (
                    <li key={v.id}>
                      <VehicleCard
                        vehicle={v}
                        priority={i < 2}
                        isFavorite={favorites.includes(v.id)}
                        onToggleFavorite={toggleFavorite}
                        compare={{ checked: compare.includes(v.id), disabled: compare.length >= 3, onChange: () => toggleCompare(v.id) }}
                        sizes="(min-width: 1280px) 320px, (min-width: 640px) 45vw, 100vw"
                      />
                    </li>
                  ))}
                </ul>
                {shown < results.length && (
                  <div className="mt-8 text-center">
                    <button type="button" className="btn btn-secondary" onClick={() => setShown((s) => s + PAGE)}>
                      Show more ({results.length - shown} left)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-stone-200 bg-white/95 backdrop-blur lg:bottom-0">
          <div className="page-container flex items-center justify-between gap-3 py-3">
            <p className="text-sm text-stone-700"><span className="font-bold">{compare.length}</span> of 3 selected to compare</p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompare([])}>Clear</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>
                <GitCompare className="h-4 w-4" aria-hidden />Compare
              </button>
            </div>
          </div>
        </div>
      )}

      {filtersOpen && (
        <Dialog title="Filters" onClose={() => setFiltersOpen(false)} variant="drawer">
          {filterPanel}
          <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => setFiltersOpen(false)}>
            Show {results.length} car{results.length === 1 ? '' : 's'}
          </button>
        </Dialog>
      )}

      {compareOpen && compared.length >= 2 && (
        <Dialog title="Compare cars" onClose={() => setCompareOpen(false)} wide>
          <CompareTable vehicles={compared} />
        </Dialog>
      )}
    </div>
  );
}

function FilterPanel({
  filters, brandOptions, typeOptions, lockBrand, onChange,
}: {
  filters: Filters;
  brandOptions: { slug: string; name: string; count: number }[];
  typeOptions: string[];
  lockBrand: boolean;
  onChange: (p: Partial<Filters>) => void;
}) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const group = 'border-b border-stone-200 pb-5 mb-5';
  const legend = 'field-label mb-3';
  return (
    <div>
      <fieldset className={group}>
        <legend className={legend}>Budget</legend>
        <select className="field" value={filters.budget} onChange={(e) => onChange({ budget: Number(e.target.value) })}>
          {BUDGETS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
        </select>
      </fieldset>
      {!lockBrand && brandOptions.length > 0 && (
        <fieldset className={group}>
          <legend className={legend}>Brand</legend>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {brandOptions.map((b) => (
              <li key={b.slug}>
                <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm text-stone-800">
                  <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={filters.brands.includes(b.slug)}
                    onChange={() => onChange({ brands: toggle(filters.brands, b.slug) })} />
                  <span className="flex-1">{b.name}</span>
                  <span className="font-mono text-xs text-stone-500">{b.count}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {typeOptions.length > 1 && (
        <fieldset className={group}>
          <legend className={legend}>Body type</legend>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map((t) => (
              <button key={t} type="button" aria-pressed={filters.types.includes(t)}
                className={`chip ${filters.types.includes(t) ? 'chip-active' : ''}`}
                onClick={() => onChange({ types: toggle(filters.types, t) })}>{t}</button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset className={group}>
        <legend className={legend}>Fuel</legend>
        <div className="flex flex-wrap gap-2">
          {FUELS.map((f) => (
            <button key={f} type="button" aria-pressed={filters.fuels.includes(f)}
              className={`chip ${filters.fuels.includes(f) ? 'chip-active' : ''}`}
              onClick={() => onChange({ fuels: toggle(filters.fuels, f) })}>{f}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className={group}>
        <legend className={legend}>Transmission</legend>
        <div className="flex flex-wrap gap-2">
          {['', ...TRANSMISSIONS].map((t) => (
            <button key={t || 'any'} type="button" aria-pressed={filters.transmission === t}
              className={`chip ${filters.transmission === t ? 'chip-active' : ''}`}
              onClick={() => onChange({ transmission: t })}>{t || 'Any'}</button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-stone-800">
        <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={filters.sold} onChange={(e) => onChange({ sold: e.target.checked })} />
        Include sold cars
      </label>
    </div>
  );
}

function CompareTable({ vehicles }: { vehicles: Vehicle[] }) {
  const rows: [string, (v: Vehicle) => React.ReactNode][] = [
    ['Price', (v) => formatPrice(v.price)],
    ['Year', (v) => v.year || '—'],
    ['Kilometres', (v) => (v.kmDriven ? `${v.kmDriven.toLocaleString('en-IN')} km` : '—')],
    ['Owners', (v) => v.owners ?? '—'],
    ['Fuel', (v) => v.fuel],
    ['Transmission', (v) => v.transmission],
    ['Engine', (v) => v.engine || '—'],
    ['Power', (v) => v.power || '—'],
    ['Mileage', (v) => v.mileage || '—'],
    ['Seats', (v) => v.seats],
    ['Body type', (v) => v.lifestyle],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr>
            <th scope="col" className="w-28 py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-stone-500">Spec</th>
            {vehicles.map((v) => (
              <th key={v.id} scope="col" className="py-2 pr-3 align-bottom">
                <Link to={carPath(v.id)} className="font-bold text-stone-900 hover:underline">{vehicleName(v)}</Link>
                <span className="block text-xs font-normal text-stone-600">{v.badge}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200">
          {rows.map(([label, get]) => (
            <tr key={label}>
              <th scope="row" className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</th>
              {vehicles.map((v) => <td key={v.id} className="py-2.5 pr-3 text-stone-800">{get(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
