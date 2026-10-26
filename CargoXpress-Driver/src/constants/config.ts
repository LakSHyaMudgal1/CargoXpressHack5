import { Platform } from 'react-native';

export const CONFIG = {
  // Configurable via EXPO_PUBLIC_API_URL or environment variable
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000'),
  API_TIMEOUT_MS: 15000,
  TOKEN_STORAGE_KEY: 'cargoxpress_driver_jwt_token',
  DRIVER_STORAGE_KEY: 'cargoxpress_driver_profile',
};
