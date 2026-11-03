import React, { useState, useEffect, useMemo } from 'react';
import { ActivePage, Vehicle } from '../types';
import { BRANDS, VEHICLES } from '../data';
import { Search, Calendar, ChevronRight, Award, BadgeAlert, Shield, Compass, TrendingUp, Heart, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CardStack } from './CardStack';
import CircularTestimonials from './CircularTestimonials';
import ZoomParallax from './ZoomParallax';
import FlowingMenu from './FlowingMenu';
import LogoCarousel, {
  MercedesIcon,
  BMWIcon,
  ToyotaIcon,
  LandRoverIcon,
} from './LogoCarousel';

const brandLogos = [
  { name: 'Mercedes-Benz', id: 1, img: MercedesIcon },
  { name: 'BMW', id: 2, img: BMWIcon },
  { name: 'Land Rover', id: 3, img: LandRoverIcon },
  { name: 'Toyota', id: 4, img: ToyotaIcon },
  { name: 'Mercedes-Benz', id: 5, img: MercedesIcon },
  { name: 'BMW', id: 6, img: BMWIcon },
  { name: 'Land Rover', id: 7, img: LandRoverIcon },
  { name: 'Toyota', id: 8, img: ToyotaIcon },
];

const userTestimonials = [
  {
    quote: "Every luxury detail feels incredibly curated. The interface response, quiet cabin, and powerful acceleration turn daily city commuting into a highly meditative and relaxing journey.",
    name: "David Lee",
    designation: "Architect & Design Principal",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop"
  },
  {
    quote: "Every drive feels effortless. The transition is smooth, quiet, and powerful — it's like the car understands me before I even move. The responsiveness and control give me confidence on every road.",
    name: "Maria Gonzalez",
    designation: "Urban Commuter & Tech Executive",
    src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop"
  },
  {
    quote: "The Exotique Machines concierge experience is unmatched. Pristine vehicle condition, transparent ownership documentation, expedited finance approvals, and seamless handover make acquiring a certified machine effortless.",
    name: "Sarah Jenkins",
    designation: "Executive Director",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop"
  }
];

