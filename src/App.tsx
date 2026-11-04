import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Phone, MessageCircle, Calendar, MapPin } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import { RouterProvider, useRouter, Link } from './router';
import { SiteProvider, useContact, whatsappLink } from './content';
import { GarageProvider } from './garage';
import { navKey } from './lib/routes';
import { Spinner } from './components/ui';

// Route-level code splitting: each page is its own chunk.
const HomeView = lazy(() => import('./components/HomeView'));
const InventoryView = lazy(() => import('./components/InventoryView'));
const VehicleDetailsView = lazy(() => import('./components/VehicleDetailsView'));
const FinanceView = lazy(() => import('./components/FinanceView'));
const TradeInView = lazy(() => import('./components/TradeInView'));
const TestDriveView = lazy(() => import('./components/TestDriveView'));
const ServiceView = lazy(() => import('./components/ServiceView'));
const OffersView = lazy(() => import('./components/OffersView'));
const OfferDetailView = lazy(() => import('./components/OfferDetailView'));
const AboutView = lazy(() => import('./components/AboutView'));
const NotFoundView = lazy(() => import('./components/NotFoundView'));
const AdminPortalView = lazy(() => import('./components/AdminPortalView'));
const EnquiryModal = lazy(() => import('./components/EnquiryModal'));
const SavedSessionsDrawer = lazy(() => import('./components/SavedSessionsDrawer'));

export default function App() {
  return (
    <RouterProvider>
      <SiteProvider>
        <GarageProvider>
          <Shell />
        </GarageProvider>
      </SiteProvider>
    </RouterProvider>
  );
}

function Shell() {
  const { route } = useRouter();
  const [enquiry, setEnquiry] = useState<{ open: boolean; car?: string }>({ open: false });
  const [garageOpen, setGarageOpen] = useState(false);
  const isAdmin = route.page === 'admin';

  // Other components open the enquiry form with: window.dispatchEvent(new CustomEvent('em:enquire', {detail}))
  useEffect(() => {
    const on = (e: Event) => setEnquiry({ open: true, car: (e as CustomEvent).detail?.car });
    window.addEventListener('em:enquire', on);
    return () => window.removeEventListener('em:enquire', on);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)] font-sans text-stone-900 selection:bg-stone-900 selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <Header
        active={navKey(route)}
        onEnquireClick={() => setEnquiry({ open: true })}
        onGarageClick={() => setGarageOpen(true)}
      />
      {/* min-height keeps the footer below the fold while a page chunk loads (no layout shift). */}
      <main id="main" className="min-h-[100svh] flex-grow pb-20 lg:pb-0">
        <Suspense fallback={<Spinner />}>
          <Page />
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <MobileActionBar />}

      <Suspense fallback={null}>
        {enquiry.open && <EnquiryModal initialCar={enquiry.car} onClose={() => setEnquiry({ open: false })} />}
        {garageOpen && <SavedSessionsDrawer onClose={() => setGarageOpen(false)} />}
      </Suspense>
    </div>
  );
}

function Page() {
  const { route } = useRouter();
  switch (route.page) {
    case 'home': return <HomeView />;
    case 'inventory': return <InventoryView brandSlug={route.brand} />;
    case 'details': return <VehicleDetailsView vehicleId={route.id} />;
    case 'finance': return <FinanceView />;
    case 'tradein': return <TradeInView />;
    case 'testdrive': return <TestDriveView />;
    case 'service': return <ServiceView />;
    case 'offers': return <OffersView />;
    case 'offer': return <OfferDetailView slug={route.slug} />;
    case 'about': return <AboutView />;
    case 'admin': return <AdminPortalView />;
    default: return <NotFoundView />;
  }
}

function MobileActionBar() {
  const contact = useContact();
  const phone = contact?.phones[0]?.number;
  const item = 'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-stone-700';
  return (
    <nav aria-label="Quick actions" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-stone-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <a href={phone ? `tel:${phone}` : '/about'} className={item}>
        <Phone className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />Call
      </a>
      <a href={whatsappLink(contact?.whatsapp)} target="_blank" rel="noopener" className={item}>
        <MessageCircle className="h-5 w-5 text-emerald-700" aria-hidden />WhatsApp
      </a>
      <Link to="/test-drive" className={item}>
        <Calendar className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />Test drive
      </Link>
      <a href={contact?.mapUrl || '/about'} target={contact?.mapUrl ? '_blank' : undefined} rel="noopener" className={item}>
        <MapPin className="h-5 w-5 text-[var(--color-accent)]" aria-hidden />Directions
      </a>
    </nav>
  );
}
