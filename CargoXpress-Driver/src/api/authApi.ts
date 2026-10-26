import { apiClient } from './client';
import { LoginCredentials, LoginResponse, DriverProfile } from '../types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    return await apiClient.request<LoginResponse>('/driver/login', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return await apiClient.post<{ message: string }>('/driver/logout');
  },

  getProfile: async (): Promise<{ driver: DriverProfile }> => {
    return await apiClient.get<{ driver: DriverProfile }>('/driver/me');
  },
};
