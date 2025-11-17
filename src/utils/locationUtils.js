// utils/locationUtils.js
import axios from 'axios';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-places-loader';
let googleMapsScriptPromise = null;
let placesServiceContainer = null;

const ensureGoogleMapsPlacesLibrary = (apiKey) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google.maps);
  }

  if (!googleMapsScriptPromise) {
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const handleLoad = () => {
        const maps = window.google?.maps;
        if (!maps) {
          googleMapsScriptPromise = null;
          reject(new Error('Google Maps JavaScript API failed to load.'));
          return;
        }

        resolve(maps);
      };

      const handleError = (event) => {
        googleMapsScriptPromise = null;
        reject(event instanceof Error ? event : new Error('Google Maps JavaScript API failed to load.'));
      };

      const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    });
  }

  return googleMapsScriptPromise;
};

const createPlacesService = (googleMaps) => {
  if (typeof document === 'undefined' || !googleMaps?.places?.PlacesService) {
    return null;
  }

  if (!placesServiceContainer) {
    placesServiceContainer = document.createElement('div');
  }

  return new googleMaps.places.PlacesService(placesServiceContainer);
};

const extractAddressComponent = (components, type) => {
  if (!components) {
    return '';
  }

  const component = components.find((item) => item.types?.includes(type));
  if (!component) {
    return '';
  }

  return (
    component.longText ??
    component.long_name ??
    component.name ??
    component.text ??
    component.longName ??
    ''
  );
};

const formatPlacesResult = (place) => {
  if (!place) {
    return null;
  }

  const addressComponents = place.address_components || place.addressComponents;
  const shortFormattedAddress =
    typeof place.shortFormattedAddress === 'object'
      ? place.shortFormattedAddress?.text
      : place.shortFormattedAddress;

  const formatted =
    place.formattedAddress ||
    place.formatted_address ||
    shortFormattedAddress ||
    place.vicinity ||
    place.displayName?.text ||
    place.displayName ||
    place.name ||
    '';

  const cityFromPlusCode =
    place.plus_code?.compound_code?.split(' ')?.slice(1).join(' ') ?? '';
  const cityFromVicinity = place.vicinity
    ? place.vicinity
      .split(',')
      .slice(1)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join(', ')
    : '';

  const cityFromComponents =
    extractAddressComponent(addressComponents, 'locality') ||
    extractAddressComponent(addressComponents, 'administrative_area_level_2');

  return {
    formatted,
    street:
      place.name ||
      place.displayName?.text ||
      extractAddressComponent(addressComponents, 'route') ||
      place.vicinity?.split(',')[0]?.trim() ||
      '',
    city: cityFromComponents || cityFromPlusCode || cityFromVicinity,
    province: extractAddressComponent(addressComponents, 'administrative_area_level_1') || '',
    country: extractAddressComponent(addressComponents, 'country') || '',
    postalCode: extractAddressComponent(addressComponents, 'postal_code') || '',
  };
};

const fetchAddressFromPlaces = async ({ latitude, longitude }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('Google Maps API key is not configured; skipping Places lookup.');
    return null;
  }

  if (Platform.OS === 'web') {
    try {
      const googleMaps = await ensureGoogleMapsPlacesLibrary(apiKey);
      if (!googleMaps?.places) {
        console.warn('Google Maps Places library is unavailable in the current environment.');
        return null;
      }

      const placesService = createPlacesService(googleMaps);
      if (!placesService) {
        return null;
      }

      const firstResult = await new Promise((resolve) => {
        placesService.nearbySearch(
          {
            location: new googleMaps.LatLng(latitude, longitude),
            radius: 75,
          },
          (results, status) => {
            if (status !== googleMaps.places.PlacesServiceStatus.OK || !results?.length) {
              resolve(null);
              return;
            }

            resolve(results[0]);
          },
        );
      });

      return formatPlacesResult(firstResult);
    } catch (error) {
      console.error('Places JS lookup failed:', error);
      return null;
    }
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        key: apiKey,
        location: `${latitude},${longitude}`,
        radius: 75,
      },
    });

    const firstResult = response.data?.results?.[0];
    return formatPlacesResult(firstResult);
  } catch (error) {
    console.error('Places REST lookup failed:', error);
    return null;
  }
};

