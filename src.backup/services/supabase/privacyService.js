// c:/Users/reycel/Documents/iyayabeforereadme/forTransferIyaya/iyayaSupa/src/services/supabase/privacyService.js
import { SupabaseBase, supabase } from './base.js'
import { getCachedOrFetch, invalidateCache } from './cache.js'
import { notificationService } from './notificationService.js'

// Database artefacts
const TABLE_SETTINGS = 'privacy_settings'
const TABLE_PERMISSIONS = 'privacy_permissions'
const TABLE_NOTIFICATIONS = 'privacy_notifications'
const VIEW_PERMISSIONS_EXT = 'privacy_permissions_enriched'
const RPC_UPSERT_SETTINGS = 'upsert_privacy_settings'
const RPC_GRANT_PERMISSION = 'grant_privacy_permission'
const RPC_REVOKE_PERMISSION = 'revoke_privacy_permission'
const CACHE_TTL_MS = 30 * 1000

// Canonical set of supported privacy toggles
const DEFAULT_SETTINGS = {
    // High-level visibility toggles
    profileVisibility: true,
    showOnlineStatus: true,
    allowDirectMessages: true,
    showRatings: true,

    // Data sharing toggle intentionally omitted until analytics pipeline honors it

    // Legacy granular toggles
    sharePhone: false,
    shareAddress: false,
    shareEmergencyContact: false,
    shareChildMedicalInfo: false,
    shareChildAllergies: false,
    shareChildBehaviorNotes: false,
    shareFinancialInfo: false,
    shareDocuments: false,
    shareBackgroundCheck: false,
    sharePortfolio: false,
    shareAvailability: false,
    shareLanguages: false,
    shareReferences: false,
    shareRateHistory: false,
    shareWorkHistory: false,
    autoApproveBasicInfo: true
}

// Helpers
const toCamel = (input = '') => input.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

const toSnake = (input = '') =>
    String(input)
        .trim()
        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
        .replace(/[^a-z\d_]+/gi, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase()

const normalizeSettingsRow = (row) => {
    if (!row) return { ...DEFAULT_SETTINGS }

    return Object.keys(DEFAULT_SETTINGS).reduce((acc, key) => {
        const snakeKey = toSnake(key)
        acc[key] = row?.[snakeKey] ?? row?.[key] ?? DEFAULT_SETTINGS[key]
        return acc
    }, {})
}

const normalizePermissionRow = (row) => {
    if (!row) return null

    return {
        id: row.id,
        targetId: row.target_id,
        viewerId: row.viewer_id,
        field: row.field,
        fieldCamel: toCamel(row.field),
        grantedBy: row.granted_by,
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        status: row.status || 'active',
        metadata: row.metadata || {}
    }
}

const normalizeNotificationRow = (row) => {
    if (!row) return null

    return {
        id: row.id,
        userId: row.user_id,
        requestId: row.request_id,
        type: row.type,
        title: row.title,
        message: row.message,
        data: row.data || {},
        read: Boolean(row.read),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at).toISOString() : null
    }
}

const isMissingTableError = (error, tableName) => {
    if (!error) return false
    if (error.code === 'PGRST205') return true
    const message = String(error.message || '').toLowerCase()
    const hint = String(error.hint || '').toLowerCase()
    return message.includes('could not find the table') || hint.includes(`'public.${tableName?.toLowerCase?.()}'`)
}

const isMissingColumnError = (error) => {
    if (!error) return false
    const code = String(error.code || '')
    if (code === '42703' || code === 'PGRST204') return true
    const message = String(error.message || '').toLowerCase()
    return message.includes('column') && (message.includes('does not exist') || message.includes('could not find'))
}

const extractMissingColumnName = (error) => {
    if (!error) return null
    const message = String(error.message || '')
    const match = message.match(/'([^']+)'/)
    return match ? match[1] : null
}

class PrivacyService extends SupabaseBase {
    constructor() {
        super()
        this._settingsSchema = null
        this._missingColumnsBySchema = {
            camel: new Set(),
            snake: new Set()
        }
    }

    _settingsCacheKey(userId) {
        return `privacy-settings:${userId}`
    }

