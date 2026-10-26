import { apiClient } from './client';
import {
  LocationPayload,
  LocationBatchPayload,
  LocationResponse,
  LatestLocationResponse,
} from '../types/location';

export const locationApi = {
  /**
   * Ingests a single real-time GPS coordinate from the device.
   */
  sendLocation: async (payload: LocationPayload): Promise<LocationResponse> => {
    return await apiClient.post<LocationResponse>('/driver/location', payload);
  },

  /**
   * Synchronizes an array of queued location records accumulated during offline/background periods.
   */
  sendBatchLocations: async (payload: LocationBatchPayload): Promise<LocationResponse> => {
    return await apiClient.post<LocationResponse>('/driver/location', payload);
  },

  /**
   * Retrieves the latest recorded location for the authenticated driver.
   */
  getLatestLocation: async (): Promise<LatestLocationResponse> => {
    return await apiClient.get<LatestLocationResponse>('/driver/location/latest');
  },
};
