import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

const TABLE_REQUESTS = 'information_requests'
const CACHE_TTL_MS = 30 * 1000
const REQUEST_SELECT = `*,
  requester:requester_id (
    id,
    name,
    email,
    profile_data
  ),
  target:target_id (
    id,
    name,
    email,
    profile_data
  )`

class InformationRequestService extends SupabaseBase {
    _profileSummary(profile, fallbackId) {
        if (!profile && !fallbackId) return null
        return {
            id: profile?.id || fallbackId || null,
            name: profile?.name || null,
            email: profile?.email || null,
            profileData: profile?.profile_data || null
        }
    }

    _normalizeRequest(row) {
        if (!row) return null

        const requesterSummary = this._profileSummary(row.requester, row.requester_id)
        const targetSummary = this._profileSummary(row.target, row.target_id)

        return {
            id: row.id,
            requesterUserId: row.requester_id,
            requesterId: requesterSummary,
            requester: requesterSummary,
            targetUserId: row.target_id,
            targetId: targetSummary,
            target: targetSummary,
            status: row.status,
            reason: row.reason,
            requestedFields: row.requested_fields || [],
            sharedFields: row.shared_fields || [],
            expiresAt: row.expires_at,
            respondedAt: row.responded_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }
    }

    _cacheKey(type, userId) {
        return `${TABLE_REQUESTS}:${type}:${userId}`
    }

    async _getRequestById(requestId) {
        this._validateId(requestId, 'Request ID')

        const { data, error } = await supabase
            .from(TABLE_REQUESTS)
            .select(REQUEST_SELECT)
            .eq('id', requestId)
            .single()

        if (error) throw error
        return this._normalizeRequest(data)
    }

    async createRequest({ targetId, requestedFields, reason = null, expiresAt = null }) {
        try {
            const currentUser = await this._ensureAuthenticated()
            const resolvedTargetId = await this._ensureUserId(targetId, 'Target ID')
            const fields = Array.isArray(requestedFields)
                ? requestedFields.map(field => String(field).trim()).filter(Boolean)
                : []

            if (!fields.length) {
                throw new Error('At least one requested field is required')
            }

            const payload = {
                target_id: resolvedTargetId,
                requested_fields: fields,
                reason,
                expires_at: expiresAt
            }

            const { data, error } = await supabase
                .rpc('create_information_request', { payload })

            if (error) throw error

            const requestId = Array.isArray(data) ? data[0] : data
            const request = await this._getRequestById(requestId)

            invalidateCache(this._cacheKey('pending', resolvedTargetId))
            invalidateCache(this._cacheKey('sent', currentUser.id))

            return request
        } catch (error) {
            return this._handleError('createRequest', error)
        }
    }

    async getPendingRequests(userId = null) {
        try {
            const targetId = userId
                ? await this._ensureUserId(userId, 'Target ID')
                : (await this._ensureAuthenticated()).id

            const cacheKey = this._cacheKey('pending', targetId)

            return await getCachedOrFetch(cacheKey, async () => {
                const { data, error } = await supabase
                    .from(TABLE_REQUESTS)
                    .select(REQUEST_SELECT)
                    .eq('target_id', targetId)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })

                if (error) throw error
                return (data || []).map(row => this._normalizeRequest(row))
            }, CACHE_TTL_MS)
        } catch (error) {
            return this._handleError('getPendingRequests', error)
        }
    }

    async getSentRequests(userId = null) {
        try {
            const requesterId = userId
                ? await this._ensureUserId(userId, 'Requester ID')
                : (await this._ensureAuthenticated()).id

            const cacheKey = this._cacheKey('sent', requesterId)

            return await getCachedOrFetch(cacheKey, async () => {
                const { data, error } = await supabase
                    .from(TABLE_REQUESTS)
                    .select(REQUEST_SELECT)
                    .eq('requester_id', requesterId)
                    .order('created_at', { ascending: false })

                if (error) throw error
                return (data || []).map(row => this._normalizeRequest(row))
            }, CACHE_TTL_MS)
        } catch (error) {
            return this._handleError('getSentRequests', error)
        }
    }

    async respondToRequest({ requestId, approved, sharedFields = [], expiresAt = null }) {
        try {
            if (typeof approved !== 'boolean') {
                throw new Error('approved flag is required')
            }

            const payload = {
                p_request_id: requestId,
                approved,
                shared_fields_input: Array.isArray(sharedFields) ? sharedFields : [],
                expires_at_input: expiresAt
            }

            const { error } = await supabase
                .rpc('respond_to_information_request', payload)

            if (error) throw error

            const updated = await this._getRequestById(requestId)

            invalidateCache(this._cacheKey('pending', updated.targetId))
            invalidateCache(this._cacheKey('sent', updated.requesterId))

            return updated
        } catch (error) {
            return this._handleError('respondToRequest', error)
        }
    }

    async revokeAccess(requestId) {
        try {
            this._validateId(requestId, 'Request ID')

            const { error } = await supabase
                .rpc('revoke_information_access', { p_request_id: requestId })

            if (error) throw error

            const updated = await this._getRequestById(requestId)

            if (updated) {
                invalidateCache(this._cacheKey('pending', updated.targetId))
                invalidateCache(this._cacheKey('sent', updated.requesterId))
            }

            return updated
        } catch (error) {
            return this._handleError('revokeAccess', error)
        }
    }
}

export const informationRequestService = new InformationRequestService()
export default informationRequestService