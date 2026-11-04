import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parseRoute, PAGE_PATHS, carPath, type Route } from './lib/routes';
import type { ActivePage } from './types';

/**
 * A ~60-line History API router. Every page has a real, shareable, crawlable URL
 * (served with server-rendered meta by the backend), and links are real <a href>.
 */
interface RouterState {
  path: string;
  search: URLSearchParams;
  route: Route;
  navigate: (to: string, opts?: { replace?: boolean; keepScroll?: boolean }) => void;
}

const RouterContext = createContext<RouterState | null>(null);

function read() {
  return { path: window.location.pathname, search: new URLSearchParams(window.location.search) };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState(read);

  useEffect(() => {
    const onPop = () => setLoc(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, opts: { replace?: boolean; keepScroll?: boolean } = {}) => {
    const url = new URL(to, window.location.origin);
    if (url.origin !== window.location.origin) {
      window.location.assign(to);
      return;
    }
    const next = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) {
      window.history[opts.replace ? 'replaceState' : 'pushState']({}, '', next);
    }
    setLoc(read());
    if (!opts.keepScroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const value = useMemo<RouterState>(
    () => ({ path: loc.path, search: loc.search, route: parseRoute(loc.path), navigate }),
    [loc, navigate],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

/** Compatibility for components written against the old page-state API. */
export function usePageNav() {
  const { navigate } = useRouter();
  return useCallback(
    (page: ActivePage, opts?: { id?: string; query?: Record<string, string> }) => {
      let path = page === 'details' && opts?.id ? carPath(opts.id) : PAGE_PATHS[page] ?? '/';
      if (opts?.query) {
        const q = new URLSearchParams(Object.entries(opts.query).filter(([, v]) => v));
        if ([...q].length) path += `?${q}`;
      }
      navigate(path);
    },
    [navigate],
  );
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean };

/** A real link that navigates client-side on plain left-clicks. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, onClick, target, ...rest },
  ref,
) {
  const { navigate } = useRouter();
  return (
    <a
      ref={ref}
      href={to}
      target={target}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented || e.button !== 0 || target === '_blank' ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
        ) return;
        e.preventDefault();
        navigate(to, { replace });
      }}
      {...rest}
    />
  );
});
