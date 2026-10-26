import { apiClient } from './client';
import {
  TripStopsResponse,
  StopDetailsResponse,
  UpdateStopStatusPayload,
  UpdateStopStatusResponse,
} from '../types/stop';

export const stopApi = {
  /**
   * Fetch ordered stops and current execution progress for the active trip
   */
  getActiveTripStops: async (): Promise<TripStopsResponse> => {
    return await apiClient.get<TripStopsResponse>('/driver/active-trip/stops');
  },

  /**
   * Fetch detailed stop information, operational instructions, and audit log
   */
  getStopDetails: async (stopIndex: number): Promise<StopDetailsResponse> => {
    return await apiClient.get<StopDetailsResponse>(`/driver/active-trip/stops/${stopIndex}`);
  },

  /**
   * Update operational status of a stop (en route, arrival, progress, completion, or failure)
   */
  updateStopStatus: async (
    stopIndex: number,
    payload: UpdateStopStatusPayload
  ): Promise<UpdateStopStatusResponse> => {
    return await apiClient.post<UpdateStopStatusResponse>(
      `/driver/active-trip/stops/${stopIndex}/status`,
      payload
    );
  },
};
