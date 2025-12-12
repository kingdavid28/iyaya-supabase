import { SupabaseBase } from './base'
import supabase from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class UserService extends SupabaseBase {
  async getProfile(userId) {
    try {
      let targetUserId = userId

      if (!targetUserId) {
        const user = await this._getCurrentUser()
        if (!user) {
          console.warn('⚠️ No authenticated user found for getProfile')
          return null
        }
        targetUserId = user.id
      }

      const resolvedUserId = await this._ensureUserId(targetUserId, 'User ID')

      const cacheKey = `profile:${resolvedUserId}`
      const data = await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await this._withTimeout(
          supabase
            .from('users')
            .select(`
              id,
              name,
              email,
              profile_image,
              first_name,
              last_name,
              phone,
              address,
              location,
              role,
              hourly_rate,
              email_verified,
              auth_provider,
              created_at,
              updated_at
            `)
            .eq('id', resolvedUserId)
            .maybeSingle()
        )

        if (error) {
          console.warn('Error getting profile:', error)
          return null
        }

        return data || null
      }, 5 * 60 * 1000)

      if (!data) return null

      return {
        ...data,
        firstName: data.first_name,
        lastName: data.last_name,
        profileImage: data.profile_image,
        hourlyRate: data.hourly_rate,
        emailVerified: data.email_verified,
        authProvider: data.auth_provider,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        displayName: data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email?.split('@')[0] || 'User'
      }
    } catch (error) {
      return this._handleError('getProfile', error, false)
    }
  }

  async updateProfile(userId, updates) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== resolvedUserId) {
        throw new Error('Unauthorized to update this profile')
      }

      const existingUser = await this.getProfile(resolvedUserId)

      if (!existingUser) {
        const userData = {
          id: resolvedUserId,
          email: user.email,
          name: updates.name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: updates.role || user.user_metadata?.role || 'parent',
          first_name: updates.first_name || updates.firstName || user.user_metadata?.first_name,
          last_name: updates.last_name || updates.lastName || user.user_metadata?.last_name,
          phone: updates.phone || user.user_metadata?.phone,
          address: updates.address,
          bio: updates.bio,
          experience: updates.experience,
          hourly_rate: updates.hourly_rate,
          availability: updates.availability,
          skills: updates.skills,
          certifications: updates.certifications,
          profile_image: updates.profile_image,
          status: 'active',
          email_verified: user.email_confirmed_at ? true : false,
          auth_provider: 'supabase',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        Object.keys(userData).forEach(key => {
          if (userData[key] === undefined) {
            delete userData[key]
          }
        })

        const { data, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            return await this.updateProfile(userId, updates)
          }
          throw error
        }
        invalidateCache(`profile:${resolvedUserId}`)
        return data
      }

      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', resolvedUserId)
        .select()
        .single()

      if (error) throw error
      invalidateCache(`profile:${resolvedUserId}`)
      return data
    } catch (error) {
      return this._handleError('updateProfile', error)
    }
  }

  async getCaregivers(filters = {}) {
    try {
      const cacheKey = `caregivers:${JSON.stringify(filters || {})}`

      return await getCachedOrFetch(cacheKey, async () => {
        let query = supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            phone,
            address,
            profile_image,
            rating,
            hourly_rate,
            experience,
            skills,
            bio,
            created_at,
            updated_at,
            profile_data
          `)
          .eq('role', 'caregiver')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (filters.location) {
          query = query.ilike('address', `%${filters.location}%`)
        }

        const { data, error } = await query
        if (error) throw error

        const caregiverIds = (data || []).map(caregiver => caregiver?.id).filter(Boolean)
        let reviewStatsMap = new Map()
        let privacySettingsMap = new Map()

        if (caregiverIds.length) {
          try {
            const { data: privacyRows, error: privacyError } = await supabase
              .from('privacy_settings')
              .select('*')
              .in('user_id', caregiverIds)

            if (privacyError) {
              console.warn('Error fetching privacy settings for caregivers:', privacyError)
            } else if (Array.isArray(privacyRows)) {
              privacySettingsMap = new Map(privacyRows.map((row) => [row.user_id, row]))
            }
          } catch (privacyFetchError) {
            console.warn('Error loading privacy settings:', privacyFetchError)
          }

          try {
            const { data: reviewRows, error: reviewRowsError } = await supabase
              .from('reviews')
              .select('reviewee_id, rating')
              .in('reviewee_id', caregiverIds)

            if (reviewRowsError) {
              console.warn('Error fetching caregiver review rows:', reviewRowsError)
            } else if (Array.isArray(reviewRows) && reviewRows.length) {
              const aggregates = new Map()

              reviewRows.forEach(({ reviewee_id, rating }) => {
                if (!reviewee_id) {
                  return
                }

                const numericRating = Number(rating)
                const bucket = aggregates.get(reviewee_id) || { sum: 0, count: 0 }

                if (Number.isFinite(numericRating)) {
                  bucket.sum += numericRating
                  bucket.count += 1
                }

                aggregates.set(reviewee_id, bucket)
              })

              reviewStatsMap = new Map(
                Array.from(aggregates.entries()).map(([revieweeId, { sum, count }]) => {
                  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : null
                  return [
                    revieweeId,
                    {
                      averageRating: average,
                      reviewCount: count,
                    },
                  ]
                })
              )
            }
          } catch (aggregationError) {
            console.warn('Error processing caregiver review aggregates:', aggregationError)
          }
        }

        const caregiversWithStats = (data || [])
          .map((caregiver) => {
            const privacyRow = privacySettingsMap.get(caregiver.id) || {}
            const profileVisibility = privacyRow.profile_visibility ?? privacyRow.profileVisibility

            if (profileVisibility === false) {
              return null
            }

            const showOnlineStatus = privacyRow.show_online_status ?? privacyRow.showOnlineStatus ?? true
            const allowDirectMessages = privacyRow.allow_direct_messages ?? privacyRow.allowDirectMessages ?? true
            const showRatings = privacyRow.show_ratings ?? privacyRow.showRatings ?? true

            const stats = reviewStatsMap.get(caregiver.id)
            const averageRating = stats?.averageRating ?? caregiver.average_rating ?? caregiver.rating
            const resolvedRating = Number.isFinite(Number(averageRating))
              ? Math.round(Number(averageRating) * 10) / 10
              : 0
            const reviewCount = stats?.reviewCount ?? caregiver.reviewCount ?? caregiver.review_count ?? 0

            const computedTrustScore = showRatings && reviewCount > 0
              ? Math.min(100, Math.round(((resolvedRating / 5) * 80) + Math.min(reviewCount, 20)))
              : null

            return {
              ...caregiver,
              rating: showRatings ? resolvedRating : null,
              average_rating: showRatings ? resolvedRating : null,
              reviewCount: showRatings ? reviewCount : 0,
              review_count: showRatings ? reviewCount : 0,
              trustScore: showRatings ? computedTrustScore ?? 0 : null,
              privacySettings: {
                profileVisibility: profileVisibility ?? true,
                showOnlineStatus,
                allowDirectMessages,
                showRatings,
              },
            }
          })
          .filter(Boolean)

        console.log('✅ Fetched caregivers from Supabase:', caregiversWithStats?.length || 0)
        return caregiversWithStats || []
      }, 60 * 1000)
    } catch (error) {
      return this._handleError('getCaregivers', error)
    }
  }

  async deleteProfile(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', resolvedUserId)

      if (error) throw error
      invalidateCache(`profile:${resolvedUserId}`)
      return { success: true }
    } catch (error) {
      return this._handleError('deleteProfile', error)
    }
  }
}

export const userService = new UserService()