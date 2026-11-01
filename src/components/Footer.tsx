import React from 'react';
import { ActivePage } from '../types';
import { Mail, Phone, MapPin, ArrowUpRight, ShieldCheck, HeartHandshake, Eye, Star, Instagram, Youtube, Facebook, Lock } from 'lucide-react';

interface FooterProps {
  setActivePage: (page: ActivePage) => void;
  onInventoryClick?: () => void;
}

export default function Footer({ setActivePage, onInventoryClick }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-50 text-stone-500 border-t border-stone-200/80 pt-16 pb-8 font-sans" id="app-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div 
              className="flex items-center space-x-2.5 cursor-pointer group shrink-0" 
              onClick={() => { setActivePage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <img src="/logo.png" alt="Exotique Machines" className="h-9 w-auto object-contain rounded-md shadow-sm" />
              <div className="flex flex-col text-left">
                <span className="text-sm sm:text-base md:text-lg font-bold tracking-widest uppercase bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity whitespace-nowrap leading-tight">
                  EXOTIQUE MACHINES
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-amber-700 uppercase leading-none font-mono mt-0.5 whitespace-nowrap">
                  (A UNIT OF SAI BABA CAR SALES PVT LTD)
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-stone-500">
              Lucknow's premier showroom sanctuary for elite performance, sustainable luxury, and bespoke automobile experiences. Excellence in every handpicked detail.
            </p>
            {/* Social Links with Logos */}
            <div className="flex space-x-3 pt-2">
              {[
                {
                  name: 'Instagram',
                  url: 'https://www.instagram.com/exotique_machines_lucknow?exln=MTQ5MXUyZ2dkcGx0OQ==',
                  icon: <Instagram className="w-4 h-4" />,
                  hoverClass: 'hover:bg-gradient-to-tr hover:from-amber-600 hover:via-pink-600 hover:to-purple-600 hover:text-white hover:border-transparent',
                  title: 'Follow Exotique Machines on Instagram'
                },
                {
                  name: 'YouTube',
                  url: 'https://www.youtube.com/@ExotiqueMachinesofficial',
                  icon: <Youtube className="w-4 h-4" />,
                  hoverClass: 'hover:bg-[#FF0000] hover:text-white hover:border-transparent',
                  title: 'Subscribe to Exotique Machines on YouTube'
                },
                {
                  name: 'Facebook',
                  url: 'http://facebook.com/exotiquemachines',
                  icon: <Facebook className="w-4 h-4" />,
                  hoverClass: 'hover:bg-[#1877F2] hover:text-white hover:border-transparent',
                  title: 'Follow Exotique Machines on Facebook'
                }
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-9 h-9 rounded-full bg-stone-200/60 text-stone-600 flex items-center justify-center transition-all duration-300 shadow-sm border border-stone-200 ${social.hoverClass}`}
                  title={social.title}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Nav */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-stone-900 uppercase mb-6 border-l-2 border-amber-600 pl-3">
              Explore Showroom
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { label: 'Premium Inventory', page: 'inventory' },
                { label: 'Bespoke Financing', page: 'finance' },
                { label: 'Exclusive Test Drives', page: 'testdrive' },
                { label: 'Precision Service Hub', page: 'service' },
                { label: 'Festive Privileges', page: 'offers' }
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => {
                      if (link.page === 'inventory' && onInventoryClick) {
                        onInventoryClick();
                      } else {
                        setActivePage(link.page as ActivePage);
                      }
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-amber-700 transition-colors flex items-center space-x-1 group"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-stone-900 uppercase mb-6 border-l-2 border-amber-600 pl-3">
              Elite Support
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 mt-1 text-amber-600 shrink-0" />
                <span className="text-stone-500">
                  Adjacent to Indira Nagar Metro Station, A.Automovers Building, Main Faizabad Road, Lucknow, UP - 226016
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900">Garima:</span>
                    <a href="tel:+916390000976" className="text-stone-600 hover:text-amber-700 font-mono transition-colors">+91 6390000976</a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-stone-900">Akash:</span>
                    <a href="tel:+916390000593" className="text-stone-600 hover:text-amber-700 font-mono transition-colors">+91 6390000593</a>
                  </div>
                </div>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <a href="mailto:infoexotiquelucknow@gmail.com" className="text-stone-600 hover:text-amber-700 transition-colors">
                  infoexotiquelucknow@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Core Guarantees */}
          <div className="space-y-4 bg-white border border-stone-200/60 p-5 rounded-lg shadow-sm">
            <h3 className="text-sm font-semibold tracking-wider text-stone-900 uppercase mb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Exotique Assurance</span>
            </h3>
            <div className="text-xs text-stone-500 space-y-3 leading-relaxed">
              <p className="flex items-center space-x-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Certified 120-Point Inspection</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>3-Year Elite Roadside Assist</span>
              </p>
              <p className="flex items-center space-x-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Original OEM Spares Only</span>
              </p>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center space-x-1">
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                <span>Trusted Service</span>
              </span>
              <span className="text-amber-700 font-mono font-bold flex items-center space-x-1">
                <Star className="w-3 h-3 text-amber-600 fill-current" />
                <span>4.9/5</span>
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-200/80 my-8 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-stone-400">
          <p>© {currentYear} EXOTIQUE MACHINES (Sai Baba Car Sales Pvt Ltd). All Rights Reserved. Crafted with precision for high-performance experiences.</p>
          <div className="flex flex-wrap items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-amber-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-amber-700 transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-amber-700 transition-colors">Whistleblower Policy</a>
            <button
              onClick={() => {
                setActivePage('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-stone-500 hover:text-amber-700 transition-colors flex items-center space-x-1 font-semibold"
              title="Staff Portal (Upload / Edit / Delete Cars)"
              id="footer-staff-login-button"
            >
              <Lock className="w-3 h-3 text-amber-600 inline" />
              <span>Staff Login</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
