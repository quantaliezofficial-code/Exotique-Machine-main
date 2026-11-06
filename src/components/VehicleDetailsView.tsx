import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, Share2, Phone, MessageCircle, CalendarCheck, Landmark, Check } from 'lucide-react';
import type { Vehicle } from '../types';
import { Link } from '../router';
import { api } from '../services/api';
import { useSite, useContact, initialVehicle, formatPrice, vehicleName, cleanName, whatsappLink, formatInr } from '../content';
import { useGarage } from '../garage';
import { brandPath, carPath } from '../lib/routes';
import { usePageMeta } from '../lib/seo';
import { preloadImage, srcSet, variant, isOptimisable, placeholder } from '../lib/images';
import { Breadcrumbs, Spinner } from './ui';
import VehicleCard from './ui/VehicleCard';
import NotFoundView from './NotFoundView';

export default function VehicleDetailsView({ vehicleId }: { vehicleId: string }) {
  const { vehicles, vehiclesLoaded } = useSite();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(
    () => initialVehicle(vehicleId) ?? vehicles.find((v) => v.id === vehicleId),
  );

  useEffect(() => {
    const local = initialVehicle(vehicleId) ?? vehicles.find((v) => v.id === vehicleId);
    if (local) { setVehicle(local); return; }
    if (!vehiclesLoaded) return;
    let cancelled = false;
    api.getVehicle(vehicleId).then((v) => !cancelled && setVehicle(v)).catch(() => !cancelled && setVehicle(null));
    return () => { cancelled = true; };
  }, [vehicleId, vehicles, vehiclesLoaded]);

  if (vehicle === undefined) return <Spinner label="Loading car" />;
  if (vehicle === null) return <NotFoundView message="This car is no longer listed. It may have been sold." />;
  return <Details key={vehicle.id} v={vehicle} all={vehicles} />;
}