const HERO_SLIDES = [
  {
    id: 'bmw-x5-2024-white-32',
    brand: 'BMW',
    model: 'X5 xDrive30d M Sport',
    watermark: 'X5 M SPORT',
    title: 'Command Every Journey',
    desc: 'Exotique Machines certified 2024 BMW X5 xDrive30d LCI M Sport in Mineral White. 22,000 verified kms, M Sport aerodynamics, and Sky Lounge panoramic glass roof.',
    image: '/uploads/DSC04220-1792895012921-827501317.jpg',
    thumbnail: '/uploads/DSC04220-1792895012921-827501317.jpg',
    carCutout: '/uploads/DSC04220-1792895012921-827501317.jpg',
    ctaLabel: 'Explore BMW X5',
    type: 'Certified Luxury Performance SUV',
    targetId: 'featured-elite-fleet'
  },
  {
    id: 'audi-a3-2020-white-26',
    brand: 'Audi',
    model: 'A3 35 TDI Premium Plus',
    watermark: 'AUDI A3',
    title: 'Refined Precision, Pure Performance',
    desc: 'Exotique Machines certified 2020 Audi A3 35 TDI Premium Plus. UP32 registered, 2.0L Turbo Diesel, panoramic sunroof, and pristine showroom condition.',
    image: '/uploads/1O8A2799_JPG-1792888318571-705636993.jpg',
    thumbnail: '/uploads/1O8A2799_JPG-1792888318571-705636993.jpg',
    carCutout: '/uploads/1O8A2799_JPG-1792888318571-705636993.jpg',
    ctaLabel: 'Explore Audi A3',
    type: 'Certified Luxury Sedan',
    targetId: 'featured-elite-fleet'
  },
  {
    id: 'volvo-xc90-2019-white-51',
    brand: 'Volvo',
    model: 'XC90 D5 Inscription',
    watermark: 'VOLVO XC90',
    title: 'Scandinavian Luxury & Safety',
    desc: 'Exotique Machines certified 2019 Volvo XC90 D5 Inscription 7-Seater. Luxury AWD, panoramic glass roof, crystal gearshift, and verified service history.',
    image: '/uploads/1O8A2473_JPG-1792888826798-912125552.jpg',
    thumbnail: '/uploads/1O8A2473_JPG-1792888826798-912125552.jpg',
    carCutout: '/uploads/1O8A2473_JPG-1792888826798-912125552.jpg',
    ctaLabel: 'Explore Volvo XC90',
    type: 'Certified 7-Seater Luxury SUV',
    targetId: 'featured-elite-fleet'
  },
  {
    id: 'mercedes-benz-cla-2018-white-43',
    brand: 'Mercedes-Benz',
    model: 'CLA 200d Urban Sport',
    watermark: 'MERCEDES CLA',
    title: 'Sensual Purity & Aerodynamic Grace',
    desc: 'Exotique Machines certified 2018 Mercedes-Benz CLA 200d Urban Sport. Frameless doors, panoramic glass roof, dynamic driving modes, and sport styling.',
    image: '/uploads/1O8A3190_JPG-1792890803052-217088618.jpg',
    thumbnail: '/uploads/1O8A3190_JPG-1792890803052-217088618.jpg',
    carCutout: '/uploads/1O8A3190_JPG-1792890803052-217088618.jpg',
    ctaLabel: 'Explore Mercedes CLA',
    type: 'Certified Luxury Coupe Sedan',
    targetId: 'featured-elite-fleet'
  },
  {
    id: 'bmw-x1-2019-white-30',
    brand: 'BMW',
    model: 'X1 sDrive20d xLine',
    watermark: 'BMW X1',
    title: 'Urban Agility, Uncompromised Comfort',
    desc: 'Exotique Machines certified 2019 BMW X1 sDrive20d xLine. TwinPower Turbo Diesel, dual panoramic glass roof, and sports leather cockpit.',
    image: '/uploads/1O8A3273_JPG-1792888527857-966383162.jpg',
    thumbnail: '/uploads/1O8A3273_JPG-1792888527857-966383162.jpg',
    carCutout: '/uploads/1O8A3273_JPG-1792888527857-966383162.jpg',
    ctaLabel: 'Explore BMW X1',
    type: 'Certified Luxury Compact SUV',
    targetId: 'featured-elite-fleet'
  },
  {
    id: 'honda-elevate-2024-white-17',
    brand: 'Honda',
    model: 'Elevate ZX CVT Flagship',
    watermark: 'ELEVATE',
    title: 'Modern Sophistication & Space',
    desc: 'Exotique Machines certified 2024 Honda Elevate ZX CVT Flagship. Single 1st owner, 29K kms, advanced safety suite, and wireless connectivity.',
    image: '/uploads/1O8A2642_JPG-1792890601075-381505309.jpg',
    thumbnail: '/uploads/1O8A2642_JPG-1792890601075-381505309.jpg',
    carCutout: '/uploads/1O8A2642_JPG-1792890601075-381505309.jpg',
    ctaLabel: 'Explore Honda Elevate',
    type: 'Certified Flagship SUV',
    targetId: 'featured-elite-fleet'
  }
];

interface HomeViewProps {
  setActivePage: (page: ActivePage) => void;
  setSearchFilters: (filters: {
    brand: string;
    budget: string;
    fuel: string;
    transmission: string;
  }) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onSelectVehicle: (id: string) => void;
  vehicles?: Vehicle[];
}

