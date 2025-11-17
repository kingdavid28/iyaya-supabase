import { SupabaseBase, supabase } from './base'
import { invalidateCache } from './cache'
import { userService } from './userService'

const normalizeString = (value) => {
    if (value === null || value === undefined) return null
    const stringValue = String(value).trim()
    return stringValue.length ? stringValue : null
}

const toLowerOrNull = (value) => {
    if (!value || typeof value !== 'string') return null
    return value.toLowerCase()
}

const uniqueById = (rows = []) => {
    const map = new Map()
    rows.forEach((row) => {
        if (!row || !row.id) return
        if (!map.has(row.id)) {
            map.set(row.id, row)
        }
    })
    return Array.from(map.values())
}

export class DataService extends SupabaseBase {
    async _resolveUserContext(userId = null, userType = null) {
        const authUser = await this._getCurrentUser()
        const fallbackId = userId || authUser?.id
        if (!fallbackId) {
            throw new Error('Authentication required')
        }

        const resolvedUserId = await this._ensureUserId(fallbackId, 'User ID')

        let profile = null
        try {
            profile = await userService.getProfile(resolvedUserId)
        } catch (error) {
            console.warn('⚠️ dataService: failed to load profile via userService', error?.message || error)
        }

        const resolvedRoleCandidate =
            userType ||
            profile?.role ||
            authUser?.app_metadata?.role ||
            authUser?.user_metadata?.role ||
            authUser?.role ||
            'parent'

        const resolvedRole = toLowerOrNull(resolvedRoleCandidate) || 'parent'

        return {
            resolvedUserId,
            role: resolvedRole,
            profile: profile || null,
            authUser: authUser || null,
        }
    }

    _normalizeProfile(profile, authUser) {
        if (!profile && !authUser) return null

        const source = profile || {}
        const name =
            normalizeString(source.displayName || source.name) ||
            normalizeString(`${source.firstName || ''} ${source.lastName || ''}`) ||
            normalizeString(authUser?.user_metadata?.name) ||
            normalizeString(authUser?.email?.split('@')[0])

        return {
            id: source.id || authUser?.id || null,
            name: name || 'User Profile',
            email: normalizeString(source.email || authUser?.email) || 'Unknown email',
            phone: normalizeString(source.phone || authUser?.phone) || null,
            role:
                normalizeString(
                    source.role || authUser?.app_metadata?.role || authUser?.user_metadata?.role
                ) || 'parent',
            profileImage:
                normalizeString(
                    source.profileImage || source.profile_image || authUser?.user_metadata?.profile_image
                ) || null,
            status: normalizeString(source.status) || 'Active',
            createdAt: source.createdAt || source.created_at || authUser?.created_at || null,
            updatedAt: source.updatedAt || source.updated_at || null,
        }
    }

    async _fetchJobs(userId, role) {
        try {
            if (role === 'parent') {
                const { data, error } = await supabase
                    .from('jobs')
                    .select('id,title,status,location,created_at,updated_at')
                    .eq('parent_id', userId)
                    .order('created_at', { ascending: false })

                if (error) throw error

                return (data || []).map((job) => ({
                    id: job.id,
                    name: normalizeString(job.title) || 'Job listing',
                    title: job.title,
                    status: job.status,
                    location: job.location,
                    createdAt: job.created_at,
                    updatedAt: job.updated_at,
                    type: 'job',
                }))
            }

            const { data, error } = await supabase
                .from('applications')
                .select(
                    `
          id,
          applied_at,
          status,
          jobs:jobs!inner(
            id,
            title,
            status,
            location,
            created_at,
            updated_at,
            parent:users!jobs_parent_id_fkey(id,name)
          )
        `
                )
                .eq('caregiver_id', userId)
                .order('applied_at', { ascending: false })

            if (error) throw error

            const normalized = []
                ; (data || []).forEach((row) => {
                    if (!row?.jobs) return
                    normalized.push({
                        id: row.jobs.id,
                        name: normalizeString(row.jobs.title) || 'Job listing',
                        title: row.jobs.title,
                        status: row.jobs.status,
                        location: row.jobs.location,
                        createdAt: row.jobs.created_at,
                        updatedAt: row.jobs.updated_at,
                        appliedAt: row.applied_at,
                        parentName: normalizeString(row.jobs.parent?.name) || null,
                        type: 'job',
                    })
                })

            return uniqueById(normalized)
        } catch (error) {
            return this._handleError('dataService._fetchJobs', error, false) || []
        }
    }

