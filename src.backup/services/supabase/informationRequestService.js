import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

const TABLE_REQUESTS = 'information_requests'
const VIEWER_PERMISSION_TABLE = 'information_request_permissions'
const CACHE_TTL_MS = 30 * 1000
const REQUEST_SELECT = `*,
  requester:requester_id (
    id,
    name,
    email,
    profile_image,
    first_name,
    last_name
  ),
  target:target_id (
    id,
    name,
    email,
    profile_image,
    first_name,
    last_name
  )`

const SENSITIVE_PERMISSION_FIELDS = new Set([
    'documents',
    'background_check',
    'emergency_contacts',
    'age_care_ranges',
    'child_medical_info',
    'child_allergies',
    'child_behavior_notes',
    'financial_info'
])

const snakeToCamel = (input = '') =>
    String(input).replace(/_([a-z])/g, (_, group) => group.toUpperCase());

const toSnake = (input = '') =>
    String(input)
        .trim()
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/[^a-z\d_]+/gi, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

class InformationRequestService extends SupabaseBase {
    _profileSummary(profile, fallbackId) {
        if (!profile && !fallbackId) return null
        const firstName = profile?.first_name
        const lastName = profile?.last_name
        const displayName = profile?.name || [firstName, lastName].filter(Boolean).join(' ') || null

        return {
            id: profile?.id || fallbackId || null,
            name: displayName,
            email: profile?.email || null,
            profileImage: profile?.profile_image || null,
            firstName,
            lastName
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

    _normalizePermission(row) {
        if (!row) return null

        return {
            id: row.id,
            requestId: row.request_id,
            viewerId: row.viewer_id,
            targetId: row.target_id,
            field: row.field,
            expiresAt: this._normalizeTimestamp(row.expires_at),
            createdAt: this._normalizeTimestamp(row.created_at)
        }
    }

    _normalizeTimestamp(value) {
        if (!value) return null

        if (value instanceof Date) {
            return value.toISOString()
        }

        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
    }

    _normalizeDocuments(documents) {
        if (!Array.isArray(documents)) {
            return []
        }

        return documents
            .map(document => {
                if (!document || typeof document !== 'object') {
                    return null
                }

                const uploadedAt = document.uploadedAt || document.uploaded_at || document.createdAt || document.created_at || document.timestamp

                return {
                    id: document.id || document.documentId || document.uuid || document.url || null,
                    type: document.type || document.documentType || document.category || null,
                    label: document.label || document.name || document.fileName || 'Document',
                    fileName: document.fileName || document.name || null,
                    url: document.url || document.fileUrl || document.href || null,
                    verified: typeof document.verified === 'boolean'
                        ? document.verified
                        : Boolean(document.isVerified ?? document.approved ?? document.status === 'verified'),
                    uploadedAt: this._normalizeTimestamp(uploadedAt),
                    metadata: document.metadata || null,
                    raw: document
                }
            })
            .filter(Boolean)
    }

    _dedupePermissions(rows = [], includeExpired = false) {
        const normalized = (rows || []).map(row => {
            const permission = this._normalizePermission(row)
            return {
                ...permission,
                fieldCamel: snakeToCamel(permission.field)
            }
        })

        const byField = new Map()
        normalized.forEach(permission => {
            const existing = byField.get(permission.field)
            const createdAtMs = permission.createdAt ? new Date(permission.createdAt).getTime() : 0

            if (!existing) {
                byField.set(permission.field, permission)
                return
            }

            const existingCreatedMs = existing.createdAt ? new Date(existing.createdAt).getTime() : 0
            if (createdAtMs > existingCreatedMs) {
                byField.set(permission.field, permission)
            }
        })

        const deduped = Array.from(byField.values())
        if (includeExpired) {
            return deduped
        }

        const now = Date.now()
        return deduped.filter(permission => !permission.expiresAt || new Date(permission.expiresAt).getTime() > now)
    }

    _cacheKey(type, userId) {
        return `${TABLE_REQUESTS}:${type}:${userId}`
    }

    async _filterNewPermissionFields(targetId, viewerId, fields) {
        if (!targetId || !viewerId || !Array.isArray(fields) || !fields.length) {
            return Array.isArray(fields) ? fields : []
        }

        try {
            const { data, error } = await supabase
                .from(VIEWER_PERMISSION_TABLE)
                .select('field')
                .eq('target_id', targetId)
                .eq('viewer_id', viewerId)
                .in('field', fields)

            if (error) {
                console.warn('Failed to query existing information request permissions:', error)
                return fields
            }

            const existingFields = new Set((data || []).map((row) => row.field))
            if (!existingFields.size) {
                return fields
            }

            const filtered = fields.filter((field) => !existingFields.has(field))
            if (filtered.length !== fields.length) {
                console.log('ℹ️ Skipping already granted fields for information request:', {
                    skipped: fields.filter((field) => existingFields.has(field))
                })
            }

            return filtered
        } catch (error) {
            console.warn('Error filtering existing information request permissions:', error)
            return fields
        }
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
        let requestMeta = null

        try {
            if (typeof approved !== 'boolean') {
                throw new Error('approved flag is required')
            }

            requestMeta = await this._getRequestById(requestId)

            const normalizedFields = Array.from(
                new Set(
                    (Array.isArray(sharedFields) ? sharedFields : [])
                        .map((field) => toSnake(String(field).trim()))
                        .filter(Boolean)
                )
            )

            let targetId = null
            let viewerId = null

            if (approved && normalizedFields.length) {
                targetId = requestMeta?.targetUserId || requestMeta?.target?.id || requestMeta?.targetId?.id
                viewerId = requestMeta?.requesterUserId || requestMeta?.requester?.id || requestMeta?.requesterId?.id
            }

            const filteredFields = approved && normalizedFields.length && targetId && viewerId
                ? await this._filterNewPermissionFields(targetId, viewerId, normalizedFields)
                : normalizedFields

            if (approved && filteredFields.length === 0) {
                console.log('ℹ️ Approving information request without new fields to share.');
            }

            const payload = {
                p_request_id: requestId,
                approved,
                shared_fields_input: filteredFields,
                expires_at_input: expiresAt
            }

            const { error } = await supabase
                .rpc('respond_to_information_request', payload)

            if (error) throw error

            const updated = await this._getRequestById(requestId)

            const targetCacheKey = updated?.targetUserId || updated?.target?.id || updated?.targetId?.id
            if (targetCacheKey) {
                invalidateCache(this._cacheKey('pending', targetCacheKey))
            }

            const requesterCacheKey = updated?.requesterUserId || updated?.requester?.id || updated?.requesterId?.id
            if (requesterCacheKey) {
                invalidateCache(this._cacheKey('sent', requesterCacheKey))
            }

            return updated
        } catch (error) {
            if (error?.code === '23505') {
                console.warn('Duplicate permission detected during respondToRequest, treating as already approved.', error)

                try {
                    // Ensure the information request row is marked as approved even if permissions already exist
                    const { data: updatedRow, error: updateError } = await supabase
                        .from(TABLE_REQUESTS)
                        .update({
                            status: 'approved',
                            responded_at: new Date().toISOString(),
                        })
                        .eq('id', requestId)
                        .select(REQUEST_SELECT)
                        .single()

                    let updatedRequest = null

                    if (updateError) {
                        console.warn('Failed to update request status after duplicate permission error, falling back to existing row.', updateError)
                        updatedRequest = requestMeta || (await this._getRequestById(requestId))
                    } else {
                        updatedRequest = this._normalizeRequest(updatedRow)
                    }

                    const targetCacheKey = updatedRequest?.targetUserId || updatedRequest?.target?.id || updatedRequest?.targetId?.id
                    if (targetCacheKey) {
                        invalidateCache(this._cacheKey('pending', targetCacheKey))
                    }

                    const requesterCacheKey = updatedRequest?.requesterUserId || updatedRequest?.requester?.id || updatedRequest?.requesterId?.id
                    if (requesterCacheKey) {
                        invalidateCache(this._cacheKey('sent', requesterCacheKey))
                    }

                    return updatedRequest
                } catch (fetchError) {
                    console.warn('Failed to finalize approval after duplicate permission error.', fetchError)
                    return { id: requestId }
                }
            }

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

    async getViewerPermissions(targetUserId, viewerUserId = null, options = {}) {
        const { includeExpired = false } = options

        try {
            const viewerId = viewerUserId
                ? await this._ensureUserId(viewerUserId, 'Viewer ID')
                : (await this._ensureAuthenticated()).id
            const resolvedTargetId = await this._ensureUserId(targetUserId, 'Target ID')

            const { data, error } = await supabase
                .from(VIEWER_PERMISSION_TABLE)
                .select('*')
                .eq('viewer_id', viewerId)
                .eq('target_id', resolvedTargetId)
                .order('created_at', { ascending: false })

            if (error) throw error

            const deduped = this._dedupePermissions(data || [], includeExpired)
            const permissionFields = deduped.map(permission => permission.field)
            const camelFields = deduped.map(permission => permission.fieldCamel)
            const sensitiveFields = deduped
                .filter(permission => SENSITIVE_PERMISSION_FIELDS.has(permission.field))
                .map(permission => permission.field)

            const expiresAt = deduped.reduce((acc, permission) => {
                if (!permission.expiresAt) {
                    return acc
                }

                if (!acc) {
                    return permission.expiresAt
                }

                const current = new Date(permission.expiresAt).getTime()
                const existing = new Date(acc).getTime()
                return current < existing ? permission.expiresAt : acc
            }, null)

            return {
                targetId: resolvedTargetId,
                viewerId,
                permissions: permissionFields,
                permissionsCamel: camelFields,
                sensitiveFields,
                entries: deduped,
                expiresAt
            }
        } catch (error) {
            return this._handleError('getViewerPermissions', error)
        }
    }

    async getSharedCaregiverData(targetUserId, viewerUserId = null, options = {}) {
        const { includeExpired = false, includeRaw = false } = options

        try {
            const permissions = await this.getViewerPermissions(targetUserId, viewerUserId, { includeExpired })
            if (!permissions || !Array.isArray(permissions.entries) || permissions.entries.length === 0) {
                return {
                    targetId: permissions?.targetId || null,
                    viewerId: permissions?.viewerId || null,
                    permissions,
                    shared: {},
                    documents: []
                }
            }

            const allowedFields = new Set(permissions.permissions)
            const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }] = await Promise.all([
                supabase
                    .from('users')
                    .select('id,name,email,phone,address,profile_image')
                    .eq('id', permissions.targetId)
                    .maybeSingle(),
                supabase
                    .from('caregiver_profiles')
                    .select('*')
                    .eq('user_id', permissions.targetId)
                    .maybeSingle()
            ])

            if (userError) throw userError
            if (profileError) throw profileError

            const shared = {}
            let documents = []

            if (allowedFields.has('profile_image')) {
                shared.profileImage = userRow?.profile_image || null
            }

            if (allowedFields.has('documents')) {
                documents = this._normalizeDocuments(profileRow?.documents)
                shared.documents = documents
            }

            if (allowedFields.has('background_check')) {
                shared.backgroundCheckStatus = profileRow?.background_check_status || null
            }

            if (allowedFields.has('emergency_contacts')) {
                shared.emergencyContacts = profileRow?.emergency_contacts || []
            }

            if (allowedFields.has('age_care_ranges')) {
                shared.ageCareRanges = profileRow?.age_care_ranges || []
            }

            if (allowedFields.has('portfolio')) {
                shared.portfolio = profileRow?.portfolio || null
            }

            if (allowedFields.has('availability')) {
                shared.availability = profileRow?.availability || null
            }

            if (allowedFields.has('languages')) {
                shared.languages = profileRow?.languages || []
            }

            if (allowedFields.has('phone')) {
                shared.phone = userRow?.phone || null
            }

            if (allowedFields.has('address')) {
                shared.address = userRow?.address || profileRow?.address || null
            }

            const result = {
                targetId: permissions.targetId,
                viewerId: permissions.viewerId,
                permissions,
                shared,
                documents
            }

            if (includeRaw) {
                result.raw = {
                    user: userRow,
                    caregiverProfile: profileRow
                }
            }

            return result
        } catch (error) {
            return this._handleError('getSharedCaregiverData', error)
        }
    }

    async getSharedProfileForViewer(targetUserId, viewerUserId = null, options = {}) {
        const { includeExpired = false, includeRaw = false } = options || {}

        try {
            const sharedData = await this.getSharedCaregiverData(targetUserId, viewerUserId, {
                includeExpired,
                includeRaw
            })

            if (!sharedData) {
                return null
            }

            const sharedProfile = {
                profileImage: sharedData.shared?.profileImage ?? null,
                backgroundCheckStatus: sharedData.shared?.backgroundCheckStatus ?? null,
                emergencyContacts: sharedData.shared?.emergencyContacts ?? [],
                ageCareRanges: sharedData.shared?.ageCareRanges ?? [],
                portfolio: sharedData.shared?.portfolio ?? null,
                availability: sharedData.shared?.availability ?? null,
                languages: sharedData.shared?.languages ?? [],
                phone: sharedData.shared?.phone ?? null,
                address: sharedData.shared?.address ?? null
            }

            const grantedFields = new Set(sharedData.permissions?.permissions || [])
            const grantedFieldsCamel = new Set(sharedData.permissions?.permissionsCamel || [])
            const permissionsMap = {}
            grantedFields.forEach(field => {
                permissionsMap[field] = true
            })
            grantedFieldsCamel.forEach(field => {
                permissionsMap[field] = true
            })

            const permissionsMeta = {
                ...(sharedData.permissions || {}),
                grantedFields: sharedData.permissions?.permissions || [],
                grantedFieldsCamel: sharedData.permissions?.permissionsCamel || [],
                map: permissionsMap
            }

            const response = {
                targetId: sharedData.targetId,
                viewerId: sharedData.viewerId,
                profile: sharedProfile,
                shared: sharedData.shared || {},
                documents: sharedData.documents || [],
                permissions: permissionsMeta
            }

            if (includeRaw && sharedData.raw) {
                response.raw = sharedData.raw
            }

            return response
        } catch (error) {
            return this._handleError('getSharedProfileForViewer', error)
        }
    }
}

export const informationRequestService = new InformationRequestService()
export default informationRequestService