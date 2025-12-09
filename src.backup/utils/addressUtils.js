/**
 * Utility function to format address/location objects consistently
 * @param {Object|string} locationData - The location/address data
 * @returns {string} - Formatted address string
 */
export const formatAddress = (locationData) => {
  try {
    // If location is a string, return it directly
    if (typeof locationData === 'string') return locationData;
    
    // Handle location/address as object
    const locationObj = locationData || {};
    
    // Try to build a readable address from common location object properties
    if (locationObj.formattedAddress) return locationObj.formattedAddress;
    if (locationObj.street && locationObj.city) {
      return `${locationObj.street}, ${locationObj.city}`;
    }
    if (locationObj.street) return locationObj.street;
    if (locationObj.city) return locationObj.city;
    
    // If we have coordinates, return them as a fallback
    if (locationObj.coordinates) {
      const [lat, lng] = locationObj.coordinates;
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
    
    // Return default message for empty/null locations without logging
    return 'Location not specified';
  } catch (e) {
    console.error('Error processing location:', e);
    return 'Location not available';
  }
};
