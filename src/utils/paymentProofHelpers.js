import * as ImagePicker from 'expo-image-picker';
import { supabaseService } from '../services';

export class PaymentProofError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PaymentProofError';
    this.code = code;
  }
}

export const selectPaymentProofImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new PaymentProofError(
        'IMAGE_PICKER_PERMISSION_DENIED',
        'Media library access is required to select a payment proof.'
      );
    }

    const imageMediaType = ImagePicker?.MediaType?.Images ?? ImagePicker?.MediaTypeOptions?.Images;

    if (!imageMediaType) {
      throw new PaymentProofError(
        'IMAGE_PICKER_MEDIA_TYPE_UNAVAILABLE',
        'Image selection is not supported on this device configuration.'
      );
    }

    const pickerOptions = {
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    };

    pickerOptions.mediaTypes = ImagePicker?.MediaType?.Images
      ? [imageMediaType]
      : imageMediaType;

    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled) {
      return null;
    }

    const asset = result.assets?.[0];

    if (!asset) {
      throw new PaymentProofError(
        'IMAGE_PICKER_NO_ASSET',
        'No image information was returned from the picker.'
      );
    }

    const inferredMimeType =
      asset.mimeType || (asset.uri?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

    return {
      uri: asset.uri,
      base64: asset.base64 ?? null,
      mimeType: inferredMimeType,
    };
  } catch (error) {
    if (error instanceof PaymentProofError) {
      throw error;
    }

    throw new PaymentProofError('IMAGE_PICKER_UNKNOWN_ERROR', error?.message || 'Failed to pick image');
  }
};

export const submitPaymentProof = async (
  bookingId,
  imageBase64,
  mimeType = 'image/jpeg',
  paymentType = 'deposit'
) => {
  if (!bookingId) {
    throw new PaymentProofError('BOOKING_ID_MISSING', 'Booking ID is required to upload a payment proof.');
  }

  if (!imageBase64) {
    throw new PaymentProofError('IMAGE_DATA_MISSING', 'Payment proof image data is required.');
  }

  try {
    const currentUser = typeof supabaseService._getCurrentUser === 'function'
      ? await supabaseService._getCurrentUser()
      : null;

    const uploadResult = await supabaseService.storage.uploadPaymentProofImage(bookingId, {
      base64: imageBase64,
      mimeType
    });

    const paymentProofUrl = uploadResult?.url;

    if (!paymentProofUrl) {
      throw new Error('Payment proof upload returned no URL');
    }

    const supabaseResult = await supabaseService.bookings.uploadPaymentProof(bookingId, paymentProofUrl, {
      storagePath: uploadResult?.path,
      mimeType: uploadResult?.mimeType || mimeType,
      uploadedBy: currentUser?.id,
      paymentType
    });

    return {
      url: paymentProofUrl,
      storage: uploadResult,
      booking: supabaseResult?.booking,
      paymentProof: supabaseResult?.paymentProof || null
    };
  } catch (error) {
    throw new PaymentProofError('UPLOAD_FAILED', error?.message || 'Failed to upload payment proof.');
  }
};
