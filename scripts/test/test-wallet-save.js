// Test wallet save directly
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://myiyrmiiywwgismcpith.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aXlybWlpeXd3Z2lzbWNwaXRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTgwODM0NiwiZXhwIjoyMDc1Mzg0MzQ2fQ.WWqfmf8hai5mVBC4iZcfjjlpNfkdd_IHk9NNju2Ehjc'
);

async function testSave() {
  try {
    const { data, error } = await supabase
      .from('app_user')
      .update({
        solana_wallet_address: '2HqULzF3DRBLRCMRHUc4nVKnVAR3ErPmok6rd13RCj3f',
        preferred_token: 'SOL'
      })
      .eq('id', '57764bb4-b282-4228-a6cd-94f2f26e542d')
      .select();
    
    console.log('Result:', { data, error });
  } catch (err) {
    console.error('Error:', err);
  }
}

testSave();