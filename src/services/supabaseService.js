import { supabase } from '../config/supabase'

export const supabaseService = {
  // ============ UTILITY FUNCTIONS ============
  _handleError(method, error, throwError = true) {
    console.error(`❌ Error in ${method}:`, error)
    if (throwError) throw error
    return null
  },

  _validateId(id, fieldName = 'ID') {
    if (!id || typeof id !== 'string') {
      throw new Error(`Invalid ${fieldName}: ${id}`)
    }
  },

  _validateRequiredFields(data, requiredFields, methodName) {
    const missingFields = requiredFields.filter(field => !data?.[field])
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields in ${methodName}: ${missingFields.join(', ')}`)
    }
  },

  // ============ USER MANAGEMENT ============
  async getProfile(userId) {
    try {
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.warn('Error getting profile:', error)
        return null
      }
      return data
    } catch (error) {
      return this._handleError('getProfile', error, false)
    }
  },

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
        // Create user if doesn't exist
        const userData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: 'parent',
          status: 'active',
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single()
          
        if (error) {
          if (error.code === '23505') { // Unique violation
            // Retry update if user was created concurrently
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
  },

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
  },

  // ============ CHILDREN MANAGEMENT ============
  async getChildren(parentId) {
    try {
      this._validateId(parentId, 'Parent ID')
      
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getChildren', error)
    }
  },

  async addChild(parentId, childData) {
    try {
      this._validateId(parentId, 'Parent ID')
      this._validateRequiredFields(childData, ['name'], 'addChild')

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== parentId) {
        throw new Error('User authentication required to add child')
      }

      // Verify user exists in the users table
      const existingUser = await this.getProfile(user.id)
      if (!existingUser) {
        throw new Error('User profile not found. Please complete your profile setup first.')
      }
      
      const childRecord = {
        parent_id: parentId,
        name: childData.name.trim(),
        age: childData.age ? parseInt(childData.age) : null,
        allergies: childData.allergies?.trim() || null,
        notes: childData.notes?.trim() || childData.preferences?.trim() || null,
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('children')
        .insert([childRecord])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('addChild', error)
    }
  },

  async updateChild(childId, updates) {
    try {
      this._validateId(childId, 'Child ID')
      
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const childRecord = {
        ...updates,
        name: updates.name?.trim(),
        age: updates.age ? parseInt(updates.age) : null,
        allergies: updates.allergies?.trim() || null,
        notes: updates.notes?.trim() || updates.preferences?.trim() || null,
        updated_at: new Date().toISOString()
      }
      
      // Remove undefined fields
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
      return data
    } catch (error) {
      return this._handleError('updateChild', error)
    }
  },

  async deleteChild(childId) {
    try {
      this._validateId(childId, 'Child ID')
      
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      return this._handleError('deleteChild', error)
    }
  },

  // ============ JOB MANAGEMENT ============
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
        emergencyContact: job.emergency_contact
      })) || []
    } catch (error) {
      return this._handleError('getJobs', error)
    }
  },

  async getMyJobs(clientId) {
    try {
      this._validateId(clientId, 'Client ID')
      
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
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
        emergencyContact: job.emergency_contact
      })) || []
    } catch (error) {
      return this._handleError('getMyJobs', error)
    }
  },

  async createJob(jobData) {
    try {
      this._validateRequiredFields(
        jobData, 
        ['parent_id', 'parentId', 'client_id', 'clientId'], 
        'createJob'
      )

      const parentId = jobData.parent_id || jobData.parentId || jobData.client_id || jobData.clientId
      this._validateId(parentId, 'Parent ID')

      const convertTo24Hour = (timeStr) => {
        if (!timeStr) return '08:00:00'
        
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
        if (!timeMatch) return '08:00:00'
        
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
        const timeMatch = jobData.workingHours.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i)
        if (timeMatch) {
          startTime = convertTo24Hour(timeMatch[1].trim())
          endTime = convertTo24Hour(timeMatch[2].trim())
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
  },

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
  },

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
  },

  // ============ APPLICATION MANAGEMENT ============
  async applyToJob(jobId, caregiverId, message = '') {
    try {
      this._validateId(jobId, 'Job ID')
      this._validateId(caregiverId, 'Caregiver ID')
      
      const { data, error } = await supabase
        .from('applications')
        .insert([{
          job_id: jobId,
          caregiver_id: caregiverId,
          message: message?.trim() || '',
          status: 'pending',
          applied_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('applyToJob', error)
    }
  },

  async getMyApplications(caregiverId) {
    try {
      this._validateId(caregiverId, 'Caregiver ID')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs(*),
          users!applications_caregiver_id_fkey(name, email, phone)
        `)
        .eq('caregiver_id', caregiverId)
        .order('applied_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getMyApplications', error)
    }
  },

  async getJobApplications(jobId) {
    try {
      this._validateId(jobId, 'Job ID')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          users!applications_caregiver_id_fkey(name, email, phone, profile_image)
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getJobApplications', error)
    }
  },

  async updateApplicationStatus(applicationId, status) {
    try {
      this._validateId(applicationId, 'Application ID')
      
      const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
      }
      
      const { data, error } = await supabase
        .from('applications')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', applicationId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateApplicationStatus', error)
    }
  },

  async withdrawApplication(applicationId) {
    try {
      this._validateId(applicationId, 'Application ID')
      
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)
      
      if (error) throw error
      return { success: true }
    } catch (error) {
      return this._handleError('withdrawApplication', error)
    }
  },

  // ============ BOOKING MANAGEMENT ============
  async createBooking(bookingData) {
    try {
      console.log('📝 Creating booking with data:', bookingData)
      
      this._validateRequiredFields(
        bookingData, 
        ['clientId', 'parent_id', 'caregiverId', 'caregiver_id'], 
        'createBooking'
      )

      const parentId = bookingData.clientId || bookingData.parent_id
      const caregiverId = bookingData.caregiverId || bookingData.caregiver_id
      
      this._validateId(parentId, 'Parent ID')
      this._validateId(caregiverId, 'Caregiver ID')

      const { data: { user } } = await supabase.auth.getUser()
      const parentProfile = user ? await this.getProfile(user.id) : null
      
      const dbBookingData = {
        parent_id: parentId,
        caregiver_id: caregiverId,
        job_id: bookingData.jobId || bookingData.job_id || null,
        date: bookingData.date || new Date().toISOString().split('T')[0],
        start_time: bookingData.startTime || bookingData.start_time || '08:00:00',
        end_time: bookingData.endTime || bookingData.end_time || '17:00:00',
        hourly_rate: bookingData.hourlyRate || bookingData.hourly_rate || 300,
        total_amount: bookingData.totalCost || bookingData.total_amount || 0,
        status: bookingData.status || 'pending',
        address: bookingData.address || null,
        contact_phone: bookingData.contactPhone || bookingData.contact_phone || null,
        selected_children: bookingData.selectedChildren || bookingData.selected_children || [],
        special_instructions: bookingData.specialInstructions || bookingData.special_instructions || null,
        emergency_contact: bookingData.emergencyContact || bookingData.emergency_contact || null,
        caregiver_name: bookingData.caregiver?.name || bookingData.caregiver_name || bookingData.caregiver || 'Unknown Caregiver',
        parent_name: parentProfile?.name || bookingData.parent?.name || user?.user_metadata?.name || 'Parent',
        time_display: bookingData.time || bookingData.time_display || null,
        created_at: new Date().toISOString()
      }

      console.log('📝 Database booking data:', dbBookingData)

      const { data, error } = await supabase
        .from('bookings')
        .insert([dbBookingData])
        .select()
        .single()
      
      if (error) throw error
      
      console.log('✅ Booking created successfully:', data)
      return data
    } catch (error) {
      return this._handleError('createBooking', error)
    }
  },

  async getMyBookings(userId, role) {
    try {
      this._validateId(userId, 'User ID')
      
      if (!['parent', 'caregiver'].includes(role)) {
        throw new Error('Role must be either "parent" or "caregiver"')
      }

      console.log('🔍 getMyBookings called with:', { userId, role })
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          jobs(*),
          parent:users!bookings_parent_id_fkey(id, name, email, phone, profile_image),
          caregiver:users!bookings_caregiver_id_fkey(id, name, email, phone, profile_image)
        `)

      if (role === 'parent') {
        query = query.eq('parent_id', userId)
      } else {
        query = query.eq('caregiver_id', userId)
      }

      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      if (error) throw error
      
      console.log('📋 Raw booking data from Supabase:', data?.length || 0)
      
      const transformedData = data?.map(booking => ({
        ...booking,
        caregiverId: booking.caregiver ? {
          _id: booking.caregiver.id || booking.caregiver_id,
          id: booking.caregiver.id || booking.caregiver_id,
          name: booking.caregiver_name || booking.caregiver?.name || 'Unknown Caregiver',
          email: booking.caregiver?.email,
          profileImage: booking.caregiver?.profile_image,
          avatar: booking.caregiver?.profile_image
        } : {
          _id: booking.caregiver_id,
          id: booking.caregiver_id,
          name: booking.caregiver_name || 'Unknown Caregiver',
          email: null,
          profileImage: null,
          avatar: null
        },
        clientId: booking.parent ? {
          _id: booking.parent.id || booking.parent_id,
          id: booking.parent.id || booking.parent_id,
          name: booking.parent?.name || 'Unknown Parent',
          email: booking.parent?.email
        } : {
          _id: booking.parent_id,
          id: booking.parent_id,
          name: 'Unknown Parent',
          email: null
        },
        parentId: booking.parent_id,
        startTime: booking.start_time,
        endTime: booking.end_time,
        hourlyRate: booking.hourly_rate,
        totalAmount: booking.total_amount,
        contactPhone: booking.contact_phone,
        selectedChildren: booking.selected_children,
        specialInstructions: booking.special_instructions,
        emergencyContact: booking.emergency_contact,
        time: booking.time_display || (booking.start_time && booking.end_time ? `${booking.start_time} - ${booking.end_time}` : ''),
        family: booking.parent?.name || booking.parent_name || 'Unknown Family'
      })) || []
      
      console.log('✅ Transformed booking data count:', transformedData.length)
      return transformedData
    } catch (error) {
      return this._handleError('getMyBookings', error)
    }
  },

  async updateBookingStatus(bookingId, status, feedback = null) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
      }
      
      const updateData = { 
        status, 
        updated_at: new Date().toISOString() 
      }
      
      if (feedback) {
        updateData.feedback = feedback.trim()
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateBookingStatus', error)
    }
  },

  async uploadPaymentProof(bookingId, paymentProof) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          payment_proof: paymentProof, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('uploadPaymentProof', error)
    }
  },

  // ============ MESSAGING ============
  async getBookingById(bookingId, userId) {
    try {
      this._validateId(bookingId, 'Booking ID')
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          jobs(*),
          parent:users!bookings_parent_id_fkey(id, name, email, phone, profile_image),
          caregiver:users!bookings_caregiver_id_fkey(id, name, email, phone, profile_image)
        `)
        .eq('id', bookingId)
        .or(`parent_id.eq.${userId},caregiver_id.eq.${userId}`)
        .single()
      
      if (error) throw error
      
      const transformedBooking = {
        ...data,
        caregiverId: data.caregiver ? {
          _id: data.caregiver.id || data.caregiver_id,
          id: data.caregiver.id || data.caregiver_id,
          name: data.caregiver_name || data.caregiver?.name || 'Unknown Caregiver',
          email: data.caregiver?.email,
          profileImage: data.caregiver?.profile_image,
          avatar: data.caregiver?.profile_image
        } : {
          _id: data.caregiver_id,
          id: data.caregiver_id,
          name: data.caregiver_name || 'Unknown Caregiver',
          email: null,
          profileImage: null,
          avatar: null
        },
        clientId: data.parent ? {
          _id: data.parent.id || data.parent_id,
          id: data.parent.id || data.parent_id,
          name: data.parent?.name || 'Unknown Parent',
          email: data.parent?.email
        } : {
          _id: data.parent_id,
          id: data.parent_id,
          name: 'Unknown Parent',
          email: null
        },
        parentId: data.parent_id,
        startTime: data.start_time,
        endTime: data.end_time,
        hourlyRate: data.hourly_rate,
        totalAmount: data.total_amount,
        contactPhone: data.contact_phone,
        selectedChildren: data.selected_children,
        specialInstructions: data.special_instructions,
        emergencyContact: data.emergency_contact,
        time: data.time_display || (data.start_time && data.end_time ? `${data.start_time} - ${data.end_time}` : ''),
        family: data.parent?.name || 'Unknown Family'
      }
      
      return transformedBooking
    } catch (error) {
      return this._handleError('getBookingById', error)
    }
  },

  async getOrCreateConversation(participant1, participant2) {
    try {
      this._validateId(participant1, 'Participant 1 ID')
      this._validateId(participant2, 'Participant 2 ID')
      
      if (participant1 === participant2) {
        throw new Error('Cannot create conversation with yourself')
      }
      
      // Try to find existing conversation
      let { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(participant_1.eq.${participant1},participant_2.eq.${participant2}),and(participant_1.eq.${participant2},participant_2.eq.${participant1})`)

      if (error) throw error
      
      if (data && data.length > 0) {
        return data[0]
      }

      // Create new conversation
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{
          participant_1: participant1,
          participant_2: participant2,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) throw createError
      return newConversation
    } catch (error) {
      return this._handleError('getOrCreateConversation', error)
    }
  },

  async getConversations(userId) {
    try {
      this._validateId(userId, 'User ID')
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:users!conversations_participant_1_fkey(id, name, profile_image),
          participant2:users!conversations_participant_2_fkey(id, name, profile_image)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getConversations', error)
    }
  },

  async sendMessage(conversationId, senderId, content) {
    try {
      this._validateId(conversationId, 'Conversation ID')
      this._validateId(senderId, 'Sender ID')
      
      if (!content?.trim()) {
        throw new Error('Message content is required')
      }

      // Get conversation to find recipient
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (conversationError) throw conversationError

      const recipientId = conversation.participant_1 === senderId 
        ? conversation.participant_2 
        : conversation.participant_1

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: senderId,
          recipient_id: recipientId,
          content: content.trim(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)

      return data
    } catch (error) {
      return this._handleError('sendMessage', error)
    }
  },

  async getMessages(conversationId, limit = 50) {
    try {
      this._validateId(conversationId, 'Conversation ID')
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(name, profile_image)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getMessages', error)
    }
  },

  async markMessagesAsRead(conversationId, userId) {
    try {
      this._validateId(conversationId, 'Conversation ID')
      this._validateId(userId, 'User ID')
      
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', userId)
        .is('read_at', null)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return this._handleError('markMessagesAsRead', error)
    }
  },

  // ============ REAL-TIME SUBSCRIPTIONS ============
  subscribeToMessages(conversationId, callback) {
    this._validateId(conversationId, 'Conversation ID')
    
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .subscribe()
  },

  subscribeToApplications(jobId, callback) {
    this._validateId(jobId, 'Job ID')
    
    return supabase
      .channel(`applications:${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'applications',
        filter: `job_id=eq.${jobId}`
      }, callback)
      .subscribe()
  },

  subscribeToBookings(userId, callback) {
    this._validateId(userId, 'User ID')
    
    return supabase
      .channel(`bookings:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `or(parent_id.eq.${userId},caregiver_id.eq.${userId})`
      }, callback)
      .subscribe()
  },

  // ============ FILE STORAGE ============
  async uploadProfileImage(userId, imageFile) {
    try {
      this._validateId(userId, 'User ID')
      
      if (!imageFile) {
        throw new Error('Image file is required')
      }

      const fileName = `profile-${userId}-${Date.now()}.jpg`
      
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, imageFile, {
          contentType: imageFile.type || 'image/jpeg',
          upsert: true
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName)

      // Update user profile with image URL
      await this.updateProfile(userId, { profile_image: publicUrl })

      return { url: publicUrl }
    } catch (error) {
      return this._handleError('uploadProfileImage', error)
    }
  },

  async uploadPaymentProofImage(bookingId, imageFile) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      if (!imageFile) {
        throw new Error('Image file is required')
      }

      const fileName = `payment-${bookingId}-${Date.now()}.jpg`
      
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, imageFile, {
          contentType: imageFile.type || 'image/jpeg'
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

      // Update booking with payment proof URL
      await this.uploadPaymentProof(bookingId, publicUrl)

      return publicUrl
    } catch (error) {
      return this._handleError('uploadPaymentProofImage', error)
    }
  }
}

export default supabaseService