import React from 'react';
import { MapPin, Phone, Mail, Clock, CheckCircle2, Play } from 'lucide-react';
import { useSite, useContact, displayPhone } from '../content';
import { usePageMeta } from '../lib/seo';
import { PageHeader, Spinner } from './ui';
import { Link } from '../router';
import { variant } from '../lib/images';
import VideoStories from './video/VideoStories';

export default function AboutView() {
  const { settings, home } = useSite();
  const contact = useContact();
  const g = settings?.general;
  usePageMeta(g ? { title: g.aboutTitle || 'About Exotique Machines', description: (g.aboutBody || g.tagline).slice(0, 158), path: '/about' } : null);
  if (!g) return <Spinner />;
  const [intro = null, ...moreVideos] = (g.aboutVideos || []).filter((c) => c.src);
  const stories = g.aboutStories === false ? [] : (settings?.homepage.videoStories || []).filter((c) => c.src);

  return (
    <div id="about-view">
      <PageHeader eyebrow="About us" title={g.aboutTitle || 'About Exotique Machines'} crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]} lead={g.tagline} />
      <div className="page-container grid gap-10 py-10 lg:grid-cols-12">
        {intro && (
          <figure className="mx-auto w-full max-w-[340px] lg:col-span-4 lg:row-span-2 lg:mx-0 lg:max-w-none">
            <div className="relative overflow-hidden rounded-[2rem] border-[6px] border-stone-900 bg-stone-900 shadow-2xl shadow-stone-900/20">
              <IntroPlayer src={intro.src} poster={intro.poster ? variant(intro.poster, 960) : undefined}
                label={intro.title || `${g.siteName || 'Exotique Machines'} showroom introduction`} />
            </div>
            {(intro.title || intro.description) && (
              <figcaption className="mt-3 text-sm text-stone-600">
                {intro.title && <span className="block font-semibold text-stone-900">{intro.title}</span>}
                {intro.description}
              </figcaption>
            )}
          </figure>
        )}
        <div className={`space-y-4 text-base leading-relaxed text-stone-800 ${intro ? 'lg:col-span-8' : 'lg:col-span-7'}`}>
          {(g.aboutBody || '').split(/\n\n+/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          {g.assurances?.length > 0 && (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {g.assurances.map((a) => (
                <li key={a} className="card flex gap-3 p-4 text-sm font-semibold text-stone-900">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />{a}
                </li>
              ))}
            </ul>
          )}
          {home?.stats.count ? (
            <p className="pt-4">
              Right now there are <strong>{home.stats.count} cars</strong> from <strong>{home.stats.brands} brands</strong> in the showroom.{' '}
              <Link to="/cars" className="font-semibold underline underline-offset-2">See them all</Link>.
            </p>
          ) : null}
        </div>
        {contact && (
          <aside className={`card h-fit space-y-4 p-6 text-sm text-stone-700 ${intro ? 'lg:col-span-8' : 'lg:col-span-5'}`}>
            <h2 className="text-lg font-bold text-stone-900">Visit the showroom</h2>
            <p className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden /><span>{contact.address}</span></p>
            {contact.hours && <p className="flex gap-2.5"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />{contact.hours}</p>}
            {contact.phones.map((p) => (
              <p key={p.number} className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <a href={`tel:${p.number}`} className="hover:underline">{p.label}: {displayPhone(p.number)}</a></p>
            ))}
            {contact.email && <p className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
              <a href={`mailto:${contact.email}`} className="break-all hover:underline">{contact.email}</a></p>}
            {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener" className="btn btn-primary w-full">Get directions</a>}
            {g.legalName && <p className="border-t border-stone-200 pt-4 text-xs text-stone-500">Exotique Machines is a unit of {g.legalName}.</p>}
          </aside>
        )}
      </div>
      {moreVideos.length > 0 && (
        <section className="border-t border-stone-200 py-14 md:py-20" aria-labelledby="about-more-videos">
          <div className="page-container">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-600">Inside the showroom</p>
            <h2 id="about-more-videos" className="mt-2 mb-8 text-2xl font-black uppercase tracking-tight text-stone-900 sm:text-3xl">More videos</h2>
            <VideoStories clips={moreVideos} fallback="Showroom video" />
          </div>
        </section>
      )}
      {stories.length > 0 && (
        <section className="border-t border-stone-200 bg-stone-50 py-14 md:py-20" aria-labelledby="about-stories">
          <div className="page-container">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-600">In their own words</p>
            <h2 id="about-stories" className="mt-2 text-2xl font-black uppercase tracking-tight text-stone-900 sm:text-3xl">Customer stories</h2>
            <p className="mt-2 mb-8 max-w-xl text-sm text-stone-600">Real buyers at our Lucknow showroom. Tap a story to watch with sound.</p>
            <VideoStories clips={stories} />
          </div>
        </section>
      )}
    </div>
  );
}

/** Poster with a big play button; the native player (with sound) takes over on tap. */
function IntroPlayer({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [started, setStarted] = React.useState(false);
  return (
    <div className="relative">
      <video ref={ref} src={src} poster={poster} controls={started} playsInline preload="none"
        className="aspect-[9/16] w-full bg-black object-cover" aria-label={label} />
      {!started && (
        <button type="button" onClick={() => { setStarted(true); ref.current?.play().catch(() => {}); }}
          className="group absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-8"
          aria-label={`Play video: ${label}`}>
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-900 shadow-xl transition-transform group-hover:scale-105">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white"><Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden /></span>
            Watch our story
          </span>
        </button>
      )}
    </div>
  );
}
