import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Calendar, FileText, Trash2, Clock, CheckCircle, ExternalLink, Car } from 'lucide-react';
import { Vehicle } from '../types';
import { VEHICLES } from '../data';

interface SavedSessionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVehicle: (id: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  testDrives: any[];
  cancelTestDrive: (id: string) => void;
  services: any[];
  cancelService: (id: string) => void;
  financeApps: any[];
  withdrawFinance: (id: string) => void;
  vehicles?: Vehicle[];
}

export default function SavedSessionsDrawer({
  isOpen,
  onClose,
  onSelectVehicle,
  favorites,
  toggleFavorite,
  testDrives,
  cancelTestDrive,
  services,
  cancelService,
  financeApps,
  withdrawFinance,
  vehicles
}: SavedSessionsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'favorites' | 'testdrives' | 'services' | 'finance'>('favorites');

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const vehicleList = vehicles && vehicles.length > 0 ? vehicles : VEHICLES;
  const favoritedVehicles = vehicleList.filter((v) => favorites.includes(v.id));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 cursor-pointer"
          />

          {/* Drawer Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-white border-l border-stone-200 shadow-2xl z-50 flex flex-col justify-between font-sans text-stone-900"
            id="saved-sessions-drawer"
          >
            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
              <div>
                <span className="text-amber-800 font-mono text-[10px] uppercase tracking-widest font-bold">Personal Garage</span>
                <h3 className="text-lg font-black uppercase tracking-wider text-stone-900">My Saved Sessions</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 rounded-full transition-colors cursor-pointer"
                id="close-garage-drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Navigation Tabs */}
            <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-50/30 text-center text-xs text-stone-500">
              {[
                { id: 'favorites', label: 'Saved', icon: <Heart className="w-3.5 h-3.5" /> },
                { id: 'testdrives', label: 'Pilots', icon: <Calendar className="w-3.5 h-3.5" /> },
                { id: 'services', label: 'Service', icon: <Clock className="w-3.5 h-3.5" /> },
                { id: 'finance', label: 'Finance', icon: <FileText className="w-3.5 h-3.5" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 flex flex-col items-center justify-center space-y-1 transition-all relative cursor-pointer ${
                    activeTab === tab.id
                      ? 'text-amber-800 font-bold bg-stone-50/60'
                      : 'hover:text-stone-900'
                  }`}
                >
                  {tab.icon}
                  <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Contents (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              
              {/* FAVORITES TAB */}
              {activeTab === 'favorites' && (
                <div className="space-y-4">
                  {favoritedVehicles.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 space-y-3">
                      <Heart className="w-10 h-10 mx-auto text-stone-200 animate-pulse" />
                      <p className="text-xs font-medium">Your showroom favorites list is currently empty.</p>
                      <button
                        onClick={() => { onClose(); onSelectVehicle(''); }}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline uppercase tracking-wider cursor-pointer"
                      >
                        Browse Showroom →
                      </button>
                    </div>
                  ) : (
                    favoritedVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className="bg-stone-50/50 border border-stone-200 rounded-lg p-3.5 flex space-x-3.5 hover:border-amber-600 transition-all relative group shadow-xs"
                      >
                        <div className="w-20 h-14 rounded overflow-hidden bg-stone-100 shrink-0 aspect-[4/3]">
                          <img
                            src={vehicle.images[0]}
                            alt={vehicle.model}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-stone-400 font-mono uppercase tracking-wider block">{vehicle.brand}</span>
                            <h4 className="text-xs font-bold text-stone-900 uppercase truncate">{vehicle.model}</h4>
                            <p className="text-[10px] text-amber-800 font-mono font-bold mt-0.5">₹{vehicle.price} Lakh*</p>
                          </div>
                          <div className="flex items-center space-x-3 mt-2">
                            <button
                              onClick={() => {
                                onSelectVehicle(vehicle.id);
                                onClose();
                              }}
                              className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1 cursor-pointer"
                            >
                              <span>Spec Sheet</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFavorite(vehicle.id)}
                          className="absolute top-3 right-3 text-red-600 hover:text-red-700 transition-colors p-1 rounded bg-stone-100 hover:bg-stone-200 cursor-pointer"
                          title="Remove Favorite"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TEST DRIVES TAB */}
              {activeTab === 'testdrives' && (
                <div className="space-y-4">
                  {testDrives.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 space-y-3">
                      <Calendar className="w-10 h-10 mx-auto text-stone-200" />
                      <p className="text-xs font-medium">No test drives scheduled yet.</p>
                    </div>
                  ) : (
                    testDrives.map((booking) => {
                      const isCancelled = booking.status === 'Cancelled';
                      return (
                        <div
                          key={booking.id}
                          className="bg-stone-50/50 border border-stone-200 rounded-lg p-4 space-y-3.5 relative shadow-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] text-amber-805 font-mono tracking-widest uppercase block">{booking.id}</span>
                              <h4 className="text-xs font-extrabold text-stone-900 uppercase mt-0.5">{booking.modelName}</h4>
                              <p className="text-[10px] text-stone-500 font-mono mt-0.5">{booking.date} at {booking.time}</p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isCancelled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isCancelled ? 'Cancelled' : 'Confirmed'}
                            </span>
                          </div>

                          {!isCancelled && (
                            <div className="flex justify-end border-t border-stone-200/40 pt-2">
                              <button
                                onClick={() => cancelTestDrive(booking.id)}
                                className="text-[10px] font-bold text-red-700 hover:text-red-800 flex items-center space-x-1 uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Cancel Session</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* SERVICES TAB */}
              {activeTab === 'services' && (
                <div className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 space-y-3">
                      <Clock className="w-10 h-10 mx-auto text-stone-200" />
                      <p className="text-xs font-medium">No service reservations scheduled yet.</p>
                    </div>
                  ) : (
                    services.map((srv) => {
                      const isCancelled = srv.status === 'Cancelled';
                      return (
                        <div
                          key={srv.id}
                          className="bg-stone-50/50 border border-stone-200 rounded-lg p-4 space-y-3 relative shadow-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] text-amber-805 font-mono tracking-widest uppercase block">{srv.id}</span>
                              <h4 className="text-xs font-extrabold text-stone-900 uppercase mt-0.5">{srv.model}</h4>
                              <p className="text-[10px] text-amber-800 mt-1 font-semibold">{srv.serviceType}</p>
                              <p className="text-[10px] text-stone-500 font-mono mt-0.5">Preferred Date: {srv.date}</p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isCancelled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isCancelled ? 'Cancelled' : 'Scheduled'}
                            </span>
                          </div>

                          {!isCancelled && (
                            <div className="flex justify-end border-t border-stone-200/40 pt-2">
                              <button
                                onClick={() => cancelService(srv.id)}
                                className="text-[10px] font-bold text-red-700 hover:text-red-800 flex items-center space-x-1 uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Cancel Booking</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* FINANCE APPLICATIONS TAB */}
              {activeTab === 'finance' && (
                <div className="space-y-4">
                  {financeApps.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 space-y-3">
                      <FileText className="w-10 h-10 mx-auto text-stone-200" />
                      <p className="text-xs font-medium">No active finance applications found.</p>
                    </div>
                  ) : (
                    financeApps.map((app) => {
                      const isWithdrawn = app.status === 'Withdrawn';
                      return (
                        <div
                          key={app.id}
                          className="bg-stone-50/50 border border-stone-200 rounded-lg p-4 space-y-3 relative shadow-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] text-amber-805 font-mono tracking-widest uppercase block">{app.id}</span>
                              <h4 className="text-xs font-extrabold text-stone-900 uppercase mt-0.5">{app.model}</h4>
                              <p className="text-[10px] text-stone-500 mt-1">Applicant: {app.name}</p>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isWithdrawn
                                ? 'bg-stone-100 text-stone-500 border border-stone-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                              }`}>
                              {app.status}
                            </span>
                          </div>

                          {!isWithdrawn && (
                            <div className="flex justify-end border-t border-stone-200/40 pt-2">
                              <button
                                onClick={() => withdrawFinance(app.id)}
                                className="text-[10px] font-bold text-red-700 hover:text-red-800 flex items-center space-x-1 uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Withdraw App</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>

            {/* Footer Information */}
            <div className="p-6 border-t border-stone-200 bg-stone-50/50 space-y-2 text-[10px] text-stone-450 text-center font-light leading-relaxed">
              <p>Exotique Machines offline caching protocol active. Changes sync locally instantly for responsive performance.</p>
              <p>© 2026 Exotique Machines Concierge. All Rights Reserved.</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