    async _detectSettingsSchema() {
        if (this._settingsSchema) {
            return this._settingsSchema
        }

        try {
            const { data } = await supabase
                .from(TABLE_SETTINGS)
                .select('*')
                .limit(1)
                .maybeSingle()

            if (data && typeof data === 'object') {
                const hasCamel = Object.prototype.hasOwnProperty.call(data, 'userId')
                    || Object.keys(data).some((key) => !key.includes('_') && key !== key.toLowerCase())

                this._settingsSchema = hasCamel ? 'camel' : 'snake'
                return this._settingsSchema
            }
        } catch (error) {
            if (!isMissingTableError(error, TABLE_SETTINGS)) {
                console.warn('Unable to detect privacy settings schema:', error)
            }
        }

        this._settingsSchema = 'snake'
        return this._settingsSchema
    }

    _permissionsCacheKey(targetId, viewerId) {
        return `privacy-permissions:${targetId}:${viewerId}`
    }

    _notificationsCacheKey(userId) {
        return `privacy-notifications:${userId}`
    }

    async _requireCurrentUserId() {
        const current = await this._ensureAuthenticated()
        return current.id
    }

    async _resolveTargetUserId(userId) {
        if (userId) {
            return this._ensureUserId(userId, 'Target user ID')
        }
        return this._requireCurrentUserId()
    }

    async getPrivacySettings(userId = null) {
        try {
            const targetId = await this._resolveTargetUserId(userId)
            const cacheKey = this._settingsCacheKey(targetId)

            const data = await getCachedOrFetch(
                cacheKey,
                async () => {
                    const { data, error } = await supabase
                        .from(TABLE_SETTINGS)
                        .select('*')
                        .eq('user_id', targetId)
                        .maybeSingle()

                    if (error) {
                        if (isMissingTableError(error, TABLE_SETTINGS)) {
                            console.warn('⚠️ privacy_settings table not found - returning defaults')
                            return { ...DEFAULT_SETTINGS }
                        }
                        throw error
                    }
                    return normalizeSettingsRow(data)
                },
                CACHE_TTL_MS
            )

            return { userId: targetId, data }
        } catch (error) {
            if (isMissingTableError(error, TABLE_SETTINGS)) {
                console.warn('⚠️ Falling back to default privacy settings due to missing table')
                return { userId: userId || null, data: { ...DEFAULT_SETTINGS } }
            }
            return this._handleError('getPrivacySettings', error)
        }
    }

    async updatePrivacySettings(userId = null, settings = {}) {
        try {
            const targetId = await this._resolveTargetUserId(userId)
            const preferredSchema = await this._detectSettingsSchema()
            const schemasToTry = preferredSchema === 'camel' ? ['camel', 'snake'] : ['snake', 'camel']
            let lastError = null

            const buildPayload = (schema) => {
                const userIdKey = schema === 'camel' ? 'userId' : 'user_id'
                const updatedAtKey = schema === 'camel' ? 'updatedAt' : 'updated_at'
                const missingColumns = this._missingColumnsBySchema[schema] ?? (this._missingColumnsBySchema[schema] = new Set())

                const row = {
                    [userIdKey]: targetId,
                    [updatedAtKey]: new Date().toISOString()
                }

                Object.keys(DEFAULT_SETTINGS).forEach((key) => {
                    const columnKey = schema === 'camel' ? key : toSnake(key)
                    if (missingColumns.has(columnKey)) return
                    row[columnKey] = settings[key] !== undefined ? Boolean(settings[key]) : DEFAULT_SETTINGS[key]
                })

                return { row, userIdKey }
            }

            const attemptSchema = async (schema) => {
                const missingColumns = this._missingColumnsBySchema[schema] ?? (this._missingColumnsBySchema[schema] = new Set())

                let shouldRetry = true
                while (shouldRetry) {
                    shouldRetry = false
                    const { row, userIdKey } = buildPayload(schema)
                    const { data, error } = await supabase
                        .from(TABLE_SETTINGS)
                        .upsert(row, { onConflict: userIdKey })
                        .select('*')
                        .maybeSingle()

                    if (error) {
                        if (isMissingColumnError(error)) {
                            const missingColumnRaw = extractMissingColumnName(error)
                            if (missingColumnRaw) {
                                const normalizedColumn = schema === 'camel' ? missingColumnRaw : toSnake(missingColumnRaw)
                                if (!missingColumns.has(normalizedColumn)) {
                                    missingColumns.add(normalizedColumn)
                                    shouldRetry = true
                                    continue
                                }
                            }
                        }
                        throw error
                    }

                    let storedRow = data
                    if (!storedRow) {
                        const { data: fetched, error: fetchError } = await supabase
                            .from(TABLE_SETTINGS)
                            .select('*')
                            .eq(userIdKey, targetId)
                            .maybeSingle()

                        if (fetchError) throw fetchError
                        storedRow = fetched
                    }

                    invalidateCache(this._settingsCacheKey(targetId))
                    this._settingsSchema = schema

                    return {
                        storedRow
                    }
                }
            }

            for (let index = 0; index < schemasToTry.length; index += 1) {
                const schema = schemasToTry[index]
                try {
                    const { storedRow } = await attemptSchema(schema)

                    return {
                        userId: targetId,
                        data: normalizeSettingsRow(storedRow)
                    }
                } catch (schemaError) {
                    lastError = schemaError
                    if (isMissingColumnError(schemaError) && index < schemasToTry.length - 1) {
                        this._settingsSchema = null
                        continue
                    }
                    break
                }
            }

            throw lastError
        } catch (error) {
            return this._handleError('updatePrivacySettings', error)
        }
    }

