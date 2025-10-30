import * as FileSystem from 'expo-file-system'
import { Linking, Platform } from 'react-native'
import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'
import { notificationService } from './notificationService'

const ACTIVE_STATUSES = ['sent', 'signed_parent', 'signed_caregiver', 'active']
const VALID_STATUSES = [...ACTIVE_STATUSES, 'draft', 'completed', 'cancelled']
const PDF_FUNCTION_NAME = 'generate-contract-pdf'

class ContractService extends SupabaseBase {
  _normalizeContract(row) {
    if (!row) return null

    return {
      id: row.id,
      bookingId: row.booking_id,
      parentId: row.parent_id,
      caregiverId: row.caregiver_id,
      status: row.status,
      terms: row.terms || {},
      version: row.version,
      effectiveDate: row.effective_date,
      expiryDate: row.expiry_date,
      parentSignedAt: row.parent_signed_at,
      parentSignature: row.parent_signature,
      parentSignatureHash: row.parent_signature_hash,
      parentSignedIp: row.parent_signed_ip,
      caregiverSignedAt: row.caregiver_signed_at,
      caregiverSignature: row.caregiver_signature,
      caregiverSignatureHash: row.caregiver_signature_hash,
      caregiverSignedIp: row.caregiver_signed_ip,
      contractHash: row.contract_hash,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata || {}
    }
  }

  async createContract(contractData) {
    try {
      this._validateRequiredFields(contractData, ['bookingId', 'parentId', 'caregiverId', 'terms'], 'createContract')

      const resolvedBookingId = contractData.bookingId || contractData.booking_id
      const resolvedParentId = await this._ensureUserId(contractData.parentId || contractData.parent_id, 'Parent ID')
      const resolvedCaregiverId = await this._ensureUserId(contractData.caregiverId || contractData.caregiver_id, 'Caregiver ID')

      const dbContractData = {
        booking_id: resolvedBookingId,
        parent_id: resolvedParentId,
        caregiver_id: resolvedCaregiverId,
        status: contractData.status || 'draft',
        terms: contractData.terms || {},
        version: contractData.version || 1,
        effective_date: contractData.effectiveDate || contractData.effective_date || null,
        expiry_date: contractData.expiryDate || contractData.expiry_date || null,
        metadata: contractData.metadata || {},
        created_by: contractData.createdBy || contractData.created_by || (await this._getCurrentUser())?.id || null
      }

      const { data, error } = await supabase
        .from('job_contracts')
        .insert([dbContractData])
        .select('*')
        .single()

      if (error) throw error

      invalidateCache(`job_contracts:booking:${resolvedBookingId}`)
      invalidateCache(`job_contracts:user:${resolvedParentId}`)
      invalidateCache(`job_contracts:user:${resolvedCaregiverId}`)
      invalidateCache(`bookings:parent:${resolvedParentId}`)
      invalidateCache(`bookings:caregiver:${resolvedCaregiverId}`)
      invalidateCache('bookings:')

      await notificationService.notifyContractCreated(this._normalizeContract(data))

      return this._normalizeContract(data)
    } catch (error) {
      return this._handleError('createContract', error)
    }
  }

  async getContractById(contractId) {
    try {
      this._validateId(contractId, 'Contract ID')

      const { data, error } = await supabase
        .from('job_contracts')
        .select('*')
        .eq('id', contractId)
        .single()

      if (error) throw error
      return this._normalizeContract(data)
    } catch (error) {
      return this._handleError('getContractById', error)
    }
  }

  async getContractsByBooking(bookingId) {
    try {
      this._validateId(bookingId, 'Booking ID')

      const cacheKey = `job_contracts:booking:${bookingId}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('job_contracts')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map(row => this._normalizeContract(row))
      }, 30 * 1000)
    } catch (error) {
      return this._handleError('getContractsByBooking', error)
    }
  }

  async getContractsForUser(userId, role = 'parent') {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')
      const lookupField = role === 'caregiver' ? 'caregiver_id' : 'parent_id'
      const cacheKey = `job_contracts:user:${resolvedUserId}:${role}`

      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('job_contracts')
          .select('*')
          .eq(lookupField, resolvedUserId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return (data || []).map(row => this._normalizeContract(row))
      }, 30 * 1000)
    } catch (error) {
      return this._handleError('getContractsForUser', error)
    }
  }

  async updateContractStatus(contractId, status, metadata = {}) {
    try {
      this._validateId(contractId, 'Contract ID')
      if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid contract status: ${status}`)
      }

      const { data, error } = await supabase
        .from('job_contracts')
        .update({ status, metadata })
        .eq('id', contractId)
        .select('*')
        .single()

      if (error) throw error

