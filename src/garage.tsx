import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useStoredState } from './lib/hooks';

/**
 * "My garage": saved cars and the references of requests sent from this device.
 * Stored only in this browser. No names, phone numbers or emails are kept here —
 * those go to the showroom and nowhere else.
 */
export interface RequestRecord {
  reference: string;
  kind: 'Test drive' | 'Finance' | 'Service' | 'Enquiry';
  label: string;
  date?: string;
  createdAt: string;
}

interface GarageState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  requests: RequestRecord[];
  addRequest: (r: Omit<RequestRecord, 'createdAt'>) => void;
  removeRequest: (reference: string) => void;
  count: number;
}

const GarageContext = createContext<GarageState | null>(null);

export function GarageProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useStoredState<string[]>('em_favorites', []);
  const [requests, setRequests] = useStoredState<RequestRecord[]>('em_requests', []);

  const toggleFavorite = useCallback(
    (id: string) => setFavorites((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    [setFavorites],
  );
  const addRequest = useCallback(
    (r: Omit<RequestRecord, 'createdAt'>) =>
      setRequests((p) => [{ ...r, createdAt: new Date().toISOString() }, ...p].slice(0, 20)),
    [setRequests],
  );
  const removeRequest = useCallback(
    (reference: string) => setRequests((p) => p.filter((x) => x.reference !== reference)),
    [setRequests],
  );

  const value = useMemo(
    () => ({ favorites, toggleFavorite, requests, addRequest, removeRequest, count: favorites.length + requests.length }),
    [favorites, toggleFavorite, requests, addRequest, removeRequest],
  );
  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage(): GarageState {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error('useGarage must be used inside GarageProvider');
  return ctx;
}
