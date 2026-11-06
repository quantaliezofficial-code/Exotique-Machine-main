import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Vehicle, SiteSettings, HomePayload, Offer } from './types';
import { api } from './services/api';

/**
 * Everything the public site shows comes from the CMS (via /api/public/*). The server
 * embeds the first page's data in <script id="em-initial-data">, so the first paint
 * needs no API round trip; there is no bundled fallback data.
 */
let initialData: Record<string, any> | null | undefined;
export function readInitialData(): Record<string, any> | null {
  if (initialData !== undefined) return initialData;
  try {
    const el = document.getElementById('em-initial-data');
    initialData = el?.textContent ? JSON.parse(el.textContent) : null;
  } catch {
    initialData = null;
  }
  return initialData;
}

/** A vehicle embedded by the server for /cars/:id (only valid for that id). */
export function initialVehicle(id: string): Vehicle | null {
  const v = readInitialData()?.vehicle;
  return v && v.id === id ? (v as Vehicle) : null;
}

export function initialOffer(slug: string): { offer: Offer; vehicle: Vehicle | null } | null {
  const d = readInitialData();
  return d?.offer?.slug === slug ? { offer: d.offer, vehicle: d.vehicle ?? null } : null;
}

interface SiteState {
  settings: SiteSettings | null;
  home: HomePayload | null;
  vehicles: Vehicle[];
  vehiclesLoaded: boolean;
  vehiclesError: boolean;
  refreshVehicles: () => Promise<void>;
  refreshHome: () => Promise<void>;
}

const SiteContext = createContext<SiteState | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const seeded = readInitialData()?.home as HomePayload | undefined;
  const [home, setHome] = useState<HomePayload | null>(seeded ?? null);
  const [settings, setSettings] = useState<SiteSettings | null>(seeded?.settings ?? null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const [vehiclesError, setVehiclesError] = useState(false);

  const refreshVehicles = useCallback(async () => {
    try {
      const list = await api.getVehicles();
      setVehicles(list);
      setVehiclesError(false);
    } catch {
      setVehiclesError(true);
    } finally {
      setVehiclesLoaded(true);
    }
  }, []);

  const refreshHome = useCallback(async () => {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    try {
      const data = await api.getHome(preview);
      setHome(data);
      setSettings(data.settings);
    } catch {
      /* keep what we have */
    }
  }, []);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    if (!seeded || preview) refreshHome();
    else if (!settings) setSettings(seeded.settings);
    refreshVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ settings, home, vehicles, vehiclesLoaded, vehiclesError, refreshVehicles, refreshHome }),
    [settings, home, vehicles, vehiclesLoaded, vehiclesError, refreshVehicles, refreshHome],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteState {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}

export interface ContactInfo {
  phones: { label: string; number: string }[];
  whatsapp: string;
  email: string;
  address: string;
  mapUrl: string;
  hours: string;
}

/** Contact details from CMS settings, formatted for display. */
export function useContact(): ContactInfo | null {
  const { settings } = useSite();
  return useMemo(() => {
    if (!settings) return null;
    const c = settings.contact;
    const address = [c.streetAddress, c.city, c.region, c.postalCode].filter(Boolean).join(', ');
    const hours = (c.openingHours || [])
      .map((h) => {
        const days = h.days.length === 7 ? 'Open daily' : h.days.length > 1 ? `${h.days[0]}–${h.days[h.days.length - 1]}` : h.days[0];
        return `${days}, ${formatTime(h.opens)} – ${formatTime(h.closes)}`;
      })
      .join(' · ');
    return { phones: c.phones || [], whatsapp: c.whatsapp, email: c.email, address, mapUrl: c.mapUrl, hours };
  }, [settings]);
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

/** ₹ price from the stored lakh value: 85 → "₹85 Lakh", 125 → "₹1.25 Cr". */
export function formatPrice(lakhs?: number | null): string {
  if (!lakhs) return 'Price on request';
  if (lakhs >= 100) return `₹${(lakhs / 100).toFixed(2).replace(/\.00$/, '')} Cr`;
  return `₹${lakhs.toFixed(2).replace(/\.00$/, '')} Lakh`;
}

export function formatInr(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export function displayPhone(n: string): string {
  const d = n.replace(/\D/g, '');
  const local = d.length > 10 ? d.slice(-10) : d;
  return local.length === 10 ? `${local.slice(0, 5)} ${local.slice(5)}` : n;
}

export function whatsappLink(number: string | undefined, text?: string): string {
  const n = (number || '').replace(/\D/g, '');
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** '730Ld M Sport' + 'M Sport Executive' -> '730Ld M Sport Executive'. Mirrors clean_name in backend/seo/listing.py. */
export function cleanName(model: string, badge?: string | null, year?: number | null): string {
  const m = (model || '').trim();
  let b = (badge || '').trim();
  if (year) b = b.replace(new RegExp(`\\s*\\(${year}\\)\\s*$`), '');
  if (!b || b.toLowerCase() === m.toLowerCase()) return m;
  const mw = m.split(/\s+/), bw = b.split(/\s+/);
  for (let k = Math.min(mw.length, bw.length); k > 0; k--) {
    if (mw.slice(-k).join(' ').toLowerCase() === bw.slice(0, k).join(' ').toLowerCase()) return [...mw, ...bw.slice(k)].join(' ');
  }
  return m.toLowerCase().includes(b.toLowerCase()) ? m : `${m} ${b}`;
}

export function vehicleName(v: Pick<Vehicle, 'brand' | 'model'> & { year?: number | null }): string {
  return [v.year, v.brand, v.model].filter(Boolean).join(' ');
}
