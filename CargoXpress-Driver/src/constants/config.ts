import { Platform } from 'react-native';

const DEFAULT_LAN_HOST = '10.22.1.7'; // Local development host IPv4

const resolveApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    if (Platform.OS === 'android' && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      // Android cannot reach host machine via localhost (loopback refers to the phone/emulator itself)
      return envUrl.replace(/localhost|127\.0\.0\.1/, DEFAULT_LAN_HOST);
    }
    return envUrl;
  }

  if (Platform.OS === 'android') {
    return `http://${DEFAULT_LAN_HOST}:5000`;
  }

  return 'http://localhost:5000';
};

export const CONFIG = {
  // Resolves local LAN IP on Android devices/emulators to prevent java.net.ConnectException
  API_BASE_URL: resolveApiBaseUrl(),
  API_TIMEOUT_MS: 15000,
  TOKEN_STORAGE_KEY: 'cargoxpress_driver_jwt_token',
  DRIVER_STORAGE_KEY: 'cargoxpress_driver_profile',
};