    async getViewerPermissions(targetUserId, viewerUserId = null, options = {}) {
        const { includeExpired = false } = options

        try {
            const targetId = await this._ensureUserId(targetUserId, 'Target user ID')
            const viewerId = await this._ensureUserId(
                viewerUserId || (await this._requireCurrentUserId()),
                'Viewer user ID'
            )

            const cacheKey = this._permissionsCacheKey(targetId, viewerId)
            const entries = await getCachedOrFetch(
                cacheKey,
                async () => {
                    const { data, error } = await supabase
                        .from(VIEW_PERMISSIONS_EXT)
                        .select('*')
                        .eq('target_id', targetId)
                        .eq('viewer_id', viewerId)
                        .order('created_at', { ascending: false })

                    if (error) throw error
                    return (data || []).map(normalizePermissionRow)
                },
                CACHE_TTL_MS
            )

            const now = Date.now()
            const filtered = includeExpired
                ? entries
                : entries.filter(
                    (permission) =>
                        !permission.expiresAt ||
                        new Date(permission.expiresAt).getTime() > now ||
                        permission.status === 'permanent'
                )

            const permissions = Array.from(new Set(filtered.map((permission) => permission.field)))
            const permissionsCamel = Array.from(new Set(filtered.map((permission) => permission.fieldCamel)))

            const expiresAt = filtered.reduce((acc, permission) => {
                if (!permission.expiresAt) return acc
                const expiresMs = new Date(permission.expiresAt).getTime()
                if (!acc) return expiresMs
                return Math.min(acc, expiresMs)
            }, null)

            return {
                targetId,
                viewerId,
                entries: filtered,
                permissions,
                permissionsCamel,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
            }
        } catch (error) {
            return this._handleError('getViewerPermissions', error)
        }
    }

    async grantPermission({ targetUserId, viewerUserId, fields = [], metadata = {}, expiresAt = null }) {
        try {
            if (!Array.isArray(fields) || fields.length === 0) {
                throw new Error('At least one field must be provided')
            }

            const targetId = await this._ensureUserId(targetUserId, 'Target user ID')
            const viewerId = await this._ensureUserId(viewerUserId, 'Viewer user ID')
            const grantingUserId = await this._requireCurrentUserId()

            const payload = {
                p_target_id: targetId,
                p_viewer_id: viewerId,
                p_fields: fields.map((field) => toSnake(field)),
                p_granted_by: grantingUserId,
                p_expires_at: expiresAt,
                p_metadata: metadata
            }

            const { data, error } = await supabase.rpc(RPC_GRANT_PERMISSION, payload)
            if (error) throw error

            invalidateCache(this._permissionsCacheKey(targetId, viewerId))
            invalidateCache(this._notificationsCacheKey(targetId))

            const entries = Array.isArray(data) ? data : data ? [data] : []
            return {
                targetId,
                viewerId,
                permissions: entries.map(normalizePermissionRow)
            }
        } catch (error) {
            return this._handleError('grantPermission', error)
        }
    }

