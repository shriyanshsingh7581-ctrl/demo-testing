import {
  AdBanner,
  BookingType,
  JaunpurArea,
  JaunpurLocality,
  PartnerApprovalStatus,
  QueueToken,
  RegisteredCustomer,
  Salon,
  ServiceItem,
} from '../types/salon';

export const WHATSAPP_BOOKING_NUMBER = '917043602377';

export function formatTokenNumber(num: number): string {
  if (num <= 0) return '#00';
  return `#${String(num).padStart(2, '0')}`;
}

export interface SalonQueueMetrics {
  nowServingToken: number;
  nowServingFormatted: string;
  nowServingCustomer: QueueToken | undefined;
  waitingTokens: QueueToken[];
  waitingCount: number;
  waitingLabel: string;
  estimatedWaitMins: number;
  estimatedWaitLabel: string;
  nextAvailableToken: number;
  nextAvailableFormatted: string;
  completedRevenue: number;
  completedCount: number;
}

export function getSalonQueueMetrics(salon: Salon): SalonQueueMetrics {
  const waitingTokens = salon.queue
    .filter((t) => t.status === 'Waiting')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const nowServingCustomer =
    salon.queue.find(
      (t) =>
        t.status === 'In Chair' && t.tokenNumber === salon.currentServingToken
    ) || salon.queue.find((t) => t.status === 'In Chair');

  const nowServingToken = nowServingCustomer
    ? nowServingCustomer.tokenNumber
    : salon.currentServingToken;

  const waitingCount = waitingTokens.length;
  const waitingLabel =
    waitingCount === 0
      ? '0 People (No Wait!)'
      : waitingCount === 1
      ? '1 Person'
      : `${waitingCount} People`;

  const estimatedWaitMins =
    waitingCount === 0
      ? 0
      : Math.max(
          5,
          Math.round((waitingCount * salon.avgWaitMinsPerPerson) / 5) * 5
        );

  const estimatedWaitLabel =
    estimatedWaitMins === 0 ? '0 mins' : `~${estimatedWaitMins} mins`;

  const maxQueueToken = salon.queue.reduce(
    (max, item) => Math.max(max, item.tokenNumber),
    salon.currentServingToken
  );
  const nextAvailableToken = Math.max(salon.nextTokenNumber, maxQueueToken + 1);

  const completedTokens = salon.queue.filter((t) => t.status === 'Completed');
  const completedRevenue = completedTokens.reduce(
    (sum, t) => sum + t.totalAmount,
    0
  );

  return {
    nowServingToken,
    nowServingFormatted: formatTokenNumber(nowServingToken),
    nowServingCustomer,
    waitingTokens,
    waitingCount,
    waitingLabel,
    estimatedWaitMins,
    estimatedWaitLabel,
    nextAvailableToken,
    nextAvailableFormatted: formatTokenNumber(nextAvailableToken),
    completedRevenue,
    completedCount: completedTokens.length,
  };
}

export interface CustomerTokenTracker {
  currentlyServingFormatted: string;
  peopleAheadCount: number;
  estimatedTurnMins: number;
  estimatedTurnLabel: string;
  isNowServing: boolean;
  isCompleted: boolean;
  isCancelledOrSkipped: boolean;
}

export function getCustomerTokenProgress(
  salon: Salon,
  token: QueueToken
): CustomerTokenTracker {
  const metrics = getSalonQueueMetrics(salon);
  const liveTokenInSalon =
    salon.queue.find((t) => t.id === token.id) || token;

  if (liveTokenInSalon.status === 'Completed') {
    return {
      currentlyServingFormatted: metrics.nowServingFormatted,
      peopleAheadCount: 0,
      estimatedTurnMins: 0,
      estimatedTurnLabel: 'Completed',
      isNowServing: false,
      isCompleted: true,
      isCancelledOrSkipped: false,
    };
  }

  if (
    liveTokenInSalon.status === 'Cancelled' ||
    liveTokenInSalon.status === 'Skipped'
  ) {
    return {
      currentlyServingFormatted: metrics.nowServingFormatted,
      peopleAheadCount: 0,
      estimatedTurnMins: 0,
      estimatedTurnLabel: liveTokenInSalon.status,
      isNowServing: false,
      isCompleted: false,
      isCancelledOrSkipped: true,
    };
  }

  if (
    liveTokenInSalon.status === 'In Chair' ||
    liveTokenInSalon.tokenNumber === metrics.nowServingToken
  ) {
    return {
      currentlyServingFormatted: metrics.nowServingFormatted,
      peopleAheadCount: 0,
      estimatedTurnMins: 0,
      estimatedTurnLabel: "It's Your Turn Now!",
      isNowServing: true,
      isCompleted: false,
      isCancelledOrSkipped: false,
    };
  }

  const peopleAheadCount = metrics.waitingTokens.filter(
    (t) => t.tokenNumber < liveTokenInSalon.tokenNumber
  ).length;

  const estimatedTurnMins =
    peopleAheadCount === 0
      ? 5
      : Math.max(
          5,
          Math.round((peopleAheadCount * salon.avgWaitMinsPerPerson) / 5) * 5
        );

  return {
    currentlyServingFormatted: metrics.nowServingFormatted,
    peopleAheadCount,
    estimatedTurnMins,
    estimatedTurnLabel: `~${estimatedTurnMins} Mins`,
    isNowServing: false,
    isCompleted: false,
    isCancelledOrSkipped: false,
  };
}

