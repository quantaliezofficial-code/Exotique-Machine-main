import React, { useState, useEffect } from 'react';
import { Vehicle, ActivePage } from '../types';
import { VEHICLES, FAQS } from '../data';
import { api } from '../services/api';
import { DollarSign, Percent, Calendar, CheckCircle2, ChevronDown, Landmark, HelpCircle, ArrowRight, Info } from 'lucide-react';

interface FinanceViewProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  setActivePage: (page: ActivePage) => void;
  onAddFinance?: (finance: {
    id: string;
    name: string;
    phone: string;
    whatsappUpdates: boolean;
    model: string;
    status: 'pending' | 'approved' | 'cancelled';
    loanAmount: number;
    tenure: number;
    emi: number;
  }) => void;
  vehicles?: Vehicle[];
}

export default function FinanceView({ selectedModel, setSelectedModel, setActivePage, onAddFinance, vehicles }: FinanceViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;

  // Calculator States
  const [loanAmount, setLoanAmount] = useState<number>(2500000); // INR 25 Lakhs
  const [interestRate, setInterestRate] = useState<number>(9.5); // 9.5%
  const [tenure, setTenure] = useState<number>(5); // 5 Years

  // Form States
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [appReference, setAppReference] = useState('');

  // Active Accordion State for FAQs
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Auto-set loan amount if preferred vehicle model changes (ex-showroom price as base, e.g. 80%)
  useEffect(() => {
    if (selectedModel && selectedModel !== '') {
      const match = vehicleList.find(v => `${v.brand} ${v.model}` === selectedModel);
      if (match) {
        // Assume 85% of ex-showroom price as loan amount
        setLoanAmount(Math.round(match.price * 100000 * 0.85));
      }
    }
  }, [selectedModel, vehicleList]);

  // Compute EMI calculations
  const monthlyInterest = interestRate / 12 / 100;
  const totalMonths = tenure * 12;
  
  const emi = useMemoEmi(loanAmount, monthlyInterest, totalMonths);
  const totalCost = emi * totalMonths;
  const totalInterest = Math.max(0, totalCost - loanAmount);

  function useMemoEmi(P: number, r: number, n: number) {
    if (r === 0) return Math.round(P / n);
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }

  // Calculate percentages for the styled horizontal comparison bar
  const principalPercent = totalCost > 0 ? (loanAmount / totalCost) * 100 : 80;
  const interestPercent = 100 - principalPercent;

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !mobile) return;
    
    // Generate a secure reference ID
    const ref = `LFX-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    setAppReference(ref);
    setFormSubmitted(true);

    const modelName = selectedModel || 'Bespoke Order';

    // Persist to PostgreSQL backend
    api.applyFinance({
      name: fullName,
      phone: mobile,
      whatsappUpdates,
      model: modelName
    }).catch(err => console.warn('Could not sync finance application to API:', err));

    if (onAddFinance) {
      onAddFinance({
        id: ref,
        name: fullName,
        phone: mobile,
        whatsappUpdates,
        model: modelName,
        status: 'pending',
        loanAmount,
        tenure,
        emi
      });
    }
  };

  const handleResetForm = () => {
    setFormSubmitted(false);
    setFullName('');
    setMobile('');
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="finance-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="border-b border-stone-200 pb-8 mb-10 text-center md:text-left">
          <span className="text-amber-800 font-mono text-xs uppercase tracking-widest font-bold">Premium Custom Financing</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Finance Your Dream</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
            Exclusively customized loan structures calculated at segment lowest rates. Supported by certified banking networks.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* Left Block: EMI Calculator (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-8 shadow-sm" id="emi-calculator-card">
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-lg font-bold text-stone-900 flex items-center space-x-2.5">
                <Landmark className="w-5 h-5 text-amber-700" />
                <span>Interactive EMI Calculator</span>
              </h2>
              <p className="text-xs text-stone-500 mt-1">Simulate loan combinations, tenure rates, and down-payments</p>
            </div>

            {/* Sliders Area */}
            <div className="space-y-6">
              
              {/* Slider 1: Loan Amount */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-stone-500 uppercase tracking-wider">Loan Amount Principal</label>
                  <span className="text-amber-800 font-mono font-extrabold text-sm bg-amber-50 px-2.5 py-1 rounded border border-amber-200/50">
                    ₹{loanAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="range"
                  min="300000"
                  max="15000000"
                  step="50000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                  <span>₹3L</span>
                  <span>₹75L</span>
                  <span>₹1.5Cr</span>
                </div>
              </div>

              {/* Slider 2: Interest Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-stone-500 uppercase tracking-wider">Interest Rate (p.a.)</label>
                  <span className="text-amber-800 font-mono font-extrabold text-sm bg-amber-50 px-2.5 py-1 rounded border border-amber-200/50">
                    {interestRate}%
                  </span>
                </div>
                <input
                  type="range"
                  min="6.5"
                  max="16"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                  <span>6.5%</span>
                  <span>11.2%</span>
                  <span>16%</span>
                </div>
              </div>

              {/* Slider 3: Loan Tenure */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-stone-500 uppercase tracking-wider">Loan Tenure</label>
                  <span className="text-amber-800 font-mono font-extrabold text-sm bg-amber-50 px-2.5 py-1 rounded border border-amber-200/50">
                    {tenure} Years
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full accent-amber-600 h-1.5 bg-stone-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                  <span>1 Year</span>
                  <span>4 Years</span>
                  <span>7 Years</span>
                </div>
              </div>
            </div>

            {/* Calculations results block */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">Monthly EMI</span>
                <span className="text-xl sm:text-2xl font-black text-amber-850 block mt-1">₹{emi.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t md:border-t-0 md:border-x border-stone-200 py-4 md:py-0">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Interest Payable</span>
                <span className="text-lg font-extrabold text-stone-800 block mt-1">₹{totalInterest.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">Total Cumulative Cost</span>
                <span className="text-lg font-extrabold text-stone-800 block mt-1">₹{totalCost.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Graphic Bar Chart Breakdown */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-stone-500">Amortization Split</span>
                <div className="flex space-x-4 text-[10px]">
                  <span className="flex items-center space-x-1.5 text-stone-600">
                    <span className="w-2.5 h-2.5 bg-amber-600 rounded-full inline-block" />
                    <span>Principal: {principalPercent.toFixed(1)}%</span>
                  </span>
                  <span className="flex items-center space-x-1.5 text-stone-400">
                    <span className="w-2.5 h-2.5 bg-stone-400 rounded-full inline-block" />
                    <span>Interest: {interestPercent.toFixed(1)}%</span>
                  </span>
                </div>
              </div>
              {/* Amortization Progress split bar */}
              <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden flex">
                <div style={{ width: `${principalPercent}%` }} className="bg-gradient-to-r from-amber-600 to-amber-500 transition-all duration-300" />
                <div style={{ width: `${interestPercent}%` }} className="bg-stone-300 transition-all duration-300" />
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed text-center font-light">
                *Computed calculations are indicative based on standard premium tax schedules. Subject to banking KYC criteria.
              </p>
            </div>
          </div>

          {/* Right Block: Apply for Finance Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-sm" id="apply-finance-card">
            
            {formSubmitted ? (
              /* Success State */
              <div className="space-y-6 text-center my-auto py-8">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-stone-900 uppercase tracking-wider">Application Received</h3>
                  <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto font-light">
                    Your financial clearance request has been successfully submitted to HDFC Bank and ICICI bank partner APIs.
                  </p>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 font-mono space-y-1">
                  <span className="text-[10px] text-stone-400 uppercase tracking-widest block">Reference ID</span>
                  <span className="text-lg font-bold text-amber-805 block">{appReference}</span>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-xs text-amber-800 flex items-center justify-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    <span>Eligibility confirmation takes average 4 hours.</span>
                  </p>
                  <button
                    onClick={handleResetForm}
                    className="px-5 py-2.5 bg-white border border-stone-200 hover:border-amber-600 text-stone-700 hover:text-amber-850 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow-sm"
                  >
                    Calculate New Estimate
                  </button>
                </div>
              </div>
            ) : (
              /* Entry Form State */
              <div className="space-y-6">
                <div className="border-b border-stone-200 pb-4">
                  <h3 className="text-base font-bold text-stone-900 uppercase tracking-wider">Apply for Finance Clearance</h3>
                  <p className="text-xs text-stone-500 mt-1 font-light">Complete basic identification to initiate eligibility vetting</p>
                </div>

                <form onSubmit={handleApplySubmit} className="space-y-4">
                  
                  {/* Select Model */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Preferred Vehicle</label>
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-[#FBFBFA] text-xs font-semibold text-stone-700 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2378716C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.6rem_auto] bg-[right_1.2rem_center] bg-no-repeat"
                        required
                        id="finance-preferred-model-select"
                      >
                        <option value="">-- Choose Vehicle --</option>
                        {vehicleList.map((v) => (
                          <option key={v.id} value={`${v.brand} ${v.model}`}>
                            {v.brand} {v.model} ({v.badge}) - ₹{v.price}L
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
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
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full bg-[#FBFBFA] border border-stone-200 hover:border-stone-300 rounded-r-xl px-4 py-3.5 text-xs focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>

                  {/* WhatsApp Opt-In Checkbox */}
                  <label className="flex items-start space-x-2.5 text-[11px] text-stone-500 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={whatsappUpdates}
                      onChange={() => setWhatsappUpdates(!whatsappUpdates)}
                      className="w-4 h-4 bg-stone-50 rounded border-stone-200 text-amber-600 focus:ring-amber-500/20 mt-0.5 cursor-pointer"
                    />
                    <span>Receive instant EMI approval and loan status updates via WhatsApp.</span>
                  </label>

                  <button
                    type="submit"
                    className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-md shadow-stone-900/10 transition-all flex items-center justify-center space-x-2 pt-3 cursor-pointer"
                    id="finance-submit-btn"
                  >
                    <span>Request Callback Support</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Banking Partners Section */}
        <div className="space-y-6 border-t border-stone-200 pt-12 mb-16" id="banking-partners">
          <div className="text-center">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Certified Integrations</span>
            <h3 className="text-lg font-extrabold text-stone-900 mt-1">Our Elite Financing Partners</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'HDFC Bank', interest: '8.4% starting', color: 'border-stone-200 bg-white shadow-sm' },
              { name: 'ICICI Bank', interest: '8.5% starting', color: 'border-stone-200 bg-white shadow-sm' },
              { name: 'State Bank of India', interest: '8.45% starting', color: 'border-stone-200 bg-white shadow-sm' },
              { name: 'Axis Bank', interest: '8.6% starting', color: 'border-stone-200 bg-white shadow-sm' }
            ].map((partner) => (
              <div
                key={partner.name}
                className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 transition-all ${partner.color}`}
              >
                <span className="text-sm font-bold text-stone-800 tracking-wide uppercase">{partner.name}</span>
                <span className="text-[10px] font-mono text-amber-700 font-semibold">{partner.interest} p.a.</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-6 max-w-3xl mx-auto" id="faqs">
          <div className="text-center">
            <HelpCircle className="w-8 h-8 text-amber-700 mx-auto" />
            <h3 className="text-xl font-bold text-stone-900 mt-2">Frequently Asked Questions</h3>
            <p className="text-xs text-stone-500 mt-1">Understanding standard luxury loan approvals and rate metrics</p>
          </div>

          <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="transition-all">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center px-6 py-4 text-left font-bold text-sm text-stone-700 hover:text-stone-900 hover:bg-stone-50 transition-colors focus:outline-none cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <span className={`text-amber-700 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs text-stone-500 leading-relaxed font-light border-t border-stone-100 pt-2 bg-stone-50/50">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
