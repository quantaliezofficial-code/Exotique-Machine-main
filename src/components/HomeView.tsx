import React, { useEffect, useMemo, useState } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';

const motionFeatures = () => import('./home/motionFeatures').then((m) => m.default);
import { ChevronDown, ChevronRight, Heart, TrendingUp, PenLine } from 'lucide-react';
import type { HeroSlide, HomeSection, Offer, Vehicle } from '../types';
import { Link, useRouter } from '../router';
import { useSite, formatPrice, vehicleName } from '../content';
import { useGarage } from '../garage';
import { brandPath, carPath, offerPath } from '../lib/routes';
import { usePageMeta } from '../lib/seo';
import { Spinner } from './ui';
import Picture from './ui/Picture';
import AnimatedBorder from './ui/AnimatedBorder';
import CardGlare from './ui/CardGlare';
import ArrowRevealButton from './ui/ArrowRevealButton';
import MaskReveal from './home/MaskReveal';
import Dialog from './ui/Dialog';
import Hero from './home/Hero';
import LogoCarousel, { iconForBrand, type BrandLogo } from './home/LogoCarousel';
import type { TestimonialCard } from './home/CircularTestimonials';
// Below-the-fold showpieces load in their own chunks so the hero paints first.
const CardStack = React.lazy(() => import('./home/CardStack').then((m) => ({ default: m.CardStack })));
const ZoomParallax = React.lazy(() => import('./home/ZoomParallax'));
const CircularTestimonials = React.lazy(() => import('./home/CircularTestimonials'));
const FlowingMenu = React.lazy(() => import('./home/FlowingMenu'));
const VideoStories = React.lazy(() => import('./video/VideoStories'));
const VelocityBand = React.lazy(() => import('./home/RbSections').then((m) => ({ default: m.VelocityBand })));
const WhyUs = React.lazy(() => import('./home/RbSections').then((m) => ({ default: m.WhyUs })));
import { CountUp, Reveal } from './home/motion';
import OfferCard, { offerBenefit } from './OfferCard';
import ReviewForm from './ReviewForm';

type Home = NonNullable<ReturnType<typeof useSite>['home']>;
type Settings = NonNullable<ReturnType<typeof useSite>['settings']>;
type Ctx = { home: Home; settings: Settings; vehicles: Vehicle[] };

/**
 * Home page. Every section, its order, its copy and its images come from
 * Admin → Website (hero slides, featured cars, reviews, offers, Settings → Home page).
 * Motion respects the visitor's reduced-motion setting throughout.
 */
export default function HomeView() {
  const { home, settings, vehicles } = useSite();
  usePageMeta(settings ? { title: settings.seo.homeTitle, description: settings.seo.homeDescription, path: '/' } : null);
  // Paint the first screen (hero + stats) on its own, then render the rest of the page
  // right after: the long page no longer holds back the hero's first paint.
  const [full, setFull] = useState(false);
  const ready = !!home && !!settings;
  useEffect(() => {
    if (!ready || full) return;
    let t = 0;
    const r = requestAnimationFrame(() => { t = window.setTimeout(() => setFull(true), 0); });
    return () => { cancelAnimationFrame(r); window.clearTimeout(t); };
  }, [ready, full]);
  if (!home || !settings) return <Spinner />;
  const ctx = { home, settings, vehicles };
  const enabled = (settings.homepage.sections || []).filter((s) => s.enabled);
  const firstScreen = Math.max(1, enabled.findIndex((s) => s.id !== 'hero' && s.id !== 'stats'));
  const sections = full ? enabled : enabled.slice(0, firstScreen);
  return (
    <LazyMotion features={motionFeatures} strict>
    <MotionConfig reducedMotion="user">
      <div id="home-view" className="overflow-x-clip bg-[#FAFAF9]">
        {sections.map((s) => (
          <React.Suspense key={s.id} fallback={<div className="min-h-[60vh]" aria-hidden />}>{renderSection(s, ctx)}</React.Suspense>
        ))}
      </div>
    </MotionConfig>
    </LazyMotion>
  );
}

