import { apiClient } from './client';
import {
  MergeOffersResponse,
  AcceptMergeResponse,
  RejectMergeResponse,
} from '../types/merge';

export const mergeApi = {
  getMergeOffers: async (): Promise<MergeOffersResponse> => {
    return await apiClient.get<MergeOffersResponse>('/driver/merge-offers');
  },

  acceptMergeOffer: async (pairId: string): Promise<AcceptMergeResponse> => {
    return await apiClient.post<AcceptMergeResponse>(`/driver/merge-offers/${pairId}/accept`);
  },

  rejectMergeOffer: async (
    pairId: string,
    reason: string,
    notes?: string
  ): Promise<RejectMergeResponse> => {
    return await apiClient.post<RejectMergeResponse>(`/driver/merge-offers/${pairId}/reject`, {
      reason,
      notes,
    });
  },
};

