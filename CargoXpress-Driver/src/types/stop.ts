export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'failed';

export type StopType = 'pickup' | 'delivery' | 'pickup_delivery' | 'waypoint';

export type ShipmentStatus = 'pending' | 'loaded' | 'delivered' | 'partial' | 'failed';

export type ShipmentOperation = 'pickup' | 'delivery';

export interface RecipientInfo {
  name?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface ProofOfDelivery {
  type: 'otp' | 'signature' | 'photo' | 'acknowledgement';
  verificationStatus: 'driver_reported' | 'verified';
  otpCode?: string | null;
  signatureData?: string | null;
  photoReference?: string | null;
  submittedAt?: string | null;
}

export interface StopShipmentItem {
  shipmentId: string;
  shipmentType: 'carrier_truck' | 'absorbed_truck' | 'trader_request';
  reference: string;
  cargoDescription: string;
  weightKg: number;
  deliveredWeightKg?: number | null;
  operation: ShipmentOperation;
  status: ShipmentStatus;
  failureReason?: string | null;
  completedAt?: string | null;
}

export interface StopTransitionAudit {
  fromStatus: string;
  toStatus: string;
  driverId: string;
  driverName: string;
  timestamp: string;
  reason?: string | null;
  notes?: string | null;
}

export interface StopItem {
  stopIndex: number;
  stopName: string;
  stopType: StopType;
  status: StopStatus;
  isCompleted: boolean;
  isFailed: boolean;
  isActive: boolean;
  isUpcoming: boolean;
  allowedNextActions: StopStatus[];
  shipmentsCount: number;
  cargoWeightKg: number;
  shipments: StopShipmentItem[];
  recipient?: RecipientInfo | null;
  proofOfDelivery?: ProofOfDelivery | null;
  failureReason?: string | null;
  notes?: string | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lastUpdatedAt: string;
}

export interface TripStopsResponse {
  tripId: string;
  tripType: 'MergedSchedule' | 'Route';
  truck: {
    id: string;
    licensePlate: string;
    totalCapacity: number;
  };
  currentStopIndex: number;
  currentLoadOnBoard: number;
  totalDeliveredWeight: number;
  lifecycleStatus: string;
  stops: StopItem[];
  message?: string;
}

export interface StopDetailsResponse {
  tripId: string;
  tripType: 'MergedSchedule' | 'Route';
  stopIndex: number;
  stopName: string;
  stopType: StopType;
  status: StopStatus;
  failureReason?: string | null;
  notes?: string | null;
  instructions: string[];
  allowedNextActions: StopStatus[];
  currentLoadOnBoard: number;
  shipments: StopShipmentItem[];
  recipient?: RecipientInfo | null;
  proofOfDelivery?: ProofOfDelivery | null;
  arrivedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lastUpdatedAt: string;
  transitionHistory: StopTransitionAudit[];
}

export interface UpdateStopStatusPayload {
  status: StopStatus;
  failureReason?: string;
  notes?: string;
  recipient?: RecipientInfo;
  proofOfDelivery?: {
    type?: 'otp' | 'signature' | 'photo' | 'acknowledgement';
    otpCode?: string;
    signatureData?: string;
    photoReference?: string;
  };
  shipmentUpdates?: Array<{
    shipmentId: string;
    status: 'partial' | 'failed' | 'delivered';
    deliveredWeightKg?: number;
    failureReason?: string;
  }>;
}

export interface UpdateStopStatusResponse {
  message: string;
  stop: {
    stopIndex: number;
    stopName: string;
    stopType: StopType;
    status: StopStatus;
    failureReason?: string | null;
    recipient?: RecipientInfo | null;
    proofOfDelivery?: ProofOfDelivery | null;
    shipments: StopShipmentItem[];
    completedAt?: string | null;
    arrivedAt?: string | null;
    failedAt?: string | null;
  };
  currentLoadOnBoard: number;
  totalDeliveredWeight: number;
  lifecycleStatus: string;
}

export interface StopShipmentsResponse {
  tripId: string;
  stopIndex: number;
  stopName: string;
  stopType: StopType;
  status: StopStatus;
  shipmentsCount: number;
  cargoWeightKg: number;
  shipments: StopShipmentItem[];
}

export interface StopHistoryResponse {
  tripId: string;
  stopIndex: number;
  stopName: string;
  currentStatus: StopStatus;
  arrivedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  lastUpdatedAt: string;
  transitionHistory: StopTransitionAudit[];
}
