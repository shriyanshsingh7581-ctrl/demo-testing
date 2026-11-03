import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Users,
  Store,
  Ticket,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Star,
  Phone,
  MessageCircle,
  Bell,
  Megaphone,
  ArrowLeft,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  AdBanner,
  JaunpurLocality,
  NotificationAudience,
  PartnerApprovalStatus,
  PushNotificationItem,
  RegisteredCustomer,
  Salon,
} from '../types/salon';
import {
  formatTokenNumber,
  getPlatformAnalytics,
} from '../utils/queueLogic';
import { SalonArtwork } from './SalonArtwork';

interface SuperAdminPanelProps {
  salons: Salon[];
  customers: RegisteredCustomer[];
  adBanners: AdBanner[];
  notifications: PushNotificationItem[];
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  onUpdateApproval: (salonId: string, status: PartnerApprovalStatus) => void;
  onToggleFeatured: (salonId: string) => void;
  onSendPushNotification: (notif: Omit<PushNotificationItem, 'id' | 'createdAt'>) => void;
  onToggleAdBanner: (bannerId: string) => void;
  onAddAdBanner: (banner: Omit<AdBanner, 'id'>) => void;
  onResetDemoData: () => void;
  onBackToCustomerView: () => void;
}

const SUPER_ADMIN_PIN = '7777';

