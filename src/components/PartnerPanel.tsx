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
  Image as ImageIcon,
  MapPin,
  Store,
} from 'lucide-react';
import { JaunpurLocality, Salon, ServiceItem } from '../types/salon';
import {
  buildAdminWhatsAppAlertUrl,
  formatTokenNumber,
  getSalonQueueMetrics,
} from '../utils/queueLogic';
import { DEFAULT_SALON_SERVICES } from '../data/initialSalons';
import { SalonArtwork } from './SalonArtwork';

interface PartnerPanelProps {
  salons: Salon[];
  selectedSalonId: string;
  onSelectSalonId: (id: string) => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
  initialOpenRegister?: boolean;
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
  onRegisterPartnerSalon: (newSalon: Salon) => void;
  onUpdateSalonProfile: (
    salonId: string,
    updates: {
      name?: string;
      address?: string;
      mapQuery?: string;
      photoUrl?: string;
      avgWaitMinsPerPerson: number;
      services: ServiceItem[];
    }
  ) => void;
  onBackToCustomerView: () => void;
}

const PARTNER_PIN = '1111';

const JAUNPUR_LOCALITIES: JaunpurLocality[] = [
  'Olandganj',
  'Civil Lines',
  'Line Bazar',
  'TDB College Road',
  'Machhlishahr Padav',
];

