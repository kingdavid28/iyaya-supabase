import { SupabaseBase } from './base'
import supabase from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class ChildrenService extends SupabaseBase {
  async getChildren(parentId) {
    try {
      let targetParentId = parentId
      
      if (!targetParentId) {
        const user = await this._getCurrentUser()
        if (!user) {
          console.warn('⚠️ No authenticated user found for getChildren')
          return []
        }
        targetParentId = user.id
      }
      
      this._validateId(targetParentId, 'Parent ID')
      
      const cacheKey = `children:${targetParentId}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('children')
          .select(`
            id,
            parent_id,
            name,
            age,
            allergies,
            notes,
            preferences,
            created_at,
            updated_at
          `)
          .eq('parent_id', targetParentId)
          .order('created_at', { ascending: true })
        
        if (error) throw error
        return data || []
      }, 60 * 1000)
    } catch (error) {
      console.warn('⚠️ getChildren error:', error.message)
      return []
    }
  }

  async addChild(parentId, childData) {
    try {
      this._validateId(parentId, 'Parent ID')
      this._validateRequiredFields(childData, ['name'], 'addChild')

      const user = await this._getCurrentUser()
      if (!user) {
        throw new Error('User authentication required to add child')
      }
      
      if (user.id !== parentId) {
        console.warn('⚠️ Parent ID mismatch, but proceeding with current user ID')
        parentId = user.id
      }
      
      const childRecord = {
        parent_id: parentId,
        name: childData.name.trim(),
        age: childData.age ? parseInt(childData.age) : null,
        allergies: childData.allergies?.trim() || null,
        notes: childData.notes?.trim() || childData.preferences?.trim() || null,
        created_at: new Date().toISOString()
      }
      
      console.log('👶 Adding child:', childRecord)
      
      const { data, error } = await supabase
        .from('children')
        .insert([childRecord])
        .select()
        .single()
      
      if (error) throw error
      invalidateCache(`children:${parentId}`)
      console.log('✅ Child added successfully:', data)
      return data
    } catch (error) {
      return this._handleError('addChild', error)
    }
  }

  async updateChild(childId, updates) {
    try {
      this._validateId(childId, 'Child ID')
      
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const { data: existingChild, error: checkError } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .maybeSingle()
      
      if (checkError) throw checkError
      
      if (!existingChild) {
        throw new Error('Child not found')
      }

      const childRecord = {
        ...updates,
        name: updates.name?.trim(),
        age: updates.age ? parseInt(updates.age) : null,
        allergies: updates.allergies?.trim() || null,
        notes: updates.notes?.trim() || updates.preferences?.trim() || null,
        updated_at: new Date().toISOString()
      }
      
      Object.keys(childRecord).forEach(key => {
        if (childRecord[key] === undefined) {
          delete childRecord[key]
        }
      })
      
      const { data, error } = await supabase
        .from('children')
        .update(childRecord)
        .eq('id', childId)
        .select()
        .single()
      
      if (error) throw error
      if (data?.parent_id) {
        invalidateCache(`children:${data.parent_id}`)
      }
      return data
    } catch (error) {
      return this._handleError('updateChild', error)
    }
  }

  async deleteChild(childId) {
    try {
      this._validateId(childId, 'Child ID')
      
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)
      
      if (error) throw error
      invalidateCache('children:')
      return { success: true }
    } catch (error) {
      return this._handleError('deleteChild', error)
    }
  }

  // Aliases
  async createChild(parentId, childData) {
    return await this.addChild(parentId, childData)
  }

  async removeChild(childId) {
    return await this.deleteChild(childId)
  }
}

export const childrenService = new ChildrenService()