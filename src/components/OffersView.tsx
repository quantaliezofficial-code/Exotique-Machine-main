import React, { useState, useEffect } from 'react';
import { ActivePage } from '../types';
import { Gift, CheckCircle2, MessageSquare, Flame, Award, Percent, Hourglass } from 'lucide-react';

interface OffersViewProps {
  setActivePage: (page: ActivePage) => void;
}

export default function OffersView({ setActivePage }: OffersViewProps) {
  // Live Countdown Timer State (e.g., target 12 days, 5 hours from now)
  const [timeLeft, setTimeLeft] = useState({
    days: 12,
    hours: 5,
    minutes: 42,
    seconds: 18
  });

  // Loyalty eligibility check states
  const [eligibilityPhone, setEligibilityPhone] = useState('');
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);

  // Live countdown ticker effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleEligibilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibilityPhone) return;

    // Simulate eligibility logic: if last digit of phone number is even, they are eligible for elite luxury trade premium bonus!
    const lastDigit = Number(eligibilityPhone.slice(-1));
    setIsEligible(lastDigit % 2 === 0);
    setEligibilityChecked(true);
  };

  const handleResetEligibility = () => {
    setEligibilityChecked(false);
    setEligibilityPhone('');
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="offers-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="border-b border-stone-200 pb-8 mb-10 text-center md:text-left">
          <span className="text-stone-500 font-mono text-xs uppercase tracking-widest font-bold">Privileges Showroom</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Exquisite Solitary Offers</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
            Celebrate luxury with bespoke corporate bonuses, zero-down-payment loyalty upgrades, and complimentary elite maintenance.
          </p>
        </div>

        {/* Live Privilege Timer banner */}
        <section className="bg-gradient-to-r from-stone-50 via-stone-100/30 to-stone-50 border border-stone-200 rounded-2xl p-8 mb-12 text-center md:text-left relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-8 shadow-sm" id="offers-countdown-banner">
          <div className="absolute top-0 right-0 w-96 h-96 bg-stone-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4 max-w-xl">
            <span className="inline-block px-3 py-1 bg-stone-100 text-stone-700 text-xs font-semibold tracking-wider uppercase rounded-full border border-stone-200">
              Exclusive Showroom Privileges
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-950 leading-tight">
              The Grand <span className="text-stone-850">Golden Privilege Hour</span>
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              We offer certified down-payment waivers, complimentary original service diagnostics, and expedited home delivery for premium orders placed before timer expiration.
            </p>
          </div>

          {/* Clock Ticker widget */}
          <div className="shrink-0 flex items-center space-x-3.5 bg-white/80 border border-stone-200 p-4 rounded-xl shadow-sm">
            <Hourglass className="w-5 h-5 text-amber-800 shrink-0 hidden sm:block animate-pulse" />
            <div className="flex space-x-3 font-mono">
              {[
                { val: timeLeft.days, label: 'Days' },
                { val: timeLeft.hours, label: 'Hrs' },
                { val: timeLeft.minutes, label: 'Min' },
                { val: timeLeft.seconds, label: 'Sec' }
              ].map((c) => (
                <div key={c.label} className="text-center">
                  <span className="text-xl sm:text-2xl font-black text-amber-800 bg-stone-100/80 px-2.5 py-1.5 rounded inline-block min-w-[40px] sm:min-w-[48px]">
                    {String(c.val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-stone-400 uppercase tracking-widest block mt-1.5">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
          
          {/* Card 1: Corporate Elite Program (7 Cols) */}
          <div className="md:col-span-7 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-5 shadow-sm" id="corporate-elite-card">
            <div className="flex items-center space-x-3 border-b border-stone-200 pb-4">
              <span className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                <Award className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-stone-900 uppercase tracking-wider">Corporate Elite Program</h3>
                <p className="text-xs text-stone-500 mt-0.5">Bespoke privileges for certified corporate members</p>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed font-light">
              Employees and executive staff of certified MNCs, public sectors, and software conglomerates are eligible for flat cash-equivalent benefits up to <span className="text-stone-900 font-bold">₹ 1,50,000</span> on luxury SUV and premium EV model purchases.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="border border-stone-200 bg-stone-50/50 p-4 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Maximum Benefit</span>
                <p className="text-lg font-bold text-amber-800">Up to ₹1.5L Cash*</p>
                <p className="text-[10px] text-stone-400 font-light">Applicable directly to showroom ex-price.</p>
              </div>
              <div className="border border-stone-200 bg-stone-50/50 p-4 rounded-lg space-y-1">
                <span className="text-[10px] text-stone-400 uppercase font-semibold">Bonus perk</span>
                <p className="text-lg font-bold text-stone-900">0% Finance Assistance</p>
                <p className="text-[10px] text-stone-400 font-light">Expedited priority KYC verification.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <span className="text-stone-400 font-light text-center sm:text-left">Requires corporate identity / salary ledger proof</span>
              <button
                onClick={() => {
                  setActivePage('finance');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-100 hover:bg-stone-900 text-stone-800 hover:text-white font-bold uppercase tracking-wider text-[11px] rounded transition-all cursor-pointer border border-stone-200"
              >
                Apply Corporate Finance
              </button>
            </div>
          </div>

          {/* Card 2: Loyalty Upgrade Eligibility Vetting (5 Cols) */}
          <div className="md:col-span-5 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-sm" id="loyalty-eligibility-card">
            
            {eligibilityChecked ? (
              /* Checked state */
              <div className="space-y-6 text-center my-auto">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-stone-900 uppercase tracking-wider">
                    {isEligible ? 'Elite Privilege Unlocked' : 'Classic Benefits Active'}
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed font-light">
                    {isEligible 
                      ? 'Congratulations! Your mobile prefix qualifies you for our 0% Down-payment Loyalty Upgrade scheme.'
                      : 'You qualify for our standard cash trade-in upgrade and complimentary roadside insurance assistance.'}
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 p-4 rounded-lg space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest block">Loyalty Scheme Tier</span>
                  <span className="text-base font-bold text-amber-805 block">
                    {isEligible ? 'VIP EXECUTIVE WAIVER' : 'STANDARD ASSURANCE PACK'}
                  </span>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => {
                      setActivePage('tradein');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow-md"
                  >
                    Initiate Trade-In Valuation
                  </button>
                  <button
                    onClick={handleResetEligibility}
                    className="text-xs text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    Verify Another Identifier
                  </button>
                </div>
              </div>
            ) : (
              /* Check Form state */
              <div className="space-y-6">
                <div className="border-b border-stone-200 pb-3 flex items-center space-x-2.5">
                  <Flame className="w-4.5 h-4.5 text-amber-800" />
                  <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Loyalty Upgrade Vetting</h3>
                </div>

                <p className="text-xs text-stone-500 leading-relaxed font-light">
                  Input your registered mobile number below to evaluate loyalty waiver packages, down-payment rebates, or premium exchange valuations.
                </p>

                <form onSubmit={handleEligibilitySubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Mobile Number</label>
                    <div className="flex">
                      <span className="bg-stone-100 border border-stone-200 text-stone-500 px-3 py-3 text-xs rounded-l font-mono flex items-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={eligibilityPhone}
                        onChange={(e) => setEligibilityPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full bg-stone-50 border border-stone-200 border-l-0 text-xs text-stone-800 rounded-r px-3.5 py-3 focus:border-amber-600 focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-md shadow-stone-900/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <span>Check Waiver Eligibility</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Supplementary program grids: Complimentary Care & Golden Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          
          {/* Complimentary Care card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-200 inline-block">Complimentary Support</span>
            <h4 className="text-base font-extrabold text-stone-900 uppercase">3-Year Complimentary Care Pack</h4>
            <p className="text-xs text-stone-500 leading-relaxed font-light">
              Lock in peace of mind. All vehicle orders booked during this festive hour receive a complimentary 3-year scheduled periodic care pack, covering diagnostic code resets, synthetic engine oil updates, and road assist diagnostics.
            </p>
            <button
              onClick={() => {
                setActivePage('service');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-bold underline mt-2 cursor-pointer"
            >
              View Service Cover Guidelines →
            </button>
          </div>

          {/* Golden Key Delivery card */}
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
            <span className="px-2.5 py-1 bg-stone-100 text-stone-700 text-[10px] font-bold uppercase tracking-wider rounded border border-stone-200 inline-block">Golden Stance</span>
            <h4 className="text-base font-extrabold text-stone-900 uppercase">The Golden Key Delivery Experience</h4>
            <p className="text-xs text-stone-500 leading-relaxed font-light">
              Make vehicle delivery a historic family milestone. Includes custom bespoke showroom unveilings, premium cake and flower suites, and a digital high-definition photography portfolio recording the key handoff.
            </p>
            <button
              onClick={() => {
                window.open('https://wa.me/9118004198888?text=Hello%20Exotique%20Motors%20Concierge.%20I\'m%20inquiring%20about%20the%20Golden%20Key%20Delivery%20experience%20for%20my%20order.', '_blank');
              }}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded border border-emerald-200 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Request Quote via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
