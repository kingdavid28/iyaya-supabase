/**
 * Filter utilities for caregiver search functionality
 * Implements best practices for filtering and search
 */

export const ANY_CERTIFICATION_FILTER = '__ANY_CERTIFICATION__';

/**
 * Apply filters to caregiver list
 * @param {Array} caregivers - List of caregivers to filter
 * @param {Object} filters - Filter criteria
 * @param {string} searchQuery - Text search query
 * @returns {Array} Filtered caregiver list
 */
export const applyFilters = (caregivers, filters = {}, searchQuery = '') => {
  if (!Array.isArray(caregivers)) return [];

  const normalizedFilters = {
    availability: filters.availability || {},
    location: filters.location || {},
    rate: filters.rate || {},
    experience: filters.experience || {},
    certifications: filters.certifications || [],
    rating: filters.rating ?? 0,
  };

  let filtered = [...caregivers];

  // Text search filter (name, location, specialties, bio)
  if (searchQuery?.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((caregiver) => {
      const nameMatch = caregiver.name?.toLowerCase().includes(query);
      const locationMatch = caregiver.location?.toLowerCase().includes(query) || caregiver.address?.toLowerCase().includes(query);
      const bioMatch = caregiver.bio?.toLowerCase().includes(query);
      const specialties = Array.isArray(caregiver.specialties)
        ? caregiver.specialties
        : Array.isArray(caregiver.skills)
          ? caregiver.skills
          : [];
      const specialtyMatch = specialties.some((specialty) =>
        specialty?.toLowerCase().includes(query)
      );

      return Boolean(nameMatch || locationMatch || bioMatch || specialtyMatch);
    });
  }

  // Availability filter
  if (normalizedFilters.availability.availableNow) {
    filtered = filtered.filter((caregiver) => {
      const availabilitySources = [
        caregiver.availableNow,
        caregiver.availability?.availableNow,
        caregiver.availability?.available_now,
        caregiver.metadata?.availability?.availableNow,
      ];
      return availabilitySources.some((value) => value === true);
    });
  }

  // Days availability filter
  if (Array.isArray(normalizedFilters.availability.days) && normalizedFilters.availability.days.length > 0) {
    filtered = filtered.filter((caregiver) => {
      const caregiverDays = caregiver.availableDays
        || caregiver.availability?.days
        || caregiver.availability?.availableDays
        || caregiver.metadata?.availability?.days
        || [];
      return normalizedFilters.availability.days.some((day) => caregiverDays?.includes?.(day));
    });
  }

  // Distance filter (requires coordinates)
  if (normalizedFilters.location.distance && normalizedFilters.location.userLocation) {
    filtered = filtered.filter((caregiver) => {
      const distance = calculateDistance(
        normalizedFilters.location.userLocation,
        caregiver.locationCoordinates || caregiver.location
      );
      return Number.isFinite(distance) && distance <= normalizedFilters.location.distance;
    });
  }

  // Rate range filter
  if (normalizedFilters.rate.min !== undefined || normalizedFilters.rate.max !== undefined) {
    filtered = filtered.filter((caregiver) => {
      const rateSources = [
        caregiver.hourlyRate,
        caregiver.hourly_rate,
        caregiver.rate,
        caregiver.pricing?.hourlyRate,
      ];
      const rate = rateSources.map((value) => parseFloat(value)).find(Number.isFinite) || 0;
      const minRate = normalizedFilters.rate.min ?? 0;
      const maxRate = normalizedFilters.rate.max ?? Infinity;
      return rate >= minRate && rate <= maxRate;
    });
  }

  // Experience filter
  if (normalizedFilters.experience.min !== undefined) {
    filtered = filtered.filter((caregiver) => {
      const experienceSources = [
        caregiver.experience,
        caregiver.experienceYears,
        caregiver.experience_years,
        caregiver.profile?.experience,
        caregiver.metadata?.experience,
      ];

      const experienceValue = experienceSources
        .map((value) => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const match = value.match(/(\d+(?:\.\d+)?)/);
            return match ? Number(match[1]) : NaN;
          }
          if (typeof value === 'object' && value) {
            return Number(value.years ?? value.total ?? value.minimum ?? value.min ?? value.value);
          }
          return NaN;
        })
        .find(Number.isFinite) || 0;

      return experienceValue >= (normalizedFilters.experience.min ?? 0);
    });
  }

  // Rating filter
  if (normalizedFilters.rating !== undefined && normalizedFilters.rating > 0) {
    filtered = filtered.filter((caregiver) => {
      const ratingSources = [
        caregiver.rating,
        caregiver.average_rating,
        caregiver.reviews?.average,
        caregiver.metadata?.reviews?.average,
      ];
      const rating = ratingSources.map((value) => parseFloat(value)).find(Number.isFinite) || 0;
      return rating >= normalizedFilters.rating;
    });
  }

  // Certifications filter
  if (Array.isArray(normalizedFilters.certifications) && normalizedFilters.certifications.length > 0) {
    const requiresAnyCertification = normalizedFilters.certifications.includes(ANY_CERTIFICATION_FILTER);
    const requiredSpecificCerts = normalizedFilters.certifications
      .filter((cert) => cert !== ANY_CERTIFICATION_FILTER)
      .map((cert) => cert?.toString().toLowerCase());

    filtered = filtered.filter((caregiver) => {
      const certSources = [
        caregiver.certifications,
        caregiver.verification?.certifications,
        caregiver.metadata?.certifications,
      ];
      const caregiverCerts = certSources.find(Array.isArray) || [];
      const normalizedCaregiverCerts = caregiverCerts.map((cert) => cert?.toString().toLowerCase());

      if (requiresAnyCertification && normalizedCaregiverCerts.length === 0) {
        return false;
      }

      if (requiredSpecificCerts.length === 0) {
        return true;
      }

      return requiredSpecificCerts.some((required) => normalizedCaregiverCerts.includes(required));
    });
  }

  return filtered;
};

