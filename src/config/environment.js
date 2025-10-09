// Environment configuration for production security
import Constants from 'expo-constants';

const ENV = {
  development: {
    API_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co',
    SOCKET_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co',
    ANALYTICS_ENABLED: false,
    DEBUG_MODE: true,
  },
  production: {
    API_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co',
    SOCKET_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://myiyrmiiywwgismcpith.supabase.co',
    ANALYTICS_ENABLED: true,
    DEBUG_MODE: false,
  }
};

const getEnvVars = () => {
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  
  if (__DEV__) {
    return ENV.development;
  } else if (releaseChannel === 'production') {
    return ENV.production;
  } else {
    return ENV.development;
  }
};

export default getEnvVars();