import { SupabaseBase, supabase } from './base'

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
      
      this._validateId(targetUserId, 'User ID')
      
      const { data, error } = await this._withTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle()
      )
      
      if (error) {
        console.warn('Error getting profile:', error)
        return null
      }
      
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
      this._validateId(userId, 'User ID')
      
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        throw new Error('Unauthorized to update this profile')
      }

      const existingUser = await this.getProfile(userId)
      
      if (!existingUser) {
        const userData = {
          id: user.id,
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
        return data
      }
      
      const { data, error } = await supabase
        .from('users')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateProfile', error)
    }
  }

  async getCaregivers(filters = {}) {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'caregiver')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (filters.location) {
        query = query.ilike('address', `%${filters.location}%`)
      }

      const { data, error } = await query
      if (error) throw error
      
      console.log('✅ Fetched caregivers from Supabase:', data?.length || 0)
      return data || []
    } catch (error) {
      return this._handleError('getCaregivers', error)
    }
  }
}

export const userService = new UserService()