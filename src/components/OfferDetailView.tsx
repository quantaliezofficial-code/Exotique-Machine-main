import React, { useEffect, useState } from 'react';
import type { Offer, Vehicle } from '../types';
import { api, ApiError } from '../services/api';
import { initialOffer, useContact, whatsappLink } from '../content';
import { usePageMeta } from '../lib/seo';
import { Breadcrumbs, Spinner } from './ui';
import Picture from './ui/Picture';
import VehicleCard from './ui/VehicleCard';
import NotFoundView from './NotFoundView';
import { offerBenefit, offerValidity } from './OfferCard';

export default function OfferDetailView({ slug }: { slug: string }) {
  const [data, setData] = useState<{ offer: Offer; vehicle: Vehicle | null } | null | undefined>(() => initialOffer(slug) ?? undefined);
  const contact = useContact();

  useEffect(() => {
    if (initialOffer(slug)) return;
    let off = false;
    api.getOffer(slug).then((r) => !off && setData(r)).catch((e) => !off && setData(e instanceof ApiError && e.status === 404 ? null : null));
    return () => { off = true; };
  }, [slug]);

  const o = data?.offer;
  usePageMeta(o ? { title: o.title, description: o.summary || o.description || o.title, path: `/offers/${slug}`, noindex: o.effectiveStatus === 'expired' } : null);

  if (data === undefined) return <Spinner label="Loading offer" />;
  if (!data || !o) return <NotFoundView message="This offer is not available." />;
  const ended = o.effectiveStatus === 'expired';
  const benefit = offerBenefit(o);
  const enquire = () => window.dispatchEvent(new CustomEvent('em:enquire', { detail: { car: `Offer: ${o.title}` } }));

  return (
    <article className="page-container max-w-4xl py-8" id="offer-detail-view">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Offers', to: '/offers' }, { label: o.title }]} />
      {ended && <p className="form-alert form-alert-error mb-4" role="status">This offer has ended.</p>}
      {benefit && <span className="badge bg-amber-100 text-amber-900">{benefit}</span>}
      <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">{o.title}</h1>
      {o.summary && <p className="mt-3 text-lg text-stone-700">{o.summary}</p>}
      <p className="mt-2 text-sm font-semibold text-stone-600">{offerValidity(o)}</p>
      {o.image && (
        <div className="mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-stone-200">
          <Picture src={o.image} alt="" priority sizes="(min-width: 896px) 896px, 100vw" className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
        </div>
      )}
      {o.description && <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-stone-800">{o.description}</div>}
      {!ended && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={enquire} className="btn btn-primary">{o.ctaLabel || 'Enquire about this offer'}</button>
          {contact?.whatsapp && (
            <a href={whatsappLink(contact.whatsapp, `Hi, I'd like to know more about "${o.title}".`)} target="_blank" rel="noopener" className="btn btn-secondary">Ask on WhatsApp</a>
          )}
        </div>
      )}
      {data.vehicle && (
        <section className="mt-10" aria-labelledby="offer-car">
          <h2 id="offer-car" className="text-xl font-bold text-stone-900">Applies to</h2>
          <div className="mt-4 max-w-sm"><VehicleCard vehicle={data.vehicle} /></div>
        </section>
      )}
      {o.terms && (
        <section className="mt-10 border-t border-stone-200 pt-6" aria-labelledby="offer-terms">
          <h2 id="offer-terms" className="text-base font-bold text-stone-900">Terms</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{o.terms}</p>
        </section>
      )}
    </article>
  );
}
