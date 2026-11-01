import React, { useState, useEffect, useMemo } from 'react';
import { ActivePage, TestDriveBooking, Vehicle } from '../types';
import { VEHICLES } from '../data';
import { api } from '../services/api';
import { Check, Calendar, Clock, User, ShieldCheck, Mail, Phone, ArrowLeft, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

interface TestDriveViewProps {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  setActivePage: (page: ActivePage) => void;
  onAddBooking?: (booking: TestDriveBooking) => void;
  vehicles?: Vehicle[];
}

export default function TestDriveView({ selectedModelId, setSelectedModelId, setActivePage, onAddBooking, vehicles }: TestDriveViewProps) {
  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;

  // Wizard steps: 1 = Select Model, 2 = Schedule, 3 = Personal Details
  const [step, setStep] = useState(1);

  // Selections state
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Personal Info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hasLicense, setHasLicense] = useState(false);

  // Success state
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Initialize from props if pre-selected from other views
  useEffect(() => {
    if (selectedModelId) {
      setSelectedCarId(selectedModelId);
    } else {
      setSelectedCarId(vehicleList[0]?.id || '');
    }
  }, [selectedModelId, vehicleList]);

  // Available dates to select (custom formatted cards)
  const availableDates = [
    { day: 'Wed', num: '08', month: 'Jul' },
    { day: 'Thu', num: '09', month: 'Jul' },
    { day: 'Fri', num: '10', month: 'Jul' },
    { day: 'Sat', num: '11', month: 'Jul' }
  ];

  // Available times
  const availableTimes = ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'];

  // Handle step navigations
  const handleNextStep = () => {
    if (step === 1 && !selectedCarId) {
      alert('Please select a vehicle model to test drive.');
      return;
    }
    if (step === 2 && (!selectedDate || !selectedTime)) {
      alert('Please select a preferred date and session time.');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email) return;
    if (!hasLicense) {
      alert('A valid driving license declaration is required to finalize reservation.');
      return;
    }

    const ref = `LXM-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    setBookingRef(ref);
    setIsConfirmed(true);

    const modelDisplayName = selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : 'Exotique Luxury Fleet';

    // Persist to PostgreSQL backend
    api.bookTestDrive({
      modelId: selectedCarId || 'general',
      modelName: modelDisplayName,
      date: selectedDate || new Date().toISOString().split('T')[0],
      time: selectedTime || '11:00 AM',
      name: fullName,
      phone,
      email,
      hasLicense
    }).catch(err => console.warn('Could not sync test drive booking to API:', err));

    if (onAddBooking) {
      onAddBooking({
        id: ref,
        modelId: selectedCarId,
        modelName: modelDisplayName,
        date: selectedDate,
        time: selectedTime,
        name: fullName,
        phone,
        email,
        hasLicense,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });
    }
  };

  const selectedCar = useMemo(() => {
    return vehicleList.find(v => v.id === selectedCarId) || vehicleList[0];
  }, [selectedCarId, vehicleList]);

  const handleResetWizard = () => {
    setStep(1);
    setIsConfirmed(false);
    setSelectedDate('');
    setSelectedTime('');
    setFullName('');
    setPhone('');
    setEmail('');
    setHasLicense(false);
  };

  return (
    <div className="bg-[#FAFAF9] text-stone-900 min-h-screen py-12 font-sans" id="test-drive-view">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="border-b border-stone-200 pb-8 mb-10 text-center md:text-left">
          <span className="text-amber-800 font-mono text-xs uppercase tracking-widest font-bold">Bespoke Concierge</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1">Experience Excellence</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xl font-light">
            Reserve your exclusive private session behind the wheel of the showroom's most advanced driving machinery.
          </p>
        </div>

        {/* Wizard Card container */}
        <div className="max-w-4xl mx-auto bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          
          {/* Top Progress bar */}
          {!isConfirmed && (
            <div className="bg-stone-50 px-6 py-4 border-b border-stone-100 flex justify-between items-center text-xs">
              <div className="flex items-center space-x-6">
                {[
                  { num: 1, label: 'Select Machine' },
                  { num: 2, label: 'Schedule Date' },
                  { num: 3, label: 'Driver Details' }
                ].map((s) => (
                  <div key={s.num} className="flex items-center space-x-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono border ${
                      step === s.num
                        ? 'bg-amber-600 text-white border-amber-600'
                        : step > s.num
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-400 border-stone-200'
                    }`}>
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </span>
                    <span className={`font-semibold uppercase tracking-wide hidden sm:inline ${
                      step === s.num ? 'text-stone-800' : step > s.num ? 'text-emerald-700' : 'text-stone-400'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <span className="text-stone-400 font-mono">Step {step} of 3</span>
            </div>
          )}

          {/* Form Wizard Core */}
          <div className="p-6 sm:p-10">
            {isConfirmed ? (
              /* CONFIRMED STATE */
              <div className="space-y-8 text-center py-6">
                <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8 text-amber-600" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-stone-900 uppercase tracking-wider">Reservation Confirmed!</h2>
                  <p className="text-sm text-stone-500 leading-relaxed max-w-md mx-auto font-light">
                    Your concierge test drive reservation has been locked. A private driver will coordinate key handoff at the Exotique Machines Indira Nagar Showroom.
                  </p>
                </div>

                {/* Grid details summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 bg-stone-50 border border-stone-200/80 rounded-xl p-5 max-w-lg mx-auto text-left gap-4 text-xs">
                  <div>
                    <span className="text-stone-400 uppercase font-semibold">Vehicle Reserved</span>
                    <p className="font-bold text-stone-800 mt-0.5">{selectedCar?.brand} {selectedCar?.model}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5 font-bold">{selectedCar?.badge}</p>
                  </div>
                  <div>
                    <span className="text-stone-400 uppercase font-semibold">Schedule Session</span>
                    <p className="font-bold text-stone-800 mt-0.5">{selectedDate} - {selectedTime}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Exotique Machines Indira Nagar Showroom</p>
                  </div>
                  <div className="border-t border-stone-200 pt-3">
                    <span className="text-stone-400 uppercase font-semibold">Driver Registered</span>
                    <p className="font-semibold text-stone-800 mt-0.5">{fullName}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">+91 {phone}</p>
                  </div>
                  <div className="border-t border-stone-200 pt-3">
                    <span className="text-stone-400 uppercase font-semibold">Receipt Code</span>
                    <p className="font-mono font-bold text-amber-800 mt-0.5">{bookingRef}</p>
                  </div>
                </div>

                {/* Action button stack */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 max-w-md mx-auto">
                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`Hello Exotique Machines. Here is my test drive confirmation reference: ${bookingRef} for the ${selectedCar?.brand} ${selectedCar?.model} on ${selectedDate} at ${selectedTime}.`);
                      window.open(`https://wa.me/9118004198888?text=${text}`, '_blank');
                    }}
                    className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider rounded-md flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp Receipt</span>
                  </button>
                  <button
                    onClick={handleResetWizard}
                    className="flex-1 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-xs text-stone-700 font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
                  >
                    Configure Another Run
                  </button>
                </div>
              </div>
            ) : (
              /* WIZARD FORMS */
              <div className="space-y-8">
                
                {/* STEP 1: SELECT MODEL */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 uppercase tracking-wider">Select Your Machine</h3>
                      <p className="text-xs text-stone-500 mt-1">Choose the exact model specification you wish to pilot</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="testdrive-car-select-grid">
                      {vehicleList.map((car) => (
                        <div
                          key={car.id}
                          onClick={() => setSelectedCarId(car.id)}
                          className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                            selectedCarId === car.id
                              ? 'bg-amber-50/50 border-amber-600 ring-1 ring-amber-600'
                              : 'bg-stone-50 border-stone-200 hover:border-stone-300 hover:scale-[1.01]'
                          }`}
                        >
                          <div className="h-28 bg-stone-100">
                            <img src={car.images[0]} alt={car.model} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-3.5 space-y-1 relative">
                            {selectedCarId === car.id && (
                              <span className="absolute top-3 right-3 bg-amber-600 text-white rounded-full p-0.5">
                                <Check className="w-3 h-3 font-bold" />
                              </span>
                            )}
                            <span className="text-[9px] text-stone-400 uppercase font-mono tracking-wider">{car.brand}</span>
                            <h4 className="text-xs font-bold text-stone-900 uppercase">{car.model}</h4>
                            <p className="text-[10px] text-amber-700 font-mono font-bold mt-1">₹{car.price} Lakh*</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2: SCHEDULE */}
                {step === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 uppercase tracking-wider">Schedule Your Pilot Session</h3>
                      <p className="text-xs text-stone-500 mt-1">Select from standard luxury calendar slots</p>
                    </div>

                    {/* Date select cards */}
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Select Preference Date</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {availableDates.map((d) => {
                          const dateString = `${d.day} ${d.num} ${d.month}`;
                          const isSelected = selectedDate === dateString;
                          return (
                            <button
                              key={dateString}
                              type="button"
                              onClick={() => setSelectedDate(dateString)}
                              className={`p-4 border rounded-lg flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-50/50 border-amber-600 text-stone-900'
                                  : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300'
                              }`}
                            >
                              <span className="text-[10px] uppercase font-mono">{d.day}</span>
                              <span className="text-xl font-bold tracking-tight text-stone-900 mt-1">{d.num}</span>
                              <span className="text-[10px] uppercase tracking-wide text-stone-400 mt-1">{d.month}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time select cards */}
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest">Select Preference Time</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {availableTimes.map((t) => {
                          const isSelected = selectedTime === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedTime(t)}
                              className={`py-3 px-4 border rounded-lg text-center font-bold text-xs tracking-wider transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-50/50 border-amber-600 text-stone-900'
                                  : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-300'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: DETAILS */}
                {step === 3 && (
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 uppercase tracking-wider">Driver Certification Information</h3>
                      <p className="text-xs text-stone-500 mt-1">Confirm identification credentials to activate insurance liability</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase">Full Name</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Rahul Sharma"
                          className="w-full bg-[#FBFBFA] text-xs text-stone-800 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase">Mobile Number</label>
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

                      {/* Email */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase">Email Address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rahul.sharma@gmail.com"
                          className="w-full bg-[#FBFBFA] text-xs text-stone-800 border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3.5 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/5 focus:outline-none transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Valid license check */}
                    <div className="bg-[#FBFBFA] rounded-xl p-4.5 border border-stone-200 space-y-3.5">
                      <label className="flex items-start space-x-3 text-xs text-stone-500 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          checked={hasLicense}
                          onChange={() => setHasLicense(!hasLicense)}
                          className="w-4.5 h-4.5 bg-stone-50 rounded-md border-stone-200 text-stone-900 focus:ring-stone-900/10 mt-0.5 cursor-pointer accent-stone-950"
                        />
                        <span className="leading-relaxed text-stone-600">
                          I declare that I possess a valid permanent Indian driving license required for test drive validation, and agree to follow safety protocols.
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold tracking-wider uppercase text-xs rounded-md shadow-md shadow-stone-900/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      id="testdrive-confirm-btn"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm Reservation</span>
                    </button>
                  </form>
                )}

                {/* Action Buttons Nav */}
                {step < 3 && (
                  <div className="flex justify-between items-center pt-6 border-t border-stone-200">
                    <button
                      type="button"
                      disabled={step === 1}
                      onClick={handlePrevStep}
                      className={`px-5 py-2.5 border text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center space-x-1.5 cursor-pointer ${
                        step === 1
                          ? 'opacity-0 pointer-events-none'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider rounded shadow-md shadow-stone-900/10 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
