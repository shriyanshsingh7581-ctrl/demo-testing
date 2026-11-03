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
  SlidersHorizontal,
  Bell,
  Store,
  Megaphone,
  ChevronRight,
  X,
  ArrowRight,
  Cloud,
  LogIn,
  LogOut,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  INITIAL_SALONS,
  INITIAL_AD_BANNERS,
  INITIAL_PUSH_NOTIFICATIONS,
  INITIAL_REGISTERED_CUSTOMERS,
} from './data/initialSalons';
import {
  AdBanner,
  BookingType,
  JaunpurArea,
  PartnerApprovalStatus,
  PortalMode,
  PushNotificationItem,
  QueueToken,
  RegisteredCustomer,
  Salon,
  ServiceItem,
} from './types/salon';
import {
  bookNewTokenForSalon,
  buildGoogleMapsUrl,
  callNextTokenInSalon,
  cancelTokenById,
  filterAndSortSalons,
  getSalonQueueMetrics,
  markCurrentTokenCompleted,
  skipCurrentOrNextToken,
  toggleSalonFeatured,
  updateSalonApprovalStatus,
} from './utils/queueLogic';
import {
  signInWithGooglePopup,
  signOutFirebase,
  subscribeToAuthChanges,
  subscribeToLivePlatformState,
  syncPlatformStateToFirestore,
} from './firebase';
import { SalonArtwork } from './components/SalonArtwork';
import { BookingModal } from './components/BookingModal';
import { LiveTokenTicket } from './components/LiveTokenTicket';
import { PartnerPanel } from './components/PartnerPanel';
import { SuperAdminPanel } from './components/SuperAdminPanel';

