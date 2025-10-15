import { SupabaseBase, supabase } from './base'

const parseJSONSafe = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'object') return value
  if (typeof value === 'string' && value.trim() !== '') {
    try {
      return JSON.parse(value)
    } catch (_) {
      return fallback
    }
  }
  return fallback
}

const ensureArray = (value) => {
  if (Array.isArray(value)) return value
  const parsed = parseJSONSafe(value)
  return Array.isArray(parsed) ? parsed : []
}

const formatTimeSegment = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = timeStr.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : timeStr
}

const deriveWorkingHours = (storedWorkingHours, startTime, endTime) => {
  if (storedWorkingHours && typeof storedWorkingHours === 'string') return storedWorkingHours
  const start = formatTimeSegment(startTime)
  const end = formatTimeSegment(endTime)
  return start && end ? `${start} - ${end}` : storedWorkingHours || null
}

const normalizeJobRecord = (job) => {
  const parentProfile = job?.users || job?.parent || {}
  const parentName = job?.parent_name || parentProfile?.name || job?.client_name || 'Parent'
  const parentPhoto = job?.parent_photo || parentProfile?.profile_image || null
  const contactEmail = parentProfile?.email || null
  const contactPhone = parentProfile?.phone || null
  const requirements = ensureArray(job?.requirements)
  const children = ensureArray(job?.children)
  const emergencyContact = parseJSONSafe(job?.emergency_contact, null)
  const workingHours = deriveWorkingHours(job?.working_hours, job?.start_time, job?.end_time)
  const hourlyRate = job?.hourly_rate !== undefined && job?.hourly_rate !== null
    ? Number(job.hourly_rate)
    : (job?.hourlyRate !== undefined ? Number(job.hourlyRate) : null)
  const childrenCount = job?.number_of_children ?? (children?.length || null)

  const applications = Array.isArray(job?.applications)
    ? job.applications.map(app => ({
        id: app.id,
        caregiverId: app.caregiver_id,
        status: app.status,
        message: app.message,
        appliedAt: app.applied_at || app.created_at,
        createdAt: app.created_at,
        updatedAt: app.updated_at
      }))
    : []

  return {
    ...job,
    id: job.id,
    _id: job.id,
    parentId: job.parent_id,
    clientId: job.parent_id,
    title: job.title,
    description: job.description,
    location: job.location,
    date: job.date,
    startTime: job.start_time,
    endTime: job.end_time,
    workingHours,
    schedule: workingHours,
    hourlyRate,
    rate: hourlyRate,
    numberOfChildren: childrenCount,
    childrenCount,
    childrenAges: job.children_ages,
    children,
    requirements,
    specialInstructions: job.special_instructions,
    contactPhone,
    contactEmail,
    parentContact: {
      email: contactEmail,
      phone: contactPhone
    },
    emergencyContact,
    status: job.status,
    urgent: Boolean(job.urgent),
    created_at: job.created_at,
    createdAt: job.created_at,
    updated_at: job.updated_at,
    updatedAt: job.updated_at,
    parentName,
    parentPhoto,
    origin: parentName ? `Posted by ${parentName}` : 'Parent job',
    originLabel: parentName ? `Posted by ${parentName}` : 'Parent job',
    family: parentName,
    familyName: parentName,
    applications,
    applicationsCount: applications.length,
    applications_count: applications.length,
    // Add derived fields for skills and experience if not in DB
    skills: job.skills || requirements, // Use requirements as skills if not separate
    experience: job.experience || (job.years_experience ? `${job.years_experience} years` : 'Experience not specified'),
    specialRequirements: requirements, // Already parsed
    raw: job
  }
}

export class JobService extends SupabaseBase {
  async getJobs(filters = {}) {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          users!parent_id(
            id,
            name,
            email,
            phone,
            profile_image
          )
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

      // Fetch children data for each job
      const jobsWithChildren = await Promise.all(
        (data || []).map(async (job) => {
          try {
            const { data: children } = await supabase
              .from('children')
              .select('*')
              .eq('parent_id', job.parent_id)
            return { ...job, children: children || [] }
          } catch {
            return { ...job, children: [] }
          }
        })
      )

      return jobsWithChildren.map(normalizeJobRecord)
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
          users!parent_id(
            id,
            name,
            email,
            phone,
            profile_image
          ),
          applications(
            id,
            caregiver_id,
            status,
            message,
            applied_at,
            created_at,
            updated_at
          )
        `)
        .eq('parent_id', clientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch children data for user's jobs
      const { data: children } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', clientId)

      const jobsWithChildren = (data || []).map(job => ({
        ...job,
        children: children || [],
        applications: job.applications || [],
        applications_count: job.applications?.length || 0
      }))

      return jobsWithChildren.map(normalizeJobRecord)
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

      const childrenArray = Array.isArray(jobData.children) ? jobData.children : []
      const requirementsArray = Array.isArray(jobData.requirements) ? jobData.requirements : []
      const emergencyContact = jobData.emergency_contact || jobData.emergencyContact || null

      const dbJobData = {
        parent_id: parentId,
        title: jobData.title?.trim() || 'Childcare Position',
        description: jobData.description?.trim() || 'Childcare needed',
        location: jobData.location?.trim() || 'Location TBD',
        date: jobData.date || jobData.startDate || new Date().toISOString().split('T')[0],
        start_time: jobData.start_time || jobData.startTime || startTime,
        end_time: jobData.end_time || jobData.endTime || endTime,
        hourly_rate: Number(jobData.hourly_rate || jobData.hourlyRate || jobData.rate || jobData.salary || 300),
        urgent: Boolean(jobData.urgent),
        status: ['active', 'filled', 'cancelled', 'completed', 'pending'].includes(jobData.status) ? jobData.status : 'active'
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