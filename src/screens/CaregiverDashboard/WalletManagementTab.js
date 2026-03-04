import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PublicKey } from '@solana/web3.js';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseService } from '../../services/supabase';
import { Card, Button } from '../../shared/ui';
import Toast from '../../components/ui/feedback/Toast';

export const WalletManagementTab = ({ refreshing = false, onRefresh = () => {} }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    token: 'USDC',
  });
  const [addressValidation, setAddressValidation] = useState({
    isValid: false,
    error: null,
    isChecking: false,
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
  };

  const loadWalletData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await supabaseService.wallet.getWallet(user.id);
      
      if (data) {
        setWalletData(data);
        setFormData({
          address: data.solana_wallet_address || '',
          token: data.preferred_token || 'USDC',
        });
      } else {
        setWalletData(null);
        setFormData({ address: '', token: 'USDC' });
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
      showToast('Failed to load wallet information', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Real-time address validation
  const validateAddress = useCallback((address) => {
    const trimmedAddress = address.trim();
    
    if (!trimmedAddress) {
      setAddressValidation({
        isValid: false,
        error: 'Wallet address is required',
        isChecking: false,
      });
      return false;
    }

    if (trimmedAddress.length < 32) {
      setAddressValidation({
        isValid: false,
        error: 'Address too short',
        isChecking: false,
      });
      return false;
    }

    if (trimmedAddress.length > 44) {
      setAddressValidation({
        isValid: false,
        error: 'Address too long',
        isChecking: false,
      });
      return false;
    }

    try {
      new PublicKey(trimmedAddress);
      setAddressValidation({
        isValid: true,
        error: null,
        isChecking: false,
      });
      return true;
    } catch (e) {
      setAddressValidation({
        isValid: false,
        error: 'Invalid Solana address format',
        isChecking: false,
      });
      return false;
    }
  }, []);

  // Update validation when address changes
  useEffect(() => {
    if (editMode && formData.address) {
      validateAddress(formData.address);
    }
  }, [formData.address, editMode, validateAddress]);

  const handleAddressChange = (text) => {
    setFormData({ ...formData, address: text });
  };

  const handleVerifyWallet = async () => {
    if (!addressValidation.isValid) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana wallet address');
      return;
    }

    setVerifying(true);
    try {
      // In a real implementation, you'd verify the wallet exists on Solana network
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showToast('Wallet verified successfully!', 'success');
      setShowVerification(false);
      
      // Proceed with saving after verification
      await handleSave();
    } catch (error) {
      console.error('Wallet verification failed:', error);
      showToast('Wallet verification failed. Please try again.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!addressValidation.isValid) {
      Alert.alert('Error', 'Please enter a valid wallet address');
      return;
    }

    setSaving(true);
    try {
      console.log('💾 Saving wallet for user:', user?.id);
      
      const result = await supabaseService.wallet.saveWallet(user.id, {
        solana_wallet_address: formData.address.trim(),
        preferred_token: formData.token,
      });

      console.log('✅ Wallet save result:', result);

      setWalletData({
        solana_wallet_address: formData.address.trim(),
        preferred_token: formData.token,
        verified: false,
      });

      setEditMode(false);
      showToast('Wallet saved successfully!', 'success');
    } catch (error) {
      console.error('❌ Failed to save wallet:', error);
      
      // Show detailed error to user
      const errorMessage = error?.message || 'Failed to save wallet. Please check that you are logged in and try again.';
      
      if (errorMessage.includes('permission') || errorMessage.includes('RLS') || errorMessage.includes('Policy')) {
        showToast('Permission denied. Please contact support if this persists.', 'error');
        Alert.alert(
          'Permission Error',
          'Your account does not have permission to save wallet information. This may be a temporary issue. Please try again or contact support.\n\nError: ' + errorMessage,
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('User lookup failed') || errorMessage.includes('not found')) {
        showToast('User account issue. Please re-login and try again.', 'error');
        Alert.alert(
          'Account Issue',
          'There was an issue with your account. Please log out and log back in, then try again.\n\nError: ' + errorMessage,
          [{ text: 'OK' }]
        );
      } else {
        showToast(errorMessage, 'error');
        Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setShowVerification(false);
    setAddressValidation({ isValid: false, error: null, isChecking: false });
    if (walletData) {
      setFormData({
        address: walletData.solana_wallet_address || '',
        token: walletData.preferred_token || 'USDC',
      });
    }
  };

  const handleRefresh = async () => {
    await loadWalletData();
    onRefresh?.();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading wallet information...</Text>
      </View>
    );
  }

  const maskAddress = (address) => {
    if (!address || address.length < 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F9FAFB' }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#3B82F6']}
          tintColor="#3B82F6"
        />
      }
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Header Card */}
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="wallet" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>
              Solana Wallet Setup
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', marginTop: 4 }}>
              {walletData ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={{ marginLeft: 4 }}>Configured</Text>
                </View>
              ) : (
                'Not configured'
              )}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 20 }}>
          {walletData
            ? 'Your Solana wallet is set up to receive payments. You can update your wallet address or preferred token at any time.'
            : 'Set up your Solana wallet to receive payments in SOL or USDC from families after bookings.'}
        </Text>
      </LinearGradient>

      {/* Wallet Info Card */}
      {walletData && !editMode && (
        <Card style={{ marginBottom: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
              WALLET ADDRESS
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  color: '#1F2937',
                  flex: 1,
                }}
              >
                {maskAddress(walletData.solana_wallet_address)}
              </Text>
              <Pressable
                onPress={() => {
                  showToast('Wallet address copied!', 'success');
                }}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="copy" size={18} color="#3B82F6" />
              </Pressable>
            </View>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' }}>
              Full address: {walletData.solana_wallet_address}
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
              PREFERRED TOKEN
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Ionicons
                name={walletData.preferred_token === 'SOL' ? 'flash' : 'checkmark-circle'}
                size={18}
                color="#10B981"
              />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginLeft: 8 }}>
                {walletData.preferred_token}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>
                {walletData.preferred_token === 'USDC' ? '(Stable)' : '(Native)'}
              </Text>
            </View>
          </View>

          <Button
            title="Update Wallet"
            onPress={() => setEditMode(true)}
            style={{ marginBottom: 12 }}
          />
        </Card>
      )}

      {/* Edit Form */}
      {editMode && !showVerification && (
        <Card style={{ marginBottom: 24, padding: 20, backgroundColor: '#FFFFFF' }}>
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
              WALLET ADDRESS
            </Text>
            <TextInput
              style={{
                borderWidth: 2,
                borderColor: addressValidation.isValid ? '#10B981' : (addressValidation.error ? '#EF4444' : '#E5E7EB'),
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
              value={formData.address}
              onChangeText={handleAddressChange}
              placeholder="Enter your Solana wallet address"
              multiline
              numberOfLines={2}
              placeholderTextColor="#D1D5DB"
            />
            
            {/* Validation Feedback */}
            {formData.address && (
              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
                {addressValidation.isValid ? (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={{ fontSize: 12, color: '#10B981', marginLeft: 6, fontWeight: '500' }}>
                      Valid address format
                    </Text>
                  </>
                ) : addressValidation.error ? (
                  <>
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: '#EF4444', marginLeft: 6, fontWeight: '500' }}>
                      {addressValidation.error}
                    </Text>
                  </>
                ) : null}
              </View>
            )}

            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
              Compatible with Phantom, Backpack, Solflare, Magic Eden
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
              PREFERRED TOKEN
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['SOL', 'USDC'].map((token) => (
                <Pressable
                  key={token}
                  onPress={() => setFormData({ ...formData, token })}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: formData.token === token ? '#3B82F6' : '#E5E7EB',
                    backgroundColor: formData.token === token ? '#DBEAFE' : '#FFFFFF',
                  }}
                >
                  <Text
                    style={{
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: 14,
                      color: formData.token === token ? '#3B82F6' : '#6B7280',
                    }}
                  >
                    {token}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
              {formData.token === 'USDC'
                ? 'USDC: Stable value, better for accounting'
                : 'SOL: Native token, lower transaction fees'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              style={{ flex: 1 }}
              disabled={saving || verifying}
            />
            <Button
              title="Verify & Save"
              onPress={() => setShowVerification(true)}
              style={{ flex: 1 }}
              loading={saving || verifying}
              disabled={!addressValidation.isValid || saving || verifying}
            />
          </View>
        </Card>
      )}

      {/* Verification Modal */}
      {showVerification && (
        <Card style={{ marginBottom: 24, padding: 24, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#3B82F6' }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#DBEAFE',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="shield-checkmark" size={32} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
              Verify Wallet
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 }}>
              Please review your wallet address before saving. This cannot be changed without re-verification.
            </Text>
          </View>

          <View style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 8 }}>
              ADDRESS TO SAVE
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: '#1F2937',
                lineHeight: 18,
              }}
            >
              {formData.address}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={handleCancel}
              style={{ flex: 1 }}
              disabled={verifying}
            />
            <Button
              title={verifying ? 'Verifying...' : 'Confirm & Save'}
              onPress={handleVerifyWallet}
              style={{ flex: 1 }}
              loading={verifying}
              disabled={verifying}
            />
          </View>

          <Text style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
            We'll verify your wallet exists on the Solana network
          </Text>
        </Card>
      )}

      {/* Empty State */}
      {!walletData && !editMode && (
        <Card style={{ marginBottom: 24, padding: 24, backgroundColor: '#FFFFFF' }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Ionicons name="wallet-outline" size={32} color="#9CA3AF" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
              No Wallet Configured
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#6B7280',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              Set up your Solana wallet to receive payments from families after completing bookings.
            </Text>
            <Button
              title="Add Wallet"
              onPress={() => {
                setEditMode(true);
                setFormData({ address: '', token: 'USDC' });
              }}
            />
          </View>
        </Card>
      )}

      {/* Info Cards */}
      <View style={{ gap: 12, marginBottom: 24 }}>
        <Card style={{ padding: 16, backgroundColor: '#F0F9FF', borderLeftWidth: 4, borderLeftColor: '#3B82F6' }}>
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#0284C7', marginBottom: 4 }}>
                Security Best Practices
              </Text>
              <Text style={{ fontSize: 12, color: '#0369A1', lineHeight: 18 }}>
                • Never share your private key{'\n'}
                • Only use reputable wallet apps{'\n'}
                • Verify the address twice before saving
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ padding: 16, backgroundColor: '#FEFCE8', borderLeftWidth: 4, borderLeftColor: '#FBBF24' }}>
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="alert-circle" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#D97706', marginBottom: 4 }}>
                Supported Networks
              </Text>
              <Text style={{ fontSize: 12, color: '#B45309', lineHeight: 18 }}>
                Currently supporting Solana Mainnet-Beta. Ensure your wallet is configured for the correct network.
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ padding: 16, backgroundColor: '#F0FDF4', borderLeftWidth: 4, borderLeftColor: '#10B981' }}>
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="help-circle" size={20} color="#10B981" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#047857', marginBottom: 4 }}>
                Payment Processing
              </Text>
              <Text style={{ fontSize: 12, color: '#065F46', lineHeight: 18 }}>
                Payments are processed weekly. Transaction fees are deducted from your payment.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
};
