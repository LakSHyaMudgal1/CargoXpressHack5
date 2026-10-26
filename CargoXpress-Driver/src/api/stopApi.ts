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

  /**
   * Record a dedicated consignment delivery attempt (full, partial, or failed)
   */
  recordDeliveryAttempt: async (
    stopIndex: number,
    payload: import('../types/stop').DeliveryAttemptPayload
  ): Promise<import('../types/stop').DeliveryAttemptResponse> => {
    return await apiClient.post<import('../types/stop').DeliveryAttemptResponse>(
      `/driver/active-trip/stops/${stopIndex}/delivery-attempt`,
      payload
    );
  },

  /**
   * Request generation of a recipient OTP code for this stop
   */
  generateOtp: async (stopIndex: number): Promise<import('../types/stop').GenerateOtpResponse> => {
    return await apiClient.post<import('../types/stop').GenerateOtpResponse>(
      `/driver/active-trip/stops/${stopIndex}/generate-otp`,
      {}
    );
  },

  /**
   * Verify recipient OTP code for delivery authorization
   */
  verifyOtp: async (
    stopIndex: number,
    otpCode: string
  ): Promise<import('../types/stop').VerifyOtpResponse> => {
    return await apiClient.post<import('../types/stop').VerifyOtpResponse>(
      `/driver/active-trip/stops/${stopIndex}/verify-otp`,
      { otpCode }
    );
  },

  /**
   * Securely upload delivery photo evidence
   */
  uploadEvidence: async (
    stopIndex: number,
    payload: import('../types/stop').UploadEvidencePayload
  ): Promise<import('../types/stop').UploadEvidenceResponse> => {
    return await apiClient.post<import('../types/stop').UploadEvidenceResponse>(
      `/driver/active-trip/stops/${stopIndex}/evidence`,
      payload
    );
  },
};
