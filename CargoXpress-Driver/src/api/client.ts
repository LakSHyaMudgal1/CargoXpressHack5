import * as SecureStore from 'expo-secure-store';
import { CONFIG } from '../constants/config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
};

class ApiClient {
  private onUnauthorizedCallback: (() => void) | null = null;

  public setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(CONFIG.TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${CONFIG.API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const token = options.skipAuth ? null : await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 401) {
        if (!options.skipAuth && this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback();
        }
        const errorText = await response.text();
        let message = 'Session expired. Please log in again.';
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.message || message;
        } catch (_) {}
        throw new Error(message);
      }

      const text = await response.text();
      let data: any = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = { message: text };
        }
      }

      if (!response.ok) {
        const errorMsg = data.message || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Network request timed out. Please check your internet connection.');
      }
      throw err;
    }
  }

  public get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public post<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  public patch<T>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PATCH', body, headers });
  }

  public delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
