import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { CheckCircle, Upload, XCircle, AlertCircle, Clock, X } from 'lucide-react-native';
import { ModalWrapper } from '../../../shared/ui';
import RatingSystem from '../../../components/ui/feedback/RatingSystem';
import ratingService from '../../../services/ratingService';
import { calculateDeposit, calculateRemainingPayment } from '../../../utils/paymentUtils';
import {
  selectPaymentProofImage,
  submitPaymentProof,
  PaymentProofError
} from '../../../utils/paymentProofHelpers';

const PaymentModal = ({ 
  visible, 
  onClose, 
  bookingId, 
  amount, 
  caregiverName, 
  bookingDate,
  paymentType = 'deposit',
  onPaymentSuccess 
}) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('pending');
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [showRating, setShowRating] = useState(false);
  const [canRate, setCanRate] = useState(false);

  // Safe formatting for payment data
  const formatPaymentData = () => {
    if (!amount || !caregiverName || !bookingDate) {
      return null;
    }
    
    try {
      const paymentAmount = paymentType === 'deposit' 
        ? calculateDeposit(amount)
        : paymentType === 'final_payment'
          ? calculateRemainingPayment(amount)
          : amount;
          
      return {
        amount: paymentAmount.toFixed(2),
        totalAmount: amount.toFixed(2),
        caregiverName: caregiverName,
        bookingDate: bookingDate,
        paymentType: paymentType
      };
    } catch (error) {
      console.error('Error formatting payment data:', error);
      return null;
    }
  };

  const pickImage = async () => {
    try {
      const result = await selectPaymentProofImage();

      if (!result) {
        return;
      }

      setImage(result.uri);
      setImageBase64(result.base64 || null);
      setMimeType(result.mimeType);
    } catch (error) {
      const message = error instanceof PaymentProofError
        ? error.message
        : 'Failed to pick image. Please try again.';

      console.error('Error picking image:', error);
      Alert.alert('Error', message);
    }
  };

  const uploadImage = async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select a payment screenshot first.');
      return;
    }
    if (!imageBase64) {
      Alert.alert('Image Error', 'Could not read image data. Please reselect the image.');
      return;
    }

    setUploading(true);
    setBookingStatus('uploading');

    try {
      // Upload payment proof with base64 image and mime type
      const res = await submitPaymentProof(bookingId, imageBase64, mimeType);

      setBookingStatus('pending_verification');

      // Check if user can rate after payment (if rating service exists)
      try {
        if (ratingService && ratingService.canRate) {
          const ratingEligible = await ratingService.canRate(bookingId);
          setCanRate(ratingEligible);
        }
      } catch (ratingError) {
        console.log('Rating service not available:', ratingError.message);
      }
      
      Alert.alert(
        'Payment Submitted', 
        `Your ${paymentType === 'deposit' ? 'deposit' : 'final payment'} proof has been submitted. We will verify it shortly.`
      );
      
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
      
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      setBookingStatus('error');

      const errorMessage = error instanceof PaymentProofError
        ? error.message
        : error.response?.data?.message || 
          error.message || 
          'Failed to upload payment proof. Please try again.';

      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const renderStatusIcon = () => {
    switch (bookingStatus) {
      case 'verified':
        return <CheckCircle size={48} color="#10B981" style={styles.statusIcon} />;
      case 'rejected':
        return <XCircle size={48} color="#EF4444" style={styles.statusIcon} />;
      case 'pending_verification':
        return <Clock size={48} color="#F59E0B" style={styles.statusIcon} />;
      case 'error':
        return <X size={48} color="#EF4444" style={styles.statusIcon} />;
      case 'uploading':
        return <ActivityIndicator size="large" color="#3B82F6" style={styles.statusIcon} />;
      default:
        return <AlertCircle size={48} color="#F59E0B" style={styles.statusIcon} />;
    }
  };

  const renderStatusText = () => {
    switch (bookingStatus) {
      case 'verified':
        return 'Payment Verified!';
      case 'rejected':
        return 'Payment Rejected';
      case 'pending_verification':
        return 'Payment Under Review';
      case 'error':
        return 'Upload failed. Please try again.';
      case 'uploading':
        return 'Uploading your payment...';
      default:
        return 'Upload payment proof';
    }
  };

  // Get formatted payment data
  const formattedData = formatPaymentData();

  // Don't render modal if required data is missing
  if (!formattedData) {
    return null;
  }

  return (
    <ModalWrapper
      visible={visible}
      onClose={onClose}
      animationType="slide"
      style={styles.modalContent}
    >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Confirmation</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalBody}>
            <View style={styles.paymentDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {formattedData.paymentType === 'deposit' ? 'Deposit Amount:' : 
                   formattedData.paymentType === 'final_payment' ? 'Final Payment:' : 'Amount:'}
                </Text>
                <Text style={styles.detailValue}>₱{formattedData.amount}</Text>
              </View>
              {formattedData.paymentType !== 'full' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Total Booking Cost:</Text>
                  <Text style={styles.detailValue}>₱{formattedData.totalAmount}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Caregiver:</Text>
                <Text style={styles.detailValue}>{formattedData.caregiverName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booking Date:</Text>
                <Text style={styles.detailValue}>{formattedData.bookingDate}</Text>
              </View>
            </View>

            <View style={styles.uploadContainer}>
              {renderStatusIcon()}
              <Text style={styles.uploadStatusText}>{renderStatusText()}</Text>
              
              {!uploading && bookingStatus === 'pending' && (
                <>
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    <Upload size={20} color="#FFFFFF" style={styles.uploadIcon} />
                    <Text style={styles.uploadButtonText}>
                      {image ? 'Upload Proof' : 'Select Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  
                  {image && (
                    <Image 
                      source={{ uri: image }} 
                      style={styles.imagePreview} 
                      resizeMode="contain"
                    />
                  )}
                </>
              )}
            </View>

            {image && !uploading && bookingStatus === 'pending' && (
              <TouchableOpacity 
                style={[styles.uploadButton, styles.submitButton]}
                onPress={uploadImage}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Submit Payment'}
                </Text>
              </TouchableOpacity>
            )}

            {bookingStatus === 'pending_verification' && (
              <View style={styles.statusInfo}>
                <Text style={styles.statusInfoText}>
                  Payment submitted for verification. You'll be notified when verified.
                </Text>
                {canRate && (
                  <TouchableOpacity 
                    style={styles.rateButton}
                    onPress={() => setShowRating(true)}
                  >
                    <Text style={styles.rateButtonText}>Rate Caregiver</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {showRating && (
              <RatingSystem
                onSubmit={async (rating) => {
                  await ratingService.rateCaregiver(caregiverName, bookingId, rating.rating, rating.review);
                  setShowRating(false);
                }}
              />
            )}
          </View>
    </ModalWrapper>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  paymentDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  uploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    marginBottom: 12,
  },
  uploadStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
  submitButton: {
    backgroundColor: '#10B981',
    marginTop: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadIcon: {
    marginRight: 8,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
  },
  statusInfoText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
  },
  rateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'center',
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PaymentModal;
