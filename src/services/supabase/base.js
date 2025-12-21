import supabase from '../../config/supabase'
import { isValidUUID } from '../../utils/id'
import { resolveSupabaseUserId } from './utils/idResolver'

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
    const errorMessage = typeof error === 'string' ? error : error?.message || ''
    const normalizedMessage = (errorMessage || '').toLowerCase()
    const isNetworkError =
      normalizedMessage.includes('network request timed out') ||
      normalizedMessage.includes('network connection lost') ||
      normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('fetch failed') ||
      normalizedMessage.includes('gateway error') ||
      error?.code === 'NETWORK_ERROR'

    if (isNetworkError) {
      console.warn(`⚠️ Network error in ${method}:`, errorMessage || error)
      if (throwError) {
        throw new Error('Network connection lost. Please check your internet connection and try again.')
      }
      return null
    }

    // Improved error logging with proper serialization
    const serialized = typeof error === 'string'
      ? { message: error }
      : {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
          status: error?.status,
          statusText: error?.statusText
        }

    console.error(`❌ Error in ${method}:`, serialized)

    // Log full error as string for better visibility
    try {
      console.error(`Full error: ${JSON.stringify(error, null, 2)}`)
    } catch (e) {
      console.error('Full error (non-serializable):', error)
    }

    if (throwError) throw (typeof error === 'string' ? new Error(error) : error)
    return null
  }

  _validateId(id, fieldName = 'ID') {
    if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
      throw new Error(`Invalid ${fieldName}: ${id}`)
    }
  }

  async _ensureUserId(rawId, fieldName = 'User ID') {
    if (rawId && typeof rawId === 'object') {
      rawId = rawId.id || rawId._id || rawId.user_id || rawId.userId || rawId.valueOf?.()
    }

    if (!rawId) {
      throw new Error(`Invalid ${fieldName}: ${rawId}`)
    }

    const candidate = String(rawId).trim()
    if (!candidate) {
      throw new Error(`Invalid ${fieldName}: ${rawId}`)
    }

    if (isValidUUID(candidate)) {
      return candidate
    }

    const resolved = await resolveSupabaseUserId(candidate)
    if (resolved) {
      return resolved
    }

    throw new Error(`Invalid ${fieldName}: ${rawId}`)
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
      if (!supabase || !supabase.auth) {
        console.warn('⚠️ Supabase client not initialized')
        return null
      }
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

export default supabase