const fetchAddressFromOpenStreetMap = async ({ latitude, longitude }) => {
  try {
    const response = await fetch(`https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data?.address ?? {};

    return {
      formatted: data?.display_name ?? '',
      street: address.road || address.neighbourhood || '',
      city: address.city || address.town || address.village || address.municipality || '',
      province: address.state || '',
      country: address.country || '',
      postalCode: address.postcode || '',
    };
  } catch (error) {
    console.error('OpenStreetMap lookup failed:', error);
    return null;
  }
};

const fetchAddressForCoords = async (coords) => {
  const fallbackAddress = {
    formatted: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`,
    street: '',
    city: '',
    province: '',
    country: '',
    postalCode: '',
  };

  if (Platform.OS === 'web') {
    const placesAddress = await fetchAddressFromPlaces(coords);
    if (placesAddress) {
      return placesAddress;
    }

    return fallbackAddress;
  }

  const placesAddress = await fetchAddressFromPlaces(coords);
  if (placesAddress) {
    return placesAddress;
  }

  const osmAddress = await fetchAddressFromOpenStreetMap(coords);
  if (osmAddress) {
    return osmAddress;
  }

  return fallbackAddress;
};

// Get current device location using Expo
export const getCurrentDeviceLocation = async (options = {}) => {
  const {
    accuracy = Location.Accuracy.Highest,
    timeout = 15000,
    requestAddress = true,
    shouldRetryWithBalanced = true,
    requireFineLocationServices = Platform.OS === 'android',
  } = options;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    if (requireFineLocationServices) {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error('Location services are disabled. Please enable GPS.');
      }

      if (Platform.OS === 'android' && typeof Location.getProviderStatusAsync === 'function') {
        const providerStatus = await Location.getProviderStatusAsync();
        if (providerStatus && providerStatus.gpsAvailable === false) {
          throw new Error('GPS is unavailable. Enable High Accuracy mode in system settings.');
        }
      }
    }

    let location;

    try {
      location = await Location.getCurrentPositionAsync({
        accuracy,
        timeout,
      });
    } catch (positionError) {
      if (shouldRetryWithBalanced && accuracy !== Location.Accuracy.Balanced) {
        return getCurrentDeviceLocation({
          ...options,
          accuracy: Location.Accuracy.Balanced,
          shouldRetryWithBalanced: false,
        });
      }
      throw positionError;
    }

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const address = requestAddress ? await fetchAddressForCoords(coords) : null;

    return formatLocationResponse(location, address);
  } catch (error) {
    console.error('Location error:', error);
    throw error;
  }
};

// Search location using Google Maps API
export const searchLocation = async (searchText) => {
  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
      params: {
        address: searchText,
        key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY // Use Expo environment variable
      }
    });

    if (!response.data.results.length) {
      throw new Error('Location not found');
    }

    return parseGoogleMapsResult(response.data.results[0]);
  } catch (error) {
    console.error('Location search failed:', error);
    throw error;
  }
};

// Helper functions
const formatLocationResponse = (location, address) => ({
  coordinates: {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  },
  address: address ? {
    street: address.street || '',
    city: address.city || '',
    province: address.province || address.region || '',
    country: address.country || '',
    postalCode: address.postalCode || address.postal_code || '',
    formatted: address.formatted || `${address.street || ''}, ${address.city || ''}, ${address.province || address.region || ''}`.trim().replace(/^,/, '').replace(/,$/, '')
  } : null
});

const parseGoogleMapsResult = (result) => {
  const { address_components, formatted_address, geometry } = result;

  return {
    coordinates: {
      latitude: geometry.location.lat,
      longitude: geometry.location.lng
    },
    address: {
      formatted: formatted_address,
      street: getAddressComponent(address_components, 'route'),
      city: getAddressComponent(address_components, 'locality'),
      province: getAddressComponent(address_components, 'administrative_area_level_1'),
      country: getAddressComponent(address_components, 'country'),
      postalCode: getAddressComponent(address_components, 'postal_code')
    }
  };
};

const getAddressComponent = (components, type) => {
  return components.find(c => c.types.includes(type))?.long_name || '';
};

export const validateLocation = (location) => {
  if (!location) return false;

  // Check if we have at least a city and province
  if (!location.city || !location.province) return false;

  // Check if coordinates are valid if provided
  if (location.coordinates) {
    const { latitude, longitude } = location.coordinates;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return false;
    }
  }

  return true;
};

export const formatLocationForDisplay = (location) => {
  if (!location) return '';

  const parts = [];
  if (location.street) parts.push(location.street);
  if (location.city) parts.push(location.city);
  if (location.province) parts.push(location.province);
  if (location.zipCode) parts.push(location.zipCode);
  if (location.country) parts.push(location.country);

  return parts.join(', ');
};

// Use the centralized address formatting utility
export { formatAddress } from './addressUtils';

