import React from 'react';
import {
  MapPin,
  MessageCircle,
  XCircle,
  QrCode,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { QueueToken, Salon } from '../types/salon';
import {
  buildCustomerWhatsAppTicketUrl,
  buildGoogleMapsUrl,
  formatTokenNumber,
  getCustomerTokenProgress,
} from '../utils/queueLogic';

interface LiveTokenTicketProps {
  token: QueueToken;
  salon: Salon;
  onCancelToken: (salonId: string, tokenId: string) => void;
  compact?: boolean;
}

export const LiveTokenTicket: React.FC<LiveTokenTicketProps> = ({
  token,
  salon,
  onCancelToken,
  compact = false,
}) => {
  const tracker = getCustomerTokenProgress(salon, token);
  const tokenFormatted = formatTokenNumber(token.tokenNumber);
  const whatsappUrl = buildCustomerWhatsAppTicketUrl(token, tracker);
  const googleMapsUrl = buildGoogleMapsUrl(salon.mapQuery || salon.address);

  // Deterministic 7x7 QR pattern from token id
  const seed = token.tokenNumber * 37 + salon.name.length;

  return (
    <div
      data-testid="live-token-ticket"
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Top Boarding Pass Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 py-4 border-b border-dashed border-slate-700/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block">
            Digital Live Queue Boarding Pass
          </span>
          <h3 className="text-base font-bold text-white truncate mt-0.5">
            {salon.name}
          </h3>
          <p className="text-xs text-slate-400 truncate">{salon.address}</p>
        </div>

        {/* Giant Glowing Token Badge */}
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-right shrink-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            YOUR TOKEN
          </span>
          <span
            data-testid="customer-ticket-number"
            className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums tracking-tight"
          >
            {tokenFormatted}
          </span>
        </div>
      </div>

      {/* Main Ticket Body */}
      <div className="p-5 space-y-4">
        {/* Live Progress Tracker Strip */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium text-slate-300">
              Live Queue Progress Tracker
            </span>
            <span className="font-mono tabular-nums text-amber-400">
              Booked at {token.createdAt}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-800">
            <div className="px-1">
              <span className="text-[11px] text-slate-400 block">
                Currently Serving
              </span>
              <span
                data-testid="ticket-currently-serving"
                className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-0.5 block"
              >
                {tracker.currentlyServingFormatted}
              </span>
            </div>

            <div className="px-1">
              <span className="text-[11px] text-slate-400 block">
                People Ahead of You
              </span>
              <span
                data-testid="ticket-people-ahead"
                className="text-base font-bold text-white font-mono tabular-nums mt-0.5 flex items-center justify-center gap-1"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                {tracker.peopleAheadCount}
              </span>
            </div>

            <div className="px-1">
              <span className="text-[11px] text-slate-400 block">
                Estimated Turn In
              </span>
              <span
                data-testid="ticket-est-turn"
                className="text-sm font-bold text-amber-400 font-mono tabular-nums mt-0.5 flex items-center justify-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                {tracker.estimatedTurnLabel}
              </span>
            </div>
          </div>

          {tracker.isNowServing && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Your token {tokenFormatted} is currently being served! Please
                take your seat.
              </span>
            </div>
          )}

          {tracker.isCompleted && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>This token service has been marked Completed & Paid.</span>
            </div>
          )}
        </div>

        {/* Customer Info + Booked Services + QR Code */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div>
              <span className="text-[11px] text-slate-400 block">Customer</span>
              <p className="text-sm font-semibold text-white truncate">
                {token.customerName} ·{' '}
                <span className="font-mono tabular-nums text-slate-300">
                  +91 {token.customerPhone}
                </span>
              </p>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">
                Booked Services ({token.bookingType})
              </span>
              <ul className="mt-1 space-y-1">
                {token.services.map((s) => (
                  <li
                    key={s.id}
                    className="text-xs text-slate-200 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="font-mono tabular-nums text-amber-400 shrink-0">
                      ₹{s.price}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Total Payable at Salon
              </span>
              <span className="text-base font-bold text-amber-400 font-mono tabular-nums">
                ₹{token.totalAmount}
              </span>
            </div>
          </div>

          {/* Crisp SVG QR Code Verification Block */}
          {!compact && (
            <div className="p-2.5 bg-white rounded-xl shrink-0 flex flex-col items-center">
              <svg
                width="72"
                height="72"
                viewBox="0 0 7 7"
                className="w-16 h-16"
                aria-label={`QR Code for Token ${tokenFormatted}`}
              >
                {Array.from({ length: 49 }).map((_, idx) => {
                  const r = Math.floor(idx / 7);
                  const c = idx % 7;
                  const isCorner =
                    (r < 2 && c < 2) || (r < 2 && c > 4) || (r > 4 && c < 2);
                  const isFilled = isCorner || (seed + r * 11 + c * 7) % 3 === 0;
                  return isFilled ? (
                    <rect
                      key={idx}
                      x={c}
                      y={r}
                      width="0.9"
                      height="0.9"
                      fill="#0f172a"
                    />
                  ) : null;
                })}
              </svg>
              <span className="text-[9px] font-mono font-bold text-slate-900 mt-1 flex items-center gap-0.5">
                <QrCode className="w-2.5 h-2.5" /> {tokenFormatted}
              </span>
            </div>
          )}
        </div>

        {/* 3 Required Action Buttons */}
        <div className="pt-2 space-y-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Send Token Ticket on WhatsApp (+91 7043602377)</span>
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Open Salon Location in Google Maps</span>
          </a>

          {!tracker.isCompleted && !tracker.isCancelledOrSkipped && (
            <button
              type="button"
              onClick={() => onCancelToken(salon.id, token.id)}
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Cancel Token</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