    async _fetchBookings(userId, role) {
        try {
            const column = role === 'parent' ? 'parent_id' : 'caregiver_id'

            const { data, error } = await supabase
                .from('bookings')
                .select(
                    `
          id,
          status,
          date,
          start_time,
          end_time,
          total_amount,
          address,
          created_at,
          updated_at,
          parent:users!bookings_parent_id_fkey(id,name,email),
          caregiver:users!bookings_caregiver_id_fkey(id,name,email)
        `
                )
                .eq(column, userId)
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map((booking) => ({
                id: booking.id,
                name:
                    role === 'parent'
                        ? normalizeString(booking.caregiver?.name) || 'Caregiver'
                        : normalizeString(booking.parent?.name) || 'Family',
                status: booking.status,
                date: booking.date,
                startTime: booking.start_time,
                endTime: booking.end_time,
                totalAmount: booking.total_amount,
                location: booking.address,
                createdAt: booking.created_at,
                updatedAt: booking.updated_at,
                parentName: normalizeString(booking.parent?.name) || null,
                caregiverName: normalizeString(booking.caregiver?.name) || null,
                type: 'booking',
            }))
        } catch (error) {
            return this._handleError('dataService._fetchBookings', error, false) || []
        }
    }

    async _fetchApplications(userId, role) {
        try {
            if (role === 'parent') {
                const { data, error } = await supabase
                    .from('applications')
                    .select(
                        `
            id,
            status,
            message,
            applied_at,
            created_at,
            caregiver:users!caregiver_id(id,name,email),
            jobs!inner(
              id,
              title,
              location
            )
          `
                    )
                    .eq('jobs.parent_id', userId)
                    .order('applied_at', { ascending: false })

                if (error) throw error

                return (data || []).map((application) => ({
                    id: application.id,
                    name: normalizeString(application.caregiver?.name) || 'Caregiver application',
                    status: application.status,
                    message: application.message,
                    jobId: application.jobs?.id || null,
                    jobTitle: normalizeString(application.jobs?.title) || null,
                    jobLocation: normalizeString(application.jobs?.location) || null,
                    appliedAt: application.applied_at,
                    createdAt: application.created_at,
                    type: 'application',
                }))
            }

            const { data, error } = await supabase
                .from('applications')
                .select(
                    `
          id,
          status,
          message,
          applied_at,
          created_at,
          jobs(
            id,
            title,
            location,
            parent:users!jobs_parent_id_fkey(id,name)
          )
        `
                )
                .eq('caregiver_id', userId)
                .order('applied_at', { ascending: false })

            if (error) throw error

            return (data || []).map((application) => ({
                id: application.id,
                name: normalizeString(application.jobs?.title) || 'Job application',
                status: application.status,
                message: application.message,
                appliedAt: application.applied_at,
                createdAt: application.created_at,
                jobId: application.jobs?.id || null,
                jobTitle: normalizeString(application.jobs?.title) || null,
                parentName: normalizeString(application.jobs?.parent?.name) || null,
                jobLocation: normalizeString(application.jobs?.location) || null,
                type: 'application',
            }))
        } catch (error) {
            return this._handleError('dataService._fetchApplications', error, false) || []
        }
    }

    async _fetchChildren(userId) {
        try {
            const { data, error } = await supabase
                .from('children')
                .select('id,name,age,allergies,notes,preferences,created_at,updated_at,parent_id')
                .eq('parent_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        } catch (error) {
            return this._handleError('dataService._fetchChildren', error, false) || []
        }
    }

    async _fetchMessages(userId) {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select('id,conversation_id,sender_id,recipient_id,content,message_type,created_at,updated_at')
                .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(200)

            if (error) throw error
            return data || []
        } catch (error) {
            return this._handleError('dataService._fetchMessages', error, false) || []
        }
    }

    async _fetchNotifications(userId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('id,user_id,type,title,message,read,created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(200)

            if (error) throw error
            return data || []
        } catch (error) {
            return this._handleError('dataService._fetchNotifications', error, false) || []
        }
    }

