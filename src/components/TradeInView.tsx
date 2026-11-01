import React, { useState } from 'react';
import { ActivePage, TradeInEstimation } from '../types';
import { CheckCircle2, ChevronDown, RefreshCw, Scale, Info, ArrowUpRight } from 'lucide-react';

interface TradeInViewProps {
  setActivePage: (page: ActivePage) => void;
}

export default function TradeInView({ setActivePage }: TradeInViewProps) {
  // Estimator States
  const [brand, setBrand] = useState('Mercedes-Benz');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(2022);
  const [kms, setKms] = useState<string>('');
  const [condition, setCondition] = useState<'Excellent' | 'Good' | 'Fair'>('Good');

  const [isCalculated, setIsCalculated] = useState(false);
  const [estimateMin, setEstimateMin] = useState(0);
  const [estimateMax, setEstimateMax] = useState(0);

  // Appraisal Form States
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isAppraisalSuccess, setIsAppraisalSuccess] = useState(false);
  const [appraisalCode, setAppraisalCode] = useState('');

  const brandBases: Record<string, number> = {
    'Mercedes-Benz': 5500000,
    'BMW': 5200000,
    'Land Rover': 6500000,
    'Toyota': 4500000,
    'Other Premium': 4000000
  };

  const handleEstimateCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !kms) return;

    // Depreciation Algorithm
    const base = brandBases[brand] || 3500000;
    const age = 2026 - year; // Active workspace year
    
    // 10% depreciation per year
    let depreciated = base * Math.pow(0.88, age);
    
    // Kilometer depreciation
    const parsedKms = Number(kms) || 20000;
    if (parsedKms > 80000) {
      depreciated *= 0.82;
    } else if (parsedKms > 50000) {
      depreciated *= 0.88;
    } else if (parsedKms > 30000) {
      depreciated *= 0.93;
    } else {
      depreciated *= 0.98;
    }

    // Condition scale
    if (condition === 'Excellent') {
      depreciated *= 1.05;
    } else if (condition === 'Fair') {
      depreciated *= 0.85;
    }

    // Ensure within reasonable boundaries
    const finalValue = Math.max(500000, depreciated);
    
    // Round and set range (+/- 6%)
    const minVal = Math.round((finalValue * 0.94) / 10000) * 10000;
    const maxVal = Math.round((finalValue * 1.06) / 10000) * 10000;

    setEstimateMin(minVal);
    setEstimateMax(maxVal);
    setIsCalculated(true);
  };

  const handleAppraisalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobile) return;

    const ref = `LXM-VAL-${Math.floor(1000 + Math.random() * 9000)}`;
    setAppraisalCode(ref);
    setIsAppraisalSuccess(true);
  };

  const formatLakhs = (amount: number) => {
    const lakhs = amount / 100000;
    return `₹ ${lakhs.toFixed(2)} Lakh`;
  };

  const handleResetValuation = () => {
    setIsCalculated(false);
    setIsAppraisalSuccess(false);
    setModel('');
    setKms('');
    setFullName('');
    setMobile('');
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="trade-in-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="border-b border-stone-200 pb-8 mb-10 text-center md:text-left">
          <span className="text-amber-800 font-mono text-xs uppercase tracking-widest font-bold">Bespoke Vehicle Trade-In</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Know Your Car's Value</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
            Assess the trade-in value of your current premium vehicle instantly. Transparent algorithm valuation aligned to live resale tables.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* Left Block: Valuation Estimator Form (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm" id="trade-in-estimator-card">
            <div className="border-b border-stone-200 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2.5">
                  <Scale className="w-5 h-5 text-amber-700" />
                  <span>Trade-In Estimator Engine</span>
                </h2>
                <p className="text-xs text-stone-500 mt-1">Verify condition parameters and depreciation schedules</p>
              </div>
              {isCalculated && (
                <button
                  type="button"
                  onClick={handleResetValuation}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                >
                  Recalculate
                </button>
              )}
            </div>

            <form onSubmit={handleEstimateCalculate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Brand Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Manufacturer Brand</label>
                  <div className="relative">
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full bg-stone-50 text-xs font-semibold text-stone-700 border border-stone-200 rounded px-3.5 py-3.5 focus:border-amber-600 focus:outline-none appearance-none cursor-pointer focus:bg-white"
                    >
                      {Object.keys(brandBases).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 top-4 text-stone-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Model Input */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Model / Derivative Name</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. C-Class C200"
                    className="w-full bg-stone-50 text-xs text-stone-800 border border-stone-200 rounded px-3.5 py-3.5 focus:border-amber-600 focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Manufacturing Year */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Manufacturing Year</label>
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full bg-stone-50 text-xs font-semibold text-stone-700 border border-stone-200 rounded px-3.5 py-3.5 focus:border-amber-600 focus:outline-none appearance-none cursor-pointer focus:bg-white"
                    >
                      {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <span className="absolute right-3.5 top-4 text-stone-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Kilometers Driven */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Kilometers Driven</label>
                  <input
                    type="number"
                    required
                    min="500"
                    max="300000"
                    value={kms}
                    onChange={(e) => setKms(e.target.value)}
                    placeholder="e.g. 24000"
                    className="w-full bg-stone-50 text-xs text-stone-800 border border-stone-200 rounded px-3.5 py-3.5 focus:border-amber-600 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Vehicle Condition selection */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-stone-400 uppercase">Aesthetic & Mechanical Condition</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'Excellent', desc: 'No scratch, full service history, OEM tires' },
                    { type: 'Good', desc: 'Minor wear, timely services, clean interior' },
                    { type: 'Fair', desc: 'Visible scratches, needs parts service shortly' }
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCondition(item.type as 'Excellent' | 'Good' | 'Fair')}
                      className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        condition === item.type
                          ? 'bg-amber-50/50 border-amber-600 text-stone-900 ring-1 ring-amber-600'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wide block">{item.type}</span>
                      <span className="text-[10px] text-stone-400 leading-tight mt-1.5 block font-light">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-md shadow-md shadow-stone-900/10 flex items-center justify-center space-x-2 cursor-pointer"
                  id="trade-in-estimate-submit-btn"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Calculate Algorithmic Valuation</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Block: Dynamic Valuation Display & Finalize Appraisal (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-sm" id="appraisal-booking-card">
            
            {!isCalculated ? (
              /* State 1: Awaiting calculation */
              <div className="space-y-4 my-auto py-12 text-center text-stone-400">
                <RefreshCw className="w-12 h-12 text-stone-300 mx-auto animate-reverse-spin" />
                <h3 className="text-base font-bold text-stone-800 uppercase tracking-wider">Awaiting Diagnostics Input</h3>
                <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto font-light">
                  Complete the trade-in diagnostic questionnaire on the left to estimate ex-showroom trade pricing.
                </p>
              </div>
            ) : isAppraisalSuccess ? (
              /* State 2: Valuation appointment successful */
              <div className="space-y-6 text-center my-auto py-8">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900 uppercase tracking-wider">Evaluation Booked</h3>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-xs mx-auto font-light">
                    Your physical showroom evaluation slot is reserved. An inspector will verify the vehicle specs.
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 font-mono space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest block">Appraisal Code</span>
                  <span className="text-lg font-bold text-amber-805 block">{appraisalCode}</span>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      setActivePage('inventory');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <span>Upgrade to a New Car</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetValuation}
                    className="text-xs text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                  >
                    Reset & Recalculate
                  </button>
                </div>
              </div>
            ) : (
              /* State 3: Display calculated estimate + request final appraisal form */
              <div className="space-y-6">
                
                {/* Gold Highlight Ring container */}
                <div className="border border-amber-200 bg-amber-50/30 rounded-xl p-5 text-center space-y-2">
                  <span className="text-[10px] text-amber-800 uppercase font-mono tracking-widest flex items-center justify-center space-x-1.5 font-bold">
                    <span>Calculated Fair Market Range</span>
                  </span>
                  
                  <div className="text-2xl sm:text-3xl font-black text-stone-900">
                    {formatLakhs(estimateMin)} <span className="text-stone-400 text-lg font-light">to</span> {formatLakhs(estimateMax)}
                  </div>
                  
                  <p className="text-[10px] text-stone-500 font-light max-w-xs mx-auto">
                    Based on standard market indices for {year} {brand} {model}. Subject to real verification.
                  </p>
                </div>

                {/* Finalize valuation booking form */}
                <div className="space-y-4">
                  <div className="border-b border-stone-200 pb-2">
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Book Physical Valuation Appointment</h3>
                    <p className="text-[10px] text-stone-500 mt-0.5">Locks in estimated pricing range for 7 working days</p>
                  </div>

                  <form onSubmit={handleAppraisalSubmit} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full bg-stone-50 text-xs text-stone-800 border border-stone-200 rounded px-3 py-2 focus:border-amber-600 focus:outline-none focus:bg-white"
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
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="10-digit number"
                          className="w-full bg-stone-50 border border-stone-200 border-l-0 rounded-r px-3 py-2 focus:border-amber-600 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white hover:text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer shadow-md"
                      id="trade-in-book-appraisal-btn"
                    >
                      Request Showroom Appointment
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trade-In Process Details */}
        <div className="bg-white border border-stone-200 rounded-xl p-8 max-w-4xl mx-auto shadow-sm" id="trade-in-procedure">
          <h3 className="text-base font-bold text-stone-900 uppercase tracking-wider text-center mb-8">
            Our Elite 3-Step Valuation Philosophy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <span className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono text-sm font-bold flex items-center justify-center mx-auto">1</span>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Algorithmic Check</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed font-light">
                Submit age, make, and diagnostic conditions to generate immediate regional index-linked market ranges.
              </p>
            </div>
            <div className="text-center space-y-2">
              <span className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono text-sm font-bold flex items-center justify-center mx-auto">2</span>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Home appraisal</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed font-light">
                A certified Exotique engineer completes a 120-point digital validation at your home or office.
              </p>
            </div>
            <div className="text-center space-y-2">
              <span className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-mono text-sm font-bold flex items-center justify-center mx-auto">3</span>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Immediate exchange</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed font-light">
                Secure immediate cash clearances, or apply the value directly as down payment for your new luxury vehicle upgrade.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