type SuperAdminTab =
  | 'approvals'
  | 'bookings'
  | 'customers'
  | 'notifications'
  | 'ads';

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  salons,
  customers,
  adBanners,
  notifications,
  isUnlocked,
  onUnlock,
  onLock,
  onUpdateApproval,
  onToggleFeatured,
  onSendPushNotification,
  onToggleAdBanner,
  onAddAdBanner,
  onResetDemoData,
  onBackToCustomerView,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('approvals');
  const [approvalFilter, setApprovalFilter] = useState<
    'All' | PartnerApprovalStatus
  >('All');
  const [bookingAreaFilter, setBookingAreaFilter] = useState<
    'All' | JaunpurLocality
  >('All');

  // Push Notification Form State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifAudience, setNotifAudience] =
    useState<NotificationAudience>('All Customers');
  const [notifOfferTag, setNotifOfferTag] = useState('JAUNPUR SPECIAL');
  const [notifFeedback, setNotifFeedback] = useState('');

  // Ad Banner Form State
  const [adTitle, setAdTitle] = useState('');
  const [adSubtitle, setAdSubtitle] = useState('');
  const [adSponsor, setAdSponsor] = useState('');
  const [adBadge, setAdBadge] = useState('SPONSORED AD');
  const [adCta, setAdCta] = useState('Book Token Now');
  const [adArea, setAdArea] = useState<JaunpurLocality>('Olandganj');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adSpend, setAdSpend] = useState('3500');
  const [adFeedback, setAdFeedback] = useState('');

  const handlePinKeyPress = (digit: string) => {
    setPinError('');
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next === SUPER_ADMIN_PIN) {
        setPinInput('');
        onUnlock();
      } else if (next.length === 4) {
        setPinError('Incorrect PIN. Use Platform Owner Super Admin PIN: 7777');
      }
    }
  };

  const handlePinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === SUPER_ADMIN_PIN) {
      setPinInput('');
      setPinError('');
      onUnlock();
    } else {
      setPinError(
        'Incorrect PIN. Please enter Platform Owner Super Admin PIN: 7777'
      );
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Owner Super Admin Panel
                </h1>
                <p className="text-xs text-slate-400">
                  Thanker: Salon Founder &amp; Aggregator HQ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBackToCustomerView}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 min-h-[40px] px-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer App</span>
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-xs font-semibold text-indigo-300 flex items-center justify-between">
            <span>Platform Owner Super Admin PIN: 7777</span>
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                onUnlock();
              }}
              className="underline text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
            >
              Quick Auto-Fill 7777
            </button>
          </div>

          <form onSubmit={handlePinFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="super-admin-pin-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Enter 4-Digit Founder Super Admin PIN
              </label>
              <input
                id="super-admin-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinError('');
                  setPinInput(val);
                  if (val === SUPER_ADMIN_PIN) {
                    setPinInput('');
                    onUnlock();
                  }
                }}
                placeholder="7777"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-center text-2xl font-mono tracking-[0.5em] text-indigo-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinKeyPress(digit)}
                  className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-base font-bold font-mono text-white transition-colors cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setPinError('');
                  setPinInput('');
                }}
                className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress('0')}
                className="h-11 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-base font-bold font-mono text-white transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="submit"
                className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Unlock HQ
              </button>
            </div>

            {pinError && (
              <p
                role="alert"
                className="text-xs font-medium text-red-400 text-center"
              >
                {pinError}
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  const analytics = getPlatformAnalytics(salons, customers, adBanners);

  const filteredPartnerSalons = salons.filter((s) =>
    approvalFilter === 'All' ? true : s.approvalStatus === approvalFilter
  );

  const filteredMasterTokens = analytics.allMasterTokens.filter((t) =>
    bookingAreaFilter === 'All' ? true : t.salonArea === bookingAreaFilter
  );

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    onSendPushNotification({
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      audience: notifAudience,
      offerTag: notifOfferTag.trim() || 'ANNOUNCEMENT',
    });
    setNotifTitle('');
    setNotifMessage('');
    setNotifFeedback(
      'Push Notification broadcasted live to Customer & Partner portals!'
    );
    setTimeout(() => setNotifFeedback(''), 4000);
  };

  const handleCreateAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adSponsor.trim()) return;
    onAddAdBanner({
      title: adTitle.trim(),
      subtitle:
        adSubtitle.trim() ||
        `Book your instant live queue token at ${adSponsor.trim()} in Jaunpur.`,
      sponsorName: adSponsor.trim(),
      offerBadge: adBadge.trim() || 'SPONSORED PARTNER',
      ctaText: adCta.trim() || 'Book Token Now',
      targetArea: adArea,
      imageUrl: adImageUrl.trim() || undefined,
      isActive: true,
      adSpend: parseInt(adSpend, 10) || 2500,
    });
    setAdTitle('');
    setAdSubtitle('');
    setAdSponsor('');
    setAdImageUrl('');
    setAdFeedback('New Sponsored Banner published to Customer App top carousel!');
    setTimeout(() => setAdFeedback(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6 pb-24 lg:pb-12">
      {/* Super Admin HQ Header */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            <span>MAIN OWNER SUPER ADMIN PANEL (PIN: 7777)</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">JAUNPUR AGGREGATOR HQ</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white mt-0.5">
            Thanker: Salon — Founder Control Center &amp; Traffic Analytics
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Platform Data</span>
          </button>
          <button
            type="button"
            onClick={onLock}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Lock HQ</span>
          </button>
        </div>
      </div>

      {/* TOP EXECUTIVE OVERVIEW & TRAFFIC ANALYTICS CARDS (4 KPI Cards + Area Breakdown) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Registered Customers</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p
            data-testid="superadmin-total-customers"
            className="text-2xl font-extrabold text-white font-mono tabular-nums"
          >
            {analytics.totalRegisteredCustomers.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-400 font-medium">
            +{customers.length} active directory profiles
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Salon Partners</span>
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <p
            data-testid="superadmin-salon-counts"
            className="text-2xl font-extrabold text-white font-mono tabular-nums"
          >
            {analytics.approvedSalonsCount} Active
          </p>
          <p className="text-[11px] text-amber-400 font-semibold font-mono tabular-nums">
            {analytics.pendingSalonsCount} Pending Approval ·{' '}
            {analytics.rejectedSalonsCount} Blocked
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Token Bookings</span>
            <Ticket className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-white font-mono tabular-nums">
            {analytics.totalBookingsToday} Today
          </p>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums">
            All-Time: {analytics.totalBookingsAllTime.toLocaleString('en-IN')}{' '}
            Tokens
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Platform GMV &amp; Ad Revenue</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
            ₹{analytics.totalPlatformRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 font-mono tabular-nums">
            Bookings: ₹{analytics.totalBookingGmv} · Ads: ₹
            {analytics.totalAdRevenue}
          </p>
        </div>
      </div>

      {/* Jaunpur Area-Wise Traffic Breakdown Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 shrink-0">
          Jaunpur Area-Wise Live Token Traffic:
        </span>
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
          {(
            Object.entries(analytics.areaBookingBreakdown) as [
              JaunpurLocality,
              number
            ][]
          ).map(([area, count]) => (
            <button
              key={area}
              type="button"
              onClick={() => {
                setBookingAreaFilter(area);
                setActiveTab('bookings');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{area}:</span>
              <strong className="text-amber-400">{count} Tokens</strong>
            </button>
          ))}
        </div>
      </div>

      {/* 5 Super Admin Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Super Admin Management Tabs"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {[
          {
            id: 'approvals' as const,
            label: `1. Partner Approvals (${analytics.pendingSalonsCount} Pending)`,
          },
          {
            id: 'bookings' as const,
            label: `2. Master Booking Monitor (${analytics.totalBookingsToday})`,
          },
          {
            id: 'customers' as const,
            label: `3. Registered Customers (${customers.length})`,
          },
          {
            id: 'notifications' as const,
            label: `4. Push Notifications (${notifications.length})`,
          },
          {
            id: 'ads' as const,
            label: `5. Ad & Banner Manager (${adBanners.length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
              activeTab === tab.id
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SALON PARTNER APPROVALS & MANAGEMENT */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                Salon Partner Approvals &amp; Management (किस सैलून को अप्रूव
                करना है किसको नहीं)
              </h2>
              <p className="text-xs text-slate-400">
                Approving a salon immediately publishes it live on the Customer
                App across Jaunpur.
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setApprovalFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      approvalFilter === st
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPartnerSalons.map((salon) => (
              <div
                key={salon.id}
                data-testid={`partner-approval-card-${salon.id}`}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg"
              >
                <div>
                  <SalonArtwork
                    variant={salon.artworkVariant}
                    salonName={salon.name}
                    photoUrl={salon.photoUrl}
                    isFeatured={salon.isFeatured}
                    className="w-full h-36"
                  />

                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white">
                          {salon.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {salon.address} ({salon.area})
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                          salon.approvalStatus === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : salon.approvalStatus === 'Pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {salon.approvalStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        Owner: <strong>{salon.ownerName}</strong>
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">
                        · +91 {salon.ownerPhone}
                      </span>
                      {salon.submittedAt && (
                        <span className="text-slate-400">
                          · Joined: {salon.submittedAt}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 truncate">
                      Pricing:{' '}
                      {salon.services
                        .slice(0, 3)
                        .map((s) => `${s.name} ₹${s.price}`)
                        .join(' · ')}
                    </div>
                  </div>
                </div>

                {/* 1-Click Super Admin Approval & Management Buttons */}
                <div className="p-4 pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateApproval(salon.id, 'Approved')}
                    disabled={salon.approvalStatus === 'Approved'}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      salon.approvalStatus === 'Approved'
                        ? 'bg-emerald-500/10 text-emerald-500/50 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Approve Salon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateApproval(salon.id, 'Rejected')}
                    disabled={salon.approvalStatus === 'Rejected'}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                      salon.approvalStatus === 'Rejected'
                        ? 'bg-red-500/10 text-red-500/40 cursor-not-allowed'
                        : 'bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Reject / Block</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleFeatured(salon.id)}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border ${
                      salon.isFeatured
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {salon.isFeatured ? 'Featured ★' : 'Mark Featured'}
                    </span>
                  </button>

                  <a
                    href={`tel:+91${salon.ownerPhone}`}
                    className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Call Owner</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ALL-JAUNPUR MASTER BOOKING & TRAFFIC MONITOR */}
      {activeTab === 'bookings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:px-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">
                All-Jaunpur Master Booking &amp; Traffic Monitor (कहाँ से कितने
                यूजर्स और बुकिंग आ रही हैं)
              </h2>
              <p className="text-xs text-slate-400">
                Real-time master ledger of every customer token across all
                localities in Jaunpur.
              </p>
            </div>

            <select
              aria-label="Filter master bookings by Jaunpur locality"
              value={bookingAreaFilter}
              onChange={(e) =>
                setBookingAreaFilter(
                  e.target.value as 'All' | JaunpurLocality
                )
              }
              className="h-9 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            >
              <option value="All">All Jaunpur Localities</option>
              <option value="Olandganj">Olandganj</option>
              <option value="Civil Lines">Civil Lines</option>
              <option value="Line Bazar">Line Bazar</option>
              <option value="TDB College Road">TDB College Road</option>
              <option value="Machhlishahr Padav">Machhlishahr Padav</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Customer Name &amp; Phone</th>
                  <th className="py-3 px-4">Salon Partner</th>
                  <th className="py-3 px-4">Jaunpur Area</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {filteredMasterTokens.map((tk) => (
                  <tr key={tk.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 tabular-nums">
                      {formatTokenNumber(tk.tokenNumber)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">
                        {tk.customerName}
                      </p>
                      <p className="text-slate-400 font-mono tabular-nums">
                        +91 {tk.customerPhone}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {tk.salonName}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{tk.salonArea}</td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {tk.services.map((s) => s.name).join(', ')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                      ₹{tk.totalAmount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          tk.status === 'In Chair'
                            ? 'text-emerald-400'
                            : tk.status === 'Waiting'
                            ? 'text-amber-400'
                            : tk.status === 'Completed'
                            ? 'text-indigo-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {tk.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REGISTERED CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:px-5 border-b border-slate-800">
            <h2 className="text-base font-bold text-white">
              Registered Customers Directory — Jaunpur
            </h2>
            <p className="text-xs text-slate-400">
              Complete directory of customers booking tokens on Thanker: Salon
              with 1-click Call &amp; WhatsApp.
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            {customers.map((cust) => (
              <div
                key={cust.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {cust.name}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-400">
                      · +91 {cust.phone}
                    </span>
                    <span className="text-xs text-amber-400">
                      · {cust.area}, Jaunpur
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono tabular-nums">
                    Total Bookings: <strong>{cust.totalBookings}</strong> ·
                    Total Spent:{' '}
                    <strong className="text-emerald-400">
                      ₹{cust.totalSpent}
                    </strong>{' '}
                    · Joined {cust.joinedAt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:+91${cust.phone}`}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/91${cust.phone}?text=${encodeURIComponent(
                      `Hi ${cust.name}! Special festive salon discount is live on Thanker: Salon Jaunpur.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PUSH NOTIFICATIONS BROADCAST */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">
                Push Notification Broadcast (Push Notification भेजने का सिस्टम)
              </h2>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="notif-title-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Notification Title *
                </label>
                <input
                  id="notif-title-input"
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Sunday Zero-Wait Haircut Flash Sale!"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="notif-message-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Notification Message *
                </label>
                <textarea
                  id="notif-message-input"
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="e.g. Book your live queue token in Olandganj or Civil Lines before 4 PM & get ₹50 instant discount!"
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="notif-audience-select"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Target Audience
                  </label>
                  <select
                    id="notif-audience-select"
                    value={notifAudience}
                    onChange={(e) =>
                      setNotifAudience(e.target.value as NotificationAudience)
                    }
                    className="w-full h-10 px-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="All Customers">All Customers</option>
                    <option value="All Salon Partners">
                      All Salon Partners
                    </option>
                    <option value="Both">Both Customers &amp; Partners</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="notif-tag-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Promotional Offer Tag
                  </label>
                  <input
                    id="notif-tag-input"
                    type="text"
                    value={notifOfferTag}
                    onChange={(e) => setNotifOfferTag(e.target.value)}
                    placeholder="FLAT ₹50 OFF"
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              {notifFeedback && (
                <p className="text-xs font-semibold text-emerald-400">
                  {notifFeedback}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Send className="w-4 h-4" />
                <span>Send Push Notification</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Recent Broadcast History ({notifications.length})
            </h3>
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400">
                      {n.offerTag} · Target: {n.audience}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {n.createdAt}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{n.title}</p>
                  <p className="text-xs text-slate-300">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ADVERTISEMENT & BANNER MANAGER */}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Create Sponsored Ad Banner (Advertisement के ज़रिए मैनेजमेंट)
              </h2>
            </div>

            <form onSubmit={handleCreateAdSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="ad-title-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Banner Headline *
                </label>
                <input
                  id="ad-title-input"
                  type="text"
                  value={adTitle}
                  onChange={(e) => setAdTitle(e.target.value)}
                  placeholder="e.g. Wedding Season Groom Package @ ₹999"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="ad-subtitle-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Subtitle / Offer Details
                </label>
                <input
                  id="ad-subtitle-input"
                  type="text"
                  value={adSubtitle}
                  onChange={(e) => setAdSubtitle(e.target.value)}
                  placeholder="e.g. Zero waiting room rush · Instant Live Queue Token"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="ad-sponsor-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Salon / Brand Sponsor *
                  </label>
                  <input
                    id="ad-sponsor-input"
                    type="text"
                    value={adSponsor}
                    onChange={(e) => setAdSponsor(e.target.value)}
                    placeholder="e.g. Royal Glow Studio"
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ad-area-select"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Target Jaunpur Area
                  </label>
                  <select
                    id="ad-area-select"
                    value={adArea}
                    onChange={(e) =>
                      setAdArea(e.target.value as JaunpurLocality)
                    }
                    className="w-full h-10 px-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Olandganj">Olandganj</option>
                    <option value="Civil Lines">Civil Lines</option>
                    <option value="Line Bazar">Line Bazar</option>
                    <option value="TDB College Road">TDB College Road</option>
                    <option value="Machhlishahr Padav">
                      Machhlishahr Padav
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="ad-cta-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    CTA Button Label
                  </label>
                  <input
                    id="ad-cta-input"
                    type="text"
                    value={adCta}
                    onChange={(e) => setAdCta(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ad-spend-input"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Sponsor Ad Fee (₹)
                  </label>
                  <input
                    id="ad-spend-input"
                    type="number"
                    value={adSpend}
                    onChange={(e) => setAdSpend(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="ad-img-input"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Banner Background Image URL (Optional)
                </label>
                <input
                  id="ad-img-input"
                  type="text"
                  value={adImageUrl}
                  onChange={(e) => setAdImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              {adFeedback && (
                <p className="text-xs font-semibold text-emerald-400">
                  {adFeedback}
                </p>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publish Sponsored Banner to Customer App</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Active &amp; Scheduled Sponsored Ad Banners ({adBanners.length})
            </h3>
            <div className="space-y-3">
              {adBanners.map((banner) => (
                <div
                  key={banner.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-amber-400">
                        {banner.offerBadge}
                      </span>
                      <span className="text-slate-400">
                        · {banner.sponsorName}
                      </span>
                      <span className="font-mono tabular-nums text-emerald-400">
                        · Ad Fee: ₹{banner.adSpend}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {banner.title}
                    </p>
                    <p className="text-xs text-slate-400">{banner.subtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleAdBanner(banner.id)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer ${
                      banner.isActive
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {banner.isActive ? 'Active on App ✓' : 'Paused (Enable)'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