export function bookNewTokenForSalon(
  salon: Salon,
  params: {
    customerName: string;
    customerPhone: string;
    services: ServiceItem[];
    bookingType: BookingType;
    scheduledSlot?: string;
    isWalkIn?: boolean;
  }
): { updatedSalon: Salon; bookedToken: QueueToken } {
  const metrics = getSalonQueueMetrics(salon);
  const assignedNumber = metrics.nextAvailableToken;
  const totalAmount = params.services.reduce((sum, s) => sum + s.price, 0);

  const now = new Date();
  const timeString = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const bookedToken: QueueToken = {
    id: `tk-${salon.id}-${assignedNumber}-${Date.now()}`,
    tokenNumber: assignedNumber,
    salonId: salon.id,
    salonName: salon.name,
    salonAddress: salon.address,
    salonArea: salon.area,
    customerName: params.customerName.trim(),
    customerPhone: params.customerPhone.trim(),
    services: params.services,
    totalAmount,
    status: 'Waiting',
    bookingType: params.bookingType,
    scheduledSlot: params.scheduledSlot,
    createdAt: timeString,
    isWalkIn: params.isWalkIn ?? false,
  };

  const updatedSalon: Salon = {
    ...salon,
    nextTokenNumber: assignedNumber + 1,
    queue: [...salon.queue, bookedToken],
  };

  return { updatedSalon, bookedToken };
}

export function callNextTokenInSalon(salon: Salon): Salon {
  const waitingTokens = salon.queue
    .filter((t) => t.status === 'Waiting')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const nextWaiting = waitingTokens[0];

  const updatedQueue = salon.queue.map((t) => {
    if (t.status === 'In Chair') {
      return { ...t, status: 'Completed' as const };
    }
    if (nextWaiting && t.id === nextWaiting.id) {
      return { ...t, status: 'In Chair' as const };
    }
    return t;
  });

  const newServingNumber = nextWaiting
    ? nextWaiting.tokenNumber
    : salon.currentServingToken;

  return {
    ...salon,
    currentServingToken: newServingNumber,
    queue: updatedQueue,
  };
}

export function markCurrentTokenCompleted(salon: Salon): Salon {
  return callNextTokenInSalon(salon);
}

export function skipCurrentOrNextToken(salon: Salon): Salon {
  const waitingTokens = salon.queue
    .filter((t) => t.status === 'Waiting')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const inChairToken = salon.queue.find((t) => t.status === 'In Chair');
  const nextWaiting = waitingTokens[0];

  if (inChairToken) {
    const updatedQueue = salon.queue.map((t) => {
      if (t.id === inChairToken.id) {
        return { ...t, status: 'Skipped' as const };
      }
      if (nextWaiting && t.id === nextWaiting.id) {
        return { ...t, status: 'In Chair' as const };
      }
      return t;
    });

    return {
      ...salon,
      currentServingToken: nextWaiting
        ? nextWaiting.tokenNumber
        : salon.currentServingToken,
      queue: updatedQueue,
    };
  }

  return salon;
}

export function cancelTokenById(salon: Salon, tokenId: string): Salon {
  return {
    ...salon,
    queue: salon.queue.map((t) =>
      t.id === tokenId ? { ...t, status: 'Cancelled' as const } : t
    ),
  };
}

export function filterAndSortSalons(
  salons: Salon[],
  options: {
    searchQuery: string;
    selectedArea: JaunpurArea;
    maxWaitMins?: number | null;
    onlyApproved?: boolean;
  }
): Salon[] {
  const query = options.searchQuery.trim().toLowerCase();
  const onlyApproved = options.onlyApproved ?? true;

  const filtered = salons.filter((salon) => {
    if (onlyApproved && salon.approvalStatus !== 'Approved') {
      return false;
    }

    if (
      options.selectedArea !== 'All Jaunpur' &&
      options.selectedArea !== 'Shortest Wait Time'
    ) {
      if (salon.area !== options.selectedArea) {
        return false;
      }
    }

    const metrics = getSalonQueueMetrics(salon);
    if (
      typeof options.maxWaitMins === 'number' &&
      metrics.estimatedWaitMins > options.maxWaitMins
    ) {
      return false;
    }

    if (!query) return true;

    const nameMatch = salon.name.toLowerCase().includes(query);
    const addressMatch = salon.address.toLowerCase().includes(query);
    const areaMatch = salon.area.toLowerCase().includes(query);
    const serviceMatch = salon.services.some(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    );

    return nameMatch || addressMatch || areaMatch || serviceMatch;
  });

  if (options.selectedArea === 'Shortest Wait Time') {
    return [...filtered].sort((a, b) => {
      const waitA = getSalonQueueMetrics(a).estimatedWaitMins;
      const waitB = getSalonQueueMetrics(b).estimatedWaitMins;
      if (waitA !== waitB) return waitA - waitB;
      return a.distanceKm - b.distanceKm;
    });
  }

  return filtered;
}

