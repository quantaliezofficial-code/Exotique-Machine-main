import React, { useEffect, useState } from 'react';
import { Menu, X, Heart, Lock, Search } from 'lucide-react';
import type { ActivePage } from '../types';
import { Link, useRouter } from '../router';
import { useGarage } from '../garage';
import { useSite } from '../content';

interface HeaderProps {
  active: ActivePage | null;
  onEnquireClick: () => void;
  onGarageClick: () => void;
}

const NAV: { label: string; page: ActivePage; to: string }[] = [
  { label: 'All cars', page: 'inventory', to: '/cars' },
  { label: 'Finance', page: 'finance', to: '/finance' },
  { label: 'Test drive', page: 'testdrive', to: '/test-drive' },
  { label: 'Trade-in', page: 'tradein', to: '/trade-in' },
  { label: 'Service', page: 'service', to: '/service' },
  { label: 'Offers', page: 'offers', to: '/offers' },
  { label: 'About', page: 'about', to: '/about' },
];

export default function Header({ active, onEnquireClick, onGarageClick }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { path } = useRouter();
  const { count } = useGarage();
  const { settings } = useSite();
  const announcement = settings?.general.announcement;

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {announcement?.enabled && announcement.text && (
        <div className="bg-stone-900 px-4 py-2 text-center text-xs text-white">
          {announcement.link ? (
            <a href={announcement.link} className="underline underline-offset-2 hover:text-amber-200">{announcement.text}</a>
          ) : announcement.text}
        </div>
      )}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-[var(--color-canvas)]/95 backdrop-blur-md">
        <div className="page-container flex h-16 items-center justify-between gap-3 lg:h-20">
          <Link to="/" className="group flex min-w-0 shrink items-center gap-2.5" aria-label="Exotique Machines home">
            <picture className="shrink-0">
              <source srcSet="/logo-80.webp 1x, /logo-160.webp 2x" type="image/webp" />
              <img src="/logo-80.png" alt="" width="40" height="40" className="h-9 w-9 shrink-0 rounded-lg sm:h-10 sm:w-10" />
            </picture>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-bold uppercase tracking-[0.08em] text-stone-900 sm:text-base sm:tracking-[0.14em]">Exotique Machines</span>
              <span className="hidden truncate font-mono text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)] min-[420px]:block">
                A unit of Sai Baba Car Sales Pvt Ltd
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden xl:flex xl:items-center xl:gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.page}
                to={item.to}
                aria-current={active === item.page ? 'page' : undefined}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-stone-100 ${
                  active === item.page ? 'text-[var(--color-accent)] font-semibold' : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {item.label}
                {active === item.page && <span className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-[var(--color-accent)]" />}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link to="/cars" className="hidden h-11 w-11 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 sm:flex" aria-label="Search all cars">
              <Search className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={onGarageClick}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-stone-700 hover:bg-stone-100"
              aria-label={`My garage${count ? `, ${count} saved` : ''}`}
            >
              <Heart className="h-[18px] w-[18px] text-red-600" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 font-mono text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
            <Link to="/admin" rel="nofollow" className="hidden h-11 w-11 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:bg-stone-100 lg:flex" aria-label="Staff login">
              <Lock className="h-[18px] w-[18px]" />
            </Link>
            <button type="button" onClick={onEnquireClick} className="btn btn-primary btn-sm sm:min-h-11 sm:px-5">
              Enquire
            </button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100 xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Main" className="border-t border-stone-200 bg-[var(--color-canvas)] xl:hidden">
            <ul className="page-container grid gap-1 py-3 sm:grid-cols-2">
              {NAV.map((item) => (
                <li key={item.page}>
                  <Link
                    to={item.to}
                    aria-current={active === item.page ? 'page' : undefined}
                    className={`flex min-h-12 items-center rounded-lg px-4 text-base font-medium ${
                      active === item.page ? 'bg-amber-50 text-[var(--color-accent-strong)] font-semibold' : 'text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="sm:col-span-2 border-t border-stone-200 pt-2 mt-1">
                <Link to="/admin" rel="nofollow" className="flex min-h-12 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100">
                  <Lock className="h-4 w-4" aria-hidden /> Staff login
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
