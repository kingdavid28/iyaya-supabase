import { SupabaseBase, supabase } from './base'
import { userService } from './userService'

const PROFILE_BUCKET = 'profile-images'
const PAYMENT_PROOF_BUCKET = 'payment-proofs'
const DOCUMENTS_BUCKET = 'verification-documents'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export class StorageService extends SupabaseBase {
  async uploadProfileImage(userId, imageData) {
    try {
      this._validateId(userId, 'User ID')

      if (!imageData) {
        throw new Error('Image data is required')
      }

      let fileData

      let contentType = 'image/jpeg'

      if (imageData.uri) {
        const response = await fetch(imageData.uri)
        fileData = await response.blob()
        contentType = response.headers.get('content-type') || 'image/jpeg'
      } else if (typeof imageData === 'string') {
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '')
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        fileData = bytes
      } else {
        throw new Error('Invalid image data format')
      }

      const fileName = `profile-${userId}-${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from(PROFILE_BUCKET)
        .upload(fileName, fileData, {
          contentType,
          upsert: true
        })

      if (error) throw error

      const storagePath = data?.path || fileName

      const { data: signedData, error: signedError } = await supabase.storage
        .from(PROFILE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

      let signedUrl = signedData?.signedUrl

      if (signedError || !signedUrl) {
        console.warn('Falling back to public profile image URL:', signedError)
        const { data: publicData } = supabase.storage
          .from(PROFILE_BUCKET)
          .getPublicUrl(storagePath)
        signedUrl = publicData?.publicUrl
      }

      if (!signedUrl) {
        throw new Error('Failed to generate profile image URL')
      }

      await userService.updateProfile(userId, { profile_image: signedUrl })

      return { url: signedUrl, path: storagePath }
    } catch (error) {
      return this._handleError('uploadProfileImage', error)
    }
  }

  _sanitizeFileName(name, fallback = 'document') {
    const trimmed = String(name || '').trim()
    if (!trimmed) {
      return fallback
    }
    return trimmed.replace(/[^a-z0-9_.-]+/gi, '_')
  }

  async uploadDocument({ uri, fileName, folder = 'general', mimeType = 'application/octet-stream', signedUrlTTL = SIGNED_URL_TTL_SECONDS }) {
    try {
      if (!uri) {
        throw new Error('File URI is required for document upload')
      }

      const response = await fetch(uri)
      const blob = await response.blob()
      const contentType = mimeType || blob.type || 'application/octet-stream'

      const safeFolder = this._sanitizeFileName(folder, 'general')
      const safeName = this._sanitizeFileName(fileName, `document-${Date.now()}`)
      const storagePath = `${safeFolder}/${Date.now()}-${safeName}`

      const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(storagePath, blob, {
          contentType,
          upsert: true
        })

      if (error) throw error

      const finalPath = data?.path || storagePath

      const { data: signedData, error: signedError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(finalPath, signedUrlTTL)

      let signedUrl = signedData?.signedUrl

      if (signedError || !signedUrl) {
        console.warn('Falling back to public document URL:', signedError)
        const { data: publicData } = supabase.storage
          .from(DOCUMENTS_BUCKET)
          .getPublicUrl(finalPath)
        signedUrl = publicData?.publicUrl
      }

      if (!signedUrl) {
        throw new Error('Failed to generate document URL')
      }

      return {
        url: signedUrl,
        path: finalPath,
        mimeType: contentType
      }
    } catch (error) {
      return this._handleError('uploadDocument', error)
    }
  }

  async uploadPaymentProofImage(bookingId, { base64, mimeType = 'image/jpeg', paymentType = 'deposit' }) {
    try {
      this._validateId(bookingId, 'Booking ID')

      if (!base64) {
        throw new Error('Image data is required')
      }

      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '')

      // Convert base64 to binary
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileName = `payment-proofs/${bookingId}/${paymentType}-${timestamp}.jpg`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .upload(fileName, bytes, {
          contentType: mimeType,
          upsert: false
        })

      if (error) throw error

      const storagePath = data?.path || fileName

      // Get signed URL for the uploaded image
      const { data: signedData, error: signedError } = await supabase.storage
        .from(PAYMENT_PROOF_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

      if (signedError) {
        console.warn('Failed to create signed URL, using public URL:', signedError)
        const { data: { publicUrl } } = supabase.storage
          .from(PAYMENT_PROOF_BUCKET)
          .getPublicUrl(storagePath)

        return {
          url: publicUrl,
          path: storagePath,
          mimeType
        }
      }

      return {
        url: signedData.signedUrl,
        path: storagePath,
        mimeType
      }
    } catch (error) {
      return this._handleError('uploadPaymentProofImage', error)
    }
  }

  async getPaymentProofUrl(fileName) {
    try {
      this._validateRequiredFields({ fileName }, ['fileName'], 'getPaymentProofUrl')

      // Try to get signed URL first (more reliable)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(fileName, SIGNED_URL_TTL_SECONDS)

      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl
      }

      // Fallback to public URL if signed URL fails
      console.warn('Signed URL failed, using public URL:', signedError)
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error getting payment proof URL:', error)
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

      return publicUrl
    }
  }
}

export const storageService = new StorageService()