import { SupabaseBase, supabase } from './base'

export class JobService extends SupabaseBase {
  async getJobs(filters = {}) {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          users(name, email, phone)
        `)
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.location) {
        query = query.ilike('location', `%${filters.location}%`)
      }

      if (filters.urgent !== undefined) {
        query = query.eq('urgent', filters.urgent)
      }

      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      if (error) throw error
      
      return data?.map(job => ({
        ...job,
        parentId: job.parent_id,
        clientId: job.parent_id,
        startTime: job.start_time,
        endTime: job.end_time,
        hourlyRate: job.hourly_rate,
        numberOfChildren: job.number_of_children,
        childrenAges: job.children_ages,
        specialInstructions: job.special_instructions,
        contactPhone: job.contact_phone,
        emergencyContact: job.emergency_contact,
        rate: job.hourly_rate,
        workingHours: job.start_time && job.end_time ? 
          `${job.start_time.slice(0, 5)} - ${job.end_time.slice(0, 5)}` : 
          null
      })) || []
    } catch (error) {
      return this._handleError('getJobs', error)
    }
  }

  async getMyJobs(clientId) {
    try {
      this._validateId(clientId, 'Client ID')
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          applications(id)
        `)
        .eq('parent_id', clientId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data?.map(job => ({
        ...job,
        parentId: job.parent_id,
        clientId: job.parent_id,
        startTime: job.start_time,
        endTime: job.end_time,
        hourlyRate: job.hourly_rate,
        numberOfChildren: job.number_of_children,
        childrenAges: job.children_ages,
        specialInstructions: job.special_instructions,
        contactPhone: job.contact_phone,
        emergencyContact: job.emergency_contact,
        rate: job.hourly_rate,
        workingHours: job.start_time && job.end_time ? 
          `${job.start_time.slice(0, 5)} - ${job.end_time.slice(0, 5)}` : 
          null
      })) || []
    } catch (error) {
      return this._handleError('getMyJobs', error)
    }
  }

  async createJob(jobData) {
    try {
      let parentId = jobData.parent_id || jobData.parentId || jobData.client_id || jobData.clientId
      
      if (!parentId) {
        const user = await this._getCurrentUser()
        if (!user) {
          throw new Error('User authentication required to create job')
        }
        parentId = user.id
      }
      
      this._validateId(parentId, 'Parent ID')

      const convertTo24Hour = (timeStr) => {
        if (!timeStr) return '08:00:00'
        
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
        if (!timeMatch) {
          const simpleMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
          if (simpleMatch) {
            const [_, hours, minutes] = simpleMatch
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
          }
          return '08:00:00'
        }
        
        let [_, hours, minutes, period] = timeMatch
        hours = parseInt(hours)
        minutes = parseInt(minutes)
        
        if (period && period.toUpperCase() === 'PM' && hours !== 12) hours += 12
        if (period && period.toUpperCase() === 'AM' && hours === 12) hours = 0
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
      }

      let startTime = '08:00:00'
      let endTime = '17:00:00'
      
      if (jobData.workingHours) {
        const patterns = [
          /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,
          /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/,
          /(\d{1,2}\s*(?:AM|PM))\s*-\s*(\d{1,2}\s*(?:AM|PM))/i
        ]
        
        for (const pattern of patterns) {
          const timeMatch = jobData.workingHours.match(pattern)
          if (timeMatch) {
            startTime = convertTo24Hour(timeMatch[1].trim())
            endTime = convertTo24Hour(timeMatch[2].trim())
            break
          }
        }
      }

      const dbJobData = {
        parent_id: parentId,
        title: jobData.title || 'Childcare Position',
        description: jobData.description || 'Childcare needed',
        location: jobData.location || 'Location TBD',
        date: jobData.date || jobData.startDate || new Date().toISOString().split('T')[0],
        start_time: jobData.start_time || jobData.startTime || startTime,
        end_time: jobData.end_time || jobData.endTime || endTime,
        hourly_rate: jobData.hourly_rate || jobData.hourlyRate || jobData.rate || jobData.salary || 300,
        number_of_children: jobData.number_of_children || jobData.numberOfChildren || (jobData.children ? jobData.children.length : 1),
        children_ages: jobData.children_ages || jobData.childrenAges || jobData.ages || 'Various ages',
        urgent: Boolean(jobData.urgent),
        status: ['active', 'filled', 'cancelled', 'completed'].includes(jobData.status) ? jobData.status : 'active',
        special_instructions: jobData.special_instructions || jobData.specialInstructions || null,
        contact_phone: jobData.contact_phone || jobData.contactPhone || null,
        emergency_contact: jobData.emergency_contact || jobData.emergencyContact || null,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([dbJobData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('createJob', error)
    }
  }

  async updateJob(jobId, updates) {
    try {
      this._validateId(jobId, 'Job ID')
      
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', jobId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateJob', error)
    }
  }

  async deleteJob(jobId) {
    try {
      this._validateId(jobId, 'Job ID')
      
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId)
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      return this._handleError('deleteJob', error)
    }
  }
}

export const jobService = new JobService()