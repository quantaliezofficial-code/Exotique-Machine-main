import React, { useMemo, useState } from 'react';
import { ArrowRight, Landmark, CalendarCheck, RefreshCcw, Wrench, Star, Quote, ChevronDown } from 'lucide-react';
import type { HeroSlide, HomeSection, Vehicle, Review } from '../types';
import { Link } from '../router';
import { useSite, vehicleName } from '../content';
import { useGarage } from '../garage';
import { brandPath, carPath } from '../lib/routes';
import { usePageMeta } from '../lib/seo';
import { SectionHeading, Spinner } from './ui';
import VehicleCard from './ui/VehicleCard';
import Picture from './ui/Picture';
import Hero from './home/Hero';
import OfferCard from './OfferCard';
import ReviewForm from './ReviewForm';

/** Home page. Every section, its order and its copy comes from Admin → Website. */
export default function HomeView() {
  const { home, settings, vehicles } = useSite();
  usePageMeta(settings ? { title: settings.seo.homeTitle, description: settings.seo.homeDescription, path: '/' } : null);
  if (!home || !settings) return <Spinner />;

  const sections = (settings.homepage.sections || []).filter((s) => s.enabled);
  return (
    <div id="home-view">
      {sections.map((s) => (
        <React.Fragment key={s.id}>
          {renderSection(s, { home, settings, vehicles })}
        </React.Fragment>
      ))}
    </div>
  );
}

type Ctx = { home: NonNullable<ReturnType<typeof useSite>['home']>; settings: NonNullable<ReturnType<typeof useSite>['settings']>; vehicles: Vehicle[] };

function renderSection(s: HomeSection, ctx: Ctx) {
  switch (s.id) {
    case 'hero': return <HeroSection ctx={ctx} />;
    case 'stats': return <StatsBar ctx={ctx} />;
    case 'brands': return <Brands ctx={ctx} />;
    case 'showcase': return <Showcase section={s} ctx={ctx} />;
    case 'offers': return ctx.home.offers.length ? <Offers section={s} ctx={ctx} /> : null;
    case 'services': return <Services />;
    case 'testimonials': return <Testimonials section={s} reviews={ctx.home.reviews} />;
    case 'lifestyle': return <Lifestyle vehicles={ctx.vehicles} />;
    case 'faq': return ctx.settings.faq.length ? <Faq section={s} items={ctx.settings.faq} /> : null;
    default: return null;
  }
}

function HeroSection({ ctx }: { ctx: Ctx }) {
  const slides = useMemo<HeroSlide[]>(() => {
    if (ctx.home.hero.length) return ctx.home.hero;
    // No slides published yet: show real cars from the showroom (never placeholder art).
    return ctx.home.featured.vehicles
      .filter((v) => v.images?.[0]?.startsWith('/uploads/'))
      .slice(0, 4)
      .map((v, i) => ({
        id: `auto-${v.id}`, title: vehicleName(v), eyebrow: v.badge, description: null,
        ctaLabel: 'View this car', ctaUrl: carPath(v.id), desktopImage: v.images[0], imageAlt: `${vehicleName(v)} ${v.badge || ''}`.trim(),
        sortOrder: i, status: 'published' as const,
      }));
  }, [ctx.home]);
  return <Hero slides={slides} heading={ctx.settings.homepage.heading} />;
}

