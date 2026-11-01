import React, { useState } from 'react';
import { ActivePage, Vehicle } from '../types';
import { VEHICLES } from '../data';
import { api } from '../services/api';
import { CheckCircle2, MapPin, Phone, MessageSquare, ShieldAlert, PenTool, Navigation, ArrowUpRight } from 'lucide-react';

interface ServiceViewProps {
  setActivePage: (page: ActivePage) => void;
  onAddService?: (service: {
    id: string;
    name: string;
    phone: string;
    model: string;
    serviceType: string;
    date: string;
    status: 'scheduled' | 'cancelled';
  }) => void;
  vehicles?: Vehicle[];
}

export default function ServiceView({ setActivePage, onAddService, vehicles }: ServiceViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;

  // Booking States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('');
  const [serviceType, setServiceType] = useState('Periodic Maintenance');
  const [preferredDate, setPreferredDate] = useState('');
  
  const [isBooked, setIsBooked] = useState(false);
  const [srvReference, setSrvReference] = useState('');

  // Single Official Showroom & Service Hub Location
  const showroomLocation = {
    name: 'EXOTIQUE MACHINES FLAGSHIP SHOWROOM',
    subtitle: 'Premier Luxury Automobile Sanctuary & Service Hub',
    address: 'Adjacent to Indira Nagar Metro Station, A.Automovers Building, Main Faizabad Road, Lucknow, UP - 226016',
    phoneGarima: '+91 6390000976',
    phoneAkash: '+91 6390000593',
    hours: 'Mon - Sun: 09:30 AM - 08:30 PM',
    mapsUrl: 'https://maps.app.goo.gl/3yrpemSXVP7ffMGX7',
    embedUrl: 'https://maps.google.com/maps?q=Exotique+Machines+A.Automovers+Building+Indira+Nagar+Metro+Station+Lucknow&t=&z=16&ie=UTF8&iwloc=&output=embed'
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !model || !preferredDate) return;

    const ref = `LXM-SRV-${Math.floor(1000 + Math.random() * 9000)}`;
    setSrvReference(ref);
    setIsBooked(true);

    // Persist to PostgreSQL backend
    api.bookService({
      vehicleModel: model,
      serviceType: serviceType || 'Certified Periodic Care',
      preferredDate,
      customerName: fullName,
      customerPhone: phone,
      notes: `Service Booking via portal. Ref: ${ref}`
    }).catch(err => console.warn('Could not sync service booking to API:', err));

    if (onAddService) {
      onAddService({
        id: ref,
        name: fullName,
        phone,
        model,
        serviceType,
        date: preferredDate,
        status: 'scheduled'
      });
    }
  };

  const handleResetBooking = () => {
    setIsBooked(false);
    setFullName('');
    setPhone('');
    setModel('');
    setPreferredDate('');
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="service-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="border-b border-stone-200 pb-8 mb-10 text-center md:text-left">
          <span className="text-amber-800 font-mono text-xs uppercase tracking-widest font-bold">Precision Engineering Care</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Precision Service</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
            Keep your high-performance driving machine operating at factory limits. Original OEM diagnostic support.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* Left Block: Care programs list (5 Cols) */}
          <div className="lg:col-span-5 space-y-4" id="service-programs">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 border-b border-stone-200 pb-2 flex items-center space-x-2">
              <PenTool className="w-4 h-4 text-amber-800" />
              <span>Certified Maintenance Classes</span>
            </h3>

            {[
              { title: 'Periodic Maintenance', desc: '120-point digital diagnostic inspection, motor oil swap, synthetic fluid checks, and diagnostic code resets.', time: 'Every 10,000 km / 1 Year' },
              { title: 'Aerodynamic Body Shop', desc: 'Full chassis alignments, dent repairs, premium color match robotic coating, and paint protection films (PPF).', time: 'On-demand customisation' },
              { title: 'AC & Climate Diagnostics', desc: 'Evaporator sanitizations, diagnostic refrigerant re-charging, dust filter swaps, and climate cabin control calibrations.', time: 'Every 20,000 km / 2 Years' }
            ].map((program, idx) => (
              <div
                key={idx}
                className="bg-white border border-stone-200 hover:border-amber-600 p-5 rounded-xl space-y-2 transition-all cursor-pointer group shadow-sm"
                onClick={() => setServiceType(program.title)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors uppercase">{program.title}</h4>
                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-semibold">
                    {program.time}
                  </span>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed font-light">{program.desc}</p>
              </div>
            ))}
          </div>

          {/* Right Block: Service Booking Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-sm" id="service-booking-card">
            {isBooked ? (
              /* Success State */
              <div className="space-y-6 text-center my-auto py-8">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900 uppercase tracking-wider">Service Reserved</h3>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto font-light">
                    Your periodic diagnostics block is successfully reserved. Our workshop engineers will receive your vehicle.
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 font-mono space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest block">Service Code</span>
                  <span className="text-lg font-bold text-amber-805 block">{srvReference}</span>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={handleResetBooking}
                    className="px-5 py-2.5 bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-white border border-stone-200 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                  >
                    Schedule Another Vehicle
                  </button>
                </div>
              </div>
            ) : (
              /* Entry Form State */
              <div className="space-y-6">
                <div className="border-b border-stone-200 pb-4">
                  <h3 className="text-base font-bold text-stone-900 uppercase tracking-wider">Book Precision Service</h3>
                  <p className="text-xs text-stone-500 mt-1 font-light">Original diagnostic calibrations scheduled instantly</p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Full Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Rahul Sharma"
                        className="w-full bg-[#FBFBFA] text-xs text-stone-800 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300"
                      />
                    </div>

                    {/* Mobile */}
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Mobile Number</label>
                      <div className="flex">
                        <span className="bg-stone-100 border border-stone-200 border-r-0 text-stone-500 px-4 py-3.5 text-xs rounded-l-xl font-mono flex items-center">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          pattern="[6-9][0-9]{9}"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full bg-[#FBFBFA] border border-stone-200 hover:border-stone-300 rounded-r-xl px-4 py-3.5 text-xs focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Select Model */}
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Vehicle Model</label>
                      <div className="relative">
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-[#FBFBFA] text-xs font-semibold text-stone-705 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2378716C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_1.2rem_center] bg-no-repeat"
                          required
                        >
                          <option value="">-- Select Model --</option>
                          {vehicleList.map((v) => (
                            <option key={v.id} value={`${v.brand} ${v.model}`}>{v.brand} {v.model}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Service Type */}
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Service Type</label>
                      <div className="relative">
                        <select
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value)}
                          className="w-full bg-[#FBFBFA] text-xs font-semibold text-stone-705 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2378716C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_1.2rem_center] bg-no-repeat"
                          required
                        >
                          <option value="Periodic Maintenance">Periodic Maintenance</option>
                          <option value="Aerodynamic Body Shop">Aerodynamic Body Shop</option>
                          <option value="AC & Climate Diagnostics">AC & Climate Diagnostics</option>
                        </select>
                      </div>
                    </div>

                    {/* Preferred Date */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Preferred Date</label>
                      <input
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full bg-[#FBFBFA] text-xs text-stone-700 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-md shadow-stone-900/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    id="service-submit-btn"
                  >
                    <span>Reserve Diagnostic Bay</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

                {/* Live Lucknow Showroom & Service Hub Map */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 sm:p-8 shadow-sm" id="locations-map-block">
          <div className="text-center md:text-left mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-amber-800 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center md:justify-start space-x-2">
                <Navigation className="w-4 h-4 text-amber-700" />
                <span>Official Showroom Location</span>
              </span>
              <h3 className="text-2xl font-black text-stone-900 mt-1">Our Lucknow Flagship Sanctuary</h3>
              <p className="text-stone-500 text-xs mt-1 max-w-lg font-light">
                Conveniently located on Main Faizabad Road. Visit us for vehicle appraisals, VIP test drives, and precision maintenance.
              </p>
            </div>
            
            <a
              href={showroomLocation.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              id="btn-open-google-maps"
            >
              <Navigation className="w-4 h-4 text-amber-500" />
              <span>Get Directions</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left: Real Live Google Maps Embed */}
            <div className="lg:col-span-7 h-80 sm:h-96 min-h-[340px] relative bg-stone-100 border border-stone-200 rounded-xl overflow-hidden shadow-inner group">
              <iframe
                title="Exotique Machines Lucknow Location Map"
                src={showroomLocation.embedUrl}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="absolute top-3 right-3 z-10">
                <a
                  href={showroomLocation.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/95 hover:bg-white text-stone-800 hover:text-amber-700 text-[11px] font-bold rounded-lg shadow-md border border-stone-200 backdrop-blur-md flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>Open Full Map</span>
                  <ArrowUpRight className="w-3 h-3 text-amber-700" />
                </a>
              </div>
            </div>

            {/* Right: Selected location info sheet */}
            <div className="lg:col-span-5 bg-stone-50/80 border border-stone-200 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-amber-850 uppercase font-bold tracking-widest block">Active Service Station</span>
                  <h4 className="text-xl font-extrabold text-stone-900 mt-1 uppercase leading-snug">{showroomLocation.name}</h4>
                  <p className="text-xs text-stone-400 mt-0.5">{showroomLocation.subtitle}</p>
                </div>

                <div className="space-y-4 text-xs pt-2">
                  <div className="flex items-start space-x-3.5">
                    <MapPin className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <span className="text-stone-700 leading-relaxed font-light">{showroomLocation.address}</span>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <Phone className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-900">Garima:</span>
                        <a href={`tel:${showroomLocation.phoneGarima.replace(/\s+/g, '')}`} className="font-mono text-stone-700 hover:text-amber-700 transition-colors font-bold">
                          {showroomLocation.phoneGarima}
                        </a>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-900">Akash:</span>
                        <a href={`tel:${showroomLocation.phoneAkash.replace(/\s+/g, '')}`} className="font-mono text-stone-700 hover:text-amber-700 transition-colors font-bold">
                          {showroomLocation.phoneAkash}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="text-stone-600 font-light">{showroomLocation.hours}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons stack */}
              <div className="pt-4 border-t border-stone-200/80 grid grid-cols-2 gap-3">
                <a
                  href={`tel:${showroomLocation.phoneGarima.replace(/\s+/g, '')}`}
                  className="py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                  id="btn-call-hub"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Hub</span>
                </a>

                <a
                  href={`https://wa.me/916390000976?text=${encodeURIComponent("Hello Exotique Machines, I would like to inquire about vehicle service and visit your Lucknow showroom.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                  id="btn-whatsapp-hub"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
);
}
