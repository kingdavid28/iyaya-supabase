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

      const existing = await this.getContractById(contractId)
      if (!existing) {
        throw new Error('Contract not found')
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
        .single()

      if (error) throw error

      const normalized = this._normalizeContract(data)
      invalidateCache(`job_contracts:booking:${normalized.bookingId}`)
      invalidateCache(`job_contracts:user:${normalized.parentId}`)
      invalidateCache(`job_contracts:user:${normalized.caregiverId}`)

      await notificationService.notifyContractSigned(normalized, signer)

      if (normalized.status === 'active' && existing.status !== 'active') {
        await notificationService.notifyContractActivated(normalized)
      }

      return normalized
    } catch (error) {
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
      const payload = {
        contractId,
        includeSignatures: options.includeSignatures ?? true,
        locale: options.locale || 'en-PH'
      }

      console.log('📝 Invoking PDF generation Edge Function:', PDF_FUNCTION_NAME, 'with payload:', payload)

      // Get the Edge Function URL
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || supabase.supabaseUrl
      const functionUrl = `${supabaseUrl}/functions/v1/${PDF_FUNCTION_NAME}`
      
      console.log('📝 Invoking PDF generation at:', functionUrl)

      // Call the Edge Function to ensure contract exists and we have access
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabase.supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response')
        console.error('❌ PDF generation failed:', response.status, errorText)
        throw new Error('PDF generation is currently unavailable.')
      }

      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      if (!anonKey) {
        throw new Error('Supabase anon key is not configured.')
      }

      const queryParams = new URLSearchParams({
        contractId: String(payload.contractId),
        includeSignatures: String(payload.includeSignatures),
        locale: String(payload.locale),
      }).toString()
      const contractUrl = `${functionUrl}?${queryParams}&apikey=${anonKey}`

      const contentType = response.headers.get('content-type') || 'application/pdf'
      if (!contentType.includes('application/pdf')) {
        console.warn('⚠️ Unexpected content-type from Edge Function:', contentType)
      }

      console.log('✅ Contract PDF URL generated (GET)', contractUrl)
      return {
        success: true,
        url: contractUrl,
        contractId,
        filename: `contract-${contractId}.pdf`,
        contentType: 'application/pdf',
      }
    } catch (error) {
      return this._handleError('generateContractPdf', error)
    }
  }
}

export const contractService = new ContractService()
export default contractService