function renderSection(s: HomeSection, ctx: Ctx) {
  switch (s.id) {
    case 'hero': return <HeroSection ctx={ctx} />;
    case 'stats': return <StatsBar ctx={ctx} />;
    case 'velocity': {
      const v = ctx.settings.homepage.velocity;
      const lines = [...(v?.lines || []).map((l) => l.trim()).filter(Boolean)];
      if (v?.brandLine && ctx.home.brands.length) lines.push(ctx.home.brands.map((b) => b.name).join(' · '));
      return <VelocityBand lines={lines} />;
    }
    case 'whyus': {
      const photos = ctx.home.featured.vehicles.map((x) => x.images?.[0]).filter((u): u is string => !!u && u.startsWith('/uploads/'));
      const cards = (ctx.settings.homepage.whyUs || []).filter((c) => c.title?.trim())
        .map((c, i) => ({ ...c, image: c.image || photos[i % Math.max(1, photos.length)] || '' }));
      return <WhyUs section={s} cards={cards} heading={<Heading section={s} fallbackTitle="Why buy from us" id="home-whyus" />} />;
    }
    case 'stories': {
      const clips = (ctx.settings.homepage.videoStories || []).filter((c) => c.src);
      if (!clips.length) return null;
      return (
        <section className="em-section bg-white" aria-labelledby="home-stories" id="customer-stories">
          <div className="page-container">
            <Heading section={s} fallbackTitle="Customer stories" id="home-stories" />
            <VideoStories clips={clips} />
          </div>
        </section>
      );
    }
    case 'brands': return <Brands section={s} ctx={ctx} />;
    case 'showcase': return <Showcase section={s} ctx={ctx} />;
    case 'services': return <Services section={s} ctx={ctx} />;
    case 'testimonials': return <Testimonials section={s} ctx={ctx} />;
    case 'lifestyle': return <Lifestyle section={s} ctx={ctx} />;
    case 'offers': return ctx.home.offers.length ? <Offers section={s} ctx={ctx} /> : null;
    case 'faq': return ctx.settings.faq.length ? <Faq section={s} items={ctx.settings.faq} /> : null;
    default: return null;
  }
}

