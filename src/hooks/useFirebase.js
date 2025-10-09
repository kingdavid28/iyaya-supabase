// hooks/useFirebase.js
import { useEffect, useState } from 'react';
import { initializeFirebase } from '../config/supabase';

export const useFirebase = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('🔄 Initializing Firebase in hook...');
        await initializeFirebase();
        setIsReady(true);
        console.log('✅ Firebase ready in hook');
      } catch (err) {
        console.error('❌ Firebase hook initialization failed:', err);
        setError(err);
      }
    };

    init();
  }, []);

  return { isReady, error };
};
