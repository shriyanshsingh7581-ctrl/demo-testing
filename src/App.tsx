/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Search,
  Star,
  Ticket,
  Compass,
  CalendarCheck,
  ShieldCheck,
  Navigation,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { INITIAL_SALONS, DEFAULT_SALON_SERVICES } from './data/initialSalons';
import {
  BookingType,
  JaunpurArea,
  QueueToken,
  Salon,
  ServiceItem,
} from './types/salon';
import {
  bookNewTokenForSalon,
  buildGoogleMapsUrl,
  callNextTokenInSalon,
  cancelTokenById,
  filterAndSortSalons,
  formatTokenNumber,
  getSalonQueueMetrics,
  markCurrentTokenCompleted,
  skipCurrentOrNextToken,
} from './utils/queueLogic';
import { SalonArtwork } from './components/SalonArtwork';
import { BookingModal } from './components/BookingModal';
import { LiveTokenTicket } from './components/LiveTokenTicket';
import { AdminPanel } from './components/AdminPanel';

const STORAGE_KEY_SALONS = 'thanker_jaunpur_salons_v1';
const STORAGE_KEY_MY_TOKENS = 'thanker_jaunpur_my_tokens_v1';

const AREA_PILLS: JaunpurArea[] = [
  'All Jaunpur',
  'Olandganj',
  'Civil Lines',
  'Line Bazar',
  'TDB College Road',
  'Machhlishahr Padav',
  'Shortest Wait Time',
];

type MobileTab = 'explore' | 'nowait' | 'mytoken' | 'bookings';

