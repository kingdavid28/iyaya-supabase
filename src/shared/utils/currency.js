import { CURRENCY } from '../../config/constants';

/**
 * Format amount as Philippine Peso currency
 * @param {number} amount - The amount to format
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showSymbol = true) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? `${CURRENCY.SYMBOL}0.00` : '0.00';
  }

  const formattedAmount = Number(amount).toFixed(CURRENCY.DECIMAL_PLACES);
  
  // Add thousand separators
  const parts = formattedAmount.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const formatted = parts.join('.');
  
  return showSymbol ? `${CURRENCY.SYMBOL}${formatted}` : formatted;
};

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string to parse
 * @returns {number} Parsed amount
 */
export const parseCurrency = (currencyString) => {
  if (!currencyString) return 0;
  
  // Remove currency symbol and commas
  const cleaned = currencyString
    .replace(CURRENCY.SYMBOL, '')
    .replace(/,/g, '')
    .trim();
    
  return parseFloat(cleaned) || 0;
};

/**
 * Validate currency amount
 * @param {number} amount - Amount to validate
 * @param {number} min - Minimum allowed amount
 * @param {number} max - Maximum allowed amount
 * @returns {object} Validation result
 */
export const validateCurrencyAmount = (amount, min = 0, max = Infinity) => {
  const numAmount = Number(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Please enter a valid amount' };
  }
  
  if (numAmount < min) {
    return { valid: false, error: `Amount must be at least ${formatCurrency(min)}` };
  }
  
  if (numAmount > max) {
    return { valid: false, error: `Amount cannot exceed ${formatCurrency(max)}` };
  }
  
  return { valid: true };
};