    async _fetchReviews(userId) {
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select('id,reviewer_id,reviewee_id,rating,comment,created_at,updated_at')
                .or(`reviewer_id.eq.${userId},reviewee_id.eq.${userId}`)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        } catch (error) {
            return this._handleError('dataService._fetchReviews', error, false) || []
        }
    }

    async _fetchDataUsageForUser(userId, role) {
        const [jobs, bookings, applications] = await Promise.all([
            this._fetchJobs(userId, role),
            this._fetchBookings(userId, role),
            this._fetchApplications(userId, role),
        ])

        return {
            jobs,
            bookings,
            applications,
        }
    }

    async getDataUsage(userId = null, userType = null) {
        try {
            const { resolvedUserId, role, profile, authUser } = await this._resolveUserContext(
                userId,
                userType
            )
            const usage = await this._fetchDataUsageForUser(resolvedUserId, role)
            const normalizedProfile = this._normalizeProfile(profile, authUser)

            return {
                profile: normalizedProfile ? [normalizedProfile] : [],
                jobs: usage.jobs,
                bookings: usage.bookings,
                applications: usage.applications,
            }
        } catch (error) {
            return (
                this._handleError('dataService.getDataUsage', error, false) || {
                    profile: [],
                    jobs: [],
                    bookings: [],
                    applications: [],
                }
            )
        }
    }

    async exportUserData(userId = null, userType = null) {
        const { resolvedUserId, role, profile, authUser } = await this._resolveUserContext(
            userId,
            userType
        )

        const usage = await this._fetchDataUsageForUser(resolvedUserId, role)
        const [children, messages, notifications, reviews] = await Promise.all([
            role === 'parent' ? this._fetchChildren(resolvedUserId) : Promise.resolve([]),
            this._fetchMessages(resolvedUserId),
            this._fetchNotifications(resolvedUserId),
            this._fetchReviews(resolvedUserId),
        ])

        return {
            exportedAt: new Date().toISOString(),
            user: {
                id: resolvedUserId,
                email: profile?.email || authUser?.email || null,
                role,
            },
            profile: profile || this._normalizeProfile(profile, authUser),
            jobs: usage.jobs,
            bookings: usage.bookings,
            applications: usage.applications,
            children,
            messages,
            notifications,
            reviews,
        }
    }

    async deleteUserData(userId = null, userType = null) {
        const { resolvedUserId, role } = await this._resolveUserContext(userId, userType)
        const summary = {
            jobsDeleted: 0,
            bookingsDeleted: 0,
            applicationsDeleted: 0,
            childrenDeleted: 0,
            messagesDeleted: 0,
            notificationsDeleted: 0,
            reviewsDeleted: 0,
        }

        const runDelete = async (label, queryBuilder) => {
            try {
                const { data, error } = await queryBuilder
                if (error) throw error
                summary[label] += data?.length || 0
            } catch (error) {
                this._handleError(`dataService.deleteUserData.${label}`, error, false)
            }
        }

        const fetchIds = async (label, queryBuilder) => {
            try {
                const { data, error } = await queryBuilder
                if (error) throw error
                return (data || []).map((row) => row.id).filter(Boolean)
            } catch (error) {
                this._handleError(`dataService.deleteUserData.${label}`, error, false)
                return []
            }
        }

        if (role === 'parent') {
            const { data: jobRows, error: jobFetchError } = await supabase
                .from('jobs')
                .select('id')
                .eq('parent_id', resolvedUserId)

            if (!jobFetchError && jobRows?.length) {
                const jobIds = jobRows.map((row) => row.id)
                await runDelete(
                    'applicationsDeleted',
                    supabase.from('applications').delete().in('job_id', jobIds).select('id')
                )

                await runDelete('jobsDeleted', supabase.from('jobs').delete().in('id', jobIds).select('id'))
            }

            await runDelete(
                'childrenDeleted',
                supabase.from('children').delete().eq('parent_id', resolvedUserId).select('id')
            )

            await runDelete(
                'bookingsDeleted',
                supabase.from('bookings').delete().eq('parent_id', resolvedUserId).select('id')
            )
        } else {
            await runDelete(
                'applicationsDeleted',
                supabase.from('applications').delete().eq('caregiver_id', resolvedUserId).select('id')
            )

            await runDelete(
                'bookingsDeleted',
                supabase.from('bookings').delete().eq('caregiver_id', resolvedUserId).select('id')
            )
        }

        const messageIds = await fetchIds(
            'messagesFetch',
            supabase
                .from('messages')
                .select('id')
                .or(`sender_id.eq.${resolvedUserId},recipient_id.eq.${resolvedUserId}`)
        )

        if (messageIds.length) {
            await runDelete(
                'messagesDeleted',
                supabase.from('messages').delete().in('id', messageIds).select('id')
            )
        }

        await runDelete(
            'notificationsDeleted',
            supabase.from('notifications').delete().eq('user_id', resolvedUserId).select('id')
        )

        const reviewIds = await fetchIds(
            'reviewsFetch',
            supabase
                .from('reviews')
                .select('id')
                .or(`reviewer_id.eq.${resolvedUserId},reviewee_id.eq.${resolvedUserId}`)
        )

        if (reviewIds.length) {
            await runDelete(
                'reviewsDeleted',
                supabase.from('reviews').delete().in('id', reviewIds).select('id')
            )
        }

        await supabase
            .from('conversations')
            .delete()
            .or(`participant_1.eq.${resolvedUserId},participant_2.eq.${resolvedUserId}`)

        invalidateCache('profile:')
        invalidateCache('jobs:')
        invalidateCache('bookings:')
        invalidateCache('applications:')
        invalidateCache('messages:')
        invalidateCache('notifications:')

        return {
            success: true,
            summary,
        }
    }
}

export const dataService = new DataService()