export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: string;
}

export interface LocationPayload {
  tripId?: string;
  truckId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  timestamp: string;
}

export interface LocationBatchPayload {
  tripId?: string;
  truckId?: string;
  locations: LocationPayload[];
}

export interface LocationResponse {
  message: string;
  recordedCount: number;
  totalSubmitted: number;
  trip?: {
    id: string;
    type: string;
    truckLicensePlate: string;
  };
  latest?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    deviceTimestamp: string;
  } | null;
}

export interface LatestLocationResponse {
  location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    altitude: number | null;
    deviceTimestamp: string;
    serverTimestamp: string;
    truckLicensePlate: string;
    tripId: string;
  } | null;
  message?: string;
}

export type TrackingMode = 'foreground' | 'background';

export type TrackingStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'services_disabled'
  | 'tracking_active'
  | 'error';
