import React from 'react';
import { Mail, Phone, MapPin, Clock, Instagram, Youtube, Facebook, Linkedin, Lock } from 'lucide-react';
import { Link } from '../router';
import { useContact, useSite, displayPhone } from '../content';
import { brandPath } from '../lib/routes';

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
};
const SOCIAL_LABELS: Record<string, string> = { instagram: 'Instagram', youtube: 'YouTube', facebook: 'Facebook', linkedin: 'LinkedIn', x: 'X' };

export default function Footer() {
  const { settings, home } = useSite();
  const contact = useContact();
  const g = settings?.general;
  const social = Object.entries(settings?.social || {}).filter(([, url]) => url);
  const brands = (home?.brands || []).slice(0, 8);

  return (
    <footer className="border-t border-stone-200 bg-stone-50 pt-14 pb-24 text-stone-600 lg:pb-8" id="app-footer">
      <div className="page-container">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5" aria-label="Exotique Machines home">
              <picture>
                <source srcSet="/logo-80.webp 1x, /logo-160.webp 2x" type="image/webp" />
                <img src="/logo-80.png" alt="" width="36" height="36" loading="lazy" className="h-9 w-9 rounded-md" />
              </picture>
              <span className="text-base font-bold uppercase tracking-[0.14em] text-stone-900">{g?.siteName || 'Exotique Machines'}</span>
            </Link>
            {g?.footerBlurb && <p className="text-sm leading-relaxed">{g.footerBlurb}</p>}
            {g?.legalName && <p className="text-xs text-stone-500">A unit of {g.legalName}</p>}
            {social.length > 0 && (
              <ul className="flex gap-2 pt-1">
                {social.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Exotique Machines on ${SOCIAL_LABELS[key] || key}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 hover:border-stone-900 hover:text-stone-900"
                    >
                      {SOCIAL_ICONS[key] || <span className="text-xs font-bold">{key.toUpperCase()}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="eyebrow mb-4 text-stone-900">Showroom</h2>
            <ul className="space-y-2.5 text-sm">
              {[
                ['All cars for sale', '/cars'], ['Current offers', '/offers'], ['Car finance & EMI', '/finance'],
                ['Book a test drive', '/test-drive'], ['Trade in your car', '/trade-in'], ['Service booking', '/service'],
                ['About us', '/about'],
              ].map(([label, to]) => (
                <li key={to}><Link to={to} className="hover:text-stone-900 hover:underline underline-offset-2">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow mb-4 text-stone-900">Brands in stock</h2>
            {brands.length > 0 ? (
              <ul className="space-y-2.5 text-sm">
                {brands.map((b) => (
                  <li key={b.slug}>
                    <Link to={brandPath(b.name)} className="hover:text-stone-900 hover:underline underline-offset-2">
                      Used {b.name} cars <span className="text-stone-500">({b.count})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Link to="/cars" className="text-sm hover:text-stone-900">Browse all cars</Link>
            )}
          </div>

          <div>
            <h2 className="eyebrow mb-4 text-stone-900">Visit or call</h2>
            {contact && (
              <ul className="space-y-3 text-sm">
                {contact.address && (
                  <li className="flex gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <address className="not-italic">
                      {contact.address}
                      {contact.mapUrl && (
                        <a href={contact.mapUrl} target="_blank" rel="noopener" className="mt-1 block font-semibold text-stone-900 underline underline-offset-2">Get directions</a>
                      )}
                    </address>
                  </li>
                )}
                {contact.phones.map((p) => (
                  <li key={p.number} className="flex gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <a href={`tel:${p.number}`} className="hover:text-stone-900">{p.label ? `${p.label}: ` : ''}{displayPhone(p.number)}</a>
                  </li>
                ))}
                {contact.email && (
                  <li className="flex gap-2.5">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <a href={`mailto:${contact.email}`} className="break-words [overflow-wrap:anywhere] hover:text-stone-900">{contact.email}</a>
                  </li>
                )}
                {contact.hours && (
                  <li className="flex gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                    <span>{contact.hours}</span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-6 text-xs text-stone-500 md:flex-row">
          <p>© {new Date().getFullYear()} {g?.legalName || 'Exotique Machines'}. All rights reserved.</p>

          {/* Developer credit */}
          <a
            href="https://quantaliez.com"
            target="_blank"
            rel="noopener"
            id="footer-quantaliez-credit"
            title="Quantaliez – Intelligence Amplified"
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 transition-all hover:border-[#0B3BA6] hover:shadow-sm"
          >
            <span className="text-stone-500 group-hover:text-stone-700">Designed &amp; developed by</span>
            <picture>
              <source srcSet="/quantaliez-mark-96.webp" type="image/webp" />
              <img src="/quantaliez-mark-48.png" srcSet="/quantaliez-mark-96.png 2x" alt="" width="20" height="20" loading="lazy" decoding="async" className="h-5 w-5" />
            </picture>
            <span className="font-bold uppercase tracking-[0.18em] text-stone-900 group-hover:text-[#0B3BA6]">Quantaliez</span>
          </a>

          <Link to="/admin" rel="nofollow" className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-semibold text-stone-500 hover:text-stone-900">
            <Lock className="h-3 w-3" aria-hidden /> Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
