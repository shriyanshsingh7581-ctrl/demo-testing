export type TokenStatus = 'In Chair' | 'Waiting' | 'Completed' | 'Skipped' | 'Cancelled';

export type BookingType = 'Join Live Queue Now' | 'Schedule Later Time Slot';

export type PortalMode = 'customer' | 'partner' | 'admin';

export type PartnerApprovalStatus = 'Approved' | 'Pending' | 'Rejected';

export type JaunpurArea =
  | 'All Jaunpur'
  | 'Olandganj'
  | 'Civil Lines'
  | 'Line Bazar'
  | 'TDB College Road'
  | 'Machhlishahr Padav'
  | 'Shortest Wait Time';

export type JaunpurLocality = Exclude<
  JaunpurArea,
  'All Jaunpur' | 'Shortest Wait Time'
>;

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  durationMins: number;
  category: string;
}

export interface QueueToken {
  id: string;
  tokenNumber: number;
  salonId: string;
  salonName: string;
  salonAddress: string;
  salonArea?: JaunpurLocality;
  customerName: string;
  customerPhone: string;
  services: ServiceItem[];
  totalAmount: number;
  status: TokenStatus;
  bookingType: BookingType;
  scheduledSlot?: string;
  createdAt: string;
  isWalkIn?: boolean;
}

export interface Salon {
  id: string;
  name: string;
  ownerName: string;
  ownerPhone: string;
  area: JaunpurLocality;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  avgWaitMinsPerPerson: number;
  currentServingToken: number;
  nextTokenNumber: number;
  artworkVariant: 'flagship' | 'royal' | 'urban' | 'aura' | 'classic';
  photoUrl?: string;
  mapQuery: string;
  approvalStatus: PartnerApprovalStatus;
  isFeatured?: boolean;
  submittedAt?: string;
  services: ServiceItem[];
  queue: QueueToken[];
}

export interface AdBanner {
  id: string;
  title: string;
  subtitle: string;
  sponsorName: string;
  offerBadge: string;
  ctaText: string;
  targetArea?: JaunpurLocality;
  imageUrl?: string;
  isActive: boolean;
  adSpend: number;
}

export type NotificationAudience =
  | 'All Customers'
  | 'All Salon Partners'
  | 'Both';

export interface PushNotificationItem {
  id: string;
  title: string;
  message: string;
  audience: NotificationAudience;
  offerTag: string;
  createdAt: string;
}

export interface RegisteredCustomer {
  id: string;
  name: string;
  phone: string;
  area: JaunpurLocality;
  totalBookings: number;
  totalSpent: number;
  joinedAt: string;
}
