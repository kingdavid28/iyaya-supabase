// utils/locationUtils.js
import axios from 'axios';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// =====================
// Constants
// =====================
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 2;

// =====================
// Cache
// =====================
const locationCache = new Map();

// =====================
// Error Messages
// =====================
const ERROR_MESSAGES = {
  PERMISSION_DENIED:
    'Location permission denied. Please enable location access.',
  SERVICES_DISABLED:
    'Location services are disabled. Please enable GPS.',
  TIMEOUT:
    'Location request timed out. Please try again.',
  UNKNOWN:
    'Unable to get your location. Please try again later.',
};

// =====================
// Helpers
// =====================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getAddressComponent = (components, type) =>
  components.find((c) => c.types?.includes(type))?.long_name || '';

const formatGeocodeResult = (result) => {
  if (!result) return null;

  const components = result.address_components || [];

  const streetNumber = getAddressComponent(components, 'street_number');
  const route = getAddressComponent(components, 'route');
  const city =
    getAddressComponent(components, 'locality') ||
    getAddressComponent(components, 'administrative_area_level_2');
  const province = getAddressComponent(
    components,
    'administrative_area_level_1'
  );

  return {
    formatted: result.formatted_address || '',
    street: [streetNumber, route].filter(Boolean).join(' ').trim(),
    city,
    province,
    country: getAddressComponent(components, 'country'),
    postalCode: getAddressComponent(components, 'postal_code'),
    placeId: result.place_id,
  };
};

// =====================
// OpenStreetMap fallback
// =====================
const fetchAddressFromOpenStreetMap = async ({ latitude, longitude }) => {
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'expo-location-app',
        },
        timeout: 5000,
      }
    );

    const a = response.data?.address || {};

    return {
      formatted: response.data.display_name || '',
      street: a.road || '',
      city: a.city || a.town || a.village || '',
      province: a.state || '',
      country: a.country || '',
      postalCode: a.postcode || '',
      cached: false,
    };
  } catch {
    return null;
  }
};

// =====================
// Google Geocoding
// =====================
const fetchAddressFromGoogle = async ({ latitude, longitude }) => {
  // Temporarily disable Google Maps API to prevent 403 errors
  console.warn('Google Maps API temporarily disabled due to 403 errors');
  return {
    formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    city: 'Unknown',
    country: 'PH',
    postal_code: null
  };
};

// =====================
// Address with cache
// =====================
const fetchAddressForCoordsWithCache = async (coords) => {
  const key = `addr_${coords.latitude.toFixed(5)}_${coords.longitude.toFixed(
    5
  )}`;
  const cached = locationCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Use OpenStreetMap as fallback instead of Google Maps
  const address = await fetchAddressFromOpenStreetMap(coords);

  if (address) {
    locationCache.set(key, {
      data: address,
      timestamp: Date.now(),
    });
  }

  return address;
};

// =====================
// Main API
// =====================
export const getCurrentDeviceLocation = async (options = {}) => {
  const {
    accuracy = Location.Accuracy.Balanced,
    timeout = DEFAULT_TIMEOUT,
    requestAddress = true,
    maxRetries = MAX_RETRIES,
  } = options;

  // =====================
  // WEB (special handling)
  // =====================
  if (Platform.OS === 'web') {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const address = requestAddress
        ? await fetchAddressForCoordsWithCache(coords)
        : null;

      return formatLocationResponse(location, address);
    } catch (error) {
      console.warn('Web location access failed:', error.message);
      // Return a default location instead of failing
      return {
        coords: {
          latitude: 14.5995, // Manila default
          longitude: 120.9842,
        },
        address: {
          city: 'Manila',
          province: 'Metro Manila',
          country: 'Philippines',
        },
        timestamp: Date.now(),
      };
    }
  }

  // =====================
  // Native (Android / iOS)
  // =====================
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      const servicesEnabled =
        await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error(ERROR_MESSAGES.SERVICES_DISABLED);
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy,
        timeout,
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const address = requestAddress
        ? await fetchAddressForCoordsWithCache(coords)
        : null;

      return formatLocationResponse(location, address);
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(1000 * attempt);
    }
  }
};

// =====================
// Response formatter
// =====================
const formatLocationResponse = (location, address) => ({
  coordinates: {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    altitude: location.coords.altitude,
    heading: location.coords.heading,
    speed: location.coords.speed,
  },
  timestamp: location.timestamp || Date.now(),
  provider: 'expo-location',
  address: address || null,
});

// =====================
// Utilities
// =====================
export const clearLocationCache = () => {
  locationCache.clear();
};

export const getCacheInfo = () => ({
  size: locationCache.size,
  keys: [...locationCache.keys()],
});
