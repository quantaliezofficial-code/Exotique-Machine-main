import React, { useState } from 'react';
import { ActivePage } from '../types';
import { Search, Menu, X, Car, DollarSign, PenTool, RefreshCw, Calendar, Tag, Heart, Lock } from 'lucide-react';

interface HeaderProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onEnquireClick: () => void;
  onGarageClick: () => void;
  savedCount: number;
  onInventoryClick?: () => void;
}

export default function Header({ activePage, setActivePage, onEnquireClick, onGarageClick, savedCount, onInventoryClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems: { label: string; page: ActivePage; icon: React.ReactNode }[] = [
    { label: 'Inventory', page: 'inventory', icon: <Car className="w-4 h-4" /> },
    { label: 'Finance', page: 'finance', icon: <DollarSign className="w-4 h-4" /> },
    { label: 'Book Test Drive', page: 'testdrive', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Service', page: 'service', icon: <PenTool className="w-4 h-4" /> },
    { label: 'Offers', page: 'offers', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF9]/95 border-b border-stone-200/80 backdrop-blur-md text-stone-900 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div 
            onClick={() => { setActivePage('home'); setIsOpen(false); }} 
            className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0"
            id="header-logo"
          >
            <img src="/logo.png" alt="Exotique Machines" className="h-8 sm:h-9 md:h-10 w-auto object-contain rounded-lg shadow-sm" />
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-base md:text-lg font-bold tracking-widest uppercase bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity whitespace-nowrap leading-tight">
                EXOTIQUE MACHINES
              </span>
              <span className="text-[6.5px] min-[360px]:text-[7.5px] sm:text-[8.5px] md:text-[9px] font-bold tracking-wider text-amber-700 uppercase leading-none font-mono whitespace-nowrap mt-0.5">
                (A UNIT OF SAI BABA CAR SALES PVT LTD)
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-1" id="desktop-nav">
            {navItems.map((item) => (
              <button
                key={item.page}
                id={`nav-item-${item.page}`}
                onClick={() => {
                  if (item.page === 'inventory' && onInventoryClick) {
                    onInventoryClick();
                  } else {
                    setActivePage(item.page);
                  }
                }}
                className={`relative px-4 py-2 text-sm font-medium tracking-wide transition-all duration-300 rounded-lg hover:bg-stone-100 flex items-center space-x-1.5 ${
                  activePage === item.page
                    ? 'text-amber-700 font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>{item.label}</span>
                {activePage === item.page && (
                  <span className="absolute bottom-1 left-4 right-4 h-[2px] bg-amber-600 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center space-x-4" id="desktop-actions">
            <button 
              onClick={() => {
                if (onInventoryClick) {
                  onInventoryClick();
                } else {
                  setActivePage('inventory');
                }
              }}
              className="p-2 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-full transition-colors"
              title="Search Inventory"
              id="btn-search-header"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Garage/Saved Sessions Hub */}
            <button
              onClick={onGarageClick}
              className="relative p-2.5 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-full transition-all flex items-center justify-center border border-stone-200 hover:border-amber-500/30"
              title="Open My Garage Hub"
              id="btn-garage-header"
            >
              <Heart className="w-4.5 h-4.5 text-red-500 fill-current" />
              {savedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white font-mono font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-lg shadow-amber-600/20">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Staff / Dealer Portal Access */}
            <button
              onClick={() => setActivePage('admin')}
              className={`p-2.5 rounded-full transition-all border ${
                activePage === 'admin'
                  ? 'bg-amber-500/10 text-amber-700 border-amber-600/40 ring-2 ring-amber-600/20'
                  : 'text-stone-400 hover:text-amber-700 hover:bg-stone-100 border-stone-200'
              }`}
              title="Staff & Inventory Management Portal"
              id="btn-admin-header"
            >
              <Lock className="w-4.5 h-4.5" />
            </button>
            
            <button
              onClick={onEnquireClick}
              className="px-5 py-2.5 text-xs font-extrabold tracking-[0.08em] uppercase bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-95 cursor-pointer"
              id="btn-enquire-header"
            >
              Enquire Now
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-1.5 min-[375px]:space-x-2.5">
            {/* Mobile Garage Button */}
            <button
              onClick={onGarageClick}
              className="relative p-1.5 sm:p-2 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-full transition-all flex items-center justify-center border border-stone-200"
              title="Open My Garage"
              id="btn-garage-header-mobile"
            >
              <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-500 fill-current" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white font-mono font-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={onEnquireClick}
              className="px-2.5 min-[375px]:px-3.5 py-1.5 min-[375px]:py-2 text-[9px] min-[375px]:text-[10px] font-extrabold tracking-[0.05em] uppercase bg-stone-900 text-white rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
              id="btn-enquire-header-mobile"
            >
              Enquire
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 sm:p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg focus:outline-none"
              aria-label="Toggle menu"
              id="btn-mobile-menu"
            >
              {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden bg-[#FAFAF9] border-b border-stone-200 transition-all" id="mobile-menu-drawer">
          <div className="px-2 pt-2 pb-6 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.page}
                id={`nav-item-mobile-${item.page}`}
                onClick={() => {
                  if (item.page === 'inventory' && onInventoryClick) {
                    onInventoryClick();
                  } else {
                    setActivePage(item.page);
                  }
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg text-base font-medium transition-colors ${
                  activePage === item.page
                    ? 'bg-amber-50 text-amber-700 font-semibold border-l-4 border-amber-600'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            <div className="pt-2 border-t border-stone-200">
              <button
                id="nav-item-mobile-admin"
                onClick={() => {
                  setActivePage('admin');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                  activePage === 'admin'
                    ? 'bg-amber-50 text-amber-700 font-bold border-l-4 border-amber-600'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Staff & Dealer Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
