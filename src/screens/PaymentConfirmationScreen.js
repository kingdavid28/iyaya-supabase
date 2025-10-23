import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CheckCircle, Upload, XCircle, AlertCircle, Clock, X } from 'lucide-react-native';
import {
  selectPaymentProofImage,
  submitPaymentProof,
  PaymentProofError
} from '../utils/paymentProofHelpers';

const PaymentConfirmationScreen = () => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('pending');
  const [bookingData, setBookingData] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const navigation = useNavigation();
  const route = useRoute();
  
  const { bookingId, amount, caregiverName, bookingDate, bookingData: initialBookingData } = route.params;
  
  // Firebase realtime listener removed. Booking updates should come from backend polling or navigation refresh.
  
  // Set initial booking data if provided
  useEffect(() => {
    if (initialBookingData) {
      setBookingData(initialBookingData);
    }
  }, [initialBookingData]);

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
      const res = await submitPaymentProof(bookingId, imageBase64, mimeType);
      setBookingStatus('pending_verification');
      if (res?.booking) setBookingData(res.booking);
      Alert.alert('Payment Submitted', 'We received your payment proof. We will verify it shortly.');

    } catch (error) {
      console.error('Error uploading image:', error);
      setBookingStatus('error');
      const message = error instanceof PaymentProofError
        ? error.message
        : 'Failed to upload payment. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setUploading(false);
    }
  };

  const renderStatusIcon = () => {
    switch (bookingStatus) {
      case 'verified':
        return <CheckCircle size={64} color="#10B981" style={styles.statusIcon} />;
      case 'rejected':
        return <XCircle size={64} color="#EF4444" style={styles.statusIcon} />;
      case 'pending_verification':
        return <Clock size={64} color="#F59E0B" style={styles.statusIcon} />;
      case 'error':
        return <X size={64} color="#EF4444" style={styles.statusIcon} />;
      case 'uploading':
        return <ActivityIndicator size="large" color="#3B82F6" style={styles.statusIcon} />;
      default:
        return <AlertCircle size={64} color="#F59E0B" style={styles.statusIcon} />;
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
        return 'Please upload a screenshot of your QR code payment.';
    }
  };
  
  const renderStatusDescription = () => {
    switch (bookingStatus) {
      case 'verified':
        return 'Your payment has been verified. Your booking is now confirmed!';
      case 'rejected':
        return 'Your payment was not accepted. Please try again or contact support.';
      case 'pending_verification':
        return 'We have received your payment screenshot and our team is verifying it. You will be notified once verified.';
      case 'error':
        return 'There was an error processing your payment. Please try again or contact support if the issue persists.';
      default:
        return 'Upload a clear screenshot of your QR code payment confirmation for verification.';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Confirmation</Text>
        <Text style={styles.subtitle}>Complete your booking by uploading payment proof</Text>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount to Pay:</Text>
          <Text style={styles.detailValue}>₱{amount.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Caregiver:</Text>
          <Text style={styles.detailValue}>{caregiverName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(bookingDate).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>

      <View style={styles.uploadContainer}>
        {renderStatusIcon()}
        <Text style={styles.uploadStatusText}>{renderStatusText()}</Text>
        <Text style={styles.uploadStatusDescription}>{renderStatusDescription()}</Text>
        
        {!uploading && bookingStatus === 'pending' && (
          <>
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={pickImage}
              disabled={uploading}
            >
              <Upload size={20} color="#FFFFFF" style={styles.uploadIcon} />
              <Text style={styles.uploadButtonText}>
                {image ? 'Upload Payment Proof' : 'Select Payment Screenshot'}
              </Text>
            </TouchableOpacity>
            
            {image && (
              <TouchableOpacity 
                style={[styles.uploadButton, styles.changeButton]}
                onPress={pickImage}
                disabled={uploading}
              >
                <Text style={[styles.uploadButtonText, { color: '#3B82F6' }]}>
                  Change Screenshot
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        
        {bookingStatus === 'pending_verification' && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusInfoText}>
              We'll notify you once your payment is verified. This usually takes 1-2 business hours.
            </Text>
          </View>
        )}
        
        {bookingStatus === 'verified' && (
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: '#10B981' }]}
            onPress={() => navigation.navigate('Bookings')}
          >
            <Text style={styles.uploadButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        )}
        
        {bookingStatus === 'rejected' && (
          <TouchableOpacity 
            style={[styles.uploadButton, { backgroundColor: '#EF4444' }]}
            onPress={pickImage}
          >
            <Upload size={20} color="#FFFFFF" style={styles.uploadIcon} />
            <Text style={styles.uploadButtonText}>Upload New Payment Proof</Text>
          </TouchableOpacity>
        )}

        {image && !uploading && (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: image }} 
              style={styles.imagePreview} 
              resizeMode="contain"
            />
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={uploadImage}
              disabled={uploading}
            >
              <Text style={styles.uploadButtonText}>
                {uploading ? 'Uploading...' : 'Submit Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to Pay:</Text>
        <View style={styles.instructionStep}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>
            Open your mobile banking app or e-wallet
          </Text>
        </View>
        <View style={styles.instructionStep}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>
            Scan the QR code or enter the payment details manually
          </Text>
        </View>
        <View style={styles.instructionStep}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>
            Take a screenshot of the successful payment confirmation
          </Text>
        </View>
        <View style={styles.instructionStep}>
          <Text style={styles.instructionNumber}>4</Text>
          <Text style={styles.instructionText}>
            Upload the screenshot using the button above
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  bookingInfo: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    paddingLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  statusIcon: {
    marginBottom: 20,
  },
  uploadStatusText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 28,
  },
  uploadStatusDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadIcon: {
    marginRight: 8,
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusInfo: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  statusInfoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});

export default PaymentConfirmationScreen;