export default function HomeView({ setActivePage, setSearchFilters, favorites, toggleFavorite, onSelectVehicle, vehicles }: HomeViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;

  // Filter only vehicles that have real uploaded studio photos (Premium luxury cars prioritized first)
  const uploadedVehicles = useMemo(() => {
    const list = vehicleList.filter(v => v.images && v.images.some(img => img.startsWith('/uploads')));
    list.sort((a, b) => {
      if (a.category === 'premium' && b.category !== 'premium') return -1;
      if (a.category !== 'premium' && b.category === 'premium') return 1;
      return (b.price || 0) - (a.price || 0);
    });
    return list.length > 0 ? list : vehicleList;
  }, [vehicleList]);

  // Dynamically compute Hero Slides from vehicles with uploaded studio photos (Premium luxury cars prioritized)
  const heroSlides = useMemo(() => {
    const premiumWithUploads = uploadedVehicles.filter(v => v.category === 'premium');
    const displayList = premiumWithUploads.length > 0 ? premiumWithUploads : uploadedVehicles;

    return displayList.slice(0, 6).map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      watermark: (v.badge?.split('(')[0]?.trim() || v.model || v.brand).toUpperCase(),
      title: v.category === 'premium' ? 'The Statement of Executive Presence' : 'Command Every Journey',
      desc: v.description,
      image: v.images[0],
      thumbnail: v.images[0],
      carCutout: v.images[0],
      ctaLabel: `Explore ${v.brand} ${v.model}`,
      type: v.type || (v.category === 'premium' ? 'Certified Luxury Performance' : 'Certified Pre-Owned Machine'),
      targetId: 'featured-elite-fleet'
    }));
  }, [uploadedVehicles]);

  // Card stack responsive sizing
  const [dimensions, setDimensions] = useState({ width: 520, height: 325 });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        const cardW = Math.min(340, w - 32);
        setDimensions({ width: cardW, height: Math.round(cardW * 0.625) });
      } else if (w < 1024) {
        setDimensions({ width: 440, height: 275 });
      } else {
        setDimensions({ width: 520, height: 325 });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Premium Hero States
  const [activeSlide, setActiveSlide] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  const currentSlide = heroSlides[activeSlide % heroSlides.length] || heroSlides[0];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev === heroSlides.length - 1 ? 0 : prev + 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const handlePrevSlide = () => {
    setActiveSlide(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlide(prev => (prev === heroSlides.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = (clientX - left - width / 2) / (width / 2);
    const y = (clientY - top - height / 2) / (height / 2);
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };



  const handleLifestyleClick = (lifestyle: 'SUV' | 'Luxury' | 'All') => {
    // Apply a specialized lifestyle filter directly
    setSearchFilters({
      brand: 'All',
      budget: 'Any Budget',
      fuel: 'All',
      transmission: 'All'
    });
    setActivePage('inventory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lifestyleItems = [
    { text: 'SUV Fleet', image: '/uploads/1O8A2473_JPG-1792888826798-912125552.jpg', onClick: () => handleLifestyleClick('SUV') },
    { text: 'Executive Luxury', image: '/uploads/1O8A2799_JPG-1792888318571-705636993.jpg', onClick: () => handleLifestyleClick('Luxury') },
    { text: 'M Sport Line', image: '/uploads/DSC04220-1792895012921-827501317.jpg', onClick: () => handleLifestyleClick('All') },
    { text: 'All-Terrain 4x4', image: '/uploads/1O8A2179_JPG-1792661673910-125869344.jpg', onClick: () => handleLifestyleClick('SUV') },
    { text: '7-Seater Luxury', image: '/uploads/1O8A3868_JPG-1792891191327-728378127.jpg', onClick: () => handleLifestyleClick('SUV') }
  ];

  return (
    <div className="bg-[#FAFAF9] text-stone-900 overflow-hidden font-sans" id="home-view">
      {/* Premium Apple / Porsche / Awwwards Style Hero Section */}
      <section 
        className="-mt-16 sm:-mt-20 pt-16 sm:pt-20 min-h-[20dvh]  w-full relative flex flex-col justify-between overflow-hidden bg-stone-950 text-white"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Continuous photographic background filling edge-to-edge */}
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <img
                src={currentSlide.image}
                alt="Luxury Car Background"
                className="w-full h-full object-cover filter brightness-[0.4] contrast-[1.05] saturate-[0.95]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/30" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Oversized Type Layer (Watermark) */}
        <div className="absolute inset-x-0 top-[28%] md:top-[30%] z-10 select-none pointer-events-none text-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.h1
              key={activeSlide}
              initial={{ opacity: 0, scale: 1.15, y: 30 }}
              animate={{ opacity: 0.12, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -25 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[16vw] sm:text-[14vw] lg:text-[12vw] font-black tracking-[0.2em] text-white leading-none font-sans uppercase"
            >
              {currentSlide.watermark}
            </motion.h1>
          </AnimatePresence>
        </div>

        {/* Main Content Layout Container */}
        <div className="max-w-[1500px] w-full mx-auto px-6 sm:px-10 lg:px-16 flex-grow flex flex-col justify-between relative z-20">
          
          {/* Spacer to slide content nicely below top sticky navigation */}
          <div className="h-4 sm:h-24" />

          {/* Built Subject Showcase (Overlaps watermark text visually) */}
          <div className="flex-grow flex items-center justify-center py-2 sm:py-6 md:py-10 z-20 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -30 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => onSelectVehicle(currentSlide.id)}
                className="relative w-full max-w-[340px] sm:max-w-[480px] md:max-w-[680px] lg:max-w-[840px] aspect-[16/10] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.65)] bg-stone-900/30 backdrop-blur-md group cursor-pointer"
                title={`Click to view ${currentSlide.brand} ${currentSlide.model}`}
              >
                <img
                  src={currentSlide.carCutout}
                  alt={currentSlide.model}
                  className="w-full h-full object-cover scale-102 group-hover:scale-106 transition-transform duration-[1.5s] ease-[0.16,1,0.3,1]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/20 z-10 pointer-events-none" />
                
                {/* Elegant overlay badge */}
                <div className="absolute bottom-4 left-6 md:bottom-6 md:left-8 z-20 text-left">
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase bg-amber-600 px-2.5 py-0.5 rounded text-stone-950 mb-2 inline-block shadow-xs">
                    {currentSlide.brand}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-white mb-0.5">
                    {currentSlide.model}
                  </h3>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Controls and Story Info Layout (Grid format) */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-8 items-end mt-auto z-30 pb-6 md:pb-14 pt-4">
            
            {/* Bottom-left anchor: Story Block */}
            <div className="lg:col-span-7 text-left max-w-xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
                    {currentSlide.type}
                  </span>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.1] text-white">
                    {currentSlide.title}
                  </h2>
                  <p className="text-stone-300 text-xs sm:text-sm md:text-base font-light leading-relaxed hidden sm:block">
                    {currentSlide.desc}
                  </p>
                  <div className="pt-1 md:pt-2">
                    <button
                      onClick={() => {
                        if (currentSlide.id && onSelectVehicle) {
                          onSelectVehicle(currentSlide.id);
                        } else if (currentSlide.targetId) {
                          const el = document.getElementById(currentSlide.targetId);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="group inline-flex items-center gap-2.5 bg-white hover:bg-amber-600 text-stone-950 hover:text-white px-6 py-3.5 rounded-full font-semibold text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer active:scale-98"
                    >
                      <span>{currentSlide.ctaLabel}</span>
                      <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom-right anchor: Carousel thumbnails cluster */}
            <div className="lg:col-span-5 flex items-center justify-start lg:justify-end">
              <div className="bg-black/45 backdrop-blur-md border border-white/10 px-5 py-3 rounded-full flex items-center space-x-3.5 shadow-xl">
                {/* Previous Button */}
                <button
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-stone-950 transition-all duration-300 cursor-pointer active:scale-90"
                  title="Previous Slide"
                >
                  <ChevronRight size={15} className="rotate-180" />
                </button>

                {/* Thumbnails row */}
                <div className="flex items-center space-x-2">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setActiveSlide(idx)}
                      className={`relative w-12 h-8 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${
                        activeSlide === idx
                          ? 'ring-2 ring-amber-500 scale-110 shadow-lg'
                          : 'opacity-50 hover:opacity-85'
                      }`}
                    >
                      <img
                        src={slide.thumbnail}
                        alt="Preview thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white hover:text-stone-950 transition-all duration-300 cursor-pointer active:scale-90"
                  title="Next Slide"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust & Stats Bar */}
      <section className="bg-stone-100/80 border-y border-stone-200/80 py-8 px-4" id="stats-bar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center space-y-1">
            <span className="text-3xl font-extrabold text-amber-700 tracking-tight">100%</span>
            <span className="text-xs text-stone-500 uppercase tracking-widest font-medium">Certified 1st-Owner Fleet</span>
          </div>
          <div className="flex flex-col items-center space-y-1 border-y md:border-y-0 md:border-x border-stone-200 py-4 md:py-0">
            <span className="text-3xl font-extrabold text-stone-900 tracking-tight">₹54.50L - ₹2.15Cr</span>
            <span className="text-xs text-amber-700 uppercase tracking-widest font-medium">Verified Showroom Inventory</span>
          </div>
          <div className="flex flex-col items-center space-y-1">
            <span className="text-3xl font-extrabold text-amber-700 tracking-tight flex items-center justify-center space-x-1">
              <span>4.9/5</span>
              <Star className="w-6 h-6 text-amber-600 fill-current shrink-0" />
            </span>
            <span className="text-xs text-stone-500 uppercase tracking-widest font-medium">Elite Customer Satisfaction</span>
          </div>
        </div>
      </section>



      {/* Multiple Premium Brands Available Section with LogoCarousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28" id="brands-available-grid">
        <div className="text-center mb-10 md:mb-14">
          <span className="text-stone-500 font-mono text-[10px] uppercase tracking-widest font-semibold">Multiple Premium Brands Available</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-stone-900 mt-1">Our Featured Elite Automakers</h2>
          <p className="text-stone-500 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed">
            Our showroom offers select high-tier brands to match your exact performance standard and design philosophy. Click any rotating brand card to explore its dedicated fleet.
          </p>
        </div>

        <div className="flex justify-center items-center">
          <LogoCarousel
            columnCount={5}
            logos={brandLogos}
            onLogoClick={(brandName) => {
              setSearchFilters({ brand: brandName, budget: 'Any Budget', fuel: 'All', transmission: 'All' });
              setActivePage('inventory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </section>

      {/* Featured Elite Fleet */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28" id="featured-elite-fleet">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-12">
          <div>
            <span className="text-stone-600 font-mono text-[10px] sm:text-xs uppercase tracking-widest font-semibold flex items-center space-x-2">
              <span>Handpicked Masterpieces</span>
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-stone-900 mt-2">
              Featured Elite Fleet
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-2 max-w-xl font-light leading-relaxed">
              Experience our highest-curated luxury and performance machines, fully cached for real-time engagement.
            </p>
          </div>
          <button
            onClick={() => {
              setActivePage('inventory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[10px] sm:text-xs font-bold text-amber-700 hover:text-amber-600 uppercase tracking-widest mt-6 md:mt-0 flex items-center space-x-1.5 group border border-amber-600/25 px-4 py-2.5 rounded bg-amber-50 hover:bg-amber-100/60 transition-all"
          >
            <span>View All Showroom ({vehicleList.length} Cars)</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="mt-8 sm:mt-12 mb-16 md:mb-24 flex justify-center w-full">
          <CardStack
            items={uploadedVehicles.map((v) => {
              const firstImg = (v.images && v.images.length > 0) ? v.images[0] : '/logo.png';
              return {
                id: v.id,
                title: `${v.brand} ${v.model}`,
                description: v.description,
                imageSrc: firstImg,
                vehicle: v,
              };
            })}
            initialIndex={0}
            autoAdvance
            intervalMs={3000}
            pauseOnHover
            showDots
            cardWidth={dimensions.width}
            cardHeight={dimensions.height}
            renderCard={(item, { active }) => {
              const vehicle = item.vehicle;
              const isFav = favorites.includes(vehicle.id);
              
              return (
                <div 
                  onClick={() => {
                    if (active) onSelectVehicle(vehicle.id);
                  }}
                  className={`relative h-full w-full bg-stone-900 overflow-hidden text-white group/card select-none rounded-2xl ${active ? 'cursor-pointer' : ''}`}
                >
                  {/* Background Image */}
                  <img
                    src={vehicle.images[0]}
                    alt={vehicle.model}
                    loading="eager"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105 opacity-80"
                    draggable={false}
                  />
                  
                  {/* Subtle overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/95 via-stone-950/45 to-stone-950/15" />

                  {/* Top Header Controls (Active Card gets full interactivity) */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    <span className="bg-amber-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase px-2.5 py-1 rounded tracking-wider border border-amber-500/20 shadow-lg">
                      {vehicle.type}
                    </span>
                    <button
                      type="button"
                      disabled={!active}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(vehicle.id);
                      }}
                      className={`p-2 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full transition-all duration-300 border border-white/10 active:scale-95 shadow-md ${!active ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                      title={isFav ? "Remove from Garage" : "Add to Garage"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-current' : 'text-stone-300'}`} />
                    </button>
                  </div>

                  {/* Bottom Content Area */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex flex-col justify-end">
                    <div className="space-y-1">
                      {/* Brand & Rating */}
                      <div className="flex justify-between items-center text-xs text-stone-300 font-mono">
                        <span className="uppercase tracking-widest font-semibold text-[10px]">
                          {vehicle.brand}
                        </span>
                        <span className="bg-white/10 backdrop-blur-sm text-white px-2 py-0.5 rounded flex items-center space-x-1 border border-white/10 font-bold text-[10px]">
                          <Star className="w-2.5 h-2.5 text-amber-500 fill-current" />
                          <span>{vehicle.rating}</span>
                        </span>
                      </div>

                      {/* Model Name */}
                      <h3 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
                        {vehicle.model}
                      </h3>

                      {/* Short Description */}
                      <p className="text-[11px] text-stone-300/95 line-clamp-2 leading-relaxed font-light font-sans">
                        {vehicle.description}
                      </p>
                    </div>

                    {/* Divider and Footer Specs/Price */}
                    <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center">
                      <div>
                        <span className="text-stone-400 text-[9px] uppercase font-semibold block tracking-wider">Ex-Showroom Price</span>
                        <p className="text-base font-black text-amber-500">₹{vehicle.price.toFixed(2)} Lakh*</p>
                      </div>
                      <button
                        disabled={!active}
                        onClick={(e) => {
                          if (!active) return;
                          e.stopPropagation();
                          onSelectVehicle(vehicle.id);
                        }}
                        className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                          active 
                            ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer hover:shadow-lg shadow-amber-600/20 active:scale-95' 
                            : 'bg-white/10 text-white/50 cursor-default'
                        }`}
                      >
                        View Specs
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </section>

      {/* Services We Provide Section */}
      <section className="bg-white pt-16 md:pt-24 lg:pt-28 pb-8 md:pb-14 relative overflow-visible" id="services-provide">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end">
            <div>
              <span className="text-stone-500 font-mono text-[10px] uppercase tracking-widest font-semibold block mb-2">SERVICES WE PROVIDE</span>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight leading-none">
                Bespoke Services <br />
                <span className="bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent">Crafted For The Elite</span>
              </h2>
            </div>
            <p className="text-stone-500 text-xs max-w-sm mt-4 md:mt-0 leading-relaxed font-light">
              Elevate your driving lifestyle. From custom interior tailored designs to track-day curations and elite doorstep delivery, we manage your luxury fleet seamlessly.
            </p>
          </div>
        </div>

        <div className="w-full pb-2">
          <ZoomParallax
            images={[
              {
                src: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&q=80&w=800",
                alt: "Bespoke Customization",
                title: "Bespoke Customization",
                desc: "Handcrafted interior personalization and paint curation."
              },
              {
                src: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&q=80&w=800",
                alt: "Instant Diagnostics",
                title: "Expert Diagnostics",
                desc: "Real-time remote telemetry & precise health checks."
              },
              {
                src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800",
                alt: "Elite Driving Curation",
                title: "Elite Track-Day",
                desc: "High-performance racing curation & professional training."
              },
              {
                src: "https://images.unsplash.com/photo-1563720223523-491ff04651de?auto=format&fit=crop&q=80&w=800",
                alt: "Electric Charging Setup",
                title: "Eco Infrastructure",
                desc: "Seamless home & corporate fast charging installations."
              },
              {
                src: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=800",
                alt: "Doorstep Flatbed Delivery",
                title: "Pristine Delivery",
                desc: "Direct-to-door enclosed flatbed transportation."
              },
              {
                src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
                alt: "Private Advisory Hub",
                title: "Fleet Advisory",
                desc: "Corporate and personal luxury investment portfolio."
              },
              {
                src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=800",
                alt: "Concierge Network",
                title: "24/7 VIP Concierge",
                desc: "Dedicated account managers ready on first ring."
              }
            ]}
          />
        </div>
      </section>

      {/* Customer Testimonials Section (Chery E5 Style) */}
      <section className="bg-white py-16 md:py-24 lg:py-28 border-b border-stone-200/80" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-16">
            <span className="text-stone-500 font-mono text-[10px] uppercase tracking-widest font-semibold">TESTIMONIALS</span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900 uppercase tracking-tight mt-1">What Our Customers Say</h2>
            <p className="text-stone-500 text-sm mt-1 max-w-xl mx-auto font-light">
              Read real stories from our elite owners who experienced the transition into the next era of high-end automotive engineering.
            </p>
          </div>

          <div className="flex justify-center items-center">
            <CircularTestimonials
              testimonials={userTestimonials}
              autoplay={true}
              colors={{
                name: "#1c1917",
                designation: "#b45309",
                testimony: "#44403c",
                arrowBackground: "#1c1917",
                arrowForeground: "#fafaf9",
                arrowHoverBackground: "#b45309",
              }}
              fontSizes={{
                name: "1.5rem",
                designation: "0.875rem",
                quote: "1rem",
              }}
            />
          </div>
        </div>
      </section>

      {/* Discover by Lifestyle Section with FlowingMenu */}
      <section className="py-16 md:py-24 lg:py-28 overflow-visible bg-white border-y border-stone-100" id="discover-lifestyle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 md:mb-16">
          <div className="text-center space-y-3">
            <span className="text-amber-700 font-mono text-xs uppercase tracking-widest font-semibold flex items-center justify-center space-x-2">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              <span>Showroom Collections</span>
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 uppercase font-sans">
              Discover by Lifestyle
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm font-light leading-relaxed max-w-2xl mx-auto">
              Hover over each collection to preview. Click any lifestyle category to view premium matching vehicles in our curated fleet.
            </p>
          </div>
        </div>

        <div className="relative w-full h-[550px] overflow-hidden">
          <FlowingMenu 
            items={lifestyleItems}
            speed={15}
            textColor="#1c1917"
            bgColor="#ffffff"
            marqueeBgColor="#b45309"
            marqueeTextColor="#ffffff"
            borderColor="rgba(120, 113, 108, 0.15)"
          />
        </div>
      </section>

      {/* Custom Festive Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28" id="festive-offer-banner">
        <div className="bg-gradient-to-r from-stone-50/50 via-stone-100/80 to-stone-50/50 border border-stone-200/50 rounded-2xl p-6 sm:p-12 text-center md:text-left relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 shadow-md">
          <div className="absolute top-0 right-0 w-96 h-96 bg-stone-400/5 rounded-full blur-3xl" />
          
          <div className="space-y-4 max-w-xl">
            <span className="inline-block px-3 py-1 bg-stone-100 text-stone-700 text-xs font-semibold tracking-wider uppercase rounded-full border border-stone-200">
              Showroom Exclusive Privileges
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight">
              Celebrate with <span className="text-stone-800">Luxury Privileges</span>
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed font-light">
              Get corporate elite benefits up to ₹1.5 Lakh, 0% upgrade assistance, and complimentary vehicle maintenance plans for 3 years. Limited time only.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center sm:items-start gap-4">
            <button
              onClick={() => {
                setActivePage('offers');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-bold text-xs tracking-wider uppercase rounded-md shadow-lg shadow-stone-950/20 transition-all flex items-center space-x-2"
              id="home-btn-view-offers"
            >
              <span>Explore Privileges</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-stone-500 font-mono">Offer ends in: 12 Days, 05 Hours</span>
          </div>
        </div>
      </section>
    </div>
  );
}
