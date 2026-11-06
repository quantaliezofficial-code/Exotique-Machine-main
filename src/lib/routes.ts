import type { ActivePage } from '../types';

/** Real URLs for every page. These must match backend/seo/render.py ROUTES. */
export type Route =
  | { page: 'home' }
  | { page: 'inventory'; brand?: string; collection?: string }
  | { page: 'details'; id: string }
  | { page: 'finance' }
  | { page: 'tradein' }
  | { page: 'testdrive' }
  | { page: 'service' }
  | { page: 'offers' }
  | { page: 'offer'; slug: string }
  | { page: 'about' }
  | { page: 'admin' }
  | { page: 'notfound' };

const STATIC: Record<string, Route['page']> = {
  '/': 'home',
  '/cars': 'inventory',
  '/finance': 'finance',
  '/trade-in': 'tradein',
  '/test-drive': 'testdrive',
  '/service': 'service',
  '/offers': 'offers',
  '/about': 'about',
};

export const PAGE_PATHS: Record<ActivePage, string> = {
  home: '/',
  inventory: '/cars',
  details: '/cars',
  finance: '/finance',
  tradein: '/trade-in',
  testdrive: '/test-drive',
  service: '/service',
  offers: '/offers',
  about: '/about',
  admin: '/admin',
};

export function parseRoute(pathname: string): Route {
  let p = '/' + pathname.replace(/^\/+/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (STATIC[p]) return { page: STATIC[p] } as Route;
  let m = p.match(/^\/cars\/([A-Za-z0-9_.-]{1,128})$/);
  if (m) return { page: 'details', id: decodeURIComponent(m[1]) };
  m = p.match(/^\/used-cars\/([a-z0-9-]{1,60})$/);
  if (m) return { page: 'inventory', collection: m[1] };
  m = p.match(/^\/brands\/([a-z0-9-]{1,120})$/);
  if (m) return { page: 'inventory', brand: m[1] };
  m = p.match(/^\/offers\/([a-z0-9-]{1,160})$/);
  if (m) return { page: 'offer', slug: m[1] };
  if (/^\/admin(\/.*)?$/.test(p)) return { page: 'admin' };
  return { page: 'notfound' };
}

export const carPath = (id: string) => `/cars/${encodeURIComponent(id)}`;
export const offerPath = (slug: string) => `/offers/${slug}`;
export const brandSlug = (brand: string) =>
  brand.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const brandPath = (brand: string) => `/brands/${brandSlug(brand)}`;
export const collectionPath = (slug: string) => `/used-cars/${slug}`;

/** The page id the header highlights for a route. */
export function navKey(route: Route): ActivePage | null {
  switch (route.page) {
    case 'details':
      return 'inventory';
    case 'offer':
      return 'offers';
    case 'notfound':
      return null;
    default:
      return route.page;
  }
}
