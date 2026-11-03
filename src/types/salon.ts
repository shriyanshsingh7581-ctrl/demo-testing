export type TokenStatus = 'In Chair' | 'Waiting' | 'Completed' | 'Skipped' | 'Cancelled';

export type BookingType = 'Join Live Queue Now' | 'Schedule Later Time Slot';

export type JaunpurArea =
  | 'All Jaunpur'
  | 'Olandganj'
  | 'Civil Lines'
  | 'Line Bazar'
  | 'TDB College Road'
  | 'Machhlishahr Padav'
  | 'Shortest Wait Time';

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
  area: Exclude<JaunpurArea, 'All Jaunpur' | 'Shortest Wait Time'>;
  address: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  avgWaitMinsPerPerson: number;
  currentServingToken: number;
  nextTokenNumber: number;
  artworkVariant: 'flagship' | 'royal' | 'urban' | 'aura' | 'classic';
  mapQuery: string;
  services: ServiceItem[];
  queue: QueueToken[];
}
