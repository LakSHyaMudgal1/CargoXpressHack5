export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'failed';

export type StopType = 'pickup' | 'delivery' | 'pickup_delivery' | 'waypoint';

export type ShipmentStatus = 'pending' | 'loaded' | 'delivered' | 'partial' | 'failed';

export type ShipmentOperation = 'pickup' | 'delivery';

export interface RecipientInfo {
  name?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface DeliveryAttempt {
  attemptNumber: number;
  attemptType: 'full' | 'partial' | 'failed';
  deliveredWeightKg: number;
  outstandingWeightKg: number;
  recipient?: RecipientInfo | null;
  proofOfDelivery?: ProofOfDelivery | null;
  failureReason?: string | null;
  driverId: string;
  driverName: string;
  requestId?: string | null;
  timestamp: string;
}

export interface ProofOfDelivery {
  type: 'otp' | 'signature' | 'photo' | 'acknowledgement';
  verificationStatus: 'driver_reported' | 'verified';
  evidenceId?: string | null;
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
  outstandingWeightKg?: number | null;
  operation: ShipmentOperation;
  status: ShipmentStatus;
  failureReason?: string | null;
  completedAt?: string | null;
  deliveryAttempts?: DeliveryAttempt[];
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
    evidenceId?: string;
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

export interface DeliveryAttemptPayload {
  shipmentId: string;
  attemptType: 'full' | 'partial' | 'failed';
  deliveredWeightKg?: number;
  failureReason?: string;
  recipient?: RecipientInfo;
  proofOfDelivery?: {
    type: 'otp' | 'signature' | 'photo' | 'acknowledgement';
    otpCode?: string;
    evidenceId?: string;
    signatureData?: string;
    photoReference?: string;
  };
  notes?: string;
  requestId?: string;
}

export interface DeliveryAttemptResponse {
  message: string;
  shipment: {
    shipmentId: string;
    reference: string;
    weightKg: number;
    deliveredWeightKg?: number | null;
    outstandingWeightKg: number;
    status: ShipmentStatus;
    failureReason?: string | null;
    completedAt?: string | null;
    attemptsCount: number;
    latestAttempt?: DeliveryAttempt;
  };
  stop: {
    stopIndex: number;
    stopName: string;
    status: StopStatus;
    completedAt?: string | null;
  };
  currentLoadOnBoard: number;
  totalDeliveredWeight: number;
}

export interface GenerateOtpResponse {
  message: string;
  expiresAt: string;
  maxAttempts: number;
  formattedOtp?: string;
}

export interface VerifyOtpResponse {
  message: string;
  isVerified: boolean;
  verifiedAt?: string;
  reason?: string;
  attemptsRemaining?: number;
}

export interface UploadEvidencePayload {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  dataBase64: string;
  shipmentId?: string;
  metadata?: Record<string, any>;
}

export interface UploadEvidenceResponse {
  message: string;
  evidence: {
    evidenceId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    verificationStatus: 'driver_reported' | 'verified';
    createdAt: string;
  };
}
