import React from 'react';
import { CalendarClock, ArrowRight } from 'lucide-react';
import type { Offer } from '../types';
import { Link } from '../router';
import { offerPath } from '../lib/routes';
import Picture from './ui/Picture';

export function offerBenefit(o: Pick<Offer, 'discountType' | 'discountValue'>): string | null {
  if (o.discountType === 'fixed' && o.discountValue) return `Benefit up to ₹${Math.round(o.discountValue).toLocaleString('en-IN')}`;
  if (o.discountType === 'percentage' && o.discountValue) return `${o.discountValue}% off`;
  return null;
}

export function offerValidity(o: Pick<Offer, 'endsAt' | 'effectiveStatus'>): string {
  const end = new Date(o.endsAt);
  const date = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (o.effectiveStatus === 'expired') return `Ended ${date}`;
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  return days <= 7 && days >= 0 ? `Ends in ${days} day${days === 1 ? '' : 's'} (${date})` : `Valid until ${date}`;
}

export default function OfferCard({ offer }: { offer: Offer }) {
  const benefit = offerBenefit(offer);
  return (
    <article className="card group relative flex flex-col overflow-hidden">
      {offer.image && (
        <div className="aspect-[16/9] bg-stone-200">
          <Picture src={offer.image} alt="" sizes="(min-width: 1024px) 33vw, 100vw" className="h-full w-full object-cover" wrapperClassName="h-full w-full" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {benefit && <span className="badge self-start bg-amber-100 text-amber-900">{benefit}</span>}
        <h3 className="mt-2 text-lg font-bold text-stone-900">
          <Link to={offerPath(offer.slug)} className="after:absolute after:inset-0">{offer.title}</Link>
        </h3>
        {offer.summary && <p className="mt-1.5 text-sm text-stone-600">{offer.summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs text-stone-600">
          <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden />{offerValidity(offer)}</span>
          <ArrowRight className="h-4 w-4 text-stone-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </article>
  );
}