const STORAGE_KEY_SALONS = 'thanker_jaunpur_salons_v2';
const STORAGE_KEY_MY_TOKENS = 'thanker_jaunpur_my_tokens_v2';
const STORAGE_KEY_ADS = 'thanker_jaunpur_ads_v2';
const STORAGE_KEY_NOTIFS = 'thanker_jaunpur_notifs_v2';
const STORAGE_KEY_CUSTOMERS = 'thanker_jaunpur_customers_v2';

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
  // Determine initial portal mode from URL query parameters or pathname
  const getInitialModeFromUrl = (): PortalMode => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);

      if (
        params.get('admin') === 'true' ||
        params.get('admin') === '1' ||
        params.get('view') === 'admin' ||
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin'
      ) {
        return 'admin';
      }

      if (
        params.get('partner') === 'true' ||
        params.get('partner') === '1' ||
        params.get('view') === 'partner' ||
        path === '/partner' ||
        path.startsWith('/partner/') ||
        hash === '#partner'
      ) {
        return 'partner';
      }
    }
    return 'customer';
  };

  const [portalMode, setPortalMode] = useState<PortalMode>(
    getInitialModeFromUrl
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>('explore');
  const [openPartnerRegisterModalOnMount, setOpenPartnerRegisterModalOnMount] =
    useState(false);

  // Firebase Auth & Real-Time Firestore Cloud Sync state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>('');
  const [authToast, setAuthToast] = useState<string>('');

  // PIN Lock states for Partner (1111) & Super Admin (7777)
  const [isPartnerUnlocked, setIsPartnerUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') === '1' || params.get('pin') === '1111';
    }
    return false;
  });

  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState<boolean>(
    () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('autostart') === '1' || params.get('pin') === '7777';
      }
      return false;
    }
  );

  // 1. Load Salons (5 Approved + 2 Pending) from localStorage
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

  // 2. Load Customer's Booked Tokens
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

  // 3. Load Sponsored Ad Banners (Managed by Super Admin)
  const [adBanners, setAdBanners] = useState<AdBanner[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_ADS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_AD_BANNERS;
  });

  // 4. Load Push Notifications (Managed by Super Admin)
  const [notifications, setNotifications] = useState<PushNotificationItem[]>(
    () => {
      if (typeof window !== 'undefined') {
        try {
          const saved = window.localStorage.getItem(STORAGE_KEY_NOTIFS);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        } catch {
          // ignore
        }
      }
      return INITIAL_PUSH_NOTIFICATIONS;
    }
  );

  // 5. Load Registered Customers Directory
  const [customers, setCustomers] = useState<RegisteredCustomer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_CUSTOMERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_REGISTERED_CUSTOMERS;
  });

  // Notification Bell Drawer & Live Push Toast
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [livePushToast, setLivePushToast] =
    useState<PushNotificationItem | null>(null);

  // Search, Area Filters, and GPS state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<JaunpurArea>('All Jaunpur');
  const [maxWaitFilter, setMaxWaitFilter] = useState<number | null>(null);
  const [gpsLocationLabel, setGpsLocationLabel] = useState(
    'Olandganj, Jaunpur (Within 5 km)'
  );
  const [gpsStatusToast, setGpsStatusToast] = useState('');

  // Modal state for Booking Live Token
  const [bookingModalSalonId, setBookingModalSalonId] = useState<string | null>(
    null
  );

  // Partner selected salon ID
  const [partnerSelectedSalonId, setPartnerSelectedSalonId] = useState<string>(
    INITIAL_SALONS[0].id
  );

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  // Subscribe to Firebase Real-Time Firestore Platform State when authenticated
  useEffect(() => {
    if (!isAuthReady || !firebaseUser) {
      return;
    }
    const unsubSnapshot = subscribeToLivePlatformState(
      {
        salons,
        adBanners,
        notifications,
      },
      (liveData) => {
        setSalons(liveData.salons);
        setAdBanners(liveData.adBanners);
        setNotifications(liveData.notifications);
        setLastCloudSyncTime(liveData.updatedAtLabel);
      }
    );
    return () => unsubSnapshot();
  }, [isAuthReady, firebaseUser]);

  // Helper to push updates to both local state and Firebase Firestore in real time
  const commitPlatformChanges = (next: {
    salons?: Salon[];
    adBanners?: AdBanner[];
    notifications?: PushNotificationItem[];
  }) => {
    const nextSalons = next.salons ?? salons;
    const nextAds = next.adBanners ?? adBanners;
    const nextNotifs = next.notifications ?? notifications;

    if (next.salons) setSalons(nextSalons);
    if (next.adBanners) setAdBanners(nextAds);
    if (next.notifications) setNotifications(nextNotifs);

    if (firebaseUser) {
      void syncPlatformStateToFirestore({
        salons: nextSalons,
        adBanners: nextAds,
        notifications: nextNotifs,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const user = await signInWithGooglePopup();
      if (user) {
        setAuthToast(
          `Connected to Firebase Real-Time Database as ${user.displayName || user.email}`
        );
        setTimeout(() => setAuthToast(''), 4000);
      }
    } catch (err) {
      setAuthToast(
        err instanceof Error
          ? `Google Sign-In: ${err.message}`
          : 'Google Sign-In cancelled'
      );
      setTimeout(() => setAuthToast(''), 4000);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutFirebase();
    setLastCloudSyncTime('');
    setAuthToast('Signed out of Firebase Cloud Sync');
    setTimeout(() => setAuthToast(''), 3000);
  };

  // Persist all 5 states to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_SALONS, JSON.stringify(salons));
    } catch {
      // ignore
    }
  }, [salons]);

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

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_ADS, JSON.stringify(adBanners));
    } catch {
      // ignore
    }
  }, [adBanners]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_NOTIFS,
        JSON.stringify(notifications)
      );
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_CUSTOMERS,
        JSON.stringify(customers)
      );
    } catch {
      // ignore
    }
  }, [customers]);

  // Listen to storage events across browser tabs for 100% real-time 3-portal sync
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
      if (e.key === STORAGE_KEY_ADS && e.newValue) {
        try {
          setAdBanners(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEY_NOTIFS && e.newValue) {
        try {
          const updated: PushNotificationItem[] = JSON.parse(e.newValue);
          setNotifications(updated);
          if (updated.length > 0) {
            setLivePushToast(updated[0]);
          }
        } catch {
          // ignore
        }
      }
      if (e.key === STORAGE_KEY_CUSTOMERS && e.newValue) {
        try {
          setCustomers(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Switch between the 3 portals and update URL query parameter cleanly
  const switchPortalMode = (
    mode: PortalMode,
    options?: { tab?: MobileTab; openPartnerRegister?: boolean }
  ) => {
    setPortalMode(mode);
    setOpenPartnerRegisterModalOnMount(Boolean(options?.openPartnerRegister));

    if (typeof window !== 'undefined') {
      if (mode === 'admin') {
        window.history.pushState({}, '', '/?admin=true');
      } else if (mode === 'partner') {
        window.history.pushState({}, '', '/?partner=true');
      } else {
        if (options?.tab === 'nowait') {
          setSelectedArea('Shortest Wait Time');
          setMobileTab('nowait');
        } else {
          if (options?.tab === 'explore' && mobileTab === 'nowait') {
            setSelectedArea('All Jaunpur');
          }
          setMobileTab(options?.tab || 'explore');
        }
        window.history.pushState({}, '', '/?view=customer');
      }
    }
  };

  useEffect(() => {
    const onUrlChange = () => {
      const nextMode = getInitialModeFromUrl();
      setPortalMode(nextMode);
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
    const approvedCount = salons.filter(
      (s) => (s.approvalStatus ?? 'Approved') === 'Approved'
    ).length;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGpsLocationLabel('Olandganj Main Market, Jaunpur (GPS Verified)');
          setSelectedArea('All Jaunpur');
          setGpsStatusToast(
            `GPS Locked: Olandganj, Jaunpur — ${approvedCount} Approved Salons Found`
          );
          setTimeout(() => setGpsStatusToast(''), 3500);
        },
        () => {
          setGpsLocationLabel('Olandganj, Jaunpur (Within 5 km)');
          setGpsStatusToast(
            `Location set to Olandganj, Jaunpur (${approvedCount} Approved Salons)`
          );
          setTimeout(() => setGpsStatusToast(''), 3500);
        },
        { timeout: 2500 }
      );
    } else {
      setGpsStatusToast(
        `Location set to Olandganj, Jaunpur (${approvedCount} Approved Salons)`
      );
      setTimeout(() => setGpsStatusToast(''), 3500);
    }
  };

  // Customer confirms booking a live token -> updates Salon Queue, My Tokens, Customers Directory & Firebase
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

    const nextSalons = salons.map((s) =>
      s.id === salonId ? updatedSalon : s
    );
    commitPlatformChanges({ salons: nextSalons });
    setMyTokens((prev) => [bookedToken, ...prev]);

    // Sync customer into RegisteredCustomers Directory for Super Admin Analytics
    setCustomers((prev) => {
      const existingIdx = prev.findIndex(
        (c) =>
          c.phone.replace(/\D/g, '') ===
            params.customerPhone.replace(/\D/g, '') ||
          c.name.toLowerCase() === params.customerName.toLowerCase()
      );
      if (existingIdx >= 0) {
        return prev.map((c, idx) =>
          idx === existingIdx
            ? {
                ...c,
                totalBookings: c.totalBookings + 1,
                lastBookedSalon: targetSalon.name,
              }
            : c
        );
      }
      const newCust: RegisteredCustomer = {
        id: `cust-${Date.now()}`,
        name: params.customerName,
        phone: params.customerPhone,
        locality: targetSalon.locality,
        totalBookings: 1,
        lastBookedSalon: targetSalon.name,
        joinedDate: 'Today',
      };
      return [newCust, ...prev];
    });

    setBookingModalSalonId(null);
    setMobileTab('mytoken');
  };

  // Cancel a customer token
  const handleCancelToken = (salonId: string, tokenId: string) => {
    const nextSalons = salons.map((s) =>
      s.id === salonId ? cancelTokenById(s, tokenId) : s
    );
    commitPlatformChanges({ salons: nextSalons });
    setMyTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId ? { ...t, status: 'Cancelled' as const } : t
      )
    );
  };

  // Partner: Call Next Token
  const handlePartnerCallNext = (salonId: string) => {
    const nextSalons = salons.map((s) =>
      s.id === salonId ? callNextTokenInSalon(s) : s
    );
    commitPlatformChanges({ salons: nextSalons });
  };

  // Partner: Mark Completed & Paid
  const handlePartnerMarkCompleted = (salonId: string) => {
    const nextSalons = salons.map((s) =>
      s.id === salonId ? markCurrentTokenCompleted(s) : s
    );
    commitPlatformChanges({ salons: nextSalons });
  };

  // Partner: Skip / No-Show
  const handlePartnerSkipToken = (salonId: string) => {
    const nextSalons = salons.map((s) =>
      s.id === salonId ? skipCurrentOrNextToken(s) : s
    );
    commitPlatformChanges({ salons: nextSalons });
  };

  // Partner: Add Walk-In Customer Token
  const handlePartnerAddWalkIn = (
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
    const nextSalons = salons.map((s) =>
      s.id === salonId ? updatedSalon : s
    );
    commitPlatformChanges({ salons: nextSalons });
    setMyTokens((prev) => [bookedToken, ...prev]);
  };

  // Partner: Register a New Salon Partner -> Goes to "Pending" for Super Admin Approval
  const handleRegisterPartnerSalon = (newSalon: Salon) => {
    const nextSalons = [newSalon, ...salons];
    commitPlatformChanges({ salons: nextSalons });
  };

  // Partner: Update Salon Profile, Photos, Services & Wait Time
  const handleUpdateSalonProfile = (
    salonId: string,
    updates: {
      name?: string;
      address?: string;
      mapQuery?: string;
      photoUrl?: string;
      avgWaitMinsPerPerson: number;
      services: ServiceItem[];
    }
  ) => {
    const nextSalons = salons.map((s) =>
      s.id === salonId
        ? {
            ...s,
            name: updates.name ?? s.name,
            address: updates.address ?? s.address,
            mapQuery: updates.mapQuery ?? s.mapQuery,
            photoUrl: updates.photoUrl,
            avgWaitMinsPerPerson: updates.avgWaitMinsPerPerson,
            services: updates.services,
          }
        : s
    );
    commitPlatformChanges({ salons: nextSalons });
  };

  // Super Admin: Approve or Reject Salon Partner
  const handleSuperAdminUpdateApproval = (
    salonId: string,
    status: PartnerApprovalStatus
  ) => {
    const nextSalons = updateSalonApprovalStatus(salons, salonId, status);
    commitPlatformChanges({ salons: nextSalons });
  };

  // Super Admin: Toggle Featured / Sponsored Partner status
  const handleSuperAdminToggleFeatured = (salonId: string) => {
    const nextSalons = toggleSalonFeatured(salons, salonId);
    commitPlatformChanges({ salons: nextSalons });
  };

  // Super Admin: Send Push Notification -> Immediately shows live toast & updates Bell
  const handleSuperAdminSendNotification = (
    notifData: Omit<PushNotificationItem, 'id' | 'createdAt'>
  ) => {
    const newNotif: PushNotificationItem = {
      id: `notif-${Date.now()}`,
      ...notifData,
      createdAt: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    const nextNotifs = [newNotif, ...notifications];
    commitPlatformChanges({ notifications: nextNotifs });
    setLivePushToast(newNotif);
  };

  // Super Admin: Toggle Ad Banner Active status
  const handleSuperAdminToggleAdBanner = (bannerId: string) => {
    const nextAds = adBanners.map((b) =>
      b.id === bannerId ? { ...b, active: !b.active } : b
    );
    commitPlatformChanges({ adBanners: nextAds });
  };

  // Super Admin: Add New Sponsored Ad Banner
  const handleSuperAdminAddAdBanner = (bannerData: Omit<AdBanner, 'id'>) => {
    const newBanner: AdBanner = {
      id: `ad-${Date.now()}`,
      ...bannerData,
    };
    const nextAds = [newBanner, ...adBanners];
    commitPlatformChanges({ adBanners: nextAds });
  };

  // Super Admin: Reset Demo Data
  const handleResetDemoData = () => {
    commitPlatformChanges({
      salons: INITIAL_SALONS,
      adBanners: INITIAL_AD_BANNERS,
      notifications: INITIAL_PUSH_NOTIFICATIONS,
    });
    setMyTokens([]);
    setCustomers(INITIAL_REGISTERED_CUSTOMERS);
    window.localStorage.removeItem(STORAGE_KEY_SALONS);
    window.localStorage.removeItem(STORAGE_KEY_MY_TOKENS);
    window.localStorage.removeItem(STORAGE_KEY_ADS);
    window.localStorage.removeItem(STORAGE_KEY_NOTIFS);
    window.localStorage.removeItem(STORAGE_KEY_CUSTOMERS);
  };

  // Customer App only displays Approved salons
  const approvedSalons = salons.filter(
    (s) => (s.approvalStatus ?? 'Approved') === 'Approved'
  );

  const filteredSalons = filterAndSortSalons(salons, {
    searchQuery,
    selectedArea,
    maxWaitMins: maxWaitFilter,
    onlyApproved: true,
  });

  const activeAdBanners = adBanners.filter((b) => b.active);
  const pendingApprovalCount = salons.filter(
    (s) => s.approvalStatus === 'Pending'
  ).length;

  // Latest active token for Customer Ticket tracker
  const latestCustomerToken: QueueToken | undefined = myTokens[0];
  const latestTokenSalon: Salon | undefined = latestCustomerToken
    ? salons.find((s) => s.id === latestCustomerToken.salonId) ||
      approvedSalons[0]
    : undefined;

  const syncedLatestToken: QueueToken | undefined =
    latestCustomerToken && latestTokenSalon
      ? latestTokenSalon.queue.find((t) => t.id === latestCustomerToken.id) ||
        latestCustomerToken
      : undefined;

  const bookingModalSalon =
    salons.find((s) => s.id === bookingModalSalonId) || null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col">
      {/* 3-PORTAL MODE SWITCHER BAR + FIREBASE REAL-TIME CLOUD SYNC STATUS */}
      <div className="bg-slate-950 border-b border-slate-800/90 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              3-Tier Platform Switcher:
            </span>
            <div
              role="navigation"
              aria-label="3-Tier Platform Mode Switcher"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
            >
              <button
                type="button"
                data-testid="mode-switch-customer"
                onClick={() => switchPortalMode('customer', { tab: 'explore' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  portalMode === 'customer'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>1. Customer App ({approvedSalons.length} Salons)</span>
              </button>

              <button
                type="button"
                data-testid="mode-switch-partner"
                onClick={() => switchPortalMode('partner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  portalMode === 'partner'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>2. Salon Partner Panel (PIN: 1111)</span>
              </button>

              <button
                type="button"
                data-testid="mode-switch-admin"
                onClick={() => switchPortalMode('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  portalMode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  3. Owner Super Admin (PIN: 7777)
                  {pendingApprovalCount > 0
                    ? ` · ${pendingApprovalCount} Pending`
                    : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Firebase Real-Time Database Cloud Auth & Live Sync Control */}
          <div className="flex items-center gap-2">
            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    Firebase Live DB Connected
                    {lastCloudSyncTime ? ` · ${lastCloudSyncTime}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  title="Sign out of Firebase Cloud Sync"
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="firebase-google-signin-btn"
                onClick={handleGoogleSignIn}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Connect Firebase Live DB (Google Login)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FIREBASE AUTH TOAST */}
      {authToast && (
        <div className="bg-emerald-950/95 border-b border-emerald-500/40 px-4 py-2 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-emerald-200 font-semibold">
            <span>{authToast}</span>
            <button
              type="button"
              onClick={() => setAuthToast('')}
              className="text-emerald-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* LIVE PUSH NOTIFICATION BROADCAST TOAST */}
      {livePushToast && (
        <div className="bg-indigo-950/95 border-b border-indigo-500/40 px-4 py-2.5 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                Live Push Alert
              </span>
              <p className="text-xs font-bold text-white truncate">
                {livePushToast.title}:{' '}
                <span className="font-normal text-indigo-200">
                  {livePushToast.message}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLivePushToast(null)}
              className="text-indigo-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* TOP BAR CONTRACT: 3-Zone Header (Brand Wordmark — Concise Nav Links — Notification Bell + Primary CTA) */}
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/?view=customer"
            onClick={(e) => {
              e.preventDefault();
              switchPortalMode('customer', { tab: 'explore' });
            }}
            className="text-lg lg:text-xl font-extrabold tracking-tight text-amber-400 font-display whitespace-nowrap shrink-0"
          >
            Thanker: Salon - Jaunpur
          </a>

          {/* Zone 2: Customer Navigation Links */}
          {portalMode === 'customer' ? (
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedArea('All Jaunpur');
                  switchPortalMode('customer', { tab: 'explore' });
                }}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mobileTab === 'explore' &&
                  selectedArea !== 'Shortest Wait Time'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Explore Nearby
              </button>
              <button
                type="button"
                onClick={() => switchPortalMode('customer', { tab: 'nowait' })}
                className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedArea === 'Shortest Wait Time' ||
                  mobileTab === 'nowait'
                    ? 'text-amber-400 underline underline-offset-8 decoration-2'
                    : ''
                }`}
              >
                Shortest Wait
              </button>
              <button
                type="button"
                onClick={() => switchPortalMode('customer', { tab: 'mytoken' })}
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
                onClick={() =>
                  switchPortalMode('customer', { tab: 'bookings' })
                }
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
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-300">
              <span>
                {portalMode === 'partner'
                  ? 'Portal 2: Salon Partner Queue & Menu Controller (PIN: 1111)'
                  : 'Portal 3: Platform Founder Super Admin Console (PIN: 7777)'}
              </span>
            </div>
          )}

          {/* Zone 3: Live Notification Bell + Primary Action Button */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="notification-bell-btn"
              aria-label={`Notifications (${notifications.length})`}
              onClick={() => setIsNotifDrawerOpen((prev) => !prev)}
              className="relative min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Alerts</span>
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono text-[10px] font-extrabold tabular-nums">
                {notifications.length}
              </span>
            </button>

            {portalMode === 'customer' ? (
              <button
                type="button"
                onClick={() =>
                  setBookingModalSalonId(
                    approvedSalons[0]?.id || salons[0].id
                  )
                }
                className="px-3.5 py-1.5 min-h-[38px] lg:min-h-[40px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                Book Instant Token
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchPortalMode('customer', { tab: 'explore' })}
                className="px-3.5 py-1.5 min-h-[38px] lg:min-h-[40px] text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                Open Customer App
              </button>
            )}
          </div>
        </div>
      </header>

      {/* NOTIFICATION BELL DRAWER / MODAL */}
      {isNotifDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-start justify-end p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden mt-14">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">
                  Thanker: Salon Live Push Notifications ({notifications.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-400">
                      {n.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {n.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
                  <div className="text-[10px] text-indigo-300 font-semibold">
                    Audience: {n.audience}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GPS LOCATION BAR (Customer View Only) */}
      {portalMode === 'customer' && (
        <div className="bg-slate-900/90 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 lg:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-xs font-semibold text-amber-400">
              Jaunpur&apos;s #1 Smart Salon Finder &amp; Live Queue Token
              Booking Platform
            </p>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 text-xs text-slate-300 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  📍 <strong className="text-white">{gpsLocationLabel}</strong>
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

      {/* MAIN VIEWPORT: SWITCH BETWEEN PORTAL 1 (CUSTOMER), PORTAL 2 (PARTNER), PORTAL 3 (SUPER ADMIN) */}
      <main className="flex-1">
        {portalMode === 'partner' ? (
          <PartnerPanel
            salons={salons}
            selectedSalonId={partnerSelectedSalonId}
            onSelectSalonId={setPartnerSelectedSalonId}
            isUnlocked={isPartnerUnlocked}
            onUnlock={() => setIsPartnerUnlocked(true)}
            onLock={() => setIsPartnerUnlocked(false)}
            initialOpenRegister={openPartnerRegisterModalOnMount}
            onCallNextToken={handlePartnerCallNext}
            onMarkCompleted={handlePartnerMarkCompleted}
            onSkipToken={handlePartnerSkipToken}
            onAddWalkInToken={handlePartnerAddWalkIn}
            onRegisterPartnerSalon={handleRegisterPartnerSalon}
            onUpdateSalonProfile={handleUpdateSalonProfile}
            onBackToCustomerView={() =>
              switchPortalMode('customer', { tab: 'explore' })
            }
          />
        ) : portalMode === 'admin' ? (
          <SuperAdminPanel
            salons={salons}
            customers={customers}
            adBanners={adBanners}
            notifications={notifications}
            isUnlocked={isSuperAdminUnlocked}
            onUnlock={() => setIsSuperAdminUnlocked(true)}
            onLock={() => setIsSuperAdminUnlocked(false)}
            onUpdateApproval={handleSuperAdminUpdateApproval}
            onToggleFeatured={handleSuperAdminToggleFeatured}
            onSendPushNotification={handleSuperAdminSendNotification}
            onToggleAdBanner={handleSuperAdminToggleAdBanner}
            onAddAdBanner={handleSuperAdminAddAdBanner}
            onResetDemoData={handleResetDemoData}
            onBackToCustomerView={() =>
              switchPortalMode('customer', { tab: 'explore' })
            }
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-5 pb-24 lg:pb-12 space-y-5">
            {/* SPONSORED ADVERTISEMENT BANNER CAROUSEL (Managed from Super Admin Panel) */}
            {activeAdBanners.length > 0 && (
              <section
                aria-label="Sponsored Promotional Offers in Jaunpur"
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Sponsored Salon Offers · Jaunpur</span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Managed live via Super Admin Ad Manager
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeAdBanners.map((banner) => (
                    <div
                      key={banner.id}
                      data-testid={`sponsored-banner-${banner.id}`}
                      className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                        banner.accentColor === 'emerald'
                          ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-emerald-500/30'
                          : banner.accentColor === 'indigo'
                            ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border-indigo-500/30'
                            : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-500/30'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {banner.badgeText}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-300">
                            {banner.sponsorSalonName}
                          </span>
                        </div>
                        <h2 className="text-sm sm:text-base font-extrabold text-white">
                          {banner.headline}
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {banner.subtext}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (banner.targetArea) {
                              setSelectedArea(banner.targetArea);
                            }
                            const matchedSalon = approvedSalons.find((s) =>
                              s.name
                                .toLowerCase()
                                .includes(
                                  banner.sponsorSalonName
                                    .split(' ')[0]
                                    .toLowerCase()
                                )
                            );
                            if (matchedSalon) {
                              setBookingModalSalonId(matchedSalon.id);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <span>{banner.ctaText}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                        setBookingModalSalonId(
                          approvedSalons[0]?.id || salons[0].id
                        );
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
                      Nearby Verified Salons in Jaunpur ({filteredSalons.length}
                      )
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
                      Show All {approvedSalons.length} Jaunpur Salons
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
                            {/* Salon Interior Artwork or Uploaded Partner Photo */}
                            <SalonArtwork
                              variant={salon.artworkVariant}
                              salonName={salon.name}
                              photoUrl={salon.photoUrl}
                              isFeatured={salon.isFeatured}
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

                    <div className="space-y-2 pt-1">
                      {approvedSalons[0] && (
                        <button
                          type="button"
                          onClick={() =>
                            setBookingModalSalonId(approvedSalons[0].id)
                          }
                          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 shrink-0" />
                          <span>
                            Book Token at Thanker Flagship (
                            {
                              getSalonQueueMetrics(approvedSalons[0])
                                .nextAvailableFormatted
                            }
                            )
                          </span>
                        </button>
                      )}

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

            {/* SALON PARTNER ONBOARDING CTA BANNER AT BOTTOM OF CUSTOMER APP */}
            <section
              aria-label="Register as a Salon Partner in Jaunpur"
              className="mt-8 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/60 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  For Salon Owners in Jaunpur
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Are you a Salon Owner in Jaunpur? → Register as a Salon
                  Partner
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl">
                  List your Men&apos;s, Ladies&apos;, or Unisex salon on
                  Thanker: Salon. Manage your daily live token queue (PIN:
                  1111), upload salon photos, update service prices, and get
                  new customers from Olandganj, Civil Lines, Line Bazar &amp;
                  TDB College Road.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  data-testid="footer-register-partner-cta"
                  onClick={() =>
                    switchPortalMode('partner', { openPartnerRegister: true })
                  }
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Store className="w-4 h-4" />
                  <span>Register as a Salon Partner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* CUSTOMER MOBILE FIXED BOTTOM NAVIGATION BAR */}
      {portalMode === 'customer' && (
        <nav
          aria-label="Mobile Bottom Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center h-16 px-1"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedArea('All Jaunpur');
              switchPortalMode('customer', { tab: 'explore' });
            }}
            className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold cursor-pointer ${
              mobileTab === 'explore' && selectedArea !== 'Shortest Wait Time'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </button>

          <button
            type="button"
            onClick={() => switchPortalMode('customer', { tab: 'nowait' })}
            className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold cursor-pointer ${
              mobileTab === 'nowait' || selectedArea === 'Shortest Wait Time'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>No Wait</span>
          </button>

          <button
            type="button"
            onClick={() => switchPortalMode('customer', { tab: 'mytoken' })}
            className={`flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold cursor-pointer ${
              mobileTab === 'mytoken'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>My Token</span>
          </button>

          <button
            type="button"
            onClick={() => switchPortalMode('partner')}
            className="flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold text-emerald-400 cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Partner</span>
          </button>

          <button
            type="button"
            onClick={() => switchPortalMode('admin')}
            className="flex flex-col items-center justify-center gap-1 h-full text-[10px] font-semibold text-indigo-400 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Owner</span>
          </button>
        </nav>
      )}

      {/* INSTANT TOKEN BOOKING MODAL (Slide-up Bottom Sheet on Mobile / Centered Modal on Desktop) */}
      <BookingModal
        salon={bookingModalSalon}
        onClose={() => setBookingModalSalonId(null)}
        onConfirmBooking={handleConfirmBooking}
      />
    </div>
  );
}
