import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { locationApi } from '../api/locationApi';
import { LocationPayload, LocationPoint } from '../types/location';

export const LOCATION_TASK_NAME = 'CARGOXPRESS_BACKGROUND_LOCATION_TRACKING';

// Active session tracking metadata
let activeTripId: string | null = null;
let activeTruckId: string | null = null;
let foregroundSubscription: Location.LocationSubscription | null = null;
let isTrackingRunning = false;
let isBackgroundRunning = false;
let lastRecordedLocation: LocationPoint | null = null;
let onLocationListener: ((loc: LocationPoint) => void) | null = null;

// Offline queue for temporary network loss
const offlineQueue: LocationPayload[] = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Flush any queued offline coordinates to the backend in batches.
 */
async function flushOfflineQueue(): Promise<void> {
  if (offlineQueue.length === 0) return;

  const batch = offlineQueue.splice(0, 30);
  try {
    await locationApi.sendBatchLocations({
      tripId: activeTripId || undefined,
      truckId: activeTruckId || undefined,
      locations: batch,
    });
  } catch (err) {
    // If sync failed, restore back to queue without exceeding limit
    offlineQueue.unshift(...batch.slice(0, MAX_QUEUE_SIZE - offlineQueue.length));
  }
}

/**
 * Formats an Expo LocationObject into a standardized LocationPoint.
 */
function formatLocationPoint(loc: Location.LocationObject): LocationPoint {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy ? Math.round(loc.coords.accuracy * 10) / 10 : null,
    speed: loc.coords.speed !== null && loc.coords.speed >= 0 ? Math.round(loc.coords.speed * 10) / 10 : null,
    heading: loc.coords.heading !== null && loc.coords.heading >= 0 ? Math.round(loc.coords.heading) : null,
    altitude: loc.coords.altitude !== null ? Math.round(loc.coords.altitude) : null,
    timestamp: new Date(loc.timestamp).toISOString(),
  };
}

/**
 * Sends or queues an extracted location point.
 */
async function processLocationUpdate(loc: Location.LocationObject): Promise<void> {
  const point = formatLocationPoint(loc);
  lastRecordedLocation = point;

  if (onLocationListener) {
    onLocationListener(point);
  }

  const payload: LocationPayload = {
    tripId: activeTripId || undefined,
    truckId: activeTruckId || undefined,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy,
    speed: point.speed,
    heading: point.heading,
    altitude: point.altitude,
    timestamp: point.timestamp,
  };

  try {
    await locationApi.sendLocation(payload);
    // Flush any backlogged offline points upon success
    if (offlineQueue.length > 0) {
      await flushOfflineQueue();
    }
  } catch (err) {
    // Queue locally during network interruption
    if (offlineQueue.length < MAX_QUEUE_SIZE) {
      offlineQueue.push(payload);
    }
  }
}

// ─── BACKGROUND TASK DEFINITION ──────────────────────────────────────────────
// Must be registered in global execution scope before mounting React components.
try {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('[LocationService] Background tracking error:', error.message);
      return;
    }

    if (data && isTrackingRunning) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        for (const loc of locations) {
          await processLocationUpdate(loc);
        }
      }
    }
  });
} catch (e) {
  // Task definition is safe even if TaskManager has already defined the task
}

export const locationService = {
  /**
   * Check current device and permission prerequisites.
   */
  async checkPermissions(): Promise<{
    servicesEnabled: boolean;
    foregroundGranted: boolean;
    backgroundGranted: boolean;
  }> {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();

    return {
      servicesEnabled,
      foregroundGranted: fg.status === 'granted',
      backgroundGranted: bg.status === 'granted',
    };
  },

  /**
   * Request foreground location permission with user explanation.
   */
  async requestForegroundPermissions(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Request background location permission (only when foreground is already granted).
   */
  async requestBackgroundPermissions(): Promise<boolean> {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      const granted = await this.requestForegroundPermissions();
      if (!granted) return false;
    }

    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === 'granted';
  },

  /**
   * Start GPS location tracking for an authorized active trip.
   */
  async startTracking(options: {
    tripId: string;
    truckId: string;
    enableBackground?: boolean;
    onLocation?: (loc: LocationPoint) => void;
  }): Promise<{ success: boolean; backgroundActive: boolean; message: string }> {
    const { tripId, truckId, enableBackground = true, onLocation } = options;

    if (!tripId || !truckId) {
      return { success: false, backgroundActive: false, message: 'Active trip and truck ID are required.' };
    }

    // 1. Check device location services
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        success: false,
        backgroundActive: false,
        message: 'Location services are disabled on this device. Please enable GPS in settings.',
      };
    }

    // 2. Request foreground permissions
    const fgGranted = await this.requestForegroundPermissions();
    if (!fgGranted) {
      return {
        success: false,
        backgroundActive: false,
        message: 'Foreground location permission was denied. Cannot track route.',
      };
    }

    // Stop any existing tracking first
    await this.stopTracking();

    activeTripId = tripId;
    activeTruckId = truckId;
    isTrackingRunning = true;
    onLocationListener = onLocation || null;

    // 3. Start foreground position watcher
    foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,       // 10 seconds interval
        distanceInterval: 25,      // 25 meters distance filter
      },
      (location) => {
        processLocationUpdate(location);
      }
    );

    // 4. Optionally initialize background location updates if authorized
    let bgActive = false;
    if (enableBackground) {
      try {
        const bgGranted = await this.requestBackgroundPermissions();
        if (bgGranted) {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
          if (!isRegistered) {
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 15000,     // 15 seconds in background
              distanceInterval: 30,    // 30 meters
              foregroundService: {
                notificationTitle: 'CargoXpress Active Trip',
                notificationBody: 'Broadcasting live delivery corridor coordinates to dispatch',
                notificationColor: '#2563EB',
              },
              pausesUpdatesAutomatically: false,
            });
          }
          bgActive = true;
          isBackgroundRunning = true;
        }
      } catch (bgErr: any) {
        // Graceful fallback to foreground tracking if background service fails or runs in unsupported environment
        console.warn('[LocationService] Background tracking unavailable:', bgErr.message);
        bgActive = false;
        isBackgroundRunning = false;
      }
    }

    // Send immediate first fix
    try {
      const initialFix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await processLocationUpdate(initialFix);
    } catch (_) {}

    return {
      success: true,
      backgroundActive: bgActive,
      message: bgActive
        ? 'Live and background GPS tracking active.'
        : 'Foreground GPS tracking active.',
    };
  },

  /**
   * Stops tracking and unregisters background listeners.
   */
  async stopTracking(): Promise<void> {
    isTrackingRunning = false;
    isBackgroundRunning = false;
    activeTripId = null;
    activeTruckId = null;
    onLocationListener = null;

    if (foregroundSubscription) {
      foregroundSubscription.remove();
      foregroundSubscription = null;
    }

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (_) {}
  },

  /**
   * Check if tracking is currently active.
   */
  isTracking(): boolean {
    return isTrackingRunning;
  },

  /**
   * Check if background tracking is running.
   */
  isBackground(): boolean {
    return isBackgroundRunning;
  },

  /**
   * Retrieves the latest recorded location.
   */
  getLastLocation(): LocationPoint | null {
    return lastRecordedLocation;
  },

  /**
   * Retrieves the count of unconfirmed points in the offline queue.
   */
  getQueuedCount(): number {
    return offlineQueue.length;
  },
};
