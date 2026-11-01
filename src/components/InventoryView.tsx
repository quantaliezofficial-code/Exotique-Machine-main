import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, ActivePage } from '../types';
import { VEHICLES, BRANDS, PREMIUM_BRANDS, NON_PREMIUM_BRANDS } from '../data';
import { SlidersHorizontal, ArrowUpDown, Check, Info, HelpCircle, X, Shuffle, CheckCircle, Car, Heart, Star } from 'lucide-react';
import { VehicleCardSkeleton } from './Skeleton';

interface InventoryViewProps {
  onSelectVehicle: (id: string) => void;
  searchFilters: {
    brand: string;
    budget: string;
    fuel: string;
    transmission: string;
  };
  setSearchFilters: (filters: {
    brand: string;
    budget: string;
    fuel: string;
    transmission: string;
  }) => void;
  setActivePage: (page: ActivePage) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  vehicles?: Vehicle[];
}

export default function InventoryView({
  onSelectVehicle,
  searchFilters,
  setSearchFilters,
  setActivePage,
  favorites,
  toggleFavorite,
  vehicles
}: InventoryViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;

  // Filters State
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'premium' | 'non-premium'>('all');
  const [maxBudget, setMaxBudget] = useState<number>(250); // in Lakhs
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedTransmission, setSelectedTransmission] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('Popularity');

  // Dynamic slider bounds based on active segment
  const sliderConfig = useMemo(() => {
    if (selectedSegment === 'non-premium') {
      return { min: 1, max: 25, step: 1, minLabel: '₹1L', midLabel: '₹12.5L', maxLabel: '₹25L' };
    }
    if (selectedSegment === 'premium') {
      return { min: 5, max: 250, step: 5, minLabel: '₹5L', midLabel: '₹1.25Cr', maxLabel: '₹2.5Cr' };
    }
    return { min: 1, max: 250, step: 5, minLabel: '₹1L', midLabel: '₹1.25Cr', maxLabel: '₹2.5Cr' };
  }, [selectedSegment]);

  // Loading & Mobile States
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Vehicle Comparison State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);

  // Debounce the search input updates to prevent main thread lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Trigger loading state for quick premium skeleton feedback when filter parameters change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedBrands, selectedSegment, maxBudget, selectedFuels, selectedTransmission, searchQuery, sortBy]);

  // Initialize filters from searchFilters prop (passed from Home Search Widget)
  useEffect(() => {
    if (searchFilters.brand && searchFilters.brand !== 'All') {
      setSelectedBrands([searchFilters.brand]);
    } else {
      setSelectedBrands([]);
    }

    if (searchFilters.fuel && searchFilters.fuel !== 'All') {
      setSelectedFuels([searchFilters.fuel]);
    } else {
      setSelectedFuels([]);
    }

    if (searchFilters.transmission && searchFilters.transmission !== 'All') {
      setSelectedTransmission(searchFilters.transmission);
    } else {
      setSelectedTransmission('All');
    }

    if (searchFilters.budget && searchFilters.budget !== 'Any Budget') {
      const budgetText = searchFilters.budget;
      if (budgetText.includes('15L - 30L') || budgetText.includes('15')) {
        setMaxBudget(30);
      } else if (budgetText.includes('30L - 50L') || budgetText.includes('30')) {
        setMaxBudget(50);
      } else if (budgetText.includes('50L+')) {
        setMaxBudget(250);
      } else if (budgetText.includes('5L - 15L') || budgetText.includes('5')) {
        setMaxBudget(15);
      }
    } else {
      setMaxBudget(250);
    }
  }, [searchFilters]);

  // Handle Segment Change (All / Premium / Non-Premium)
  const handleSegmentChange = (segment: 'all' | 'premium' | 'non-premium') => {
    setSelectedSegment(segment);
    if (segment === 'all') {
      setSelectedBrands([]);
      setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
      if (maxBudget < 1) setMaxBudget(250);
    } else if (segment === 'non-premium') {
      if (maxBudget > 25 || maxBudget < 1) setMaxBudget(25);
    } else if (segment === 'premium') {
      if (maxBudget < 5) setMaxBudget(250);
    }
  };

  // Handle Brand Filter Toggles
  const handleBrandChange = (brand: string, section?: 'premium' | 'non-premium') => {
    let next: string[];
    if (selectedBrands.includes(brand)) {
      next = selectedBrands.filter(b => b !== brand);
    } else {
      next = [...selectedBrands, brand];
    }
    setSelectedBrands(next);

    // Auto-align segment if user selected brands exclusively in one section
    if (section && next.length > 0) {
      const allPrem = next.every(b => (PREMIUM_BRANDS as readonly string[]).includes(b));
      const allNonPrem = next.every(b => (NON_PREMIUM_BRANDS as readonly string[]).includes(b));
      if (allPrem && selectedSegment !== 'premium') {
        setSelectedSegment('premium');
        if (maxBudget < 5) setMaxBudget(250);
      } else if (allNonPrem && selectedSegment !== 'non-premium') {
        setSelectedSegment('non-premium');
        if (maxBudget > 25) setMaxBudget(25);
      }
    }
  };

  // Handle Fuel Filter Toggles
  const handleFuelChange = (fuel: string) => {
    if (selectedFuels.includes(fuel)) {
      setSelectedFuels(selectedFuels.filter(f => f !== fuel));
    } else {
      setSelectedFuels([...selectedFuels, fuel]);
    }
  };

  // Reset all local filters
  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedSegment('all');
    setMaxBudget(250);
    setSelectedFuels([]);
    setSelectedTransmission('All');
    setSearchInput('');
    setSearchQuery('');
    setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
  };

  // Filter & Sort Logic
  const filteredVehicles = useMemo(() => {
    let list = [...vehicleList];

    // 1. Text Search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      list = list.filter(v => 
        v.brand.toLowerCase().includes(query) || 
        v.model.toLowerCase().includes(query) ||
        v.type.toLowerCase().includes(query)
      );
    }

    // 2. Segment Filter (Premium ₹5L-2.5Cr, Non-Premium ₹1L-25L)
    if (selectedSegment === 'premium') {
      list = list.filter(v => (v.category === 'premium' || (PREMIUM_BRANDS as readonly string[]).includes(v.brand)) && v.price >= 5 && v.price <= 250);
    } else if (selectedSegment === 'non-premium') {
      list = list.filter(v => (v.category === 'non-premium' || (NON_PREMIUM_BRANDS as readonly string[]).includes(v.brand)) && v.price >= 1 && v.price <= 25);
    }

    // 3. Brand Checkboxes
    if (selectedBrands.length > 0) {
      list = list.filter(v => selectedBrands.includes(v.brand));
    }

    // 4. Budget Limit (slider)
    list = list.filter(v => v.price <= maxBudget);

    // 4. Fuel Checkboxes
    if (selectedFuels.length > 0) {
      list = list.filter(v => selectedFuels.includes(v.fuel));
    }

    // 5. Transmission Option
    if (selectedTransmission !== 'All') {
      list = list.filter(v => v.transmission === selectedTransmission);
    }

    // 6. Sorting
    if (sortBy === 'Price: Low to High') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'Price: High to Low') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'Rating') {
      list.sort((a, b) => b.rating - a.rating);
    } // Default "Popularity" maintains array design sequence

    return list;
  }, [vehicleList, selectedBrands, selectedSegment, maxBudget, selectedFuels, selectedTransmission, searchQuery, sortBy]);

  // Handle Compare list
  const handleCompareToggle = (id: string) => {
    if (comparedIds.includes(id)) {
      setComparedIds(comparedIds.filter(item => item !== id));
    } else {
      if (comparedIds.length >= 3) {
        alert("You can compare up to 3 vehicles at a time.");
        return;
      }
      setComparedIds([...comparedIds, id]);
    }
  };

  const comparedVehicles = useMemo(() => {
    return vehicleList.filter(v => comparedIds.includes(v.id));
  }, [vehicleList, comparedIds]);

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="inventory-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-200/80 pb-8 mb-8 gap-4">
          <div>
            <span className="text-amber-700 font-mono text-xs uppercase tracking-widest font-semibold">Premium Showroom</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Showroom Inventory</h1>
            <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
              Explore our curated selection of high-performance luxury, hybrid, and sustainable electric vehicles.
            </p>
          </div>
          <div className="bg-stone-100 border border-stone-200 rounded-lg px-4 py-2.5 text-xs text-stone-500 font-mono">
            Showing <span className="text-amber-700 font-bold">{filteredVehicles.length}</span> of <span className="text-stone-900 font-bold">{vehicleList.length}</span> luxury builds
          </div>
        </div>

        {/* Toolbar: Search input + Sorting dropdown */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-stone-200 rounded-xl p-4 mb-8 gap-4 shadow-sm" id="inventory-toolbar">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search make or model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-amber-600 focus:outline-none focus:bg-white text-stone-900"
              id="inventory-search-input"
            />
            <span className="absolute left-3 top-3.5 text-stone-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-stone-500 font-medium shrink-0 flex items-center space-x-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort By:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-stone-50 text-stone-800 text-xs font-semibold border border-stone-200 rounded-md px-3 py-2.5 focus:border-amber-600 focus:outline-none cursor-pointer hover:border-amber-650/30"
              id="inventory-sort-select"
            >
              <option value="Popularity">Popularity Sequence</option>
              <option value="Price: Low to High">Price: Low to High</option>
              <option value="Price: High to Low">Price: High to Low</option>
              <option value="Rating">Customer Ratings</option>
            </select>
          </div>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setIsMobileFiltersOpen(true)}
            className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-extrabold text-xs tracking-wider uppercase rounded-lg shadow-lg shadow-stone-950/15 flex items-center justify-center space-x-2"
            id="mobile-filters-trigger"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Showroom Filters ({selectedBrands.length + (selectedSegment !== 'all' ? 1 : 0) + (maxBudget !== sliderConfig.max ? 1 : 0) + selectedFuels.length + (selectedTransmission !== 'All' ? 1 : 0)})</span>
          </button>
        </div>

        {/* Filters and Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filters - Desktop only */}
          <div className="hidden lg:block lg:col-span-1 bg-white border border-stone-200 rounded-xl p-6 self-start space-y-8 shadow-sm lg:sticky lg:top-24 h-fit" id="sidebar-filters">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                <span>Filters</span>
              </h3>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-medium text-amber-700 hover:text-amber-800 transition-colors"
              >
                Reset All
              </button>
            </div>

            {/* Category Segment Selector */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Category Selection</h4>
              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleSegmentChange('all')}
                  className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                    selectedSegment === 'all'
                      ? 'bg-white text-stone-900 shadow-sm font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  All Cars
                </button>
                <button
                  type="button"
                  onClick={() => handleSegmentChange('premium')}
                  className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                    selectedSegment === 'premium'
                      ? 'bg-amber-600 text-white shadow-sm font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="₹5 Lakh to ₹2.5 Crore"
                >
                  Premium
                </button>
                <button
                  type="button"
                  onClick={() => handleSegmentChange('non-premium')}
                  className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                    selectedSegment === 'non-premium'
                      ? 'bg-stone-800 text-white shadow-sm font-bold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="₹1 Lakh to ₹25 Lakhs"
                >
                  Non-Prem
                </button>
              </div>
            </div>

            {/* Brand Selection - Two Distinct Sections */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Brand Selection</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrands([]);
                      setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                      selectedBrands.length === 0
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                    }`}
                  >
                    All Brands
                  </button>
                </div>
                {selectedBrands.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedBrands([]);
                      setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
                    }}
                    className="text-[10px] text-amber-700 hover:underline font-semibold"
                  >
                    Clear ({selectedBrands.length})
                  </button>
                )}
              </div>

              {/* Section 1: Premium Cars */}
              <div className="bg-gradient-to-br from-amber-50/70 to-amber-100/30 rounded-xl p-3 border border-amber-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Premium Cars</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    ₹5L – ₹2.5 Cr
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {PREMIUM_BRANDS.map((brand) => (
                    <label key={brand} className="flex items-center space-x-2.5 text-xs sm:text-sm text-stone-700 cursor-pointer hover:text-stone-950 transition-colors py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => handleBrandChange(brand, 'premium')}
                        className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                      />
                      <span className="font-medium">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 2: Non-Premium Cars */}
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                  <div className="flex items-center space-x-1.5">
                    <Car className="w-3.5 h-3.5 text-stone-600" />
                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Non-Premium Cars</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-full">
                    ₹1L – ₹25 Lakh
                  </span>
                </div>
                <div className="space-y-1.5 pt-0.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  {NON_PREMIUM_BRANDS.map((brand) => (
                    <label key={brand} className="flex items-center space-x-2.5 text-xs sm:text-sm text-stone-700 cursor-pointer hover:text-stone-950 transition-colors py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => handleBrandChange(brand, 'non-premium')}
                        className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                      />
                      <span className="font-medium">{brand}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Range Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Max Budget</h4>
                <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                  {maxBudget >= 100 ? `₹${(maxBudget / 100).toFixed(2)} Cr` : `₹${maxBudget} Lakhs`}
                </span>
              </div>
              <input
                type="range"
                min={sliderConfig.min}
                max={sliderConfig.max}
                step={sliderConfig.step}
                value={maxBudget > sliderConfig.max ? sliderConfig.max : maxBudget < sliderConfig.min ? sliderConfig.min : maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value))}
                className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                <span>{sliderConfig.minLabel}</span>
                <span>{sliderConfig.midLabel}</span>
                <span>{sliderConfig.maxLabel}</span>
              </div>
            </div>

            {/* Fuel Radio / Multi-checkboxes */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Fuel Infrastructure</h4>
              <div className="space-y-2">
                {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'].map((fuel) => (
                  <label key={fuel} className="flex items-center space-x-2.5 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedFuels.includes(fuel)}
                      onChange={() => handleFuelChange(fuel)}
                      className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                    />
                    <span>{fuel}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Transmission */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Transmission</h4>
              <div className="flex flex-wrap gap-2">
                {['All', 'Automatic', 'Manual'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTransmission(type)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                      selectedTransmission === type
                        ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-md'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid Layout / Main showroom segment */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6" id="vehicles-grid-skeletons">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <VehicleCardSkeleton key={idx} />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="bg-white border border-dashed border-stone-200 rounded-xl p-12 text-center text-stone-400 space-y-4 shadow-sm">
                <Car className="w-12 h-12 text-stone-300 mx-auto" />
                <p className="text-base font-semibold text-stone-600">No high-performance vehicles match your parameters.</p>
                <button
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 bg-stone-900 text-white text-xs font-bold uppercase tracking-wider rounded"
                >
                  Reset Showroom Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6" id="vehicles-grid">
                {filteredVehicles.map((vehicle) => {
                  const isCompared = comparedIds.includes(vehicle.id);
                  const isFavorited = favorites.includes(vehicle.id);
                  
                  // Optimize Unsplash image references with lightweight performance query tags
                  const gridImageUrl = vehicle.images[0].includes('unsplash.com') && vehicle.images[0].includes('w=1200')
                    ? vehicle.images[0].replace('w=1200', 'w=600')
                    : vehicle.images[0];

                  return (
                    <div
                      key={vehicle.id}
                      className="group bg-white border border-stone-200 hover:border-amber-600/30 rounded-xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md"
                      id={`vehicle-card-${vehicle.id}`}
                    >
                      {/* Image Stage */}
                      <div className="relative aspect-[16/10] w-full bg-stone-950 overflow-hidden">
                        <img
                          src={gridImageUrl}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        
                        {/* Badges on image */}
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                          <span className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-amber-800 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-600/20 shadow-sm">
                            {vehicle.badge}
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            {/* Bookmarking Heart feedback */}
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(vehicle.id);
                              }}
                              className="p-1.5 rounded-full bg-white/90 backdrop-blur-md text-stone-500 hover:text-red-500 hover:bg-white transition-all border border-stone-200 active:scale-90 shadow-sm cursor-pointer"
                              title={isFavorited ? "Remove from Garage" : "Bookmark Vehicle"}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'text-red-500 fill-current' : ''}`} />
                            </button>
                            
                            <span className="px-2.5 py-1 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider rounded shadow-md flex items-center space-x-1">
                              <Star className="w-3 h-3 text-black fill-current" />
                              <span>{vehicle.rating}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-medium text-stone-400 font-mono tracking-widest uppercase">{vehicle.brand}</span>
                              {vehicle.category === 'premium' ? (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                  Premium
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded border border-stone-200">
                                  ₹1L–25L
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-stone-600">
                              {vehicle.type}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-stone-900 mt-1 group-hover:text-amber-700 transition-colors">
                            {vehicle.model}
                          </h3>

                          {/* Horizontal specs pills */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            <span className="text-[10px] font-semibold bg-stone-55 text-stone-500 bg-stone-100 px-2 py-1 rounded">
                              {vehicle.fuel}
                            </span>
                            <span className="text-[10px] font-semibold bg-stone-55 text-stone-500 bg-stone-100 px-2 py-1 rounded">
                              {vehicle.transmission}
                            </span>
                            <span className="text-[10px] font-semibold bg-stone-55 text-stone-500 bg-stone-100 px-2 py-1 rounded">
                              {vehicle.seats} Seats
                            </span>
                            <span className="text-[10px] font-semibold bg-stone-55 text-stone-500 bg-stone-100 px-2 py-1 rounded font-mono">
                              {vehicle.mileage}
                            </span>
                          </div>
                        </div>

                        {/* Pricing & Compare Options */}
                        <div className="border-t border-stone-100 pt-4 mt-5 flex justify-between items-end">
                          <div>
                            <span className="text-stone-400 text-[10px] uppercase font-semibold">Ex-Showroom Price</span>
                            <p className="text-xl font-black text-amber-850">₹ {vehicle.price >= 100 ? `${(vehicle.price / 100).toFixed(2)} Cr` : `${vehicle.price.toFixed(2)} Lakh`}*</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">EMI from <span className="font-semibold text-stone-800">₹{vehicle.emi.toLocaleString()}/mo</span></p>
                          </div>

                          {/* Compare Checkbox */}
                          <label className="flex items-center space-x-1.5 text-xs text-stone-500 cursor-pointer select-none pb-1">
                            <input
                              type="checkbox"
                              checked={isCompared}
                              onChange={() => handleCompareToggle(vehicle.id)}
                              className="w-3.5 h-3.5 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                            />
                            <span className={isCompared ? 'text-amber-700 font-semibold' : 'hover:text-stone-800 transition-colors'}>Compare</span>
                          </label>
                        </div>
                      </div>

                      {/* Action Grid Footer */}
                      <div className="grid grid-cols-1 border-t border-stone-100">
                        <button
                          onClick={() => onSelectVehicle(vehicle.id)}
                          className="w-full py-3.5 bg-stone-50 hover:bg-stone-900 text-stone-700 hover:text-white font-extrabold text-xs tracking-wider uppercase transition-all duration-300 cursor-pointer"
                        >
                          View Full Specifications
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Slide-out Filters Drawer */}
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-sm lg:hidden flex justify-end" id="mobile-filters-drawer-overlay">
            <div className="w-full max-w-sm bg-white border-l border-stone-200 p-6 h-full flex flex-col justify-between overflow-y-auto" id="mobile-filters-drawer-content">
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-stone-100 pb-4">
                  <h3 className="text-base font-bold uppercase tracking-wider text-stone-900 flex items-center space-x-2">
                    <SlidersHorizontal className="w-5 h-5 text-amber-700" />
                    <span>Showroom Filters</span>
                  </h3>
                  <button
                    onClick={() => setIsMobileFiltersOpen(false)}
                    className="p-1.5 bg-stone-50 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category Segment Selector */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Category Selection</h4>
                  <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSegmentChange('all')}
                      className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                        selectedSegment === 'all'
                          ? 'bg-white text-stone-900 shadow-sm font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      All Cars
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSegmentChange('premium')}
                      className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                        selectedSegment === 'premium'
                          ? 'bg-amber-600 text-white shadow-sm font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                      title="₹5 Lakh to ₹2.5 Crore"
                    >
                      Premium
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSegmentChange('non-premium')}
                      className={`py-1.5 px-1.5 rounded-md transition-all text-center ${
                        selectedSegment === 'non-premium'
                          ? 'bg-stone-800 text-white shadow-sm font-bold'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                      title="₹1 Lakh to ₹25 Lakhs"
                    >
                      Non-Prem
                    </button>
                  </div>
                </div>

                {/* Brand Selection - Two Distinct Sections */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Brand Selection</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBrands([]);
                          setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                          selectedBrands.length === 0
                            ? 'bg-amber-700 text-white shadow-xs'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                      >
                        All Brands
                      </button>
                    </div>
                    {selectedBrands.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedBrands([]);
                          setSearchFilters({ brand: 'All', budget: 'Any Budget', fuel: 'All', transmission: 'All' });
                        }}
                        className="text-[10px] text-amber-700 hover:underline font-semibold"
                      >
                        Clear ({selectedBrands.length})
                      </button>
                    )}
                  </div>

                  {/* Section 1: Premium Cars */}
                  <div className="bg-gradient-to-br from-amber-50/70 to-amber-100/30 rounded-xl p-3 border border-amber-200/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Premium Cars</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                        ₹5L – ₹2.5 Cr
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-0.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {PREMIUM_BRANDS.map((brand) => (
                        <label key={brand} className="flex items-center space-x-2.5 text-xs sm:text-sm text-stone-700 cursor-pointer hover:text-stone-950 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => handleBrandChange(brand, 'premium')}
                            className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                          />
                          <span className="font-medium">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Non-Premium Cars */}
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-200">
                      <div className="flex items-center space-x-1.5">
                        <Car className="w-3.5 h-3.5 text-stone-600" />
                        <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">Non-Premium Cars</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-stone-700 bg-stone-200 px-2 py-0.5 rounded-full">
                        ₹1L – ₹25 Lakh
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-0.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {NON_PREMIUM_BRANDS.map((brand) => (
                        <label key={brand} className="flex items-center space-x-2.5 text-xs sm:text-sm text-stone-700 cursor-pointer hover:text-stone-950 transition-colors py-0.5">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => handleBrandChange(brand, 'non-premium')}
                            className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                          />
                          <span className="font-medium">{brand}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Budget Range Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Max Budget</h4>
                    <span className="text-xs font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-100 rounded">
                      {maxBudget >= 100 ? `₹${(maxBudget / 100).toFixed(2)} Cr` : `₹${maxBudget} Lakhs`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={sliderConfig.min}
                    max={sliderConfig.max}
                    step={sliderConfig.step}
                    value={maxBudget > sliderConfig.max ? sliderConfig.max : maxBudget < sliderConfig.min ? sliderConfig.min : maxBudget}
                    onChange={(e) => setMaxBudget(Number(e.target.value))}
                    className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                    <span>{sliderConfig.minLabel}</span>
                    <span>{sliderConfig.midLabel}</span>
                    <span>{sliderConfig.maxLabel}</span>
                  </div>
                </div>

                {/* Fuel Radio / Multi-checkboxes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Fuel Infrastructure</h4>
                  <div className="space-y-2">
                    {['Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG'].map((fuel) => (
                      <label key={fuel} className="flex items-center space-x-2.5 text-sm text-stone-600 cursor-pointer hover:text-stone-900 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedFuels.includes(fuel)}
                          onChange={() => handleFuelChange(fuel)}
                          className="w-4 h-4 bg-white rounded border-stone-300 text-amber-600 focus:ring-amber-600/20"
                        />
                        <span>{fuel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Transmission */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400">Transmission</h4>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Automatic', 'Manual'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedTransmission(type)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                          selectedTransmission === type
                            ? 'bg-stone-900 text-white border-stone-900 font-bold shadow-md'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-stone-900 hover:bg-stone-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-stone-100 flex gap-3">
                <button
                  onClick={handleResetFilters}
                  className="w-1/2 py-3 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-bold uppercase tracking-wider rounded-lg border border-stone-200"
                >
                  Reset All
                </button>
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="w-1/2 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-lg shadow-md"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comparison floating Drawer */}
        {comparedIds.length > 0 && (
          <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-40 bg-[#0F1116] border-t border-amber-500/40 shadow-2xl p-4 sm:p-6" id="compare-drawer">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Shuffle className="w-4 h-4 text-amber-400" />
                  <span>Compare Vehicles ({comparedIds.length}/3)</span>
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Evaluate mechanical and technical specs side-by-side.</p>
              </div>

              {/* Grid of selected vehicles */}
              <div className="flex-1 max-w-lg grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {comparedVehicles.map(v => (
                  <div key={v.id} className="bg-[#1A1F2B] border border-gray-800 rounded p-2 relative flex items-center space-x-2">
                    <img src={v.images[0]} alt={v.model} referrerPolicy="no-referrer" className="w-8 h-8 rounded object-cover" />
                    <div className="truncate flex-1">
                      <p className="text-[10px] font-bold text-white truncate">{v.model}</p>
                      <p className="text-[9px] text-amber-400 font-semibold">₹{v.price}L</p>
                    </div>
                    <button
                      onClick={() => handleCompareToggle(v.id)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                
                {/* Empty slots */}
                {Array.from({ length: 3 - comparedIds.length }).map((_, index) => (
                  <div key={index} className="bg-[#1A1F2B]/30 border border-dashed border-gray-800 rounded p-2 flex items-center justify-center text-[10px] text-gray-600">
                    + Empty Slot
                  </div>
                ))}
              </div>

              {/* Drawer actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setComparedIds([])}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Clear All
                </button>
                <button
                  disabled={comparedIds.length < 2}
                  onClick={() => setIsCompareDrawerOpen(true)}
                  className={`px-5 py-2.5 rounded text-xs font-extrabold tracking-wider uppercase transition-colors flex items-center space-x-2 ${
                    comparedIds.length >= 2
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/15'
                      : 'bg-white/5 text-gray-500 cursor-not-allowed border border-gray-800'
                  }`}
                >
                  <span>Compare Now</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Spec Comparison Modal */}
        {isCompareDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0F1116] border border-amber-500/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
              
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                <div>
                  <h3 className="text-xl font-extrabold text-white flex items-center space-x-2.5">
                    <Shuffle className="w-5 h-5 text-amber-400" />
                    <span>Technical Comparison Specification</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Side-by-side diagnostic evaluation of luxury features</p>
                </div>
                <button
                  onClick={() => setIsCompareDrawerOpen(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Specs Table Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]" id="comparison-matrix-table">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-1/4">Spec Class</th>
                      {comparedVehicles.map(v => (
                        <th key={v.id} className="py-4 px-4 text-center">
                          <img src={v.images[0]} alt={v.model} referrerPolicy="no-referrer" className="w-20 h-12 object-cover rounded mx-auto mb-2" />
                          <p className="text-sm font-bold text-white">{v.brand} {v.model}</p>
                          <p className="text-xs font-black text-amber-400 mt-0.5">₹{v.price} Lakh*</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-sm">
                    {/* Ex-Showroom Price */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Price</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center font-mono font-bold text-white">₹{v.price}L</td>
                      ))}
                    </tr>
                    {/* Fuel Infrastructure */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Fuel Type</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center text-gray-300 font-semibold">{v.fuel}</td>
                      ))}
                    </tr>
                    {/* Transmission */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Transmission</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center text-gray-300">{v.transmission}</td>
                      ))}
                    </tr>
                    {/* Engine Displacement */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Engine / Battery</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center text-xs text-gray-400">{v.engine}</td>
                      ))}
                    </tr>
                    {/* Max Power output */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Max Power</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center text-xs text-gray-400">{v.power}</td>
                      ))}
                    </tr>
                    {/* Seating Space */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Seating Capacity</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center text-gray-300">{v.seats} Seats</td>
                      ))}
                    </tr>
                    {/* Segment Mileage */}
                    <tr>
                      <td className="py-3.5 font-semibold text-gray-400">Mileage / Range</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-3.5 px-4 text-center font-mono text-gray-300">{v.mileage}</td>
                      ))}
                    </tr>
                    {/* Key Premium Tech */}
                    <tr>
                      <td className="py-4 font-semibold text-gray-400 valign-top align-top pt-4">Highlight Technology</td>
                      {comparedVehicles.map(v => (
                        <td key={v.id} className="py-4 px-4 text-xs text-gray-400 valign-top align-top">
                          <ul className="list-disc list-inside space-y-1 text-left max-w-[200px] mx-auto">
                            {v.features.slice(0, 3).map((f, i) => (
                              <li key={i} className="truncate">{f}</li>
                            ))}
                          </ul>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 gap-4 border-t border-gray-800">
                <button
                  onClick={() => setIsCompareDrawerOpen(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Close Matrix
                </button>
                <button
                  onClick={() => {
                    // Navigate to test drive page
                    setIsCompareDrawerOpen(false);
                    setActivePage('testdrive');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-bold uppercase tracking-wider shadow-lg shadow-amber-500/10 transition-colors"
                >
                  Book Test Drives for Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
