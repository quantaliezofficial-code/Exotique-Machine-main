import React, { useState, useEffect } from 'react';
import { Vehicle, ActivePage } from '../types';
import { VEHICLES } from '../data';
import { DetailsSkeleton } from './Skeleton';
import { ArrowLeft, Share2, Compass, Shield, Zap, MessageSquare, Phone, CalendarRange, RotateCcw, Check, CheckCircle2, Heart, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

interface VehicleDetailsViewProps {
  vehicleId: string;
  setActivePage: (page: ActivePage) => void;
  onSetSelectedModelForFinance: (model: string) => void;
  onSetSelectedModelForTestDrive: (modelId: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  vehicles?: Vehicle[];
}

export default function VehicleDetailsView({
  vehicleId,
  setActivePage,
  onSetSelectedModelForFinance,
  onSetSelectedModelForTestDrive,
  favorites,
  toggleFavorite,
  vehicles
}: VehicleDetailsViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;
  // Find vehicle or default to first
  const vehicle = vehicleList.find(v => v.id === vehicleId) || vehicleList[0];

  const colors = (vehicle.colors && vehicle.colors.length > 0)
    ? vehicle.colors
    : [{ name: 'Obsidian Black', hex: '#1C1917' }, { name: 'Glacier Silver', hex: '#E5E7EB' }];

  const images = (vehicle.images && vehicle.images.length > 0)
    ? vehicle.images
    : ['/logo.png'];

  const features = vehicle.features || [];

  const [isLoading, setIsLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [is360Mode, setIs360Mode] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0); // 0-3 slider for 360 view
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [isEnquirySuccess, setIsEnquirySuccess] = useState(false);
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');

  // Reset states when vehicleId changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    setActiveImageIndex(0);
    setIs360Mode(false);
    setRotationIndex(0);
    setSelectedColor(colors[0]);
    setIsEnquirySuccess(false);
    setEnquiryName('');
    setEnquiryPhone('');

    return () => clearTimeout(timer);
  }, [vehicleId, vehicle]);

  const handleNextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Keyboard navigation for photo carousel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (is360Mode) return;
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, is360Mode]);

  if (isLoading) {
    return (
      <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans">
        <DetailsSkeleton />
      </div>
    );
  }

  // Handle color picker change
  const handleColorSelect = (color: typeof vehicle.colors[0]) => {
    setSelectedColor(color);
  };

  const handleCustomiseFinance = () => {
    onSetSelectedModelForFinance(`${vehicle.brand} ${vehicle.model}`);
    setActivePage('finance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBookTestDrive = () => {
    onSetSelectedModelForTestDrive(vehicle.id);
    setActivePage('testdrive');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsAppSimulation = () => {
    const text = encodeURIComponent(`Hello Exotique Machines. I'm interested in booking a test drive for the ${vehicle.brand} ${vehicle.model} (${selectedColor.name} color).`);
    window.open(`https://wa.me/916390000976?text=${text}`, '_blank');
  };

  const handleQuickEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryName || !enquiryPhone) return;
    setIsEnquirySuccess(true);
    setTimeout(() => {
      setIsEnquirySuccess(false);
      setEnquiryName('');
      setEnquiryPhone('');
    }, 4000);
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="vehicle-details-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back navigation & Share */}
        <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-5">
          <button
            onClick={() => {
              setActivePage('inventory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center space-x-2 text-sm text-stone-500 hover:text-amber-700 font-semibold transition-colors cursor-pointer"
            id="btn-details-back-to-inventory"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Inventory Showroom</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => toggleFavorite(vehicle.id)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 hover:border-amber-600 text-xs font-semibold text-stone-600 rounded hover:text-amber-700 transition-all active:scale-95 shadow-sm cursor-pointer"
              title={favorites.includes(vehicle.id) ? "Remove from Garage" : "Bookmark Vehicle"}
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.includes(vehicle.id) ? 'text-red-500 fill-current' : ''}`} />
              <span>{favorites.includes(vehicle.id) ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Showroom link copied to clipboard!');
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 hover:border-amber-600 text-xs font-semibold text-stone-600 rounded hover:text-amber-700 transition-all shadow-sm cursor-pointer"
              title="Share Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Vehicle</span>
            </button>
          </div>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Side: Images stage, rotation, thumbnails */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Stage Card */}
            <div className="relative bg-stone-950 border border-stone-800 rounded-2xl p-2 sm:p-3 overflow-hidden aspect-[16/10] w-full flex items-center justify-center shadow-md">
              
              {/* Highlight Overlay badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-2.5 py-1 bg-stone-900/90 text-amber-400 text-[10px] font-bold tracking-widest uppercase rounded border border-amber-500/20 flex items-center space-x-1.5 shadow-sm">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{is360Mode ? 'Interactive 360° Rotator' : 'Studio Photography'}</span>
                </span>
              </div>

              {/* 360° Toggle */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setIs360Mode(!is360Mode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all flex items-center space-x-1.5 shadow-md cursor-pointer ${
                    is360Mode
                      ? 'bg-amber-600 text-white border border-amber-600 font-extrabold'
                      : 'bg-white/95 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                  id="details-toggle-360"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${is360Mode ? 'animate-spin' : ''}`} />
                  <span>360° View</span>
                </button>
              </div>

              {/* Main Image Renderer */}
              <div 
                className={`w-full h-full rounded-xl overflow-hidden flex items-center justify-center bg-stone-950 ${!is360Mode && images.length > 1 ? 'cursor-pointer' : ''}`}
                onClick={!is360Mode ? handleNextImage : undefined}
                title={!is360Mode && images.length > 1 ? "Click to view next photo" : undefined}
              >
                <img
                  src={is360Mode ? (images[rotationIndex] || images[0]) : (images[activeImageIndex] || images[0])}
                  alt={`${vehicle.brand} ${vehicle.model} View`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-all duration-300"
                  id="main-stage-image"
                />
              </div>

              {/* Prev / Next Photo Navigation Buttons */}
              {!is360Mode && images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl group cursor-pointer"
                    title="Previous Photo (Left Arrow)"
                    aria-label="Previous Photo"
                    id="details-btn-prev-photo"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/55 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-xl group cursor-pointer"
                    title="Next Photo (Right Arrow)"
                    aria-label="Next Photo"
                    id="details-btn-next-photo"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Photo Counter Badge */}
                  <div className="absolute bottom-3.5 right-3.5 z-10 pointer-events-none">
                    <span className="px-2.5 py-1 bg-black/75 backdrop-blur-md text-white text-[11px] font-mono font-bold tracking-wider rounded-md border border-white/15 flex items-center space-x-1.5 shadow-md">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activeImageIndex + 1} / {images.length}</span>
                    </span>
                  </div>
                </>
              )}

              {/* Slider for 360 degree rotation (simulated) */}
              {is360Mode && (
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-lg p-3 border border-stone-200 text-center space-y-1.5 z-20 shadow-lg">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-800 font-bold">Drag to Orbit Vehicle</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(1, images.length - 1)}
                    step="1"
                    value={rotationIndex}
                    onChange={(e) => setRotationIndex(Number(e.target.value))}
                    className="w-full accent-amber-600 h-1 bg-stone-100 rounded-lg cursor-ew-resize"
                  />
                  <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                    <span>Front Profile</span>
                    <span>Cabin Angle</span>
                    <span>Side Detail</span>
                    <span>Rear Stance</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail Navigation (Compact & Sleek) */}
            {!is360Mode && (
              <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar" id="thumbnails-gallery">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative shrink-0 w-20 sm:w-24 md:w-26 h-13 sm:h-15 md:h-16 bg-stone-950 border rounded-lg overflow-hidden transition-all cursor-pointer ${
                      activeImageIndex === idx
                        ? 'border-amber-600 ring-2 ring-amber-600/40 shadow-sm scale-102 opacity-100'
                        : 'border-stone-200 opacity-65 hover:opacity-100 hover:border-stone-400'
                    }`}
                    title={`View photo ${idx + 1}`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover object-center" />
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom Color Picker Section */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Bespoke Exterior Shade Selection
              </h3>
              <p className="text-xs text-stone-500 font-light">
                Configure your paint scheme. Our robotic coating labs customize finish layering on order.
              </p>
              
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex space-x-3">
                  {colors.map((color, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleColorSelect(color)}
                      style={{ backgroundColor: color.hex }}
                      className={`w-9 h-9 rounded-full relative transition-all duration-300 focus:outline-none cursor-pointer ${
                        selectedColor.name === color.name
                          ? 'ring-2 ring-amber-600 ring-offset-2 ring-offset-[#FAFAF9] scale-110 shadow-lg'
                          : 'opacity-85 hover:opacity-100'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="border-l border-stone-200 pl-4">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Active Shade</span>
                  <p className="text-sm font-bold text-amber-805 mt-0.5">{selectedColor.name}</p>
                </div>
              </div>
            </div>

            {/* Vehicle Mechanical Description & Core Tech */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-stone-900 uppercase tracking-wider border-b border-stone-200 pb-2">
                Showroom Description
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed font-light">
                {vehicle.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="border border-stone-200 bg-white rounded-lg p-4 space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-amber-700" />
                    <span>Safety Assurance Matrix</span>
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Standard crash mitigation, dual side curtains, segment-leading steel layout, ISOFIX child support anchors, and ESC traction diagnostics.
                  </p>
                </div>

                <div className="border border-stone-200 bg-white rounded-lg p-4 space-y-2 shadow-sm">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="w-4 h-4 text-amber-700" />
                    <span>Infotainment Systems</span>
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Custom OTA updates, voice command assists, real-time navigation grids, integrated smartphone screen streaming, and high fidelity acoustics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Sticky Pricing Card & Quick Forms */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Spec Sticky pricing card */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-6 sticky top-24 shadow-md" id="specs-pricing-sticky-card">
              
              {/* Header block */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-850 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-200 shadow-sm">
                    {vehicle.badge} Model
                  </span>
                  <span className="text-xs font-mono text-stone-400">{vehicle.type}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1.5">{vehicle.brand} {vehicle.model}</h1>
                <p className="text-xs text-stone-500 mt-1">Configure bespoke customisations below. Delivery within 14 calendar days.</p>
              </div>

              {/* Price Block */}
              <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Ex-Showroom Price</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-850">₹ {vehicle.price.toFixed(2)} Lakh*</span>
                </div>
                <div className="text-right border-l border-stone-200 pl-4">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Estimated Monthly EMI</span>
                  <span className="text-sm font-extrabold text-stone-850">₹{vehicle.emi.toLocaleString()}/mo</span>
                  <button
                    onClick={handleCustomiseFinance}
                    className="block text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline mt-0.5 transition-all text-right w-full cursor-pointer"
                  >
                    Customise Finance →
                  </button>
                </div>
              </div>

              {/* Mechanical Diagnostics Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">Fuel Configuration</span>
                  <span className="font-bold text-stone-800 mt-0.5 block text-sm">{vehicle.fuel}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">Transmission</span>
                  <span className="font-bold text-stone-800 mt-0.5 block text-sm">{vehicle.transmission}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">Engine / Displacement</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block truncate" title={vehicle.engine}>{vehicle.engine}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">Peak Power Capacity</span>
                  <span className="font-semibold text-stone-800 mt-0.5 block truncate" title={vehicle.power}>{vehicle.power}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">Seating Capacity</span>
                  <span className="font-bold text-stone-800 mt-0.5 block text-sm">{vehicle.seats} Seater</span>
                </div>
                <div className="bg-stone-50 p-3 rounded border border-stone-200">
                  <span className="text-stone-400 block">ARAI Efficiency Range</span>
                  <span className="font-bold text-amber-700 mt-0.5 block text-sm">{vehicle.mileage}</span>
                </div>
              </div>

              {/* Key Features bullet points */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-stone-400">Key Premium Features</h4>
                <ul className="text-xs text-stone-600 space-y-2">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions Button Stack */}
              <div className="space-y-3 pt-3 border-t border-stone-200">
                <button
                  onClick={handleBookTestDrive}
                  className="w-full py-4 bg-stone-900 hover:bg-stone-850 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-lg shadow-stone-900/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  id="details-btn-testdrive"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Book VIP Test Drive</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleWhatsAppSimulation}
                    className="py-3 bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-100/30 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    id="details-btn-whatsapp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => alert('Exotique Direct Hotline: Connecting you to our Lucknow showroom concierge. Call: +91 9151911150')}
                    className="py-3 bg-white border border-stone-200 hover:border-amber-600 text-stone-700 hover:text-amber-800 text-xs font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                    id="details-btn-call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Showroom</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Inquiry Form */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900">
                Request Callback Offer
              </h3>
              
              {isEnquirySuccess ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center text-amber-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-amber-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Inquiry Submitted Successfully</p>
                  <p className="text-[10px] text-stone-500 leading-relaxed">Our premium concierge will reach out on your phone via Call/WhatsApp shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleQuickEnquirySubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={enquiryName}
                      onChange={(e) => setEnquiryName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-stone-50 border border-stone-200 rounded px-3 py-2 text-xs text-stone-800 focus:border-amber-600 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Mobile Number</label>
                    <div className="flex">
                      <span className="bg-stone-100 border border-stone-200 text-stone-500 px-2.5 py-2 text-xs rounded-l font-mono flex items-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={enquiryPhone}
                        onChange={(e) => setEnquiryPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full bg-stone-50 border border-stone-200 border-l-0 rounded-r px-3 py-2 text-xs text-stone-800 focus:border-amber-600 focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Request Callback
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
