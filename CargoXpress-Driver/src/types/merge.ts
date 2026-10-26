export interface MergeTruckInfo {
  id: string;
  licensePlate: string;
  currentStops?: string[];
  stops?: string[];
  currentLoad?: number[];
  load?: number[];
  totalCapacity?: number;
}

export interface ProposedRouteInfo {
  origin: string;
  destination: string;
  consolidatedStops: string[];
  additionalStops: string[];
  additionalStopsCount: number;
  projectedCurrentLoad?: number[];
  projectedRemainingLoad?: number[];
}

export interface IncomingShipmentInfo {
  licensePlate: string;
  origin: string;
  destination: string;
  stops: string[];
  loadKg?: number[] | number;
}

export interface MergeOffer {
  pairId: string;
  isCarrier: boolean;
  canAccept: boolean;
  role?: 'carrier' | 'absorbed';
  roleDescription?: string;
  feasible?: boolean;
  feasibilityError?: string;
  myTruck: MergeTruckInfo;
  partnerTruck: MergeTruckInfo;
  proposedRoute?: ProposedRouteInfo;
  incomingShipment?: IncomingShipmentInfo;
  createdAt: string;
}

export interface MergeOffersResponse {
  offers: MergeOffer[];
  message?: string;
}

export interface AcceptMergeResponse {
  message: string;
  mergedSchedule: {
    id: string;
    origin: string;
    destination: string;
    stops: string[];
    currentLoad: number[];
    remainingLoad: number[];
    totalCapacity: number;
    manifest?: any[];
  };
}

export interface RejectMergeResponse {
  message: string;
  reason: string;
}

