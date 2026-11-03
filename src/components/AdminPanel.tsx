import React, { useState } from 'react';
import {
  Lock,
  Megaphone,
  CheckCircle2,
  SkipForward,
  UserPlus,
  Phone,
  MessageCircle,
  Settings,
  Plus,
  Building2,
  IndianRupee,
  Users,
  Clock,
  ArrowLeft,
  Check,
  RotateCcw,
} from 'lucide-react';
import { JaunpurArea, Salon, ServiceItem } from '../types/salon';
import {
  buildAdminWhatsAppAlertUrl,
  formatTokenNumber,
  getSalonQueueMetrics,
} from '../utils/queueLogic';
import { DEFAULT_SALON_SERVICES } from '../data/initialSalons';

interface AdminPanelProps {
  salons: Salon[];
  selectedSalonId: string;
  onSelectSalonId: (id: string) => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  onCallNextToken: (salonId: string) => void;
  onMarkCompleted: (salonId: string) => void;
  onSkipToken: (salonId: string) => void;
  onAddWalkInToken: (
    salonId: string,
    params: {
      customerName: string;
      customerPhone: string;
      services: ServiceItem[];
    }
  ) => void;
  onAddNewSalon: (newSalon: Salon) => void;
  onUpdateSalonSettings: (
    salonId: string,
    updates: {
      avgWaitMinsPerPerson: number;
      services: ServiceItem[];
    }
  ) => void;
  onResetDemoData: () => void;
  onBackToCustomerView: () => void;
}

const ADMIN_PIN = '7777';