export const PartnerPanel: React.FC<PartnerPanelProps> = ({
  salons,
  selectedSalonId,
  onSelectSalonId,
  isUnlocked,
  onUnlock,
  onLock,
  initialOpenRegister = false,
  onCallNextToken,
  onMarkCompleted,
  onSkipToken,
  onAddWalkInToken,
  onRegisterPartnerSalon,
  onUpdateSalonProfile,
  onBackToCustomerView,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activePartnerTab, setActivePartnerTab] = useState<'queue' | 'profile'>(
    'queue'
  );

  // Registration Modal state (accessible from login screen and inside panel)
  const [showRegisterModal, setShowRegisterModal] = useState(
    initialOpenRegister
  );
  const [regSalonName, setRegSalonName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerPhone, setRegOwnerPhone] = useState('');
  const [regArea, setRegArea] = useState<JaunpurLocality>('Olandganj');
  const [regAddress, setRegAddress] = useState('');
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [regHaircutPrice, setRegHaircutPrice] = useState('149');
  const [regBeardPrice, setRegBeardPrice] = useState('79');
  const [regFacialPrice, setRegFacialPrice] = useState('399');
  const [regSuccessBanner, setRegSuccessBanner] = useState('');
  const [regError, setRegError] = useState('');

  // Walk-In Customer state
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInServiceIds, setWalkInServiceIds] = useState<string[]>([
    'srv-haircut',
  ]);
  const [walkInError, setWalkInError] = useState('');

  const currentSalon =
    salons.find((s) => s.id === selectedSalonId) || salons[0];

  // Tab B: Profile, Photo & Price Menu state synced to currentSalon
  const [editAddress, setEditAddress] = useState(currentSalon.address);
  const [editMapQuery, setEditMapQuery] = useState(currentSalon.mapQuery);
  const [editPhotoUrl, setEditPhotoUrl] = useState(currentSalon.photoUrl || '');
  const [editWaitMins, setEditWaitMins] = useState(
    String(Math.round(currentSalon.avgWaitMinsPerPerson))
  );
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Hair');
  const [saveFeedback, setSaveFeedback] = useState('');

  const syncFormWithSalon = (salon: Salon) => {
    setEditAddress(salon.address);
    setEditMapQuery(salon.mapQuery);
    setEditPhotoUrl(salon.photoUrl || '');
    setEditWaitMins(String(Math.round(salon.avgWaitMinsPerPerson)));
    setSaveFeedback('');
  };

  const handlePinKeyPress = (digit: string) => {
    setPinError('');
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next === PARTNER_PIN) {
        setPinInput('');
        onUnlock();
      } else if (next.length === 4) {
        setPinError('Incorrect PIN. Use Demo Salon Partner PIN: 1111');
      }
    }
  };

  const handlePinFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === PARTNER_PIN) {
      setPinInput('');
      setPinError('');
      onUnlock();
    } else {
      setPinError('Incorrect PIN. Please enter Demo Salon Partner PIN: 1111');
    }
  };

  const handlePhotoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    isRegForm: boolean
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (isRegForm) {
          setRegPhotoUrl(reader.result);
        } else {
          setEditPhotoUrl(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSalonName.trim() || !regOwnerName.trim() || !regAddress.trim()) {
      setRegError('Please fill Salon Name, Owner Name, and Full Address.');
      return;
    }
    const cleanPhone = regOwnerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setRegError('Please enter a valid 10-digit Owner Mobile Number.');
      return;
    }

    const customServices: ServiceItem[] = [
      {
        id: 'srv-haircut',
        name: 'Haircut & Styling',
        price: Math.max(49, parseInt(regHaircutPrice, 10) || 149),
        durationMins: 20,
        category: 'Hair',
      },
      {
        id: 'srv-beard',
        name: 'Beard Trim & Styling',
        price: Math.max(29, parseInt(regBeardPrice, 10) || 79),
        durationMins: 15,
        category: 'Beard',
      },
      {
        id: 'srv-facial',
        name: 'Charcoal De-Tan & Facial',
        price: Math.max(99, parseInt(regFacialPrice, 10) || 399),
        durationMins: 35,
        category: 'Facial',
      },
      DEFAULT_SALON_SERVICES[3],
      DEFAULT_SALON_SERVICES[4],
    ];

    const newSalonId = `salon-partner-${Date.now()}`;
    const createdSalon: Salon = {
      id: newSalonId,
      name: regSalonName.trim(),
      ownerName: regOwnerName.trim(),
      ownerPhone: cleanPhone.slice(-10),
      area: regArea,
      address: regAddress.trim(),
      distanceKm: 1.4,
      rating: 4.8,
      reviewCount: 12,
      avgWaitMinsPerPerson: 10,
      currentServingToken: 1,
      nextTokenNumber: 2,
      artworkVariant: 'flagship',
      photoUrl: regPhotoUrl.trim() || undefined,
      mapQuery: `${regAddress.trim()}, Jaunpur, Uttar Pradesh`,
      approvalStatus: 'Pending',
      isFeatured: false,
      submittedAt: 'Just Now',
      services: customServices,
      queue: [
        {
          id: `tk-${newSalonId}-1`,
          tokenNumber: 1,
          salonId: newSalonId,
          salonName: regSalonName.trim(),
          salonAddress: regAddress.trim(),
          salonArea: regArea,
          customerName: 'First Walk-In Customer',
          customerPhone: cleanPhone.slice(-10),
          services: [customServices[0]],
          totalAmount: customServices[0].price,
          status: 'In Chair',
          bookingType: 'Join Live Queue Now',
          createdAt: 'Just Now',
        },
      ],
    };

    onRegisterPartnerSalon(createdSalon);
    onSelectSalonId(createdSalon.id);
    syncFormWithSalon(createdSalon);
    setRegSalonName('');
    setRegOwnerName('');
    setRegOwnerPhone('');
    setRegAddress('');
    setRegPhotoUrl('');
    setRegError('');
    setShowRegisterModal(false);
    setRegSuccessBanner(
      `Salon "${createdSalon.name}" submitted! Status: Pending Super Admin Approval (PIN: 7777).`
    );
    onUnlock();
  };

  const renderRegistrationModal = () => {
    if (!showRegisterModal) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-partner-title"
      >
        <div className="w-full md:max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Join Jaunpur&apos;s #1 Salon Network
              </span>
              <h2
                id="register-partner-title"
                className="text-lg font-bold text-white"
              >
                Register New Salon Partner in Jaunpur
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRegisterModal(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <form
            onSubmit={handleRegisterSubmit}
            className="flex-1 overflow-y-auto p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-salon-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Salon Shop Name *
                </label>
                <input
                  id="reg-salon-name"
                  type="text"
                  value={regSalonName}
                  onChange={(e) => {
                    setRegError('');
                    setRegSalonName(e.target.value);
                  }}
                  placeholder="e.g. Gomti Luxury Unisex Salon"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-area"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Jaunpur Locality *
                </label>
                <select
                  id="reg-area"
                  value={regArea}
                  onChange={(e) =>
                    setRegArea(e.target.value as JaunpurLocality)
                  }
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  {JAUNPUR_LOCALITIES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="reg-owner-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Salon Owner Full Name *
                </label>
                <input
                  id="reg-owner-name"
                  type="text"
                  value={regOwnerName}
                  onChange={(e) => {
                    setRegError('');
                    setRegOwnerName(e.target.value);
                  }}
                  placeholder="e.g. Rohit विश्वकर्मा"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-owner-phone"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Owner Mobile Number (10-digit) *
                </label>
                <input
                  id="reg-owner-phone"
                  type="tel"
                  value={regOwnerPhone}
                  onChange={(e) => {
                    setRegError('');
                    setRegOwnerPhone(e.target.value);
                  }}
                  placeholder="e.g. 9415123456"
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-address"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Full Landmark Address in Jaunpur *
              </label>
              <input
                id="reg-address"
                type="text"
                value={regAddress}
                onChange={(e) => {
                  setRegError('');
                  setRegAddress(e.target.value);
                }}
                placeholder="e.g. Near Atala Masjid Road, Olandganj, Jaunpur"
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            {/* Salon Photo Upload or URL */}
            <div className="space-y-2">
              <label
                htmlFor="reg-photo-url"
                className="block text-xs font-medium text-slate-300"
              >
                Salon Interior Photo (Upload Image or Paste Photo URL)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="reg-photo-url"
                  type="text"
                  value={regPhotoUrl}
                  onChange={(e) => setRegPhotoUrl(e.target.value)}
                  placeholder="Paste image URL or upload file ->"
                  className="flex-1 h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <label className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoFileUpload(e, true)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Base Service Prices */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Set Initial Service Prices (₹)
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="reg-price-haircut"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Haircut (₹)
                  </label>
                  <input
                    id="reg-price-haircut"
                    type="number"
                    value={regHaircutPrice}
                    onChange={(e) => setRegHaircutPrice(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-price-beard"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    Beard Trim (₹)
                  </label>
                  <input
                    id="reg-price-beard"
                    type="number"
                    value={regBeardPrice}
                    onChange={(e) => setRegBeardPrice(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-price-facial"
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    De-Tan Facial (₹)
                  </label>
                  <input
                    id="reg-price-facial"
                    type="number"
                    value={regFacialPrice}
                    onChange={(e) => setRegFacialPrice(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-amber-400 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {regError && (
              <p role="alert" className="text-xs font-medium text-red-400">
                {regError}
              </p>
            )}

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Store className="w-4 h-4" />
              <span>Submit Salon for Super Admin Approval</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Salon Partner Portal
                </h1>
                <p className="text-xs text-slate-400">
                  Manage Your Salon &amp; Daily Live Token Queue
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

          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center justify-between">
            <span>Demo Salon Partner PIN: 1111</span>
            <button
              type="button"
              onClick={() => {
                setPinInput('');
                onUnlock();
              }}
              className="underline text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
            >
              Quick Auto-Fill 1111
            </button>
          </div>

          <form onSubmit={handlePinFormSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="partner-pin-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Enter 4-Digit Salon Partner PIN
              </label>
              <input
                id="partner-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinError('');
                  setPinInput(val);
                  if (val === PARTNER_PIN) {
                    setPinInput('');
                    onUnlock();
                  }
                }}
                placeholder="1111"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-center text-2xl font-mono tracking-[0.5em] text-amber-400 focus:outline-none focus:border-amber-500"
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
                className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Login
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

          {/* Register New Salon Partner CTA */}
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Own a salon in Jaunpur? List your shop on Thanker: Salon
            </p>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Salon Partner</span>
            </button>
          </div>
        </div>
        {renderRegistrationModal()}
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

  const handleSaveProfileDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWait = parseFloat(editWaitMins) || 10;
    onUpdateSalonProfile(currentSalon.id, {
      address: editAddress.trim() || currentSalon.address,
      mapQuery: editMapQuery.trim() || currentSalon.mapQuery,
      photoUrl: editPhotoUrl.trim() || undefined,
      avgWaitMinsPerPerson: Math.max(3, parsedWait),
      services: currentSalon.services,
    });
    setSaveFeedback('Salon profile, photo & wait time saved!');
  };

  const handleUpdateServicePrice = (serviceId: string, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    const updatedServices = currentSalon.services.map((s) =>
      s.id === serviceId ? { ...s, price: newPrice } : s
    );
    onUpdateSalonProfile(currentSalon.id, {
      avgWaitMinsPerPerson: currentSalon.avgWaitMinsPerPerson,
      services: updatedServices,
    });
    setSaveFeedback('Service price updated!');
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

    onUpdateSalonProfile(currentSalon.id, {
      avgWaitMinsPerPerson: currentSalon.avgWaitMinsPerPerson,
      services: [...currentSalon.services, newSrv],
    });
    setNewServiceName('');
    setNewServicePrice('');
    setSaveFeedback('New service added to your salon menu!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6 pb-24 lg:pb-12">
      {regSuccessBanner && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center justify-between gap-2">
          <span>{regSuccessBanner}</span>
          <button
            type="button"
            onClick={() => setRegSuccessBanner('')}
            className="text-slate-300 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Partner Control Bar & Salon Selector Dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-400">
            <span>SALON PARTNER PANEL (PIN: 1111)</span>
            <span aria-hidden="true">·</span>
            <span>
              Status:{' '}
              <strong
                className={
                  currentSalon.approvalStatus === 'Approved'
                    ? 'text-emerald-400'
                    : currentSalon.approvalStatus === 'Pending'
                    ? 'text-amber-300'
                    : 'text-red-400'
                }
              >
                {currentSalon.approvalStatus === 'Approved'
                  ? 'Approved & Live on Customer App'
                  : currentSalon.approvalStatus === 'Pending'
                  ? 'Pending Super Admin Approval'
                  : 'Rejected / Blocked'}
              </strong>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <label
              htmlFor="partner-salon-switcher"
              className="text-xs font-medium text-slate-400 shrink-0"
            >
              Select Partner Salon:
            </label>
            <select
              id="partner-salon-switcher"
              aria-label="Select partner salon in Jaunpur"
              value={currentSalon.id}
              onChange={(e) => {
                onSelectSalonId(e.target.value);
                const found = salons.find((s) => s.id === e.target.value);
                if (found) syncFormWithSalon(found);
              }}
              className="h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {salons.map((salon) => (
                <option key={salon.id} value={salon.id}>
                  {salon.name} ({salon.area}) — [{salon.approvalStatus}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Partner Tabs & Register New Salon Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActivePartnerTab('queue')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activePartnerTab === 'queue'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Tab A: Live Queue Board
            </button>
            <button
              type="button"
              onClick={() => setActivePartnerTab('profile')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                activePartnerTab === 'profile'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tab B: Salon Profile, Photos &amp; Menu</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Salon</span>
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

      {activePartnerTab === 'queue' ? (
        /* TAB A: LIVE TOKEN QUEUE CONTROLLER BOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Cols: Giant Live Token Counter & 4 Quick Action Buttons */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Live Token Queue Controller Board
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-400">
                  Next Token: {metrics.nextAvailableFormatted}
                </span>
              </div>

              {/* Giant Live Display */}
              <div
                data-testid="partner-now-serving-board"
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

              {/* 4 Action Buttons */}
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
                    <span>Mark Completed &amp; Paid</span>
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Add Offline Walk-In Customer (Assigns{' '}
                    {metrics.nextAvailableFormatted})
                  </h3>

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

            {/* Salon Queue Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Waiting</span>
                </div>
                <p className="text-xl font-bold text-white font-mono tabular-nums mt-1">
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
                  <span>Today Earned</span>
                </div>
                <p className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">
                  ₹{metrics.completedRevenue}
                </p>
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Active Waiting Customer Queue List */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">
                  Active Customer Queue — {currentSalon.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Owner: {currentSalon.ownerName} (+91 {currentSalon.ownerPhone}
                  ) · 1-Click Call &amp; WhatsApp Alert
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Total Tokens: {currentSalon.queue.length}
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {currentSalon.queue.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No tokens in queue yet. Click &ldquo;Add Walk-In Customer
                  Token&rdquo; to add the first customer.
                </div>
              ) : (
                currentSalon.queue
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
                            </div>

                            <p className="text-xs text-slate-300 truncate">
                              {token.services.map((s) => s.name).join(', ')}
                            </p>

                            <p className="text-xs text-slate-400 font-mono tabular-nums">
                              Amount:{' '}
                              <span className="text-amber-400 font-semibold">
                                ₹{token.totalAmount}
                              </span>{' '}
                              · Booked {token.createdAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`tel:+91${token.customerPhone}`}
                            className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <Phone className="w-3.5 h-3.5 text-amber-400" />
                            <span>Direct Call</span>
                          </a>

                          <a
                            href={whatsappAlertUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WhatsApp Alert</span>
                          </a>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB B: MY SALON PROFILE, PHOTOS & PRICE MENU MANAGER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 cols: Salon Photo Upload, Address, Google Map & Wait Time */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                My Salon Profile &amp; Photo Manager
              </h2>
            </div>

            <SalonArtwork
              variant={currentSalon.artworkVariant}
              salonName={currentSalon.name}
              photoUrl={editPhotoUrl || currentSalon.photoUrl}
              isFeatured={currentSalon.isFeatured}
              className="w-full h-40 rounded-xl"
            />

            <form onSubmit={handleSaveProfileDetails} className="space-y-3">
              <div>
                <label
                  htmlFor="partner-photo-url"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Salon Cover Photo (Upload Image or Paste URL)
                </label>
                <div className="flex gap-2">
                  <input
                    id="partner-photo-url"
                    type="text"
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    placeholder="https://... or upload file"
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                  <label className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1.5 cursor-pointer shrink-0">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoFileUpload(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label
                  htmlFor="partner-edit-address"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Salon Landmark Address in Jaunpur
                </label>
                <input
                  id="partner-edit-address"
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="partner-edit-map"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Google Maps Location Search Query
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="partner-edit-map"
                    type="text"
                    value={editMapQuery}
                    onChange={(e) => setEditMapQuery(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="partner-edit-wait"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Average Waiting Time Per Customer (Minutes)
                </label>
                <input
                  id="partner-edit-wait"
                  type="number"
                  min={2}
                  max={60}
                  value={editWaitMins}
                  onChange={(e) => setEditWaitMins(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Save Salon Profile &amp; Photo
              </button>
            </form>
          </div>

          {/* Right 7 cols: Service Menu & Price Manager */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Service Menu &amp; Price Manager — {currentSalon.name}
                </h2>
                <p className="text-xs text-slate-400">
                  Update your salon service rates (₹) — synced immediately with
                  Customer App bookings.
                </p>
              </div>
              {saveFeedback && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {saveFeedback}
                </span>
              )}
            </div>

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

            <form
              onSubmit={handleAddServiceToSalon}
              className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
            >
              <div className="flex-1">
                <label
                  htmlFor="partner-new-srv-name"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Add New Salon Service
                </label>
                <input
                  id="partner-new-srv-name"
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="e.g. Hydra Facial / Hair Highlight"
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                />
              </div>

              <div className="w-full sm:w-28">
                <label
                  htmlFor="partner-new-srv-price"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Price (₹)
                </label>
                <input
                  id="partner-new-srv-price"
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="499"
                  className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono tabular-nums"
                />
              </div>

              <div className="w-full sm:w-36">
                <label
                  htmlFor="partner-new-srv-cat"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  Category
                </label>
                <select
                  id="partner-new-srv-cat"
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

      {renderRegistrationModal()}
    </div>
  );
};