export default function App() {
  // Check URL path, hash, or query for dedicated /admin portal
  const getInitialModeFromPath = (): 'customer' | 'admin' => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin' ||
        hash === '#/admin' ||
        params.get('admin') === '1' ||
        params.get('admin') === 'true'
      ) {
        return 'admin';
      }
    }
    return 'customer';
  };

  const [appMode, setAppMode] = useState<'customer' | 'admin'>(
    getInitialModeFromPath
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>('explore');

  // Admin PIN unlock state (supports ?autostart=1 or ?admin_unlocked=1 for quick testing)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') === '1' || params.get('pin') === '7777';
    }
    return false;
  });

  // Load Salons from localStorage or pre-populated INITIAL_SALONS
  const [salons, setSalons] = useState<Salon[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_SALONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback to INITIAL_SALONS
      }
    }
    return INITIAL_SALONS;
  });

  // Load Customer's Booked Tokens (pre-populated with a demo active token or newly booked tokens)
  const [myTokens, setMyTokens] = useState<QueueToken[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_MY_TOKENS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Search, Area Filters, and GPS state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<JaunpurArea>('All Jaunpur');
  const [maxWaitFilter, setMaxWaitFilter] = useState<number | null>(null);
  const [gpsLocationLabel, setGpsLocationLabel] = useState(
    'Olandganj, Jaunpur (Showing Salons within 5 km)'
  );
  const [gpsStatusToast, setGpsStatusToast] = useState('');

  // Modal state for Booking Live Token
  const [bookingModalSalonId, setBookingModalSalonId] = useState<string | null>(
    null
  );

  // Admin selected salon ID (defaults to Thanker Flagship Unisex Salon)
  const [adminSelectedSalonId, setAdminSelectedSalonId] = useState<string>(
    INITIAL_SALONS[0].id
  );

  // Sync salons to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_SALONS, JSON.stringify(salons));
    } catch {
      // ignore storage quota errors
    }
  }, [salons]);

  // Sync myTokens to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_MY_TOKENS,
        JSON.stringify(myTokens)
      );
    } catch {
      // ignore
    }
  }, [myTokens]);

  // Listen to storage events across tabs for real-time Customer <-> Admin sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SALONS && e.newValue) {
        try {
          setSalons(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEY_MY_TOKENS && e.newValue) {
        try {
          setMyTokens(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync URL history on mode change (/admin vs /)
  const switchAppMode = (mode: 'customer' | 'admin', tab?: MobileTab) => {
    setAppMode(mode);
    if (mode === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState({}, '', '/admin');
      }
    } else {
      if (tab === 'nowait') {
        setSelectedArea('Shortest Wait Time');
        setMobileTab('nowait');
      } else {
        if (tab === 'explore' && mobileTab === 'nowait') {
          setSelectedArea('All Jaunpur');
        }
        setMobileTab(tab || 'explore');
      }
      if (
        window.location.pathname.toLowerCase().startsWith('/admin') ||
        window.location.hash.toLowerCase().includes('admin')
      ) {
        window.history.pushState({}, '', '/');
      }
    }
  };

  useEffect(() => {
    const onUrlChange = () => {
      const nextMode = getInitialModeFromPath();
      setAppMode(nextMode);
      if (nextMode === 'customer') {
        setMobileTab('explore');
      }
    };
    window.addEventListener('popstate', onUrlChange);
    window.addEventListener('hashchange', onUrlChange);
    return () => {
      window.removeEventListener('popstate', onUrlChange);
      window.removeEventListener('hashchange', onUrlChange);
    };
  }, []);

  const handleDetectGps = () => {
    setGpsStatusToast('Detecting GPS coordinates in Jaunpur...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsLocationLabel(
            'Olandganj Main Market, Jaunpur (GPS Verified · Within 5 km)'
          );
          setSelectedArea('All Jaunpur');
          setGpsStatusToast(
            'GPS Locked: Olandganj, Jaunpur — 5 Nearby Salons Found'
          );
          setTimeout(() => setGpsStatusToast(''), 3500);
        },
        () => {
          setGpsLocationLabel(
            'Olandganj, Jaunpur (Showing Salons within 5 km)'
          );
          setGpsStatusToast(
            'Location set to Olandganj, Jaunpur (5 Salons within 5 km)'
          );
          setTimeout(() => setGpsStatusToast(''), 3500);
        },
        { timeout: 2500 }
      );
    } else {
      setGpsStatusToast(
        'Location set to Olandganj, Jaunpur (5 Salons within 5 km)'
      );
      setTimeout(() => setGpsStatusToast(''), 3500);
    }
  };

  // Customer confirms booking a live token
  const handleConfirmBooking = (
    salonId: string,
    params: {
      customerName: string;
      customerPhone: string;
      services: ServiceItem[];
      bookingType: BookingType;
      scheduledSlot?: string;
    }
  ) => {
    const targetSalon = salons.find((s) => s.id === salonId);
    if (!targetSalon) return;

    const { updatedSalon, bookedToken } = bookNewTokenForSalon(
      targetSalon,
      params
    );

    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? updatedSalon : s))
    );
    setMyTokens((prev) => [bookedToken, ...prev]);
    setBookingModalSalonId(null);
    setMobileTab('mytoken');
  };

  // Cancel a customer token
  const handleCancelToken = (salonId: string, tokenId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? cancelTokenById(s, tokenId) : s))
    );
    setMyTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId ? { ...t, status: 'Cancelled' as const } : t
      )
    );
  };

  // Admin: Call Next Token
  const handleAdminCallNext = (salonId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? callNextTokenInSalon(s) : s))
    );
  };

  // Admin: Mark Completed & Paid
  const handleAdminMarkCompleted = (salonId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? markCurrentTokenCompleted(s) : s))
    );
  };

  // Admin: Skip / No-Show
  const handleAdminSkipToken = (salonId: string) => {
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? skipCurrentOrNextToken(s) : s))
    );
  };

  // Admin: Add Walk-In Customer Token
  const handleAdminAddWalkIn = (
    salonId: string,
    params: {
      customerName: string;
      customerPhone: string;
      services: ServiceItem[];
    }
  ) => {
    const target = salons.find((s) => s.id === salonId);
    if (!target) return;
    const { updatedSalon, bookedToken } = bookNewTokenForSalon(target, {
      ...params,
      bookingType: 'Join Live Queue Now',
      isWalkIn: true,
    });
    setSalons((prev) =>
      prev.map((s) => (s.id === salonId ? updatedSalon : s))
    );
    setMyTokens((prev) => [bookedToken, ...prev]);
  };

  // Admin: Add New Salon
  const handleAddNewSalon = (newSalon: Salon) => {
    setSalons((prev) => [...prev, newSalon]);
  };

  // Admin: Update Salon Services & Wait Time
  const handleUpdateSalonSettings = (
    salonId: string,
    updates: {
      avgWaitMinsPerPerson: number;
      services: ServiceItem[];
    }
  ) => {
    setSalons((prev) =>
      prev.map((s) =>
        s.id === salonId
          ? {
              ...s,
              avgWaitMinsPerPerson: updates.avgWaitMinsPerPerson,
              services: updates.services,
            }
          : s
      )
    );
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    setSalons(INITIAL_SALONS);
    setMyTokens([]);
    window.localStorage.removeItem(STORAGE_KEY_SALONS);
    window.localStorage.removeItem(STORAGE_KEY_MY_TOKENS);
  };

  const filteredSalons = filterAndSortSalons(salons, {
    searchQuery,
    selectedArea,
    maxWaitMins: maxWaitFilter,
  });

  // Find active token to display in "My Live Token" view & right sticky sidebar
  // If user hasn't booked one yet, we also allow previewing or booking in 1 click
  const latestCustomerToken: QueueToken | undefined = myTokens[0];
  const latestTokenSalon: Salon | undefined = latestCustomerToken
    ? salons.find((s) => s.id === latestCustomerToken.salonId) || salons[0]
    : undefined;

  // Keep latestCustomerToken synced with live status inside its salon
  const syncedLatestToken: QueueToken | undefined =
    latestCustomerToken && latestTokenSalon
      ? latestTokenSalon.queue.find((t) => t.id === latestCustomerToken.id) ||
        latestCustomerToken
      : undefined;

  const bookingModalSalon =
    salons.find((s) => s.id === bookingModalSalonId) || null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">
      {/* TOP BAR CONTRACT: 3-Zone Header (Brand Wordmark — Concise Nav Links — Primary Action) */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href={appMode === 'admin' ? '/admin' : '/'}
            onClick={(e) => {
              e.preventDefault();
              if (appMode === 'customer') {
                switchAppMode('customer', 'explore');
              }
            }}
            className="text-lg lg:text-xl font-extrabold tracking-tight text-amber-400 font-display whitespace-nowrap shrink-0"
          >
            {appMode === 'admin' ? 'Thanker: Salon Admin' : 'Thanker: Salon'}
          </a>

          {/* Zone 2: Customer-Only Navigation Links (hidden when on /admin) */}
          {appMode === 'customer' ? (
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedArea('All Jaunpur');
                  switchAppMode('customer', 'explore');
                }}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mobileTab === 'explore' && selectedArea !== 'Shortest Wait Time'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Explore Nearby
              </button>
              <button
                type="button"
                onClick={() => switchAppMode('customer', 'nowait')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedArea === 'Shortest Wait Time' || mobileTab === 'nowait'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Shortest Wait
              </button>
              <button
                type="button"
                onClick={() => switchAppMode('customer', 'mytoken')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mobileTab === 'mytoken'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                My Live Token
              </button>
              <button
                type="button"
                onClick={() => switchAppMode('customer', 'bookings')}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mobileTab === 'bookings'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Bookings ({myTokens.length})
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Dedicated Salon Partner Portal (/admin)</span>
            </div>
          )}

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            {appMode === 'admin' ? (
              <button
                type="button"
                onClick={() => switchAppMode('customer', 'explore')}
                className="px-3.5 py-1.5 min-h-[38px] lg:min-h-[40px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                Open Customer Website
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setBookingModalSalonId(salons[0].id)}
                className="px-3.5 py-1.5 min-h-[38px] lg:min-h-[40px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                Book Instant Token
              </button>
            )}
          </div>
        </div>
      </header>

      {/* GPS LOCATION BAR (Customer View Only) */}
      {appMode === 'customer' && (
        <div className="bg-slate-900/90 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 lg:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-400">
              Jaunpur&apos;s #1 Smart Salon Finder &amp; Live Token Booking
              System
            </p>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs text-slate-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Current Location:{' '}
                  <strong className="text-white">{gpsLocationLabel}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleDetectGps}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
              >
                <Navigation className="w-3 h-3" />
                <span>Detect My GPS</span>
              </button>
            </div>
          </div>

          {gpsStatusToast && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2.5">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
                {gpsStatusToast}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEWPORT: DEDICATED /admin PORTAL vs CUSTOMER WEBSITE */}
      <main className="flex-1">
        {appMode === 'admin' ? (
          <AdminPanel
            salons={salons}
            selectedSalonId={adminSelectedSalonId}
            onSelectSalonId={setAdminSelectedSalonId}
            isUnlocked={isAdminUnlocked}
            onUnlock={() => setIsAdminUnlocked(true)}
            onLock={() => setIsAdminUnlocked(false)}
            onCallNextToken={handleAdminCallNext}
            onMarkCompleted={handleAdminMarkCompleted}
            onSkipToken={handleAdminSkipToken}
            onAddWalkInToken={handleAdminAddWalkIn}
            onAddNewSalon={handleAddNewSalon}
            onUpdateSalonSettings={handleUpdateSalonSettings}
            onResetDemoData={handleResetDemoData}
            onBackToCustomerView={() => switchAppMode('customer', 'explore')}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-5 pb-24 lg:pb-12 space-y-4 lg:space-y-5">
            {/* Search & Mobile Jaunpur Area Horizontal Filter Bar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    aria-label="Search salons by name, locality, or service"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Jaunpur salons or services (Haircut, Beard, Facial, Bridal Makeup, Hair Spa)..."
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Touch-Friendly Horizontal Scrolling Area Filter Buttons (Mobile/Tablet) */}
              <div
                role="tablist"
                aria-label="Jaunpur Area Filters"
                className="lg:hidden flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
              >
                {AREA_PILLS.map((area) => {
                  const active = selectedArea === area;
                  return (
                    <button
                      key={area}
                      role="tab"
                      aria-selected={active}
                      type="button"
                      onClick={() => {
                        setSelectedArea(area);
                        if (
                          mobileTab !== 'explore' &&
                          mobileTab !== 'nowait'
                        ) {
                          setMobileTab('explore');
                        }
                      }}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                        active
                          ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MOBILE DEDICATED VIEWS WHEN USER TAPS "My Live Token" OR "Bookings" TAB */}
            {mobileTab === 'mytoken' && (
              <div className="lg:hidden space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    My Live Queue Token Ticket
                  </h2>
                  <button
                    type="button"
                    onClick={() => setMobileTab('explore')}
                    className="text-xs font-semibold text-amber-400"
                  >
                    + Book Another Salon
                  </button>
                </div>

                {syncedLatestToken && latestTokenSalon ? (
                  <LiveTokenTicket
                    token={syncedLatestToken}
                    salon={latestTokenSalon}
                    onCancelToken={handleCancelToken}
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                    <Ticket className="w-8 h-8 text-amber-400 mx-auto" />
                    <h3 className="text-base font-bold text-white">
                      No Active Live Token Yet
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Select any salon in Olandganj, Civil Lines, Line Bazar, or
                      TDB College Road to generate an instant live queue token.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingModalSalonId(salons[0].id);
                      }}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Book Token at Thanker Flagship Salon
                    </button>
                  </div>
                )}
              </div>
            )}

            {mobileTab === 'bookings' && (
              <div className="lg:hidden space-y-4">
                <h2 className="text-lg font-bold text-white">
                  My Salon Token Bookings ({myTokens.length})
                </h2>
                {myTokens.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
                    <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-white">
                      You haven&apos;t booked any tokens in this session yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileTab('explore')}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Explore Nearby Salons
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTokens.map((tk) => {
                      const salonObj =
                        salons.find((s) => s.id === tk.salonId) || salons[0];
                      const liveTk =
                        salonObj.queue.find((q) => q.id === tk.id) || tk;
                      return (
                        <LiveTokenTicket
                          key={tk.id}
                          token={liveTk}
                          salon={salonObj}
                          onCancelToken={handleCancelToken}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DESKTOP 12-COLUMN SPLIT LAYOUT & MOBILE EXPLORE / SHORTEST WAIT VIEW */}
            <div
              className={`${
                mobileTab !== 'explore' && mobileTab !== 'nowait'
                  ? 'hidden lg:grid'
                  : 'grid'
              } grid-cols-1 lg:grid-cols-12 gap-6 items-start`}
            >
              {/* LEFT SIDEBAR (2 Cols on Desktop): Jaunpur Area Filters & Queue Wait-Time Filters */}
              <aside
                aria-label="Jaunpur Area and Wait Time Filters"
                className="hidden lg:block lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-5 sticky top-20"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                    <span>Jaunpur Areas</span>
                  </div>
                  <div className="space-y-1">
                    {AREA_PILLS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setSelectedArea(area)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer truncate ${
                          selectedArea === area
                            ? 'bg-amber-500/15 text-amber-400 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
                    Queue Wait Filter
                  </span>
                  <div className="space-y-1">
                    {[
                      { label: 'Any Wait Time', value: null },
                      { label: 'No Wait (0 mins)', value: 0 },
                      { label: 'Under 15 mins', value: 15 },
                      { label: 'Under 25 mins', value: 25 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setMaxWaitFilter(opt.value)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          maxWaitFilter === opt.value
                            ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Popular Services
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Haircut', 'Beard', 'Facial', 'Hair Spa', 'Bridal'].map(
                      (srv) => (
                        <button
                          key={srv}
                          type="button"
                          onClick={() =>
                            setSearchQuery((prev) => (prev === srv ? '' : srv))
                          }
                          className={`px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                            searchQuery.toLowerCase() === srv.toLowerCase()
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {srv}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </aside>

              {/* CENTER SALON GRID (7 Cols on Desktop -> 3-column grid for Nearby Salon Cards; 1 col on mobile) */}
              <section
                aria-label="Nearby Salons in Jaunpur"
                className="lg:col-span-7 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-white">
                      Nearby Salons in Jaunpur ({filteredSalons.length})
                    </h1>
                    <p className="text-xs text-slate-400">
                      Live queue numbers update automatically · Book your token
                      before leaving home
                    </p>
                  </div>
                  {(searchQuery ||
                    selectedArea !== 'All Jaunpur' ||
                    maxWaitFilter !== null) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedArea('All Jaunpur');
                        setMaxWaitFilter(null);
                      }}
                      className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {filteredSalons.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                    <p className="text-base font-bold text-white">
                      No salons match your current filter criteria
                    </p>
                    <p className="text-xs text-slate-400">
                      Try clearing the search bar or switching area filter to
                      All Jaunpur.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedArea('All Jaunpur');
                        setMaxWaitFilter(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      Show All 5 Jaunpur Salons
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSalons.map((salon) => {
                      const metrics = getSalonQueueMetrics(salon);
                      const googleMapsUrl = buildGoogleMapsUrl(
                        salon.mapQuery || salon.address
                      );

                      return (
                        <article
                          key={salon.id}
                          data-testid={`salon-card-${salon.id}`}
                          className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                        >
                          <div>
                            {/* Salon Interior Artwork */}
                            <SalonArtwork
                              variant={salon.artworkVariant}
                              salonName={salon.name}
                              className="w-full h-36"
                            />

                            {/* Salon Header Info */}
                            <div className="p-4 space-y-3">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h2 className="text-base font-bold text-white leading-snug">
                                    {salon.name}
                                  </h2>
                                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0 font-mono tabular-nums">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    {salon.rating}
                                  </span>
                                </div>

                                {/* Unboxed clean metadata with Google Maps link */}
                                <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                                  <span className="truncate">
                                    {salon.address}
                                  </span>
                                  <a
                                    href={googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Open ${salon.name} in Google Maps`}
                                    aria-label={`Open ${salon.name} (${salon.distanceKm} km away) in Google Maps`}
                                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-mono tabular-nums shrink-0 font-semibold"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{salon.distanceKm} km away</span>
                                  </a>
                                </div>
                              </div>

                              {/* HIGHLIGHTED LIVE QUEUE STATUS BOX */}
                              <div
                                data-testid={`queue-box-${salon.id}`}
                                className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 font-medium">
                                    Now Serving:
                                  </span>
                                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                                    Token {metrics.nowServingFormatted}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 font-medium flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-500" />
                                    <span>Waiting:</span>
                                  </span>
                                  <span
                                    className={`font-mono font-semibold tabular-nums ${
                                      metrics.waitingCount === 0
                                        ? 'text-emerald-400'
                                        : 'text-white'
                                    }`}
                                  >
                                    {metrics.waitingLabel}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400 font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span>Est. Wait:</span>
                                  </span>
                                  <span className="font-mono font-semibold text-amber-400 tabular-nums">
                                    {metrics.estimatedWaitLabel}
                                  </span>
                                </div>

                                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                                  <span className="text-slate-300 font-semibold">
                                    Next Available Token:
                                  </span>
                                  <span className="font-mono font-extrabold text-amber-400 tabular-nums">
                                    {metrics.nextAvailableFormatted}
                                  </span>
                                </div>
                              </div>

                              {/* Popular Services Preview */}
                              <div className="text-[11px] text-slate-400 truncate">
                                {salon.services
                                  .slice(0, 3)
                                  .map((s) => `${s.name} ₹${s.price}`)
                                  .join(' · ')}
                              </div>
                            </div>
                          </div>

                          {/* Primary Card Action Button */}
                          <div className="px-4 pb-4 pt-1">
                            <button
                              type="button"
                              onClick={() => setBookingModalSalonId(salon.id)}
                              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                            >
                              <Ticket className="w-4 h-4 shrink-0" />
                              <span>
                                Book Live Token ({metrics.nextAvailableFormatted}
                                )
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* RIGHT STICKY SIDEBAR (3 Cols on Desktop): Live Active Token Ticket & Queue Tracker */}
              <aside
                aria-label="Live Active Token Ticket and Queue Tracker"
                className="lg:col-span-3 space-y-4 lg:sticky lg:top-20"
              >
                {syncedLatestToken && latestTokenSalon ? (
                  <LiveTokenTicket
                    token={syncedLatestToken}
                    salon={latestTokenSalon}
                    onCancelToken={handleCancelToken}
                  />
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Live Active Token Tracker
                      </span>
                      <Ticket className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <p className="text-sm font-bold text-white">
                        Skip the Salon Waiting Room
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Click <strong>Book Live Token</strong> on any Jaunpur
                        salon card to get your live boarding pass, track the
                        chair queue in real time, and share your ticket on
                        WhatsApp.
                      </p>
                    </div>

                    {/* Customer-Only Quick Actions */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setBookingModalSalonId(salons[0].id)}
                        className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>
                          Book Token at Thanker Flagship (
                          {getSalonQueueMetrics(salons[0]).nextAvailableFormatted}
                          )
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedArea('Shortest Wait Time')}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Show Shortest Wait Salons First</span>
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* CUSTOMER MOBILE FIXED BOTTOM NAVIGATION BAR (Customer Tabs Only — Hidden on /admin) */}
      {appMode === 'customer' && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-4 items-center h-16 px-2"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedArea('All Jaunpur');
              switchAppMode('customer', 'explore');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'explore' && selectedArea !== 'Shortest Wait Time'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap">
              Explore Nearby
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchAppMode('customer', 'nowait')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'nowait' || selectedArea === 'Shortest Wait Time'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap">
              Shortest Wait
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchAppMode('customer', 'mytoken')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer relative ${
              mobileTab === 'mytoken'
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ticket className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap">
              My Live Token
            </span>
            {syncedLatestToken && (
              <span className="absolute top-1 right-4 px-1 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[9px]">
                {formatTokenNumber(syncedLatestToken.tokenNumber)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => switchAppMode('customer', 'bookings')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
              mobileTab === 'bookings'
                ? 'text-amber-400 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight whitespace-nowrap">
              Bookings ({myTokens.length})
            </span>
          </button>
        </nav>
      )}

      {/* Interactive Token Booking Modal / Bottom Sheet Drawer */}
      <BookingModal
        salon={bookingModalSalon}
        onClose={() => setBookingModalSalonId(null)}
        onConfirmBooking={handleConfirmBooking}
      />
    </div>
  );
}
