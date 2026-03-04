import { SupabaseBase } from './base';
import supabase from './base';

export class WalletService extends SupabaseBase {
  /**
   * Get wallet information for a caregiver
   */
  async getWallet(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID');

      // Use direct Supabase call without timeout for better reliability
      const { data, error } = await supabase
        .from('users')
        .select('id, solana_wallet_address, preferred_token, created_at, updated_at')
        .eq('id', resolvedUserId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching wallet:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get wallet:', error);
      throw error;
    }
  }

  /**
   * Save or update wallet information
   */
  async saveWallet(userId, walletData) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID');

      console.log('💾 Attempting to save wallet for user:', resolvedUserId);
      console.log('📝 Wallet data:', { address: walletData.solana_wallet_address?.substring(0, 8) + '...', token: walletData.preferred_token });

      // First, verify user exists in users table with timeout
      console.log('🔍 Checking if user exists...');
      const { data: existingUser, error: selectError } = await Promise.race([
        supabase
          .from('users')
          .select('id, email, role')
          .eq('id', resolvedUserId)
          .maybeSingle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User lookup timeout')), 3000)
        )
      ])

      if (selectError) {
        console.error('❌ Error checking if user exists:', selectError);
        throw new Error(`User lookup failed: ${selectError.message}`);
      }

      console.log('✅ User lookup complete. Existing user:', existingUser ? 'YES' : 'NO');

      if (!existingUser) {
        console.warn('⚠️ User not found in users table, creating entry...');
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: resolvedUserId,
            role: 'caregiver',
          });

        if (insertError) {
          console.error('❌ Error creating user entry:', insertError);
          throw new Error(`Failed to create user entry: ${insertError.message}`);
        }
        console.log('✅ User entry created successfully');
      }

      // Use direct Supabase call - UPDATE without select to avoid hanging
      console.log('⏳ Updating wallet in database...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          solana_wallet_address: walletData.solana_wallet_address,
          preferred_token: walletData.preferred_token,
        })
        .eq('id', resolvedUserId);

      if (updateError) {
        console.error('❌ Error saving wallet:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
        });
        throw new Error(updateError.message || 'Failed to save wallet');
      }

      console.log('✅ Wallet update successful');

      // Don't fetch verification data - just return success
      console.log('✅ Wallet saved successfully:', {
        userId: resolvedUserId,
        address: walletData.solana_wallet_address?.substring(0, 8) + '...',
        token: walletData.preferred_token,
      });

      return {
        id: resolvedUserId,
        solana_wallet_address: walletData.solana_wallet_address,
        preferred_token: walletData.preferred_token,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to save wallet:', error.message);
      throw error;
    }
  }

  /**
   * Verify wallet address (placeholder for future implementation)
   */
  async verifyWallet(userId, walletAddress) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID');

      // Use direct Supabase call without timeout for better reliability
      const { error } = await supabase
        .from('users')
        .update({
          solana_wallet_address: walletAddress,
          wallet_verified: true,
        })
        .eq('id', resolvedUserId);

      if (error) {
        throw new Error(error.message || 'Failed to verify wallet');
      }

      return { id: resolvedUserId, solana_wallet_address: walletAddress, wallet_verified: true };
    } catch (error) {
      console.error('Failed to verify wallet:', error);
      throw error;
    }
  }

  /**
   * Delete wallet information
   */
  async deleteWallet(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID');

      // Use direct Supabase call without timeout for better reliability
      const { error } = await supabase
        .from('users')
        .update({
          solana_wallet_address: null,
          preferred_token: null,
        })
        .eq('id', resolvedUserId);

      if (error) {
        throw new Error(error.message || 'Failed to delete wallet');
      }

      return true;
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw error;
    }
  }
}

export default new WalletService();