    async revokePermission(targetUserId, viewerUserId, fields = null) {
        try {
            const targetId = await this._ensureUserId(targetUserId, 'Target user ID')
            const viewerId = await this._ensureUserId(viewerUserId, 'Viewer user ID')

            const payload = {
                p_target_id: targetId,
                p_viewer_id: viewerId,
                p_fields: Array.isArray(fields) && fields.length ? fields.map(toSnake) : null
            }

            const { data, error } = await supabase.rpc(RPC_REVOKE_PERMISSION, payload)
            if (error) throw error

            invalidateCache(this._permissionsCacheKey(targetId, viewerId))
            invalidateCache(this._notificationsCacheKey(targetId))

            const entries = Array.isArray(data) ? data : data ? [data] : []
            return {
                targetId,
                viewerId,
                revoked: fields,
                permissions: entries.map(normalizePermissionRow)
            }
        } catch (error) {
            return this._handleError('revokePermission', error)
        }
    }

    async getPrivacyNotifications(userId = null, options = {}) {
        const { includeRead = true } = options
        try {
            const targetId = await this._resolveTargetUserId(userId)
            const cacheKey = this._notificationsCacheKey(targetId)

            const entries = await getCachedOrFetch(
                cacheKey,
                async () => {
                    let query = supabase
                        .from(TABLE_NOTIFICATIONS)
                        .select('*')
                        .eq('user_id', targetId)
                        .order('created_at', { ascending: false })

                    if (!includeRead) {
                        query = query.eq('read', false)
                    }

                    const { data, error } = await query
                    if (error) {
                        if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                            console.warn('⚠️ privacy_notifications table not found - returning empty notifications')
                            return []
                        }
                        throw error
                    }
                    return (data || []).map(normalizeNotificationRow)
                },
                CACHE_TTL_MS
            )

            const unreadCount = entries.filter((entry) => !entry.read).length
            return {
                userId: targetId,
                data: entries,
                unreadCount
            }
        } catch (error) {
            if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                console.warn('⚠️ Falling back to empty privacy notifications due to missing table')
                return { userId: userId || null, data: [], unreadCount: 0 }
            }
            return this._handleError('getPrivacyNotifications', error)
        }
    }

    async markNotificationAsRead(notificationId, userId = null) {
        try {
            this._validateId(notificationId, 'Notification ID')
            const targetId = await this._resolveTargetUserId(userId)

            const { data, error } = await supabase
                .from(TABLE_NOTIFICATIONS)
                .update({
                    read: true,
                    acknowledged_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .eq('user_id', targetId)
                .select()
                .single()

            if (error) {
                if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                    console.warn('⚠️ privacy_notifications table not found - skipping markNotificationAsRead')
                    return null
                }
                throw error
            }

            invalidateCache(this._notificationsCacheKey(targetId))

            return normalizeNotificationRow(data)
        } catch (error) {
            if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                return null
            }
            return this._handleError('markNotificationAsRead', error)
        }
    }

    async acknowledgeNotifications(userId = null, notificationIds = []) {
        try {
            const targetId = await this._resolveTargetUserId(userId)

            if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
                return []
            }

            const { data, error } = await supabase
                .from(TABLE_NOTIFICATIONS)
                .update({
                    read: true,
                    acknowledged_at: new Date().toISOString()
                })
                .in('id', notificationIds)
                .eq('user_id', targetId)
                .select()

            if (error) {
                if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                    console.warn('⚠️ privacy_notifications table not found - skipping acknowledgeNotifications')
                    return []
                }
                throw error
            }

            invalidateCache(this._notificationsCacheKey(targetId))

            return (data || []).map(normalizeNotificationRow)
        } catch (error) {
            if (isMissingTableError(error, TABLE_NOTIFICATIONS)) {
                return []
            }
            return this._handleError('acknowledgeNotifications', error)
        }
    }

    async notifyPrivacyEvent({ userId, type, title, message, data = {} }) {
        try {
            const targetId = await this._ensureUserId(userId, 'Notification user ID')

            await notificationService.createNotification({
                user_id: targetId,
                type: type || 'privacy',
                title,
                message,
                data: {
                    ...data,
                    notificationCategory: 'privacy'
                }
            })

            invalidateCache(this._notificationsCacheKey(targetId))
            return true
        } catch (error) {
            return this._handleError('notifyPrivacyEvent', error, false)
        }
    }
}

export const privacyService = new PrivacyService()
export default privacyService