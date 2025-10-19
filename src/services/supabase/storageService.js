import { SupabaseBase, supabase } from './base'

const PROFILE_BUCKET = 'profile-images'
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
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
          transform: {
            width: 256,
            quality: 70,
          },
        })

      if (signedError) throw signedError

      const signedUrl = signedData?.signedUrl

      if (!signedUrl) {
        throw new Error('Failed to generate signed URL for profile image')
      }

      const { userService } = await import('./userService')
      await userService.updateProfile(userId, { profile_image: signedUrl })

      return { url: signedUrl, path: storagePath }
    } catch (error) {
      return this._handleError('uploadProfileImage', error)
    }
  }

  async uploadPaymentProofImage(bookingId, imageData) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      if (!imageData) {
        throw new Error('Image data is required')
      }

      let fileData
      let contentType = 'image/jpeg'
      let base64Payload = null

      if (typeof imageData === 'object' && imageData !== null) {
        if (imageData.uri) {
          const response = await fetch(imageData.uri)
          fileData = await response.blob()
          contentType = response.headers.get('content-type') || imageData.mimeType || 'image/jpeg'
        } else if (imageData.base64) {
          base64Payload = imageData.base64
          contentType = imageData.mimeType || 'image/jpeg'
        } else if (typeof imageData === 'string') {
          base64Payload = imageData
        }
      }

      if (!fileData && base64Payload) {
        const base64Data = base64Payload.replace(/^data:image\/[a-z]+;base64,/, '')
        const binaryString = atob(base64Data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        fileData = bytes
      }

      if (!fileData) {
        throw new Error('Invalid image data format')
      }

      const fileName = `payment-${bookingId}-${Date.now()}.jpg`
      
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, fileData, {
          contentType
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

      return {
        url: publicUrl,
        path: data?.path || fileName,
        mimeType: contentType
      }
    } catch (error) {
      return this._handleError('uploadPaymentProofImage', error)
    }
  }
}

export const storageService = new StorageService()