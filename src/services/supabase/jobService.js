import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

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

const normalizeChildrenArray = (value) => ensureArray(value).filter(Boolean)

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

const normalizeChildrenForDisplay = (children) => {
  if (!Array.isArray(children)) return []

  const seenIds = new Set()

  return children
    .map(child => {
      if (!child) return null

      const id = child.id || child._id || child.childId || child.child_id || null
      const name = child.name || child.firstName || child.childName || ''
      const age = child.age ?? child.childAge ?? null
      const allergies = child.allergies || child.childAllergies || ''
      const notes = child.notes || child.preferences || child.childNotes || ''

      if (!id && !name) return null

      const dedupeKey = id || name.toLowerCase()
      if (seenIds.has(dedupeKey)) return null
      seenIds.add(dedupeKey)

      return {
        id,
        name,
        age,
        allergies,
        notes
      }
    })
    .filter(Boolean)
}

const normalizeChildrenForStorage = (children) => normalizeChildrenForDisplay(children)

const deriveChildrenAgesLabel = (children) => {
  if (!Array.isArray(children) || !children.length) return null

  const ages = children
    .map(child => child?.age)
    .filter(age => age !== undefined && age !== null && age !== '')

  if (!ages.length) return null

  return ages.join(', ')
}

const normalizeJobRecord = (job) => {
  const parentProfile = job?.users || job?.parent || {}
  const parentName = job?.parent_name || parentProfile?.name || job?.client_name || 'Parent'
  const parentPhoto = job?.parent_photo || parentProfile?.profile_image || null
  const contactEmail = parentProfile?.email || null
  const contactPhone = parentProfile?.phone || null
  const requirements = ensureArray(job?.requirements)

  const storedChildrenDetails = normalizeChildrenArray(job?.children_details)
  const storedChildren = normalizeChildrenArray(job?.children)
  const resolvedChildren = storedChildrenDetails.length ? storedChildrenDetails : storedChildren
  const childrenDetails = normalizeChildrenForDisplay(resolvedChildren)

  const emergencyContact = parseJSONSafe(job?.emergency_contact, null)
  const workingHours = deriveWorkingHours(job?.working_hours, job?.start_time, job?.end_time)
  const hourlyRate = job?.hourly_rate !== undefined && job?.hourly_rate !== null
    ? Number(job.hourly_rate)
    : (job?.hourlyRate !== undefined ? Number(job.hourlyRate) : null)
  const normalizedRate = hourlyRate ?? (job?.rate !== undefined && job?.rate !== null ? Number(job.rate) : null)
  const childrenCount = job?.number_of_children ?? job?.children_count ?? (childrenDetails.length || null)
  const childrenAges = job?.children_ages || deriveChildrenAgesLabel(childrenDetails)
  const childrenSummary = job?.children_summary || (childrenCount
    ? `${childrenCount} child${childrenCount > 1 ? 'ren' : ''}${childrenAges ? ` (${childrenAges})` : ''}`
    : null)

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
    hourlyRate: normalizedRate,
    rate: normalizedRate,
    numberOfChildren: childrenCount,
    childrenCount,
    childrenAges,
    childrenDetails,
    childrenSummary,
    children: childrenDetails,
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

      const cacheKey = `jobs:list:${JSON.stringify(filters || {})}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await query
        if (error) throw error

        const parentIds = Array.from(new Set((data || []).map(job => job.parent_id).filter(Boolean)))
        let childrenLookup = {}

        if (parentIds.length) {
          const { data: childrenRows, error: childrenError } = await supabase
            .from('children')
            .select('id,parent_id,name,age,allergies,notes,preferences,created_at,updated_at')
            .in('parent_id', parentIds)

          if (!childrenError && Array.isArray(childrenRows)) {
            childrenLookup = childrenRows.reduce((acc, child) => {
              acc[child.parent_id] = acc[child.parent_id] || []
              acc[child.parent_id].push(child)
              return acc
            }, {})
          }
        }

        return (data || []).map(job => {
          const storedChildren = ensureArray(job.children)
          const fallbackChildren = childrenLookup[job.parent_id] || []
          const resolvedChildren = storedChildren.length ? storedChildren : fallbackChildren
          const childrenCount = job.children_count ?? job.number_of_children ?? (resolvedChildren.length || null)
          const childrenAges = job.children_ages || deriveChildrenAgesLabel(resolvedChildren)

          return normalizeJobRecord({
            ...job,
            children: resolvedChildren,
            children_count: childrenCount,
            number_of_children: job.number_of_children ?? childrenCount,
            children_ages: childrenAges
          })
        })
      }, 60 * 1000)
    } catch (error) {
      return this._handleError('getJobs', error)
    }
  }

  async getMyJobs(clientId) {
    try {
      this._validateId(clientId, 'Client ID')

      const cacheKey = `jobs:mine:${clientId}`
      return await getCachedOrFetch(cacheKey, async () => {
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

        const { data: childrenRows, error: childrenError } = await supabase
          .from('children')
          .select('id,parent_id,name,age,allergies,notes,preferences,created_at,updated_at')
          .eq('parent_id', clientId)

        const children = !childrenError && Array.isArray(childrenRows) ? childrenRows : []

        const fallbackChildren = children

        return (data || []).map(job => {
          const storedChildren = ensureArray(job.children)
          const resolvedChildren = storedChildren.length ? storedChildren : fallbackChildren
          const childrenCount = job.children_count ?? job.number_of_children ?? (resolvedChildren.length || null)
          const childrenAges = job.children_ages || deriveChildrenAgesLabel(resolvedChildren)

          return normalizeJobRecord({
            ...job,
            children: resolvedChildren,
            children_count: childrenCount,
            number_of_children: job.number_of_children ?? childrenCount,
            children_ages: childrenAges,
            applications: job.applications || [],
            applications_count: job.applications?.length || 0
          })
        })
      }, 60 * 1000)
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

      const convertTo24Hour = (timeStr, fallback = null) => {
        if (!timeStr) return fallback

        const normalized = String(timeStr).trim()
        if (!normalized) return fallback

        const upper = normalized.toUpperCase()

        const meridiemMatch = upper.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
        if (meridiemMatch) {
          let [_, hoursPart, minutesPart, period] = meridiemMatch
          let hours = parseInt(hoursPart, 10)
          let minutes = parseInt(minutesPart ?? '0', 10)

          if (!Number.isFinite(hours) || hours < 1 || hours > 12) return fallback
          if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) minutes = 0

          if (period === 'PM' && hours !== 12) hours += 12
          if (period === 'AM' && hours === 12) hours = 0

          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
        }

        const twentyFourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/)
        if (twentyFourMatch) {
          let [_, hoursPart, minutesPart = '0', secondsPart = '0'] = twentyFourMatch
          let hours = parseInt(hoursPart, 10)
          let minutes = parseInt(minutesPart, 10)
          let seconds = parseInt(secondsPart, 10)

          if (!Number.isFinite(hours) || hours < 0 || hours > 23) return fallback
          if (!Number.isFinite(minutes) || minutes < 0 || minutes > 59) minutes = 0
          if (!Number.isFinite(seconds) || seconds < 0 || seconds > 59) seconds = 0

          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }

        const embeddedMeridiem = upper.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/)
        if (embeddedMeridiem) {
          return convertTo24Hour(embeddedMeridiem[0], fallback)
        }

        const embedded24h = normalized.match(/(\d{1,2})(?::(\d{2}))?/) 
        if (embedded24h) {
          return convertTo24Hour(`${embedded24h[1]}:${embedded24h[2] ?? '00'}`, fallback)
        }

        return fallback
      }

      const extractTimeTokens = (value) => {
        if (typeof value !== 'string') return []
        const sanitized = value.replace(/[–—]/g, '-')
        const matches = sanitized.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi)
        return Array.isArray(matches)
          ? matches.map(token => token.trim()).filter(Boolean)
          : []
      }

      let startTime = convertTo24Hour(jobData.start_time || jobData.startTime, null)
      let endTime = convertTo24Hour(jobData.end_time || jobData.endTime, null)

      if (!startTime || !endTime) {
        const timeTokens = extractTimeTokens(jobData.workingHours)
        if (!startTime && timeTokens[0]) {
          const parsedStart = convertTo24Hour(timeTokens[0], null)
          if (parsedStart) startTime = parsedStart
        }
        if (!endTime && timeTokens[1]) {
          const parsedEnd = convertTo24Hour(timeTokens[1], null)
          if (parsedEnd) endTime = parsedEnd
        }
      }

      startTime = startTime || '08:00:00'
      endTime = endTime || '17:00:00'

      const childrenArray = Array.isArray(jobData.children) ? jobData.children : ensureArray(jobData.children)
      const emergencyContact = jobData.emergency_contact || jobData.emergencyContact || null
      const normalizedChildren = normalizeChildrenForStorage(childrenArray)
      const childrenCount = normalizedChildren.length || null
      const childrenAges = deriveChildrenAgesLabel(normalizedChildren)

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
        status: ['active', 'filled', 'cancelled', 'completed', 'pending'].includes(jobData.status) ? jobData.status : 'active',
        emergency_contact: emergencyContact,
        children_details: normalizedChildren,
        children_ages: childrenAges,
        number_of_children: childrenCount
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([dbJobData])
        .select()
        .single()
      
      if (error) throw error
      invalidateCache('jobs:')
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

      const updatesPayload = { ...updates }

      if (updatesPayload.children !== undefined) {
        const normalizedChildren = normalizeChildrenForStorage(
          Array.isArray(updatesPayload.children) ? updatesPayload.children : ensureArray(updatesPayload.children)
        )
        const childrenCount = normalizedChildren.length || null
        const childrenAges = deriveChildrenAgesLabel(normalizedChildren)

        updatesPayload.children_details = normalizedChildren
        updatesPayload.children_ages = childrenAges
        updatesPayload.number_of_children = childrenCount
        delete updatesPayload.children
      }

      if (updatesPayload.children_details !== undefined) {
        const normalizedChildren = normalizeChildrenForStorage(
          Array.isArray(updatesPayload.children_details)
            ? updatesPayload.children_details
            : ensureArray(updatesPayload.children_details)
        )
        const childrenCount = normalizedChildren.length || null
        const childrenAges = deriveChildrenAgesLabel(normalizedChildren)

        updatesPayload.children_details = normalizedChildren
        updatesPayload.children_ages = childrenAges
        updatesPayload.number_of_children = childrenCount
      }

      if (updatesPayload.requirements !== undefined && updatesPayload.requirements !== null) {
        updatesPayload.requirements = Array.isArray(updatesPayload.requirements)
          ? updatesPayload.requirements
          : ensureArray(updatesPayload.requirements)
      } else {
        delete updatesPayload.requirements
      }

      if (updatesPayload.emergencyContact !== undefined && updatesPayload.emergency_contact === undefined) {
        updatesPayload.emergency_contact = updatesPayload.emergencyContact
        delete updatesPayload.emergencyContact
      }

      if (updatesPayload.rate !== undefined && updatesPayload.hourly_rate === undefined) {
        const parsedRate = Number(updatesPayload.rate)
        updatesPayload.hourly_rate = Number.isNaN(parsedRate) ? updatesPayload.rate : parsedRate
      }

      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          ...updatesPayload, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', jobId)
        .select()
        .single()
      
      if (error) throw error
      invalidateCache('jobs:')
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
      invalidateCache('jobs:')
      return { success: true }
    } catch (error) {
      return this._handleError('deleteJob', error)
    }
  }
}

export const jobService = new JobService()