const JAUNPUR_AREAS: Exclude<JaunpurArea, 'All Jaunpur' | 'Shortest Wait Time'>[] = [
  'Olandganj',
  'Civil Lines',
  'Line Bazar',
  'TDB College Road',
  'Machhlishahr Padav',
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  salons,
  selectedSalonId,
  onSelectSalonId,
  isUnlocked,
  onUnlock,
  onLock,
  onCallNextToken,
  onMarkCompleted,
  onSkipToken,
  onAddWalkInToken,
  onAddNewSalon,
  onUpdateSalonSettings,
  onResetDemoData,
  onBackToCustomerView,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeAdminTab, setActiveAdminTab] = useState<'queue' | 'management'>(
    'queue'
  );

  // Walk-In Customer Modal / Form state
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInServiceIds, setWalkInServiceIds] = useState<string[]>([
    'srv-haircut',
  ]);
  const [walkInError, setWalkInError] = useState('');

  // New Salon Form state
  const [showNewSalonForm, setShowNewSalonForm] = useState(false);
  const [newSalonName, setNewSalonName] = useState('');
  const [newSalonArea, setNewSalonArea] =
    useState<Exclude<JaunpurArea, 'All Jaunpur' | 'Shortest Wait Time'>>(
      'Olandganj'
    );
  const [newSalonAddress, setNewSalonAddress] = useState('');
  const [newSalonDistance, setNewSalonDistance] = useState('1.5');
  const [newSalonWait, setNewSalonWait] = useState('10');
  const [newSalonMessage, setNewSalonMessage] = useState('');

  // Edit Existing Salon state
  const currentSalon =
    salons.find((s) => s.id === selectedSalonId) || salons[0];

  const [editWaitMins, setEditWaitMins] = useState<string>(
    String(Math.round(currentSalon.avgWaitMinsPerPerson))
  );
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Hair');
  const [saveFeedback, setSaveFeedback] = useState('');

  const handlePinKeyPress = (digit: string) => {
    setPinError('');
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next === ADMIN_PIN) {
        setPinInput('');
        onUnlock();
      } else if (next.length === 4) {
        setPinError('Incorrect PIN. Use Demo Admin PIN: 7777');
      }
    }
  };

  const handlePinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setPinInput('');
      setPinError('');
      onUnlock();
    } else {
      setPinError('Incorrect PIN. Please enter Demo Admin PIN: 7777');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Salon Partner Admin Lock
                </h1>
                <p className="text-xs text-slate-400">
                  Live Queue Controller · Jaunpur Partner Portal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBackToCustomerView}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 min-h-[40px] px-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>
          </div>

          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 mb-5 flex items-center justify-between">
            <span>Demo Admin PIN: 7777</span>
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
                htmlFor="admin-pin-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Enter 4-Digit Partner PIN
              </label>
              <input
                id="admin-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinError('');
                  setPinInput(val);
                  if (val === ADMIN_PIN) {
                    setPinInput('');
                    onUnlock();
                  }
                }}
                placeholder="7777"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-center text-2xl font-mono tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinKeyPress(digit)}
                  className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-base font-bold font-mono text-white transition-colors cursor-pointer"
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
                className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handlePinKeyPress('0')}
                className="h-12 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-base font-bold font-mono text-white transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="submit"
                className="h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Unlock
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

  const metrics = getSalonQueueMetrics(currentSalon);
  const nextWaitingToken = metrics.waitingTokens[0];
  const nextCallFormatted = nextWaitingToken
    ? formatTokenNumber(nextWaitingToken.tokenNumber)
    : metrics.nextAvailableFormatted;

  const nowServingServiceSummary = metrics.nowServingCustomer
    ? metrics.nowServingCustomer.services.map((s) => s.name).join(' & ')
    : 'Ready for Next Customer';

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenServices = currentSalon.services.filter((s) =>
      walkInServiceIds.includes(s.id)
    );
    if (chosenServices.length === 0) {
      setWalkInError('Select at least one service for the walk-in customer.');
      return;
    }
    if (!walkInName.trim()) {
      setWalkInError('Enter walk-in customer name.');
      return;
    }
    const cleanPhone = walkInPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setWalkInError('Enter a valid 10-digit customer mobile number.');
      return;
    }

    onAddWalkInToken(currentSalon.id, {
      customerName: walkInName.trim(),
      customerPhone: cleanPhone.slice(-10),
      services: chosenServices,
    });

    setWalkInName('');
    setWalkInPhone('');
    setWalkInError('');
    setShowWalkInForm(false);
  };

  const handleCreateNewSalon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalonName.trim() || !newSalonAddress.trim()) {
      setNewSalonMessage('Please enter both Salon Name and Address.');
      return;
    }

    const created: Salon = {
      id: `salon-custom-${Date.now()}`,
      name: newSalonName.trim(),
      area: newSalonArea,
      address: newSalonAddress.trim(),
      distanceKm: Math.max(0.2, parseFloat(newSalonDistance) || 1.5),
      rating: 4.8,
      reviewCount: 45,
      avgWaitMinsPerPerson: Math.max(5, parseInt(newSalonWait, 10) || 10),
      currentServingToken: 1,
      nextTokenNumber: 2,
      artworkVariant: 'flagship',
      mapQuery: `${newSalonAddress.trim()}, Jaunpur, Uttar Pradesh`,
      services: [...DEFAULT_SALON_SERVICES],
      queue: [
        {
          id: `tk-custom-1-${Date.now()}`,
          tokenNumber: 1,
          salonId: `salon-custom-${Date.now()}`,
          salonName: newSalonName.trim(),
          salonAddress: newSalonAddress.trim(),
          customerName: 'Ankit Tiwari',
          customerPhone: '9415001122',
          services: [DEFAULT_SALON_SERVICES[0]],
          totalAmount: 149,
          status: 'In Chair',
          bookingType: 'Join Live Queue Now',
          createdAt: '11:00 AM',
        },
      ],
    };

    onAddNewSalon(created);
    onSelectSalonId(created.id);
    setNewSalonName('');
    setNewSalonAddress('');
    setShowNewSalonForm(false);
    setNewSalonMessage('New Jaunpur Salon added and active in discovery!');
  };

  const handleAddServiceToSalon = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(newServicePrice, 10);
    if (!newServiceName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const newSrv: ServiceItem = {
      id: `srv-custom-${Date.now()}`,
      name: newServiceName.trim(),
      price: priceNum,
      durationMins: 25,
      category: newServiceCategory,
    };

    onUpdateSalonSettings(currentSalon.id, {
      avgWaitMinsPerPerson: currentSalon.avgWaitMinsPerPerson,
      services: [...currentSalon.services, newSrv],
    });
    setNewServiceName('');
    setNewServicePrice('');
    setSaveFeedback('Service added to salon menu!');
  };

  const handleUpdateServicePrice = (serviceId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    const updatedServices = currentSalon.services.map((s) =>
      s.id === serviceId ? { ...s, price: newPrice } : s
    );
    onUpdateSalonSettings(currentSalon.id, {
      avgWaitMinsPerPerson: currentSalon.avgWaitMinsPerPerson,
      services: updatedServices,
    });
    setSaveFeedback('Service price updated!');
  };

  const handleSaveAvgWait = () => {
    const parsed = parseFloat(editWaitMins);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateSalonSettings(currentSalon.id, {
        avgWaitMinsPerPerson: parsed,
        services: currentSalon.services,
      });
      setSaveFeedback('Average wait time per customer updated!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6 pb-24 lg:pb-12">
      {/* Top Partner Control Bar & Salon Switcher Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <span>SALON PARTNER ADMIN PANEL (PIN: 7777)</span>
            <span aria-hidden="true">·</span>
            <span>LIVE QUEUE CONTROLLER</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <label
              htmlFor="admin-salon-switcher"
              className="text-xs font-medium text-slate-400 shrink-0"
            >
              Managing Salon:
            </label>
            <select
              id="admin-salon-switcher"
              aria-label="Select Jaunpur salon to manage"
              value={currentSalon.id}
              onChange={(e) => {
                onSelectSalonId(e.target.value);
                const found = salons.find((s) => s.id === e.target.value);
                if (found) {
                  setEditWaitMins(String(Math.round(found.avgWaitMinsPerPerson)));
                }
              }}
              className="h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name} - {salon.area}, Jaunpur
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Admin Sub-Navigation & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveAdminTab('queue')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeAdminTab === 'queue'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Live Queue Board
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('management')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activeAdminTab === 'management'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Salon Management</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDemoData}
            title="Reset all salons to initial demo queue state"
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Queue</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock PIN</span>
          </button>
        </div>
      </div>

      {activeAdminTab === 'queue' ? (
        /* DESKTOP KANBAN / SPLIT-SCREEN DASHBOARD (Left: Live Token Counter Board | Right: Waiting Customer Table & Revenue Stats) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL (5 Cols on Desktop): Live Queue Controller Board */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Live Queue Controller Board
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  Next Token: {metrics.nextAvailableFormatted}
                </span>
              </div>

              {/* Large Digital Counter Display */}
              <div
                data-testid="admin-now-serving-board"
                className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-5 space-y-2"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  NOW SERVING: TOKEN {metrics.nowServingFormatted}
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-white tracking-tight">
                  TOKEN {metrics.nowServingFormatted}
                </div>
                <p className="text-sm font-medium text-slate-200">
                  {metrics.nowServingCustomer ? (
                    <>
                      Customer:{' '}
                      <span className="font-bold text-amber-400">
                        {metrics.nowServingCustomer.customerName}
                      </span>{' '}
                      - {nowServingServiceSummary}
                    </>
                  ) : (
                    'No active customer in chair — Call next token below'
                  )}
                </p>
              </div>

              {/* 4 Quick Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onCallNextToken(currentSalon.id)}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span>Call Next Token ({nextCallFormatted})</span>
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onMarkCompleted(currentSalon.id)}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Mark Completed & Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSkipToken(currentSalon.id)}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Skip / No-Show</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWalkInForm((prev) => !prev)}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>Add Walk-In Customer Token</span>
                </button>
              </div>

              {/* Offline Walk-In Customer Form */}
              {showWalkInForm && (
                <form
                  onSubmit={handleWalkInSubmit}
                  className="pt-4 border-t border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Add Offline Walk-In Customer (Assigns{' '}
                      {metrics.nextAvailableFormatted})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => {
                        setWalkInError('');
                        setWalkInName(e.target.value);
                      }}
                      placeholder="Walk-in Customer Full Name"
                      aria-label="Walk-in Customer Full Name"
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                    <input
                      type="tel"
                      value={walkInPhone}
                      onChange={(e) => {
                        setWalkInError('');
                        setWalkInPhone(e.target.value);
                      }}
                      placeholder="10-Digit Mobile Number"
                      aria-label="Walk-in Customer Mobile Number"
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <span className="block text-[11px] text-slate-400 mb-1.5">
                      Select Walk-In Services:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {currentSalon.services.map((srv) => {
                        const checked = walkInServiceIds.includes(srv.id);
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() =>
                              setWalkInServiceIds((prev) =>
                                prev.includes(srv.id)
                                  ? prev.filter((id) => id !== srv.id)
                                  : [...prev, srv.id]
                              )
                            }
                            className={`px-3 py-2 rounded-lg border text-left text-xs flex items-center justify-between ${
                              checked
                                ? 'bg-amber-500/15 border-amber-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="truncate">{srv.name}</span>
                            <span className="font-mono tabular-nums text-amber-400 ml-2">
                              ₹{srv.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {walkInError && (
                    <p className="text-xs text-red-400">{walkInError}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                    >
                      Generate Walk-In Token ({metrics.nextAvailableFormatted})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowWalkInForm(false)}
                      className="px-3 h-10 rounded-lg bg-slate-800 text-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Live Salon KPI Summary Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Waiting</span>
                </div>
                <p
                  data-testid="admin-waiting-count"
                  className="text-xl font-bold text-white font-mono tabular-nums mt-1"
                >
                  {metrics.waitingCount}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Est. Wait</span>
                </div>
                <p className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
                  {metrics.estimatedWaitLabel}
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                  <span>Completed</span>
                </div>
                <p className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">
                  ₹{metrics.completedRevenue}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL (7 Cols on Desktop): Active Queue & Customer List */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  Active Queue & Customer List — {currentSalon.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time token queue synced with Customer Live View · 1-click
                  Call & WhatsApp Alert
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Total Tokens Today: {currentSalon.queue.length}
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {currentSalon.queue
                .slice()
                .sort((a, b) => a.tokenNumber - b.tokenNumber)
                .map((token) => {
                  const tFormatted = formatTokenNumber(token.tokenNumber);
                  const whatsappAlertUrl = buildAdminWhatsAppAlertUrl(
                    token,
                    currentSalon.name
                  );

                  return (
                    <div
                      key={token.id}
                      className={`p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        token.status === 'In Chair'
                          ? 'bg-emerald-950/25'
                          : token.status === 'Completed' ||
                            token.status === 'Cancelled' ||
                            token.status === 'Skipped'
                          ? 'opacity-60 bg-slate-950/40'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`px-3 py-2 rounded-xl font-mono font-bold text-sm tabular-nums shrink-0 border ${
                            token.status === 'In Chair'
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : token.status === 'Waiting'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {tFormatted}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {token.customerName}
                            </span>
                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                              · +91 {token.customerPhone}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                token.status === 'In Chair'
                                  ? 'text-emerald-400'
                                  : token.status === 'Waiting'
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              · {token.status}
                            </span>
                            {token.isWalkIn && (
                              <span className="text-[11px] text-slate-400">
                                · Walk-In
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 truncate">
                            {token.services.map((s) => s.name).join(', ')}
                          </p>

                          <p className="text-xs text-slate-400 font-mono tabular-nums">
                            Total:{' '}
                            <span className="text-amber-400 font-semibold">
                              ₹{token.totalAmount}
                            </span>{' '}
                            · Booked {token.createdAt}
                            {token.scheduledSlot
                              ? ` · Slot: ${token.scheduledSlot}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      {/* 1-Click Direct Call & WhatsApp Next-Turn Alert Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`tel:+91${token.customerPhone}`}
                          aria-label={`Direct Call ${token.customerName}`}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          <span>Direct Call</span>
                        </a>

                        <a
                          href={whatsappAlertUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp Alert for ${token.customerName}`}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WhatsApp Alert</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* SALON MANAGEMENT TAB: Add New Nearby Salon in Jaunpur OR Edit Services, Prices, & Avg Wait Time */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Add New Salon in Jaunpur */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">
                  Add New Nearby Salon in Jaunpur
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNewSalonForm((v) => !v)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add New Salon</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Onboard a new partner salon in Jaunpur to the live token booking
              network.
            </p>

            <form onSubmit={handleCreateNewSalon} className="space-y-3 pt-2">
              <div>
                <label
                  htmlFor="new-salon-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Salon Name *
                </label>
                <input
                  id="new-salon-name"
                  type="text"
                  value={newSalonName}
                  onChange={(e) => setNewSalonName(e.target.value)}
                  placeholder="e.g. Gomti Luxury Hair Studio"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="new-salon-area"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Jaunpur Area
                  </label>
                  <select
                    id="new-salon-area"
                    value={newSalonArea}
                    onChange={(e) =>
                      setNewSalonArea(
                        e.target.value as Exclude<
                          JaunpurArea,
                          'All Jaunpur' | 'Shortest Wait Time'
                        >
                      )
                    }
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {JAUNPUR_AREAS.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="new-salon-distance"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Distance (km)
                  </label>
                  <input
                    id="new-salon-distance"
                    type="number"
                    step="0.1"
                    value={newSalonDistance}
                    onChange={(e) => setNewSalonDistance(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-salon-address"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Full Landmark Address in Jaunpur *
                </label>
                <input
                  id="new-salon-address"
                  type="text"
                  value={newSalonAddress}
                  onChange={(e) => setNewSalonAddress(e.target.value)}
                  placeholder="e.g. Near Shahi Bridge, Olandganj, Jaunpur"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="new-salon-wait"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Avg. Wait Time Per Customer (mins)
                </label>
                <input
                  id="new-salon-wait"
                  type="number"
                  value={newSalonWait}
                  onChange={(e) => setNewSalonWait(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                />
              </div>

              {newSalonMessage && (
                <p className="text-xs text-emerald-400 font-medium">
                  {newSalonMessage}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Nearby Salon in Jaunpur</span>
              </button>
            </form>
          </div>

          {/* Right 7 cols: Edit Existing Salon Services, Prices, & Average Wait Time */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Edit Services, Prices & Wait Time — {currentSalon.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Changes immediately update customer booking prices and
                  estimated wait times.
                </p>
              </div>
              {saveFeedback && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {saveFeedback}
                </span>
              )}
            </div>

            {/* Avg Waiting Time Per Customer Editor */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="edit-avg-wait-input"
                  className="text-xs font-semibold text-white block"
                >
                  Average Waiting Time Per Customer (Minutes)
                </label>
                <p className="text-xs text-slate-400">
                  Used to calculate live queue turnaround for waiting customers
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-avg-wait-input"
                  type="number"
                  min={2}
                  max={60}
                  value={editWaitMins}
                  onChange={(e) => setEditWaitMins(e.target.value)}
                  className="w-24 h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono tabular-nums text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveAvgWait}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Save Wait Time
                </button>
              </div>
            </div>

            {/* Existing Services & Prices List */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Service Menu & Pricing (₹)
              </h3>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                {currentSalon.services.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3 bg-slate-950/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{srv.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {srv.category} · ~{srv.durationMins} mins
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        aria-label={`Price for ${srv.name}`}
                        value={srv.price}
                        onChange={(e) =>
                          handleUpdateServicePrice(
                            srv.id,
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="w-24 h-9 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono tabular-nums text-amber-400 font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Custom Service to This Salon */}
            <form
              onSubmit={handleAddServiceToSalon}
              className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
            >
              <div className="flex-1">
                <label
                  htmlFor="add-service-name"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  New Service Name
                </label>
                <input
                  id="add-service-name"
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Royal Gold Facial"
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="w-full sm:w-32">
                <label
                  htmlFor="add-service-price"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Price (₹)
                </label>
                <input
                  id="add-service-price"
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="499"
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                />
              </div>

              <div className="w-full sm:w-36">
                <label
                  htmlFor="add-service-category"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Category
                </label>
                <select
                  id="add-service-category"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="Hair">Hair</option>
                  <option value="Beard">Beard</option>
                  <option value="Facial">Facial</option>
                  <option value="Hair Spa">Hair Spa</option>
                  <option value="Bridal Makeup">Bridal Makeup</option>
                </select>
              </div>

              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs whitespace-nowrap cursor-pointer"
              >
                + Add Service
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
