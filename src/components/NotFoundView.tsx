import React from 'react';
import { Link } from '../router';
import { usePageMeta } from '../lib/seo';

export default function NotFoundView({ message }: { message?: string }) {
  usePageMeta({ title: 'Page not found', description: 'This page does not exist.', noindex: true });
  return (
    <div className="page-container flex min-h-[50vh] flex-col items-center justify-center py-20 text-center" id="not-found-view">
      <p className="eyebrow">404</p>
      <h1 className="mt-2 text-3xl font-black text-stone-900">Page not found</h1>
      <p className="mt-3 max-w-md text-stone-600">{message || 'The page you are looking for does not exist or has moved.'}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/cars" className="btn btn-primary">Browse all cars</Link>
        <Link to="/" className="btn btn-secondary">Go to home page</Link>
      </div>
    </div>
  );
}
