import { SupabaseBase, supabase } from './base'

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
        .from('profile-images')
        .upload(fileName, fileData, {
          contentType,
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName)

      const { userService } = await import('./userService')
      await userService.updateProfile(userId, { profile_image: publicUrl })

      return { url: publicUrl }
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

      const { bookingService } = await import('./bookingService')
      await bookingService.uploadPaymentProof(bookingId, publicUrl)

      return publicUrl
    } catch (error) {
      return this._handleError('uploadPaymentProofImage', error)
    }
  }
}

export const storageService = new StorageService()