      const normalized = this._normalizeContract(data)
      invalidateCache(`job_contracts:booking:${normalized.bookingId}`)
      invalidateCache(`job_contracts:user:${normalized.parentId}`)
      invalidateCache(`job_contracts:user:${normalized.caregiverId}`)
      invalidateCache(`bookings:parent:${normalized.parentId}`)
      invalidateCache(`bookings:caregiver:${normalized.caregiverId}`)
      invalidateCache('bookings:')

      await notificationService.notifyContractStatusChange(normalized, status)

      return normalized
    } catch (error) {
      return this._handleError('updateContractStatus', error)
    }
  }

  async signContract(contractId, signer, { signature, signatureHash, ipAddress } = {}) {
    try {
      this._validateId(contractId, 'Contract ID')
      if (!['parent', 'caregiver'].includes(signer)) {
        throw new Error(`Invalid signer: ${signer}`)
      }

      const columnPrefix = signer === 'parent' ? 'parent' : 'caregiver'
      const updatePayload = {
        [`${columnPrefix}_signed_at`]: new Date().toISOString(),
        [`${columnPrefix}_signature`]: signature || null,
        [`${columnPrefix}_signature_hash`]: signatureHash || null,
        [`${columnPrefix}_signed_ip`]: ipAddress || null,
      }

      let existing
      try {
        existing = await this.getContractById(contractId)
      } catch (error) {
        if (error?.code === 'PGRST116' || error?.message?.includes('0 rows')) {
          const notFoundError = new Error('Contract not found')
          notFoundError.code = 'CONTRACT_NOT_FOUND'
          throw notFoundError
        }
        throw error
      }

      if (!existing) {
        const notFoundError = new Error('Contract not found')
        notFoundError.code = 'CONTRACT_NOT_FOUND'
        throw notFoundError
      }

      let nextStatus = existing.status
      if (signer === 'parent' && !['signed_parent', 'active', 'completed'].includes(existing.status)) {
        nextStatus = existing.caregiverSignedAt ? 'active' : 'signed_parent'
      } else if (signer === 'caregiver' && !['signed_caregiver', 'active', 'completed'].includes(existing.status)) {
        nextStatus = existing.parentSignedAt ? 'active' : 'signed_caregiver'
      }

      if (nextStatus !== existing.status) {
        updatePayload.status = nextStatus
      }

      const { data, error } = await supabase
        .from('job_contracts')
        .update(updatePayload)
        .eq('id', contractId)
        .select('*')
        .maybeSingle()

      if (error && !(error?.code === 'PGRST116' || error?.message?.includes('0 rows'))) {
        throw error
      }

      let normalized = data ? this._normalizeContract(data) : null

      if (!normalized) {
        try {
          const refetched = await this.getContractById(contractId)
          normalized = refetched || null
        } catch (refetchError) {
          if (!(refetchError?.code === 'PGRST116' || refetchError?.message?.includes('0 rows'))) {
            throw refetchError
          }
        }
      }

      if (!normalized) {
        const notFoundError = new Error('Contract not found')
        notFoundError.code = 'CONTRACT_NOT_FOUND'
        throw notFoundError
      }
      invalidateCache(`job_contracts:booking:${normalized.bookingId}`)
      invalidateCache(`job_contracts:user:${normalized.parentId}`)
      invalidateCache(`job_contracts:user:${normalized.caregiverId}`)
      invalidateCache(`bookings:parent:${normalized.parentId}`)
      invalidateCache(`bookings:caregiver:${normalized.caregiverId}`)
      invalidateCache('bookings:')

      await notificationService.notifyContractSigned(normalized, signer)

      if (normalized.status === 'active' && existing.status !== 'active') {
        await notificationService.notifyContractActivated(normalized)
      }

      return normalized
    } catch (error) {
      if (error?.code === 'CONTRACT_NOT_FOUND') {
        throw error
      }

      if (error?.code === 'PGRST116' || error?.message?.includes('0 rows')) {
        const notFoundError = new Error('Contract not found')
        notFoundError.code = 'CONTRACT_NOT_FOUND'
        throw notFoundError
      }

      return this._handleError('signContract', error)
    }
  }

  async resendContract(contractId, actorId) {
    try {
      this._validateId(contractId, 'Contract ID')
      const contract = await this.getContractById(contractId)
      if (!contract) throw new Error('Contract not found')

      await notificationService.notifyContractResent(contract, actorId)
      return contract
    } catch (error) {
      return this._handleError('resendContract', error, false)
    }
  }

  async generateContractPdf(contractId, options = {}) {
    try {
      this._validateId(contractId, 'Contract ID')

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.warn('⚠️ Unable to get Supabase session for PDF download:', sessionError)
      }

      const accessToken = session?.access_token
      if (!accessToken) {
        await this._ensureAuthenticated()
        throw new Error('Authentication required to download contract PDF.')
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || supabase.supabaseUrl
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured for PDF generation.')
      }

      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || supabase.supabaseKey
      if (!anonKey) {
        throw new Error('Supabase anon key is not configured.')
      }

      const includeSignatures = options.includeSignatures ?? true
      const locale = options.locale || 'en-PH'
      const autoDownload = options.autoDownload ?? true

      const queryParams = new URLSearchParams({
        contractId: String(contractId),
        includeSignatures: String(includeSignatures),
        locale: String(locale),
      }).toString()
      const functionUrl = `${supabaseUrl}/functions/v1/${PDF_FUNCTION_NAME}?${queryParams}`

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      }

      if (Platform?.OS === 'web' && typeof fetch === 'function') {
        const response = await fetch(functionUrl, { headers })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(errorText || 'Failed to download contract PDF. Please try again.')
        }

        const blob = await response.blob()
        const filename = `contract-${contractId}-${Date.now()}.pdf`
        const URLObject = (typeof window !== 'undefined' && window.URL)
          ? window.URL
          : (typeof globalThis !== 'undefined' ? globalThis.URL : undefined)

        if (!URLObject?.createObjectURL) {
          return {
            success: true,
            blob,
            filename,
            contractId,
            contentType: response.headers?.get?.('content-type') || 'application/pdf',
          }
        }

        const blobUrl = URLObject.createObjectURL(blob)
        const revoke = () => {
          try {
            URLObject.revokeObjectURL(blobUrl)
          } catch (error) {
            console.warn('⚠️ Failed to revoke object URL:', error)
          }
        }

        if (autoDownload) {
          if (typeof document !== 'undefined') {
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = filename
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          } else if (typeof window !== 'undefined' && typeof window.open === 'function') {
            window.open(blobUrl, '_blank', 'noopener,noreferrer')
          }
        }

        setTimeout(revoke, 60_000)

        return {
          success: true,
          uri: blobUrl,
          url: blobUrl,
          filename,
          contractId,
          contentType: 'application/pdf',
          cleanup: revoke,
        }
      }

      if (FileSystem?.downloadAsync && (FileSystem.cacheDirectory || FileSystem.documentDirectory)) {
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
        const contractsDir = `${baseDir}contracts/`
        try {
          await FileSystem.makeDirectoryAsync(contractsDir, { intermediates: true })
        } catch (dirError) {
          const dirErrorMessage = dirError?.message || ''
          if (!dirErrorMessage.includes('Directory exists')) {
            console.warn('⚠️ Unable to ensure contracts directory:', dirError)
          }
        }

        const filename = `contract-${contractId}-${Date.now()}.pdf`
        const targetPath = `${contractsDir}${filename}`
        const downloadResult = await FileSystem.downloadAsync(functionUrl, targetPath, { headers })

        if (!downloadResult || (downloadResult.status && downloadResult.status >= 400)) {
          throw new Error('Failed to download contract PDF. Please try again.')
        }

        return {
          success: true,
          uri: downloadResult.uri,
          url: downloadResult.uri,
          filename,
          contractId,
          contentType: 'application/pdf'
        }
      }

      if (typeof fetch === 'function') {
        const response = await fetch(functionUrl, { headers })
        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(errorText || 'Failed to download contract PDF. Please try again.')
        }

        const buffer = await response.arrayBuffer()
        const filename = `contract-${contractId}-${Date.now()}.pdf`

        if (FileSystem?.writeAsStringAsync && (FileSystem.cacheDirectory || FileSystem.documentDirectory)) {
          const targetPath = `${(FileSystem.cacheDirectory || FileSystem.documentDirectory)}contracts/`
          try {
            await FileSystem.makeDirectoryAsync(targetPath, { intermediates: true })
          } catch (dirError) {
            const dirErrorMessage = dirError?.message || ''
            if (!dirErrorMessage.includes('Directory exists')) {
              console.warn('⚠️ Unable to ensure contracts directory (fallback):', dirError)
            }
          }
          const filePath = `${targetPath}${filename}`
          const base64Data = Buffer.from(buffer).toString('base64')
          await FileSystem.writeAsStringAsync(filePath, base64Data, { encoding: FileSystem.EncodingType.Base64 })

          return {
            success: true,
            uri: filePath,
            url: filePath,
            filename,
            contractId,
            contentType: 'application/pdf',
            note: 'Saved using fetch fallback'
          }
        }

        if (autoDownload && Linking?.openURL) {
          await Linking.openURL(functionUrl)
          return {
            success: true,
            url: functionUrl,
            filename,
            contractId,
            contentType: 'application/pdf',
            note: 'Opened contract URL in external browser'
          }
        }

        return {
          success: true,
          url: functionUrl,
          filename,
          contractId,
          contentType: 'application/pdf',
          note: 'Returned function URL for manual download'
        }
      }

      throw new Error('PDF download is not supported on this platform yet. Try opening the contract in a web browser to download it.')
    } catch (error) {
      return this._handleError('generateContractPdf', error)
    }
  }
}

export const contractService = new ContractService()
export default contractService