/**
 * Count active filters
 * @param {Object} filters - Filter object
 * @returns {number} Number of active filters
 */
export const countActiveFilters = (filters = {}) => {
  const defaults = getDefaultFilters();

  const availability = filters.availability || {};
  const location = filters.location || {};
  const rate = filters.rate || {};
  const experience = filters.experience || {};
  const certifications = filters.certifications || [];
  const rating = filters.rating ?? defaults.rating;

  let count = 0;

  if (availability.availableNow) count++;
  if (Array.isArray(availability.days) && availability.days.length > 0) count++;

  const distance = Number(location.distance);
  const userLocation = location.userLocation;
  const hasValidUserLocation = userLocation
    && Number.isFinite(Number(userLocation.lat ?? userLocation.latitude))
    && Number.isFinite(Number(userLocation.lng ?? userLocation.longitude));
  if (Number.isFinite(distance) && distance > 0 && hasValidUserLocation) count++;

  const minRate = rate.min ?? defaults.rate.min;
  const maxRate = rate.max ?? defaults.rate.max;
  if (minRate > defaults.rate.min || maxRate < defaults.rate.max) count++;

  const experienceMin = experience.min ?? defaults.experience.min;
  if (experienceMin > defaults.experience.min) count++;

  if (Array.isArray(certifications) && certifications.length > 0) count++;

  // Only treat rating as an "active" filter when it is stricter than the default threshold
  if ((rating ?? defaults.rating) > defaults.rating) count++;

  return count;
};

/**
 * Reset filters to default state
 * @returns {Object} Default filter object
 */
export const getDefaultFilters = () => ({
  availability: { availableNow: false, days: [] },
  location: { distance: 25, userLocation: null },
  rate: { min: 50, max: 500 },
  experience: { min: 1 },
  certifications: [],
  rating: 4.0,
});

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in miles
 */
const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2) return Infinity;

  const R = 3959; // Earth's radius in miles
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Sort caregivers by various criteria
 * @param {Array} caregivers - List of caregivers
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted caregiver list
 */
export const sortCaregivers = (caregivers, sortBy = 'rating') => {
  if (!Array.isArray(caregivers)) return [];

  const sorted = [...caregivers];

  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'price_low':
      return sorted.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    case 'price_high':
      return sorted.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
    case 'experience':
      return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    case 'distance':
      return sorted.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    default:
      return sorted;
  }
};