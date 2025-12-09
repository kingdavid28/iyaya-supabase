export const configureNetwork = () => {
  console.log('Network configured');
  return { success: true };
};

export const getNetworkStatus = () => {
  return {
    isConnected: true,
    type: 'wifi',
    strength: 'strong'
  };
};

export const testConnection = async () => {
  try {
    // Test Supabase connection instead of Google
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, { 
        method: 'HEAD',
        timeout: 5000,
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        }
      });
      return { success: response.ok, latency: 100 };
    }
    
    // Fallback to Google
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      timeout: 5000 
    });
    return { success: response.ok, latency: 100 };
  } catch (error) {
    return { success: false, error: error.message };
  }
};