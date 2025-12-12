import * as FileSystem from 'expo-file-system'
import { Linking, Platform } from 'react-native'
import { SupabaseBase } from './base'
import supabase from './base'
import { getCachedOrFetch, invalidateCache } from './cache'
import { notificationService } from './notificationService'

const ACTIVE_STATUSES = ['sent', 'signed_parent', 'signed_caregiver', 'active']
const VALID_STATUSES = [...ACTIVE_STATUSES, 'draft', 'completed', 'cancelled']
const PDF_FUNCTION_NAME = 'generate-contract-pdf'

const normalizeTermsObject = (terms = {}) => {
  if (!terms) return {}

  if (Array.isArray(terms)) {
    return terms.reduce((acc, entry, index) => {
      acc[`Term ${index + 1}`] = entry
      return acc
    }, {})
  }

  if (typeof terms === 'string') {
    return { Terms: terms }
  }

  if (typeof terms === 'object') {
    return { ...terms }
  }

  return {}
}

class ContractService extends SupabaseBase {
  _validateRequiredClauses(terms = {}) {
    if (!terms || typeof terms !== 'object' || Array.isArray(terms)) {
      const error = new Error('Contract terms must be provided as an object.')
      error.code = 'INVALID_TERMS'
      throw error
    }

    return true
  }

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

      const sanitizedTerms = normalizeTermsObject(contractData.terms || {})
      this._validateRequiredClauses(sanitizedTerms)

      const dbContractData = {
        booking_id: resolvedBookingId,
        parent_id: resolvedParentId,
        caregiver_id: resolvedCaregiverId,
        status: contractData.status || 'draft',
        terms: sanitizedTerms,
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

  async updateContract(contractId, updates = {}, options = {}) {
    try {
      this._validateId(contractId, 'Contract ID')
      const normalizedUpdates = updates || {}

      const existing = await this.getContractById(contractId)
      if (!existing) {
        const notFoundError = new Error('Contract not found')
        notFoundError.code = 'CONTRACT_NOT_FOUND'
        throw notFoundError
      }

      const currentUser = await this._getCurrentUser()
      const actorId = options.actorId || currentUser?.id || null
      const actorRole = options.actorRole
        || currentUser?.role
        || currentUser?.user_metadata?.role
        || currentUser?.app_metadata?.role
        || null

      const bypassAccess = Boolean(
        options?.bypassAccess
        || actorRole === 'service_role'
        || actorRole === 'admin'
        || actorRole === 'staff'
      )

      const isParentActor = actorId && existing.parentId === actorId
      const isCaregiverActor = actorId && existing.caregiverId === actorId

      if (!bypassAccess) {
        if (!actorId) {
          const authError = new Error('Authentication required to update contract.')
          authError.code = 'AUTH_REQUIRED'
          throw authError
        }

        if (!isParentActor && !isCaregiverActor) {
          const accessError = new Error('You do not have permission to update this contract.')
          accessError.code = 'CONTRACT_ACCESS_DENIED'
          throw accessError
        }

        if (
          ['completed', 'cancelled'].includes(existing.status)
          && !options?.allowFinalizedEdit
        ) {
          const statusError = new Error('Finalized contracts cannot be edited.')
          statusError.code = 'CONTRACT_FINALIZED'
          throw statusError
        }
      }

      const contractIsSigned = Boolean(
        existing.parentSignedAt
        || existing.caregiverSignedAt
        || ['signed_parent', 'signed_caregiver', 'active'].includes(existing.status)
      )

      if (!bypassAccess && contractIsSigned && !options?.allowSignedEdit) {
        return await this._createContractVersion(existing, normalizedUpdates, {
          actorId,
          actorRole,
          options
        })
      }

      const allowedFields = [
        'terms',
        'metadata',
        'effectiveDate',
        'effective_date',
        'expiryDate',
        'expiry_date',
        'version'
      ]

      const updatePayload = {}
      allowedFields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(normalizedUpdates, field)) {
          switch (field) {
            case 'effectiveDate':
            case 'effective_date':
              updatePayload.effective_date = normalizedUpdates[field]
              break
            case 'expiryDate':
            case 'expiry_date':
              updatePayload.expiry_date = normalizedUpdates[field]
              break
            case 'terms':
              updatePayload.terms = normalizedUpdates[field] || {}
              break
            case 'metadata':
              updatePayload.metadata = normalizedUpdates[field] || {}
              break
            case 'version':
              updatePayload.version = normalizedUpdates[field]
              break
            default:
              break
          }
        }
      })

      if (options?.mergeTerms !== false && updatePayload.terms && existing.terms) {
        updatePayload.terms = {
          ...existing.terms,
          ...updatePayload.terms
        }
      }

      if (updatePayload.terms) {
        updatePayload.terms = normalizeTermsObject(updatePayload.terms)
        this._validateRequiredClauses(updatePayload.terms)
      }

      const existingMetadata = (existing.metadata && typeof existing.metadata === 'object')
        ? { ...existing.metadata }
        : {}

