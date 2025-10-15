import { supabase } from '../../config/supabase'

export class SupabaseBase {
  _withTimeout(promise, timeoutMs = 10000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
      )
    ])
  }

  _handleError(method, error, throwError = true) {
    const isNetworkError = error?.message?.includes('Network request timed out') || 
                          error?.message?.includes('fetch') ||
                          error?.code === 'NETWORK_ERROR'
    
    if (isNetworkError) {
      console.warn(`⚠️ Network error in ${method}:`, error.message)
      if (throwError) throw new Error('Connection timeout. Please check your internet connection.')
      return null
    }
    
    console.error(`❌ Error in ${method}:`, {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      error: error
    })
    if (throwError) throw error
    return null
  }

  _validateId(id, fieldName = 'ID') {
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      throw new Error(`Invalid ${fieldName}: ${id}`)
    }
  }

  _validateRequiredFields(data, requiredFields, methodName) {
    console.log(`🔍 Validating required fields for ${methodName}:`, { data, requiredFields })
    const missingFields = requiredFields.filter(field => !data?.[field])
    if (missingFields.length > 0) {
      console.error(`❌ Missing fields in ${methodName}:`, missingFields)
      throw new Error(`Missing required fields in ${methodName}: ${missingFields.join(', ')}`)
    }
  }

  async _getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.warn('⚠️ Auth error:', error.message)
        return null
      }
      return user
    } catch (error) {
      console.warn('⚠️ Failed to get current user:', error.message)
      return null
    }
  }

  async _ensureAuthenticated() {
    const user = await this._getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }
}

export { supabase }