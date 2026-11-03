import React, { useState } from 'react';
import { X, Check, Clock, Sparkles, Calendar, User, Phone, Ticket } from 'lucide-react';
import { BookingType, Salon, ServiceItem } from '../types/salon';
import { getSalonQueueMetrics } from '../utils/queueLogic';

interface BookingModalProps {
  salon: Salon | null;
  onClose: () => void;
  onConfirmBooking: (
    salonId: string,
    params: {
      customerName: string;
      customerPhone: string;
      services: ServiceItem[];
      bookingType: BookingType;
      scheduledSlot?: string;
    }
  ) => void;
}

const TIME_SLOTS = [
  '12:30 PM - 01:00 PM',
  '02:00 PM - 02:30 PM',
  '04:00 PM - 04:30 PM',
  '05:30 PM - 06:00 PM',
  '07:00 PM - 07:30 PM',
];

export const BookingModal: React.FC<BookingModalProps> = ({
  salon,
  onClose,
  onConfirmBooking,
}) => {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([
    'srv-haircut',
  ]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('Join Live Queue Now');
  const [scheduledSlot, setScheduledSlot] = useState(TIME_SLOTS[0]);
  const [errorMessage, setErrorMessage] = useState('');

  if (!salon) return null;

  const metrics = getSalonQueueMetrics(salon);

  const toggleService = (id: string) => {
    setErrorMessage('');
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedServices = salon.services.filter((s) =>
    selectedServiceIds.includes(s.id)
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMins,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      setErrorMessage('Please select at least one salon service.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    onConfirmBooking(salon.id, {
      customerName: customerName.trim(),
      customerPhone: cleanPhone.slice(-10),
      services: selectedServices,
      bookingType,
      scheduledSlot:
        bookingType === 'Schedule Later Time Slot' ? scheduledSlot : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="w-full md:max-w-xl max-h-[92vh] flex flex-col bg-slate-900 border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-10 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <p className="text-xs font-medium text-amber-400">
              Instant Live Queue Booking · {salon.area}, Jaunpur
            </p>
            <h2
              id="booking-modal-title"
              className="text-lg md:text-xl font-bold text-white mt-0.5"
            >
              {salon.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
              Now Serving: {metrics.nowServingFormatted} · Waiting:{' '}
              {metrics.waitingLabel} · Next Token:{' '}
              <span className="text-emerald-400 font-semibold">
                {metrics.nextAvailableFormatted}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          {/* Multi-select Services */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Select Salon Services (Multi-Select)
              </label>
              <span className="text-xs text-slate-400 tabular-nums">
                {selectedServices.length} selected
              </span>
            </div>

            <div className="space-y-2">
              {salon.services.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[52px] flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-slate-950'
                            : 'border-slate-600 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-white truncate">
                          {service.name}
                        </p>
                        <p className="text-xs text-slate-400 tabular-nums">
                          {service.category} · ~{service.durationMins} mins
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-400 font-mono tabular-nums shrink-0 ml-3">
                      ₹{service.price}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              2. Choose Booking Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setBookingType('Join Live Queue Now')}
                className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                  bookingType === 'Join Live Queue Now'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">
                    Join Live Queue Now
                  </p>
                  <p className="text-[11px] text-slate-400 tabular-nums">
                    Get Token {metrics.nextAvailableFormatted} immediately
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBookingType('Schedule Later Time Slot')}
                className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                  bookingType === 'Schedule Later Time Slot'
                    ? 'bg-amber-500/15 border-amber-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">
                    Schedule Later Time Slot
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Reserve preferred time today
                  </p>
                </div>
              </button>
            </div>

            {bookingType === 'Schedule Later Time Slot' && (
              <div className="mt-3">
                <label
                  htmlFor="booking-time-slot"
                  className="block text-xs text-slate-400 mb-1.5"
                >
                  Select Preferred Time Slot Today
                </label>
                <select
                  id="booking-time-slot"
                  value={scheduledSlot}
                  onChange={(e) => setScheduledSlot(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="customer-full-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="customer-full-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setErrorMessage('');
                    setCustomerName(e.target.value);
                  }}
                  placeholder="e.g. Aditya Pratap Singh"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="customer-mobile-number"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Mobile Number (10-digit) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="customer-mobile-number"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setErrorMessage('');
                    setCustomerPhone(e.target.value);
                  }}
                  placeholder="e.g. 9876543210"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-mono tabular-nums placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs font-medium text-red-300"
            >
              {errorMessage}
            </div>
          )}

          {/* Footer Summary & Submit */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between sm:block">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums">
                  Est. Service Duration: ~{totalDuration} mins
                </span>
              </div>
              <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
                Total: <span className="text-amber-400">₹{totalPrice}</span>
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Ticket className="w-4 h-4" />
              <span>
                Generate Instant Token ({metrics.nextAvailableFormatted})
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
