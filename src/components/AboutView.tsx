import React from 'react';
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { useSite, useContact, displayPhone } from '../content';
import { usePageMeta } from '../lib/seo';
import { PageHeader, Spinner } from './ui';
import { Link } from '../router';

export default function AboutView() {
  const { settings, home } = useSite();
  const contact = useContact();
  const g = settings?.general;
  usePageMeta(g ? { title: g.aboutTitle || 'About Exotique Machines', description: (g.aboutBody || g.tagline).slice(0, 158), path: '/about' } : null);
  if (!g) return <Spinner />;

  return (
    <div id="about-view">
      <PageHeader eyebrow="About us" title={g.aboutTitle || 'About Exotique Machines'} crumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]} lead={g.tagline} />
      <div className="page-container grid gap-10 py-10 lg:grid-cols-12">
        <div className="space-y-4 text-base leading-relaxed text-stone-800 lg:col-span-7">
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
          <aside className="card h-fit space-y-4 p-6 text-sm text-stone-700 lg:col-span-5">
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
    </div>
  );
}
