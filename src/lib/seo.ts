import { useEffect } from 'react';

/**
 * Keeps <title>, description, canonical and robots in sync during client-side
 * navigation. The first page load already has server-rendered tags (backend/seo), so
 * this only matters for people (and crawlers) that navigate inside the app.
 */
const ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export interface PageMeta {
  title: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}

export function usePageMeta(meta: PageMeta | null, suffix = ' | Exotique Machines Lucknow') {
  const key = meta ? `${meta.title}|${meta.description}|${meta.path}|${meta.noindex}` : '';
  useEffect(() => {
    if (!meta) return;
    // Same rule as backend/seo/render.py _title: add the brand only when it fits (~65 chars).
    const title = meta.title.includes('Exotique Machines') ? meta.title
      : [suffix, ' | Exotique Machines'].map((x) => meta.title + x).find((t) => t.length <= 65) || meta.title;
    document.title = title;
    const mk = (tag: string, attrs: Record<string, string>) => () => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    if (meta.description) {
      setMeta('meta[name="description"]', 'content', meta.description, mk('meta', { name: 'description' }));
      setMeta('meta[property="og:description"]', 'content', meta.description, mk('meta', { property: 'og:description' }));
    }
    setMeta('meta[property="og:title"]', 'content', title, mk('meta', { property: 'og:title' }));
    setMeta('meta[name="robots"]', 'content', meta.noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large',
      mk('meta', { name: 'robots' }));
    if (meta.path) {
      const href = ORIGIN + meta.path;
      setMeta('link[rel="canonical"]', 'href', href, mk('link', { rel: 'canonical' }));
      setMeta('meta[property="og:url"]', 'content', href, mk('meta', { property: 'og:url' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, suffix]);
}
