// src/utils/minWage.js
const DEFAULT_MIN_WAGE = 200; // ₱200/hour safety net while location is unknown

const REGION_MIN_WAGE_RULES = [
  {
    hourly: 80, // ₱640 / 8h -> round up to 80/hr
    sources: ['cebu', 'mandaue', 'lapu-lapu', 'toledo', 'region vii', 'central visayas'],
    reference: 'DOLE Region VII Wage Order ROVII-23 (₱610/day ≈ ₱76.25/hour, rounded up).'
  },
  {
    hourly: 90,
    sources: ['ncr', 'metro manila', 'manila', 'quezon city', 'pasig', 'makati', 'taguig'],
    reference: 'DOLE NCR Wage Order NCR-24 (₱610/day).'
  },
  {
    hourly: 75,
    sources: ['davao', 'region xi', 'digos', 'samal'],
    reference: 'DOLE Region XI Wage Order RXI-22 (₱438/day).'
  }
];

const normalizeLocationString = (location) => {
  if (!location) return '';

  if (typeof location === 'string') return location.toLowerCase();

  if (typeof location === 'object') {
    try {
      const concatenated = Object.values(location)
        .filter((value) => typeof value === 'string')
        .join(' ');
      return concatenated.toLowerCase();
    } catch {
      return '';
    }
  }

  return String(location || '').toLowerCase();
};

export const getHourlyMinimumWage = (location) => {
  const normalized = normalizeLocationString(location);
  if (!normalized) return DEFAULT_MIN_WAGE;

  const matchedRule = REGION_MIN_WAGE_RULES.find((rule) =>
    rule.sources.some((keyword) => normalized.includes(keyword))
  );

  return Math.max(DEFAULT_MIN_WAGE, matchedRule?.hourly ?? DEFAULT_MIN_WAGE);
};

export const clampToMinimumWage = (proposedRate, location) => {
  const minRequired = getHourlyMinimumWage(location);
  const parsedRate = Number(proposedRate);

  if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
    return minRequired;
  }
  return Math.max(parsedRate, minRequired);
};