function StatsBar({ ctx }: { ctx: Ctx }) {
  const { stats } = ctx.home;
  const items = (ctx.settings.homepage.stats || [])
    .map((s) => {
      let value = s.value;
      if (!value && s.auto === 'count') value = stats.count ? String(stats.count) : '';
      if (!value && s.auto === 'price_range') value = stats.priceRange;
      if (!value && s.auto === 'brands') value = stats.brands ? String(stats.brands) : '';
      return { label: s.label, value };
    })
    .filter((s) => s.value);
  if (!items.length) return null;
  return (
    <section aria-label="Showroom at a glance" className="border-b border-stone-200 bg-white">
      <dl className={`page-container grid divide-stone-200 py-6 text-center sm:divide-x ${items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-y-4`}>
        {items.map((s) => (
          <div key={s.label} className="px-4">
            <dd className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">{s.value}</dd>
            <dt className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-600">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Brands({ ctx }: { ctx: Ctx }) {
  if (!ctx.home.brands.length) return null;
  return (
    <section className="page-container py-14 md:py-20" aria-labelledby="home-brands">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Brands in stock</p>
          <h2 id="home-brands" className="section-title mt-1">Shop by brand</h2>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {ctx.home.brands.map((b) => (
          <li key={b.slug}>
            <Link to={brandPath(b.name)} className="chip min-h-11 px-4 text-sm">
              {b.name} <span className="font-mono text-xs text-stone-500">{b.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Showcase({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const { favorites, toggleFavorite } = useGarage();
  const list = ctx.home.featured.vehicles;
  if (!list.length) return null;
  return (
    <section className="page-container py-14 md:py-20" aria-labelledby="home-showcase">
      <SectionHeading
        id="home-showcase"
        eyebrow="Handpicked"
        title={section.title || 'Featured cars'}
        lead={section.subtitle}
        action={
          <Link to="/cars" className="btn btn-secondary shrink-0">
            View all {ctx.home.stats.count || ''} cars <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      {/* Scroll-snap row on phones, grid from tablet up: no JS carousel needed. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {list.map((v) => (
          <li key={v.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
            <VehicleCard vehicle={v} isFavorite={favorites.includes(v.id)} onToggleFavorite={toggleFavorite} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Offers({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  return (
    <section className="border-y border-stone-200 bg-white py-14 md:py-20" aria-labelledby="home-offers">
      <div className="page-container">
        <SectionHeading
          id="home-offers"
          eyebrow="Offers"
          title={section.title || 'Current offers'}
          lead={section.subtitle}
          action={<Link to="/offers" className="btn btn-secondary shrink-0">All offers <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
        />
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ctx.home.offers.map((o) => <li key={o.id}><OfferCard offer={o} /></li>)}
        </ul>
      </div>
    </section>
  );
}

const SERVICES = [
  { to: '/finance', icon: Landmark, title: 'Car finance', body: 'EMI calculator and loan options from partner banks.' },
  { to: '/test-drive', icon: CalendarCheck, title: 'Test drive', body: 'Pick a car and a time slot that suits you.' },
  { to: '/trade-in', icon: RefreshCcw, title: 'Trade-in', body: 'An indicative value for your current car in a minute.' },
  { to: '/service', icon: Wrench, title: 'Service', body: 'Book maintenance, diagnostics or detailing.' },
];

function Services() {
  return (
    <section className="page-container py-14 md:py-20" aria-labelledby="home-services">
      <SectionHeading id="home-services" eyebrow="How we help" title="Buy, finance, trade in and service" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map(({ to, icon: Icon, title, body }) => (
          <li key={to}>
            <Link to={to} className="card group flex h-full flex-col p-5 transition-colors hover:border-stone-900">
              <Icon className="h-6 w-6 text-[var(--color-accent)]" aria-hidden />
              <span className="mt-4 text-base font-bold text-stone-900">{title}</span>
              <span className="mt-1 text-sm text-stone-600">{body}</span>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-stone-900">
                Start <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Testimonials({ section, reviews }: { section: HomeSection; reviews: Review[] }) {
  const [writing, setWriting] = useState(false);
  return (
    <section className="border-y border-stone-200 bg-white py-14 md:py-20" aria-labelledby="home-reviews">
      <div className="page-container">
        <SectionHeading
          id="home-reviews"
          eyebrow="Reviews"
          title={section.title || 'What our customers say'}
          lead={reviews.length ? section.subtitle : 'Bought a car from us? We would love to hear about it.'}
          action={!writing && <button type="button" className="btn btn-secondary shrink-0" onClick={() => setWriting(true)}>Write a review</button>}
        />
        {writing && <div className="card mb-8 p-5"><ReviewForm onDone={() => setWriting(false)} /></div>}
        {reviews.length > 0 && (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="card flex flex-col p-5">
                <Quote className="h-5 w-5 text-stone-300" aria-hidden />
                {r.rating ? (
                  <p className="mt-2 flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < (r.rating || 0) ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} aria-hidden />
                    ))}
                  </p>
                ) : null}
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-stone-700">{r.body}</blockquote>
                <footer className="mt-4 flex items-center gap-3">
                  {r.photo && <Picture src={r.photo} alt="" sizes="40px" className="h-10 w-10 rounded-full object-cover" wrapperClassName="h-10 w-10 rounded-full" />}
                  <div>
                    <p className="text-sm font-bold text-stone-900">{r.customerName}</p>
                    {r.customerTitle && <p className="text-xs text-stone-600">{r.customerTitle}</p>}
                  </div>
                  {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener nofollow" className="ml-auto text-xs text-stone-500 underline">{r.source}</a>}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Lifestyle({ vehicles }: { vehicles: Vehicle[] }) {
  const groups = useMemo(() => {
    const by = new Map<string, { type: string; count: number; image?: string; price: number }>();
    for (const v of vehicles) {
      if (v.status === 'sold' || !v.lifestyle) continue;
      const g = by.get(v.lifestyle) || { type: v.lifestyle, count: 0, price: -1 };
      g.count += 1;
      const img = v.images?.find((i) => i.startsWith('/uploads/'));
      if (img && (v.price || 0) > g.price) { g.image = img; g.price = v.price || 0; }
      by.set(v.lifestyle, g);
    }
    return [...by.values()].filter((g) => g.image).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [vehicles]);
  if (groups.length < 2) return null;
  return (
    <section className="page-container py-14 md:py-20" aria-labelledby="home-types">
      <SectionHeading id="home-types" eyebrow="Collections" title="Browse by body type" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {groups.map((g) => (
          <li key={g.type}>
            <Link to={`/cars?type=${encodeURIComponent(g.type)}`} className="group relative block aspect-[3/4] overflow-hidden rounded-xl bg-stone-900 text-white">
              <Picture src={g.image} alt="" sizes="(min-width: 1024px) 25vw, 50vw"
                className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105" wrapperClassName="absolute inset-0" />
              <span className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <span className="block text-lg font-black sm:text-xl">{g.type}</span>
                <span className="text-sm text-stone-200">{g.count} car{g.count > 1 ? 's' : ''} in stock</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq({ section, items }: { section: HomeSection; items: { question: string; answer: string }[] }) {
  return (
    <section className="border-t border-stone-200 bg-white py-14 md:py-20" aria-labelledby="home-faq">
      <div className="page-container max-w-3xl">
        <h2 id="home-faq" className="section-title">{section.title || 'Frequently asked questions'}</h2>
        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {items.map((f) => (
            <details key={f.question} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-base font-semibold text-stone-900">
                {f.question}
                <ChevronDown className="h-5 w-5 shrink-0 text-stone-500 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-stone-700">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
