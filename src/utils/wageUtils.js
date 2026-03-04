/**
 * Minimum wage rates in PHP for different regions in the Philippines
 * As of 2024, using National Capital Region (NCR) rates as default
 * Source: https://nwpc.dole.gov.ph/
 */
const MINIMUM_WAGE_RATES = {
  // National Capital Region (NCR)
  'metro manila': 610,  // Daily rate
  'ncr': 610,
  // Add other regions as needed
};

/**
 * Clamps the given hourly rate to the minimum wage based on location
 * @param {number} rate - The hourly rate to check
 * @param {string} location - The location to check minimum wage for
 * @returns {number} The clamped hourly rate
 */
export const clampToMinimumWage = (rate, location = '') => {
  if (typeof rate !== 'number' || isNaN(rate)) return 0;
  
  // Default to NCR minimum wage if location is not specified or not found
  const locationKey = (location || '').toLowerCase();
  const dailyRate = MINIMUM_WAGE_RATES[locationKey] || MINIMUM_WAGE_RATES['ncr'];
  
  // Convert daily rate to hourly (assuming 8-hour work day)
  const hourlyMinimum = dailyRate / 8;
  
  // Return the higher of the two rates
  return Math.max(rate, hourlyMinimum);
};

/**
 * Gets the minimum hourly wage for a location
 * @param {string} location - The location to check
 * @returns {number} The minimum hourly wage
 */
export const getMinimumHourlyWage = (location = '') => {
  const locationKey = (location || '').toLowerCase();
  const dailyRate = MINIMUM_WAGE_RATES[locationKey] || MINIMUM_WAGE_RATES['ncr'];
  return dailyRate / 8; // Convert daily to hourly
};