function Details({ v, all }: { v: Vehicle; all: Vehicle[] }) {
  const contact = useContact();
  const { favorites, toggleFavorite } = useGarage();
  const name = vehicleName(v);
  const full = [v.year, v.brand, cleanName(v.model, v.badge, v.year)].filter(Boolean).join(' ');
  const sold = v.status === 'sold';
  const [copied, setCopied] = useState(false);
  usePageMeta({
    title: sold ? `Sold: ${full}` : `Used ${full} for sale in Lucknow`,
    description: `${full} at Exotique Machines, Lucknow. ${[v.fuel, v.transmission, v.engine, formatPrice(v.price)].filter(Boolean).join(', ')}.`,
    path: carPath(v.id),
  });

  const similar = useMemo(
    () => all.filter((x) => x.id !== v.id && x.status !== 'sold')
      .sort((a, b) => Number(b.brand === v.brand) - Number(a.brand === v.brand) || Math.abs(a.price - v.price) - Math.abs(b.price - v.price))
      .slice(0, 3),
    [all, v],
  );

  const facts = [
    ['Year', v.year], ['Kilometres', v.kmDriven ? `${v.kmDriven.toLocaleString('en-IN')} km` : null],
    ['Owners', v.owners ? (v.owners === 1 ? '1st owner' : `${v.owners} owners`) : null], ['Fuel', v.fuel],
    ['Transmission', v.transmission], ['Registration', v.registration],
  ].filter(([, val]) => val) as [string, React.ReactNode][];
  const specs = [
    ['Engine', v.engine], ['Power', v.power], ['Mileage / range', v.mileage], ['Seats', v.seats], ['Body type', v.lifestyle],
    ['Condition', v.condition === 'new' ? 'New' : 'Pre-owned'],
  ].filter(([, val]) => val) as [string, React.ReactNode][];

  const share = async () => {
    const url = window.location.origin + carPath(v.id);
    try {
      if (navigator.share) await navigator.share({ title: full, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };
  const enquire = () => window.dispatchEvent(new CustomEvent('em:enquire', { detail: { car: full } }));
  const isFav = favorites.includes(v.id);

  return (
    <div id="vehicle-details-view">
      <div className="page-container pt-6">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'All cars', to: '/cars' }, { label: v.brand, to: brandPath(v.brand) }, { label: name }]} />
      </div>
      {/* One summary in the DOM. Mobile order: gallery → summary → details; desktop puts
          the summary in a sticky right column. */}
      <div className="page-container grid gap-8 pb-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery images={v.images || []} alt={full} />
        </div>
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24"><Summary /></div>
        </aside>
        <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
          {(v.summary || v.description) && (
            <section aria-labelledby="about-car">
              <h2 id="about-car" className="text-xl font-bold text-stone-900">About this car</h2>
              {v.summary && <p className="mt-3 max-w-prose text-[15px] font-medium leading-relaxed text-stone-800">{v.summary}</p>}
              {v.description && <p className="mt-3 max-w-prose whitespace-pre-line text-sm leading-relaxed text-stone-700">{v.description}</p>}
            </section>
          )}
          <section aria-labelledby="specs">
            <h2 id="specs" className="text-xl font-bold text-stone-900">Specifications</h2>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:grid-cols-2">
              {[...facts, ...specs].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 bg-white px-4 py-3 text-sm">
                  <dt className="text-stone-600">{k}</dt>
                  <dd className="text-right font-semibold text-stone-900">{val}</dd>
                </div>
              ))}
            </dl>
          </section>
          {v.features?.length > 0 && (
            <section aria-labelledby="features">
              <h2 id="features" className="text-xl font-bold text-stone-900">Features</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {v.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-stone-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />{f}</li>
                ))}
              </ul>
            </section>
          )}
          {v.colors?.length > 0 && (
            <section aria-labelledby="colours">
              <h2 id="colours" className="text-xl font-bold text-stone-900">Colour</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {v.colors.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-sm text-stone-700">
                    <span className="h-6 w-6 rounded-full border border-stone-300" style={{ background: c.hex }} aria-hidden />{c.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-stone-200 bg-white py-12" aria-labelledby="similar">
          <div className="page-container">
            <h2 id="similar" className="section-title">Similar cars</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <li key={s.id}><VehicleCard vehicle={s} isFavorite={favorites.includes(s.id)} onToggleFavorite={toggleFavorite} /></li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );

  function Summary() {
    return (
      <div className="card p-5 sm:p-6">
        <p className="eyebrow">{v.brand}</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-stone-900">{name}</h1>
        {v.badge && v.badge !== v.model && <p className="text-sm text-stone-600">{v.badge}</p>}
        {sold ? (
          <p className="mt-4 inline-block rounded bg-stone-900 px-3 py-1 text-sm font-bold text-white">This car has been sold</p>
        ) : (
          <>
            <p className="mt-4 text-3xl font-black text-stone-900">{formatPrice(v.price)}</p>
            {v.emi > 0 && <p className="text-sm text-stone-600">EMI from {formatInr(v.emi)}/month*</p>}
            {v.status === 'reserved' && <p className="mt-2 badge bg-amber-100 text-amber-900">Reserved</p>}
          </>
        )}
        <ul className="mt-4 flex flex-wrap gap-2">
          {facts.slice(0, 4).map(([k, val]) => <li key={k} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{val}</li>)}
        </ul>
        <div className="mt-6 grid gap-2">
          {!sold && (
            <>
              <Link to={`/test-drive?car=${encodeURIComponent(v.id)}`} className="btn btn-primary w-full"><CalendarCheck className="h-4 w-4" aria-hidden />Book a test drive</Link>
              <Link to={`/finance?car=${encodeURIComponent(v.id)}`} className="btn btn-secondary w-full"><Landmark className="h-4 w-4" aria-hidden />Check finance &amp; EMI</Link>
            </>
          )}
          <button type="button" onClick={enquire} className="btn btn-secondary w-full">{sold ? 'Find me a similar car' : 'Enquire about this car'}</button>
          <div className="grid grid-cols-2 gap-2">
            {contact?.phones[0] && <a href={`tel:${contact.phones[0].number}`} className="btn btn-ghost border border-stone-200"><Phone className="h-4 w-4" aria-hidden />Call</a>}
            {contact?.whatsapp && (
              <a href={whatsappLink(contact.whatsapp, `Hi, I'm interested in the ${full} (${window.location.origin}${carPath(v.id)})`)} target="_blank" rel="noopener" className="btn btn-ghost border border-stone-200">
                <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />WhatsApp
              </a>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => toggleFavorite(v.id)} aria-pressed={isFav} className="btn btn-ghost">
              <Heart className={`h-4 w-4 ${isFav ? 'fill-red-600 text-red-600' : ''}`} aria-hidden />{isFav ? 'Saved' : 'Save'}
            </button>
            <button type="button" onClick={share} className="btn btn-ghost"><Share2 className="h-4 w-4" aria-hidden />{copied ? 'Link copied' : 'Share'}</button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-stone-500">*EMI is indicative and depends on the lender, down payment and tenure.</p>
      </div>
    );
  }
}

/**
 * Only the visible photo is downloaded; the next and previous ones are preloaded so
 * swiping feels instant. Thumbnails are small (320 px) and lazy.
 */
function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    if (n < 2) return;
    preloadImage(images[(i + 1) % n], 1280);
    preloadImage(images[(i - 1 + n) % n], 1280);
  }, [i, n, images]);

  if (!n) return <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-stone-200 text-sm text-stone-500">Photos coming soon</div>;
  const src = images[i];
  const blur = placeholder(src);
  return (
    <div>
      <div
        className="relative aspect-[16/10] overflow-hidden rounded-xl bg-stone-200"
        style={blur ? { backgroundImage: `url("${blur}")`, backgroundSize: 'cover' } : undefined}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); }}
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photos of ${alt}`}
        tabIndex={0}
      >
        {isOptimisable(src) ? (
          <picture key={src}>
            <source type="image/avif" srcSet={srcSet(src, 'avif', [640, 960, 1280, 1920, 2560])} sizes="(min-width: 1024px) 60vw, 100vw" />
            <source type="image/webp" srcSet={srcSet(src, 'webp', [640, 960, 1280, 1920, 2560])} sizes="(min-width: 1024px) 60vw, 100vw" />
            <img src={variant(src, 1280)} alt={`${alt}, photo ${i + 1} of ${n}`} className="h-full w-full object-cover fade-in"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              fetchPriority={i === 0 ? 'high' : 'auto'} decoding={i === 0 ? 'sync' : 'async'} width={1280} height={800} />
          </picture>
        ) : (
          <img key={src} src={src} alt={`${alt}, photo ${i + 1} of ${n}`} className="h-full w-full object-cover fade-in" />
        )}
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow hover:bg-white" aria-label="Previous photo">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-900 shadow hover:bg-white" aria-label="Next photo">
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-stone-950/70 px-2.5 py-1 font-mono text-xs text-white" aria-live="polite">{i + 1} / {n}</span>
          </>
        )}
      </div>
      {n > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Choose a photo">
          {images.map((img, idx) => (
            <li key={img} className="shrink-0">
              <button type="button" onClick={() => setI(idx)} aria-label={`Show photo ${idx + 1}`} aria-current={idx === i}
                className={`block h-14 w-20 overflow-hidden rounded-md border-2 sm:h-16 sm:w-24 ${idx === i ? 'border-stone-900' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                <img src={variant(img, 320)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" width={96} height={64}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