      if (options?.mergeMetadata !== false && existingMetadata && updatePayload.metadata) {
        updatePayload.metadata = {
          ...existingMetadata,
          ...updatePayload.metadata
        }
      }

      if (!updatePayload.metadata) {
        updatePayload.metadata = { ...existingMetadata }
      }

      const auditStamp = {
        updatedBy: actorId || null,
        updatedAt: new Date().toISOString()
      }

      const versionHistory = Array.isArray(updatePayload.metadata.versionHistory)
        ? [...updatePayload.metadata.versionHistory]
        : Array.isArray(existingMetadata.versionHistory)
          ? [...existingMetadata.versionHistory]
          : []

      const nextVersion = updatePayload.version
        || ((existing.version ?? 1) + 1)

      versionHistory.push({
        contractId,
        version: nextVersion,
        previousVersion: existing.version ?? null,
        status: existing.status,
        parentSignedAt: existing.parentSignedAt || null,
        caregiverSignedAt: existing.caregiverSignedAt || null,
        updatedAt: auditStamp.updatedAt,
        updatedBy: auditStamp.updatedBy
      })

      updatePayload.version = nextVersion
      updatePayload.metadata.versionHistory = versionHistory
      updatePayload.metadata.audit = {
        ...(updatePayload.metadata.audit || {}),
        ...auditStamp
      }

      updatePayload.updated_at = auditStamp.updatedAt

      if (typeof updatePayload.metadata === 'object' && updatePayload.metadata !== null) {
        Object.keys(updatePayload.metadata).forEach((key) => {
          if (updatePayload.metadata[key] === undefined) {
            delete updatePayload.metadata[key]
          }
        })
      }

