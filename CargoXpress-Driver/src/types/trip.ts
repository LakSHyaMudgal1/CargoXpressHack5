export interface TruckSummary {
  id: string;
  licensePlate: string;
  totalCapacity: number;
  currentLoad?: number[];
  remainingLoad?: number[];
}

export interface ManifestShipment {
  truckId: string;
  licensePlate: string;
  stops: string[];
  load: number[];
  role: 'carrier' | 'absorbed';
}

export interface TripData {
  id: string;
  type: 'MergedSchedule' | 'Route';
  status?: string;
  origin: string;
  destination: string;
  stops: string[];
  currentLoad: number[];
  remainingLoad: number[];
  totalCapacity?: number;
  manifest: ManifestShipment[];
}

export interface ActiveTripResponse {
  assignmentId?: string;
  truck?: TruckSummary;
  trip: TripData | null;
  message?: string;
}

export interface AssignmentData {
  id: string;
  status: 'active' | 'reassigned' | 'completed' | 'cancelled';
  assignedAt: string;
  notes?: string;
  truck: TruckSummary;
}

export interface AssignmentResponse {
  assignment: AssignmentData | null;
  message?: string;
}

export interface TripHistoryItem {
  id: string;
  status: string;
  assignedAt: string;
  endedAt?: string;
  truck: {
    id: string;
    licensePlate: string;
    totalCapacity: number;
  } | null;
}
