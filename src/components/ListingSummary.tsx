import React from 'react';
import { Link } from '../router';
import type { ListingInfo } from '../types';

function niceDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Answer-first block for listing pages (/cars, brand pages, /used-cars/*): one paragraph
 * that answers "what do you have and at what price", key facts, and links to related
 * listings. Text comes from the API (backend/seo/listing.py) so visitors, Google and
 * AI crawlers that read the server-rendered page all see the same facts.
 */
export default function ListingSummary({ info, current }: { info: ListingInfo; current?: string }) {
  const f = info.facts;
  const facts: [string, React.ReactNode][] = [
    ['In stock', f.count],
    ['Price range', f.priceRange],
    ['Model years', f.yearRange],
    ['Updated', niceDate(f.updatedAt)],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '') as [string, React.ReactNode][];
  const links = [
    ...info.collections.filter((c) => c.path !== current).map((c) => ({ to: c.path, label: c.title.replace(/ in [A-Z][a-z]+$/, ''), n: c.count })),
  ];
  return (
    <section aria-label="Summary" className="border-b border-stone-200 bg-stone-50">
      <div className="page-container grid grid-cols-1 gap-5 py-6 md:py-8">
        <p className="max-w-3xl text-[15px] leading-relaxed text-stone-700">{info.summary}</p>
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-500">{k}</dt>
                <dd className="text-sm font-bold text-stone-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {links.length > 0 && (
          <nav aria-label="Browse used cars">
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-stone-500">Browse</p>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
              {links.map((l) => (
                <li key={l.to} className="shrink-0">
                  <Link to={l.to} className="chip whitespace-nowrap">{l.label} <span className="text-stone-500">({l.n})</span></Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