/** Shared section heading in the original style: mono eyebrow, heavy title, light lead. */
function Heading({ section, fallbackTitle, center = true, id, action }: { section: HomeSection; fallbackTitle: string; center?: boolean; id: string; action?: React.ReactNode }) {
  return (
    <Reveal className={`mb-12 md:mb-16 lg:mb-20 ${center ? 'text-center' : 'flex flex-col gap-5 md:flex-row md:items-end md:justify-between'}`}>
      <div className={center ? 'mx-auto max-w-2xl' : 'max-w-2xl'}>
        {section.eyebrow && <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-600">{section.eyebrow}</p>}
        <h2 id={id} className="mt-3 text-3xl font-black uppercase tracking-tight text-stone-900 sm:text-4xl">
          <MaskReveal>{section.title || fallbackTitle}</MaskReveal>
          {section.titleAccent && (
            <><br /><MaskReveal delay={0.25}><span className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 bg-[length:200%_auto] bg-clip-text text-transparent motion-safe:animate-[em-shine_6s_linear_infinite]">{section.titleAccent}</span></MaskReveal></>
          )}
        </h2>
        {section.subtitle && <p className={`mt-5 text-sm font-light md:text-base leading-relaxed text-stone-600 ${center ? 'mx-auto max-w-xl' : ''}`}>{section.subtitle}</p>}
      </div>
      {action}
    </Reveal>
  );
}

// ------------------------------------------------------------------ hero
function HeroSection({ ctx }: { ctx: Ctx }) {
  const slides = useMemo<HeroSlide[]>(() => {
    if (ctx.home.hero.length) return ctx.home.hero;
    // No slides published: the newest premium cars with studio photos (as the old site did).
    return ctx.home.featured.vehicles
      .filter((v) => v.images?.[0]?.startsWith('/uploads/') && v.status !== 'sold')
      .slice(0, 6)
      .map((v, i) => ({
        id: `auto-${v.id}`, title: v.category === 'premium' ? 'The Statement of Executive Presence' : 'Command Every Journey',
        eyebrow: v.type || v.brand, description: v.description, watermark: (v.badge?.split('(')[0]?.trim() || v.model).toUpperCase(),
        ctaLabel: `Explore ${v.brand} ${v.model}`, ctaUrl: carPath(v.id), desktopImage: v.images[0],
        imageAlt: `${vehicleName(v)} ${v.badge || ''}`.trim(), sortOrder: i, status: 'published' as const,
      }));
  }, [ctx.home]);
  return <Hero slides={slides} heading={ctx.settings.homepage.heading} />;
}

// ------------------------------------------------------------------ stats
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
    <section aria-label="Showroom at a glance" className="border-y border-stone-200/80 bg-stone-100/80 px-4 py-10 md:py-14" id="stats-bar">
      <dl className="mx-auto grid max-w-7xl grid-cols-1 gap-6 text-center md:grid-cols-3 md:gap-8">
        {items.map((s, i) => (
          <div key={s.label} className={`flex flex-col items-center gap-1 ${i === 1 ? 'border-y border-stone-200 py-4 md:border-x md:border-y-0 md:py-0' : ''}`}>
            <dd className={`text-3xl font-extrabold tracking-tight ${i % 2 ? 'text-stone-900' : 'text-amber-700'}`}><CountUp value={s.value} /></dd>
            <dt className={`text-xs font-medium uppercase tracking-widest ${i % 2 ? 'text-amber-800' : 'text-stone-600'}`}>{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ------------------------------------------------------------------ brands
function Brands({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const { navigate } = useRouter();
  const brands = useMemo<BrandLogo[]>(
    () => ctx.home.brands.map((b) => ({ name: b.name, slug: b.slug, count: b.count, img: iconForBrand(b.name) })),
    [ctx.home.brands],
  );
  if (!brands.length) return null;
  return (
    <section className="page-container em-section" aria-labelledby="home-brands" id="brands-available-grid">
      <Heading section={section} fallbackTitle="Brands in stock" id="home-brands" />
      <LogoCarousel brands={brands} columns={5} onPick={(b) => navigate(brandPath(b.name))} />
    </section>
  );
}

// ------------------------------------------------------------------ featured (card stack)
function useCardSize() {
  const get = () => {
    const w = typeof window === 'undefined' ? 1280 : window.innerWidth;
    if (w < 640) { const cw = Math.min(340, w - 40); return { width: cw, height: Math.round(cw * 0.66) }; }
    if (w < 1024) return { width: 440, height: 290 };
    return { width: 540, height: 340 };
  };
  const [size, setSize] = useState(get);
  useEffect(() => {
    const on = () => setSize(get());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

function Showcase({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const { favorites, toggleFavorite } = useGarage();
  const { navigate } = useRouter();
  const size = useCardSize();
  const list = ctx.home.featured.vehicles.filter((v) => v.images?.length);
  if (!list.length) return null;
  const items = list.map((v) => ({ id: v.id, title: vehicleName(v), vehicle: v }));
  return (
    <section className="em-section border-t border-stone-200/70 bg-stone-50/60" aria-labelledby="home-showcase" id="featured-elite-fleet">
      <div className="page-container">
        <Heading section={section} fallbackTitle="Featured cars" center={false} id="home-showcase"
          action={
            <ArrowRevealButton to="/cars" tone="accent" className="border border-amber-600/30">
              View all showroom ({ctx.home.stats.count || list.length} cars)
            </ArrowRevealButton>
          } />
      </div>
      <div className="mt-6 flex w-full justify-center sm:mt-12">
        <CardStack
          items={items}
          autoAdvance
          intervalMs={3500}
          pauseOnHover
          showDots
          cardWidth={size.width}
          cardHeight={size.height}
          renderCard={(item, { active }) => {
            const v = item.vehicle as Vehicle;
            const fav = favorites.includes(v.id);
            const facts = [v.year, v.kmDriven ? `${Math.round(v.kmDriven / 1000)}k km` : null, v.fuel, v.transmission].filter(Boolean).join(' · ');
            return (
              <div onClick={() => active && navigate(carPath(v.id))}
                className={`group/card relative h-full w-full select-none overflow-hidden rounded-2xl bg-stone-900 text-white ${active ? 'cursor-pointer' : ''}`}>
                <Picture src={v.cardImage || v.images[0]} alt={vehicleName(v)} sizes={`${size.width}px`} widths={[640, 960, 1280]} loading="eager" draggable={false}
                  className="h-full w-full object-cover opacity-85 transition-transform duration-700 group-hover/card:scale-105" wrapperClassName="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/40 to-stone-950/10" />
                <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
                  <span className="rounded border border-amber-500/20 bg-amber-700/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md">
                    {v.showcaseLabel || v.lifestyle || v.type}
                  </span>
                  <button type="button" tabIndex={active ? 0 : -1} disabled={!active}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(v.id); }}
                    aria-pressed={fav} aria-label={fav ? `Remove ${vehicleName(v)} from my garage` : `Save ${vehicleName(v)}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition hover:bg-black/60">
                    <Heart className={`h-4 w-4 ${fav ? 'fill-current text-red-500' : 'text-stone-200'}`} />
                  </button>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-300">{v.brand}</p>
                  <h3 className="text-xl font-bold uppercase tracking-tight">{v.model}</h3>
                  {facts && <p className="mt-0.5 text-xs text-stone-300">{facts}</p>}
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400">{v.status === 'sold' ? 'Sold' : 'Price'}</span>
                      <p className="text-base font-black text-amber-400">{formatPrice(v.price)}</p>
                    </div>
                    <Link to={carPath(v.id)} tabIndex={active ? 0 : -1} onClick={(e) => e.stopPropagation()}
                      className={`inline-flex min-h-10 items-center rounded px-4 text-[11px] font-bold uppercase tracking-widest transition ${active ? 'bg-amber-700 text-white hover:bg-amber-800' : 'pointer-events-none bg-white/10 text-white/50'}`}>
                      View specs
                    </Link>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ services (zoom parallax)
function Services({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const sv = ctx.settings.homepage.services;
  if (!sv?.items?.length) return null;
  return (
    <section className="relative em-section-top bg-white pb-20 md:pb-28" aria-labelledby="home-services" id="services-provide">
      <div className="page-container">
        <Heading section={section} fallbackTitle="Our services" center={false} id="home-services" />
      </div>
      <ZoomParallax
        center={{ eyebrow: sv.centerEyebrow, title: sv.centerTitle, text: sv.centerText, ctaLabel: sv.ctaLabel, ctaUrl: sv.ctaUrl }}
        items={sv.items}
      />
    </section>
  );
}

// ------------------------------------------------------------------ testimonials
function Testimonials({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const [writing, setWriting] = useState(false);
  const byId = useMemo(() => new Map(ctx.vehicles.map((v) => [v.id, v])), [ctx.vehicles]);
  const cards = useMemo<TestimonialCard[]>(() => ctx.home.reviews.map((r) => {
    const car = r.vehicleId ? byId.get(r.vehicleId) : undefined;
    return {
      id: r.id, quote: r.body, name: r.customerName,
      designation: r.customerTitle || (car ? `${vehicleName(car)} owner` : null),
      image: r.photo || car?.images?.[0] || null, rating: r.rating,
      sourceUrl: r.sourceUrl, sourceLabel: r.source === 'google' ? 'Google' : r.source,
    };
  }), [ctx.home.reviews, byId]);
  return (
    <section className="em-section border-y border-stone-200/80 bg-stone-50/60" aria-labelledby="home-reviews" id="testimonials">
      <div className="page-container">
        <Heading section={section} fallbackTitle="What our customers say" id="home-reviews" />
        {cards.length > 0 ? (
          <Reveal className="flex justify-center"><CircularTestimonials items={cards} /></Reveal>
        ) : (
          <p className="text-center text-sm text-stone-600">Bought a car from us? Be the first to share your experience.</p>
        )}
        <div className="mt-14 flex justify-center">
          <button type="button" className="btn btn-secondary" onClick={() => setWriting(true)}><PenLine className="h-4 w-4" aria-hidden />Write a review</button>
        </div>
      </div>
      {writing && <Dialog title="Write a review" onClose={() => setWriting(false)} wide><ReviewForm onDone={() => setWriting(false)} /></Dialog>}
    </section>
  );
}

// ------------------------------------------------------------------ lifestyle (hover rows)
function Lifestyle({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const rows = (ctx.settings.homepage.collections || []).filter((c) => c.label && c.image);
  if (!rows.length) return null;
  return (
    <section className="em-section bg-white" aria-labelledby="home-lifestyle" id="discover-lifestyle">
      <div className="page-container">
        <Reveal className="mb-12 text-center md:mb-16 lg:mb-20">
          {section.eyebrow && (
            <p className="flex items-center justify-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-amber-800">
              <TrendingUp className="h-4 w-4" aria-hidden />{section.eyebrow}
            </p>
          )}
          <h2 id="home-lifestyle" className="mt-3 text-3xl font-black uppercase tracking-tight text-stone-900 sm:text-4xl md:text-5xl">{section.title || 'Discover by lifestyle'}</h2>
          {section.subtitle && <p className="mx-auto mt-5 max-w-2xl text-sm font-light md:text-base leading-relaxed text-stone-600">{section.subtitle}</p>}
        </Reveal>
      </div>
      <FlowingMenu items={rows} />
    </section>
  );
}

// ------------------------------------------------------------------ offers (privileges banner)
function useCountdown(endsAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${d} day${d === 1 ? '' : 's'}, ${String(h).padStart(2, '0')} hours`;
}

function Offers({ section, ctx }: { section: HomeSection; ctx: Ctx }) {
  const [lead, ...rest] = ctx.home.offers as Offer[];
  const left = useCountdown(lead?.endsAt);
  const benefit = lead ? offerBenefit(lead) : null;
  return (
    <section className="page-container em-section" aria-labelledby="home-offers" id="festive-offer-banner">
      <Reveal>
      <CardGlare radius="1rem">
      <AnimatedBorder width={1.5} duration={8} className="shadow-md" contentClassName="relative flex flex-col items-center justify-between gap-8 overflow-hidden bg-gradient-to-r from-stone-50 via-stone-100 to-stone-50 p-6 text-center sm:p-12 md:flex-row md:text-left">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" aria-hidden />
        {lead.image && (
          <div className="relative hidden aspect-[4/3] w-56 shrink-0 overflow-hidden rounded-xl lg:block">
            <Picture src={lead.image} alt="" sizes="224px" widths={[320, 640]} className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
          </div>
        )}
        <div className="relative max-w-xl space-y-4">
          <span className="inline-block rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-stone-700">
            {section.eyebrow || 'Showroom offer'}{benefit ? ` · ${benefit}` : ''}
          </span>
          <h2 id="home-offers" className="text-3xl font-extrabold leading-tight text-stone-900 sm:text-4xl">{lead.title}</h2>
          {(lead.summary || section.subtitle) && <p className="text-sm font-light leading-relaxed text-stone-700">{lead.summary || section.subtitle}</p>}
        </div>
        <div className="relative flex shrink-0 flex-col items-center gap-3 sm:items-start">
          <ArrowRevealButton to={offerPath(lead.slug)} tone="dark">{lead.ctaLabel || 'Explore privileges'}</ArrowRevealButton>
          {left && <span className="font-mono text-xs text-stone-600">Offer ends in: {left}</span>}
          <Link to="/offers" className="text-xs font-semibold text-stone-700 underline underline-offset-2">All offers</Link>
        </div>
      </AnimatedBorder>
      </CardGlare>
      </Reveal>
      {rest.length > 0 && (
        <ul className="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {rest.map((o, i) => <Reveal as="li" key={o.id} delay={i * 0.08}><OfferCard offer={o} /></Reveal>)}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ FAQ
function Faq({ section, items }: { section: HomeSection; items: { question: string; answer: string }[] }) {
  return (
    <section className="em-section border-t border-stone-200 bg-stone-50/60" aria-labelledby="home-faq">
      <div className="page-container max-w-3xl">
        <h2 id="home-faq" className="section-title">{section.title || 'Frequently asked questions'}</h2>
        <div className="mt-10 divide-y divide-stone-200 border-y border-stone-200 md:mt-12">
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