export function updateSalonApprovalStatus(
  salons: Salon[],
  salonId: string,
  status: PartnerApprovalStatus
): Salon[] {
  return salons.map((s) =>
    s.id === salonId ? { ...s, approvalStatus: status } : s
  );
}

export function toggleSalonFeatured(salons: Salon[], salonId: string): Salon[] {
  return salons.map((s) =>
    s.id === salonId ? { ...s, isFeatured: !s.isFeatured } : s
  );
}

export interface PlatformAnalyticsSummary {
  totalRegisteredCustomers: number;
  approvedSalonsCount: number;
  pendingSalonsCount: number;
  rejectedSalonsCount: number;
  totalBookingsToday: number;
  totalBookingsAllTime: number;
  totalBookingGmv: number;
  totalAdRevenue: number;
  totalPlatformRevenue: number;
  areaBookingBreakdown: Record<JaunpurLocality, number>;
  allMasterTokens: (QueueToken & { salonArea: JaunpurLocality })[];
}

export function getPlatformAnalytics(
  salons: Salon[],
  customers: RegisteredCustomer[],
  adBanners: AdBanner[]
): PlatformAnalyticsSummary {
  const approvedSalonsCount = salons.filter(
    (s) => s.approvalStatus === 'Approved'
  ).length;
  const pendingSalonsCount = salons.filter(
    (s) => s.approvalStatus === 'Pending'
  ).length;
  const rejectedSalonsCount = salons.filter(
    (s) => s.approvalStatus === 'Rejected'
  ).length;

  const areaBookingBreakdown: Record<JaunpurLocality, number> = {
    Olandganj: 0,
    'Civil Lines': 0,
    'Line Bazar': 0,
    'TDB College Road': 0,
    'Machhlishahr Padav': 0,
  };

  const allMasterTokens: (QueueToken & { salonArea: JaunpurLocality })[] = [];
  let totalBookingGmv = 0;

  for (const salon of salons) {
    for (const token of salon.queue) {
      const area = token.salonArea || salon.area;
      areaBookingBreakdown[area] = (areaBookingBreakdown[area] || 0) + 1;
      if (token.status !== 'Cancelled' && token.status !== 'Skipped') {
        totalBookingGmv += token.totalAmount;
      }
      allMasterTokens.push({
        ...token,
        salonArea: area,
      });
    }
  }

  const totalAdRevenue = adBanners
    .filter((b) => b.isActive)
    .reduce((sum, b) => sum + b.adSpend, 0);

  return {
    totalRegisteredCustomers: 1242 + customers.length,
    approvedSalonsCount,
    pendingSalonsCount,
    rejectedSalonsCount,
    totalBookingsToday: allMasterTokens.length,
    totalBookingsAllTime: 3420 + allMasterTokens.length,
    totalBookingGmv,
    totalAdRevenue,
    totalPlatformRevenue: totalBookingGmv + totalAdRevenue,
    areaBookingBreakdown,
    allMasterTokens,
  };
}

export function buildCustomerWhatsAppTicketUrl(
  token: QueueToken,
  tracker: CustomerTokenTracker
): string {
  const serviceNames = token.services
    .map((s) => `${s.name} (₹${s.price})`)
    .join(', ');
  const message = [
    `*Thanker: Salon (Jaunpur) — Live Queue Ticket*`,
    `----------------------------------`,
    `*YOUR TOKEN:* ${formatTokenNumber(token.tokenNumber)}`,
    `*Salon:* ${token.salonName}`,
    `*Address:* ${token.salonAddress}`,
    `*Customer:* ${token.customerName} (${token.customerPhone})`,
    `*Services:* ${serviceNames}`,
    `*Total Payable:* ₹${token.totalAmount}`,
    `*Queue Status:* Currently Serving ${tracker.currentlyServingFormatted} | People Ahead: ${tracker.peopleAheadCount} | Est. Turn: ${tracker.estimatedTurnLabel}`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_BOOKING_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}

export function buildAdminWhatsAppAlertUrl(
  token: QueueToken,
  salonName: string
): string {
  const digits = token.customerPhone.replace(/\D/g, '');
  const phoneWithCountry =
    digits.length === 10 ? `91${digits}` : digits || WHATSAPP_BOOKING_NUMBER;
  const text = `Hi ${token.customerName}! Your Token (${formatTokenNumber(
    token.tokenNumber
  )}) turn at ${salonName} is next, please arrive in 5 mins!`;
  return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
}

export function buildGoogleMapsUrl(queryOrAddress: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    queryOrAddress
  )}`;
}
