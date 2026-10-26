import { apiClient } from './client';
import {
  ActiveTripResponse,
  AssignmentResponse,
  TripData,
  TripHistoryItem,
} from '../types/trip';

export const tripApi = {
  getActiveTrip: async (): Promise<ActiveTripResponse> => {
    return await apiClient.get<ActiveTripResponse>('/driver/active-trip');
  },

  getAssignment: async (): Promise<AssignmentResponse> => {
    return await apiClient.get<AssignmentResponse>('/driver/assignment');
  },

  getTripDetails: async (tripId: string): Promise<{ trip: TripData }> => {
    return await apiClient.get<{ trip: TripData }>(`/driver/trip-details/${tripId}`);
  },

  getTripHistory: async (): Promise<{ assignments: TripHistoryItem[] }> => {
    return await apiClient.get<{ assignments: TripHistoryItem[] }>('/driver/trips');
  },
};
