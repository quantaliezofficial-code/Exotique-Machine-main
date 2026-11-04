import React, { useEffect, useState } from 'react';
import type { Offer } from '../types';
import { api } from '../services/api';
import { useSite } from '../content';
import { usePageMeta } from '../lib/seo';
import { PageHeader, EmptyState, Spinner } from './ui';
import { Link } from '../router';
import OfferCard from './OfferCard';

export default function OffersView() {
  const { home } = useSite();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [failed, setFailed] = useState(false);
  usePageMeta({ title: 'Current Offers on Pre-Owned Luxury Cars', description: 'Live offers at the Exotique Machines showroom in Lucknow.', path: '/offers' });

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    api.getOffers(preview).then((r) => setOffers(r.offers)).catch(() => { setFailed(true); setOffers(home?.offers || []); });
  }, [home]);

  return (
    <div id="offers-view">
      <PageHeader eyebrow="Offers" title="Current offers" crumbs={[{ label: 'Home', to: '/' }, { label: 'Offers' }]}
        lead="Promotions running at the showroom right now. Every offer shows its validity dates and terms." />
      <div className="page-container py-10">
        {offers === null ? <Spinner label="Loading offers" /> : offers.length === 0 ? (
          <EmptyState
            title={failed ? 'Offers could not be loaded' : 'No live offers right now'}
            body="New offers are added regularly. Ask us about current finance and exchange options."
            action={<Link to="/cars" className="btn btn-primary">Browse cars</Link>}
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => <li key={o.id}><OfferCard offer={o} /></li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
