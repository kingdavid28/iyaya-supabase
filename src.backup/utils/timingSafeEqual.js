import { Platform } from 'react-native';

// Timing-safe string comparison to prevent timing attacks
export const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

// Secure token comparison
export const compareTokens = (token1, token2) => {
  if (!token1 || !token2) return false;
  return timingSafeEqual(token1, token2);
};

export default timingSafeEqual;