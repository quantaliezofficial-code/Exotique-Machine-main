import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ActivePage, Vehicle } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import SavedSessionsDrawer from './components/SavedSessionsDrawer';
import { VEHICLES } from './data';
import { api } from './services/api';
import { X, CheckCircle2, Send, MessageSquare, Phone, MessageCircle, Calendar, MapPin, Loader2 } from 'lucide-react';

// Lazy load main views to reduce initial bundle size (Ship Less JavaScript / Lazy Loading)
const HomeView = lazy(() => import('./components/HomeView'));
const InventoryView = lazy(() => import('./components/InventoryView'));
const VehicleDetailsView = lazy(() => import('./components/VehicleDetailsView'));
const FinanceView = lazy(() => import('./components/FinanceView'));
const TradeInView = lazy(() => import('./components/TradeInView'));
const TestDriveView = lazy(() => import('./components/TestDriveView'));
const ServiceView = lazy(() => import('./components/ServiceView'));
const OffersView = lazy(() => import('./components/OffersView'));
const AdminPortalView = lazy(() => import('./components/AdminPortalView'));

// Fallback loader for main views
const PageLoader = () => (
  <div className="flex-grow flex flex-col items-center justify-center py-32 space-y-4">
    <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
    <span className="text-stone-500 text-xs tracking-widest uppercase font-mono">Loading...</span>
  </div>
);

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>(() => {
    try {
      const stored = localStorage.getItem('Exotique_active_page');
      return (stored as ActivePage) || 'home';
    } catch {
      return 'home';
    }
  });

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('Exotique_selected_vehicle_id');
      return stored && stored !== 'tata-nexon' ? stored : 'toyota-innova-crysta-2022-bronze-1';
    } catch {
      return 'toyota-innova-crysta-2022-bronze-1';
    }
  });

  // Dynamic Live Vehicles (Synced with Express Backend & JSON Store)
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  const refreshVehicles = async () => {
    try {
      setIsLoadingVehicles(true);
      const list = await api.getVehicles();
      if (list && Array.isArray(list) && list.length > 0) {
        setVehicles(list);
      }
    } catch (err) {
      console.warn('Could not load vehicles from API backend, falling back to static database:', err);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  useEffect(() => {
    refreshVehicles();
  }, []);

  // Advanced Search parameters passed from Home to Inventory (defaults to All Cars)
  const [searchFilters, setSearchFilters] = useState({
    brand: 'All',
    budget: 'Any Budget',
    fuel: 'All',
    transmission: 'All'
  });

  // Always clear any stale saved search filters from localStorage to ensure 'All' is default
  useEffect(() => {
    try {
      localStorage.removeItem('Exotique_search_filters');
    } catch {}
  }, []);

  // Finance and Test Drive preferences passed from Vehicle details pages
  const [selectedModelForFinance, setSelectedModelForFinance] = useState<string>('');
  const [selectedModelForTestDrive, setSelectedModelForTestDrive] = useState<string>('');

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('Exotique_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [testDrives, setTestDrives] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('Exotique_test_drives');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [services, setServices] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('Exotique_services');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [financeApps, setFinanceApps] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('Exotique_finance_applications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isGarageOpen, setIsGarageOpen] = useState(false);

  // Synchronizers to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('Exotique_active_page', activePage);
    } catch {}
  }, [activePage]);

  useEffect(() => {
    try {
      localStorage.setItem('Exotique_selected_vehicle_id', selectedVehicleId);
    } catch {}
  }, [selectedVehicleId]);

  useEffect(() => {
    try {
      localStorage.setItem('Exotique_favorites', JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('Exotique_test_drives', JSON.stringify(testDrives));
    } catch {}
  }, [testDrives]);

  useEffect(() => {
    try {
      localStorage.setItem('Exotique_services', JSON.stringify(services));
    } catch {}
  }, [services]);

  useEffect(() => {
    try {
      localStorage.setItem('Exotique_finance_applications', JSON.stringify(financeApps));
    } catch {}
  }, [financeApps]);

  // Actions
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCancelTestDrive = (id: string) => {
    setTestDrives(prev =>
      prev.map(td => td.id === id ? { ...td, status: 'Cancelled' } : td)
    );
  };

  const handleCancelService = (id: string) => {
    setServices(prev =>
      prev.map(srv => srv.id === id ? { ...srv, status: 'Cancelled' } : srv)
    );
  };

  const handleWithdrawFinance = (id: string) => {
    setFinanceApps(prev =>
      prev.map(fa => fa.id === id ? { ...fa, status: 'Withdrawn' } : fa)
    );
  };

  const handleAddBooking = (booking: any) => {
    setTestDrives(prev => [booking, ...prev]);
  };

  const handleAddService = (service: any) => {
    setServices(prev => [service, ...prev]);
  };

  const handleAddFinance = (finance: any) => {
    setFinanceApps(prev => [finance, ...prev]);
  };

  // Derive saved count for the notification badge
  const activeBookingsCount = testDrives.filter(td => td.status !== 'Cancelled').length;
  const activeServicesCount = services.filter(s => s.status !== 'Cancelled').length;
  const activeFinanceCount = financeApps.filter(fa => fa.status !== 'Withdrawn').length;
  const savedCount = favorites.length + activeBookingsCount + activeServicesCount + activeFinanceCount;

  // Global Enquiry Modal
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryCar, setEnquiryCar] = useState('');
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryRef, setEnquiryRef] = useState('');

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryName || !enquiryPhone || !enquiryEmail) return;

    const ref = `LXM-ENQ-${Math.floor(1000 + Math.random() * 9000)}`;
    setEnquiryRef(ref);
    setEnquirySuccess(true);

    // Send lead to WhatsApp — no lead is lost
    const carText = enquiryCar ? enquiryCar : 'Not specified';
    const waMessage = encodeURIComponent(
      `*New Showroom Enquiry — ${ref}*\n\n` +
      `*Name:* ${enquiryName}\n` +
      `*Phone:* +91${enquiryPhone}\n` +
      `*Email:* ${enquiryEmail}\n` +
      `*Vehicle Interest:* ${carText}\n\n` +
      `_Submitted via ExotiqueMachines.in_`
    );
    window.open(`https://wa.me/916390000976?text=${waMessage}`, '_blank');

    setTimeout(() => {
      setEnquirySuccess(false);
      setIsEnquiryOpen(false);
      setEnquiryName('');
      setEnquiryPhone('');
      setEnquiryEmail('');
      setEnquiryCar('');
    }, 5000);
  };

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicleId(id);
    setActivePage('details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenInventory = () => {
    setSearchFilters({
      brand: 'All',
      budget: 'Any Budget',
      fuel: 'All',
      transmission: 'All'
    });
    setActivePage('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen flex flex-col justify-between font-sans selection:bg-stone-900 selection:text-white">
      
      {/* Premium Header */}
      <Header
        activePage={activePage}
        setActivePage={setActivePage}
        onInventoryClick={handleOpenInventory}
        onEnquireClick={() => setIsEnquiryOpen(true)}
        onGarageClick={() => setIsGarageOpen(true)}
        savedCount={savedCount}
      />

      {/* Main Screen Router */}
      <main className="flex-grow pb-16 lg:pb-0">
        <Suspense fallback={<PageLoader />}>
          {activePage === 'home' && (
            <HomeView
              setActivePage={setActivePage}
              setSearchFilters={setSearchFilters}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onSelectVehicle={handleSelectVehicle}
              vehicles={vehicles}
            />
          )}

          {activePage === 'inventory' && (
            <InventoryView
              onSelectVehicle={handleSelectVehicle}
              searchFilters={searchFilters}
              setSearchFilters={setSearchFilters}
              setActivePage={setActivePage}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              vehicles={vehicles}
            />
          )}

          {activePage === 'details' && (
            <VehicleDetailsView
              vehicleId={selectedVehicleId}
              setActivePage={setActivePage}
              onSetSelectedModelForFinance={setSelectedModelForFinance}
              onSetSelectedModelForTestDrive={setSelectedModelForTestDrive}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              vehicles={vehicles}
            />
          )}

          {activePage === 'finance' && (
            <FinanceView
              selectedModel={selectedModelForFinance}
              setSelectedModel={setSelectedModelForFinance}
              setActivePage={setActivePage}
              onAddFinance={handleAddFinance}
              vehicles={vehicles}
            />
          )}

          {activePage === 'tradein' && (
            <TradeInView
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'testdrive' && (
            <TestDriveView
              selectedModelId={selectedModelForTestDrive}
              setSelectedModelId={setSelectedModelForTestDrive}
              setActivePage={setActivePage}
              onAddBooking={handleAddBooking}
              vehicles={vehicles}
            />
          )}

          {activePage === 'service' && (
            <ServiceView
              setActivePage={setActivePage}
              onAddService={handleAddService}
              vehicles={vehicles}
            />
          )}

          {activePage === 'offers' && (
            <OffersView
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'admin' && (
            <AdminPortalView
              setActivePage={setActivePage}
              onVehicleDataChange={refreshVehicles}
            />
          )}
        </Suspense>
      </main>

      {/* Premium Footer */}
      <Footer setActivePage={setActivePage} onInventoryClick={handleOpenInventory} />

      {/* Mobile Sticky Navigation Action Bar (from home-screen spec) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 grid grid-cols-4 text-center z-40 py-2.5">
        <a
          href="tel:+916390000976"
          className="flex flex-col items-center justify-center text-[10px] text-stone-500 hover:text-amber-700 space-y-1"
          id="mobile-nav-call"
        >
          <Phone className="w-4.5 h-4.5 text-amber-600" />
          <span className="mt-1">Call Concierge</span>
        </a>
        <a
          href="https://wa.me/916390000976"
          target="_blank"
          referrerPolicy="no-referrer"
          className="flex flex-col items-center justify-center text-[10px] text-stone-500 hover:text-emerald-600 space-y-1"
          id="mobile-nav-whatsapp"
        >
          <MessageCircle className="w-4.5 h-4.5 text-emerald-500" />
          <span className="mt-1">WhatsApp Chat</span>
        </a>
        <button
          onClick={() => {
            setActivePage('testdrive');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center text-[10px] text-stone-500 hover:text-amber-700 space-y-1"
          id="mobile-nav-booknow"
        >
          <Calendar className="w-4.5 h-4.5 text-amber-600" />
          <span className="mt-1">Book VIP</span>
        </button>
        <button
          onClick={() => {
            setActivePage('service');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center text-[10px] text-stone-500 hover:text-amber-700 space-y-1"
          id="mobile-nav-directions"
        >
          <MapPin className="w-4.5 h-4.5 text-amber-600" />
          <span className="mt-1">Locations</span>
        </button>
      </div>

      {/* Global Enquiry Modal */}
      {isEnquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-stone-200/80 rounded-xl max-w-md w-full p-6 sm:p-8 space-y-6 relative shadow-2xl shadow-stone-900/15">
            
            {/* Close */}
            <button
              onClick={() => setIsEnquiryOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 p-1.5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {enquirySuccess ? (
              /* Success Stage */
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-stone-900 uppercase">Inquiry Registered</h3>
                  <p className="text-xs text-stone-500 leading-relaxed font-light">
                    Your luxury concierge request is filed under code <span className="font-mono text-amber-700 font-bold">{enquiryRef}</span>. A representative will connect on WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              /* Entry Form Stage */
              <div className="space-y-4">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="text-lg font-extrabold text-stone-900 uppercase tracking-wider">Exotique Showroom Enquiry</h3>
                  <p className="text-xs text-stone-500 mt-1 font-light">Connect directly with a dedicated luxury automobile consultant</p>
                </div>

                <form onSubmit={handleEnquirySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={enquiryName}
                      onChange={(e) => setEnquiryName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2.5 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Mobile Number</label>
                    <div className="flex">
                      <span className="bg-stone-100 border border-stone-200 text-stone-500 px-3 py-2 text-xs rounded-l font-mono flex items-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={enquiryPhone}
                        onChange={(e) => setEnquiryPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full bg-stone-50 border-y border-r border-stone-200 rounded-r px-3 py-2 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={enquiryEmail}
                      onChange={(e) => setEnquiryEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2.5 text-xs text-stone-900 focus:border-amber-600 focus:outline-none focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">Model Choice (Optional)</label>
                    <select
                      value={enquiryCar}
                      onChange={(e) => setEnquiryCar(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-800 rounded px-3 py-2.5 focus:border-amber-600 focus:outline-none focus:bg-white transition-colors"
                    >
                      <option value="">-- Choose Showroom Vehicle --</option>
                      {VEHICLES.map((v) => (
                        <option key={v.id} value={`${v.brand} ${v.model}`}>{v.brand} {v.model}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-lg shadow-stone-950/10 flex items-center justify-center space-x-2 transition-colors pt-3"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Showroom Enquiry</span>
                  </button>
                </form>

                <div className="pt-3 border-t border-stone-100 space-y-1.5">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Or Call Showroom Advisor Directly</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href="tel:+916390000976"
                      className="flex items-center space-x-2 p-2 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 rounded-lg text-stone-700 hover:text-amber-800 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div>
                        <span className="block font-bold">Garima</span>
                        <span className="block text-[10px] font-mono text-stone-500">6390000976</span>
                      </div>
                    </a>
                    <a
                      href="tel:+916390000593"
                      className="flex items-center space-x-2 p-2 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 rounded-lg text-stone-700 hover:text-amber-800 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <div>
                        <span className="block font-bold">Akash</span>
                        <span className="block text-[10px] font-mono text-stone-500">6390000593</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Central Saved Sessions Garage Drawer */}
      <SavedSessionsDrawer
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onSelectVehicle={handleSelectVehicle}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        testDrives={testDrives}
        cancelTestDrive={handleCancelTestDrive}
        services={services}
        cancelService={handleCancelService}
        financeApps={financeApps}
        withdrawFinance={handleWithdrawFinance}
        vehicles={vehicles}
      />
    </div>
  );
}
