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
   * Fetch shipment operations and cargo items associated with a stop
   */
  getStopShipments: async (stopIndex: number) => {
    return await apiClient.get<import('../types/stop').StopShipmentsResponse>(
      `/driver/active-trip/stops/${stopIndex}/shipments`
    );
  },

  /**
   * Fetch transition audit history and shipment update log for a stop
   */
  getStopHistory: async (stopIndex: number) => {
    return await apiClient.get<import('../types/stop').StopHistoryResponse>(
      `/driver/active-trip/stops/${stopIndex}/history`
    );
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