      if (updatePayload.terms) {
        updatePayload.terms = normalizeTermsObject(updatePayload.terms)
        this._validateRequiredClauses(updatePayload.terms)
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
      invalidateCache(`bookings:parent:${normalized.parentId}`)
      invalidateCache(`bookings:caregiver:${normalized.caregiverId}`)
      invalidateCache('bookings:')

      if (!options?.silent) {
        await notificationService.notifyContractUpdated(normalized, {
          actorId,
          actorRole: actorRole || (isParentActor ? 'parent' : isCaregiverActor ? 'caregiver' : null)
        })
      }

      return normalized
    } catch (error) {
      return this._handleError('updateContract', error)
    }
  }

  async saveDraft(contractId, terms, options = {}) {
    try {
      this._validateId(contractId, 'Contract ID')
      const sanitizedTerms = normalizeTermsObject(terms || {})
      this._validateRequiredClauses(sanitizedTerms)

      return await this.updateContract(contractId, { terms: sanitizedTerms }, {
        mergeTerms: false,
        ...options
      })
    } catch (error) {
      return this._handleError('saveDraft', error)
    }
  }

  async sendDraftForSignature(contractId, payload = {}) {
    try {
      this._validateId(contractId, 'Contract ID')
      const { terms, metadata = {}, actorId, actorRole } = payload

      const existing = await this.getContractById(contractId)
      if (!existing) {
        const notFoundError = new Error('Contract not found')
        notFoundError.code = 'CONTRACT_NOT_FOUND'
        throw notFoundError
      }

      if (existing.status !== 'draft') {
        const statusError = new Error('Only draft contracts can be sent for signature.')
        statusError.code = 'CONTRACT_STATUS_INVALID'
        throw statusError
      }

      const resolvedTerms = normalizeTermsObject(terms || existing.terms || {})
      this._validateRequiredClauses(resolvedTerms)

      const updatePayload = {
        terms: resolvedTerms,
        metadata: {
          ...existing.metadata,
          ...metadata,
          lastSentAt: new Date().toISOString()
        },
        status: 'sent'
      }

      const { data, error } = await supabase
        .from('job_contracts')
        .update({
          terms: normalizeTermsObject(updatePayload.terms || existing.terms || {}),
          metadata: updatePayload.metadata,
          status: updatePayload.status
        })
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

      await notificationService.notifyContractStatusChange(normalized, 'sent')

      await notificationService.notifyContractUpdated(normalized, {
        actorId: actorId || existing.parentId,
        actorRole: actorRole || 'parent'
      })

      await notificationService.notifyContractResent(normalized, actorId || existing.parentId)

      return normalized
    } catch (error) {
      return this._handleError('sendDraftForSignature', error)
    }
  }

  async _createContractVersion(existing, updates = {}, context = {}) {
    const { actorId = null, actorRole = null, options = {} } = context
    const normalizedUpdates = updates || {}

    const mergeTerms = options?.mergeTerms !== false
    const mergeMetadata = options?.mergeMetadata !== false
    const auditTimestamp = new Date().toISOString()

    const baseMetadata = (existing.metadata && typeof existing.metadata === 'object')
      ? { ...existing.metadata }
      : {}

    const nextVersion = (existing.version ?? 1) + 1

    const resolvedTerms = (() => {
      if (!normalizedUpdates.terms) {
        return normalizeTermsObject(existing.terms || {})
      }
      if (!mergeTerms) {
        return normalizeTermsObject(normalizedUpdates.terms)
      }
      return normalizeTermsObject({
        ...existing.terms,
        ...normalizedUpdates.terms
      })
    })()

    this._validateRequiredClauses(resolvedTerms)

    let resolvedMetadata = mergeMetadata ? { ...baseMetadata } : {}
    if (normalizedUpdates.metadata && typeof normalizedUpdates.metadata === 'object') {
      resolvedMetadata = {
        ...resolvedMetadata,
        ...normalizedUpdates.metadata
      }
    }

    const versionHistory = Array.isArray(resolvedMetadata.versionHistory)
      ? [...resolvedMetadata.versionHistory]
      : Array.isArray(baseMetadata.versionHistory)
        ? [...baseMetadata.versionHistory]
        : []

    versionHistory.push({
      contractId: existing.id,
      version: existing.version ?? 1,
      status: existing.status,
      parentSignedAt: existing.parentSignedAt || null,
      caregiverSignedAt: existing.caregiverSignedAt || null,
      updatedAt: auditTimestamp,
      updatedBy: actorId || null
    })

    resolvedMetadata.versionHistory = versionHistory
    resolvedMetadata.audit = {
      ...(resolvedMetadata.audit || {}),
      supersedes: existing.id,
      updatedBy: actorId || null,
      updatedAt: auditTimestamp
    }

    const effectiveDate = normalizedUpdates.effectiveDate
      || normalizedUpdates.effective_date
      || existing.effectiveDate
      || null

    const expiryDate = normalizedUpdates.expiryDate
      || normalizedUpdates.expiry_date
      || existing.expiryDate
      || null

    const insertPayload = {
      booking_id: existing.bookingId,
      parent_id: existing.parentId,
      caregiver_id: existing.caregiverId,
      status: 'draft',
      terms: resolvedTerms,
      version: normalizedUpdates.version || nextVersion,
      effective_date: effectiveDate,
      expiry_date: expiryDate,
      metadata: resolvedMetadata,
      created_by: actorId || existing.createdBy || null
    }

    const { data, error } = await supabase
      .from('job_contracts')
      .insert([insertPayload])
      .select('*')
      .single()

    if (error) throw error

    const supersededMetadata = {
      ...baseMetadata,
      versionHistory,
      audit: {
        ...(baseMetadata.audit || {}),
        supersededBy: actorId || null,
        supersededAt: auditTimestamp
      },
      superseded_by: data.id
    }

    await supabase
      .from('job_contracts')
      .update({ metadata: supersededMetadata })
      .eq('id', existing.id)

    const normalized = this._normalizeContract(data)

    invalidateCache(`job_contracts:booking:${normalized.bookingId}`)
    invalidateCache(`job_contracts:user:${normalized.parentId}`)
    invalidateCache(`job_contracts:user:${normalized.caregiverId}`)
    invalidateCache(`bookings:parent:${normalized.parentId}`)
    invalidateCache(`bookings:caregiver:${normalized.caregiverId}`)
    invalidateCache('bookings:')

    if (!options?.silent) {
      await notificationService.notifyContractUpdated(normalized, {
        actorId,
        actorRole
      })
    }

    return normalized
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
    let existing
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

      const sanitizedTerms = normalizeTermsObject(normalized.terms || {})
      if (JSON.stringify(sanitizedTerms) !== JSON.stringify(normalized.terms || {})) {
        await supabase
          .from('job_contracts')
          .update({ terms: sanitizedTerms })
          .eq('id', normalized.id)
        normalized.terms = sanitizedTerms
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

      if (error?.code === 'P0001' && typeof error?.message === 'string' && error.message.includes('A job contract is already active for booking')) {
        console.warn('Job contract already active for this booking in signContract.', {
          code: error?.code,
          message: error?.message,
          contractId,
          bookingId: existing?.bookingId
        })

        let conflictError = null

        if (existing?.bookingId) {
          try {
            const relatedContracts = await this.getContractsByBooking(existing.bookingId)
            const activeStatuses = ACTIVE_STATUSES

            if (Array.isArray(relatedContracts)) {
              const conflictingContract = relatedContracts.find((c) => c.id !== contractId && activeStatuses.includes(c.status))

              if (conflictingContract) {
                conflictError = new Error('Another contract is already active for this booking. Please use that contract instead.')
                conflictError.code = 'CONTRACT_ACTIVE_CONFLICT'
                conflictError.bookingId = existing.bookingId
                conflictError.conflictingContractId = conflictingContract.id
              }
            }
          } catch (lookupError) {
            console.warn('Failed to evaluate active contract after P0001 error in signContract.', lookupError)
          }
        }

        if (!conflictError) {
          conflictError = new Error('Another contract is already active for this booking. Please use that contract instead.')
          conflictError.code = 'CONTRACT_ACTIVE_CONFLICT'
          conflictError.bookingId = existing?.bookingId ?? null
        }

        throw conflictError
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
