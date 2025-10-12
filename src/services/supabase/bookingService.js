import { SupabaseBase, supabase } from './base'

export class BookingService extends SupabaseBase {
  async createBooking(bookingData) {
    try {
      console.log('📝 Creating booking with data:', bookingData)
      
      let parentId = bookingData.clientId || bookingData.parent_id
      const caregiverId = bookingData.caregiverId || bookingData.caregiver_id
      
      if (!parentId) {
        const user = await this._getCurrentUser()
        if (user) {
          parentId = user.id
        }
      }
      
      if (!parentId || !caregiverId) {
        throw new Error(`Missing required IDs: parentId=${!!parentId}, caregiverId=${!!caregiverId}`)
      }

      this._validateId(parentId, 'Parent ID')
      this._validateId(caregiverId, 'Caregiver ID')
      
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
        created_at: new Date().toISOString()
      }

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
  }

  async getMyBookings(userId, role) {
    try {
      this._validateId(userId, 'User ID')
      
      if (!['parent', 'caregiver'].includes(role)) {
        throw new Error('Role must be either "parent" or "caregiver"')
      }

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
        time: booking.start_time && booking.end_time ? `${booking.start_time} - ${booking.end_time}` : '',
        family: booking.parent?.name || booking.parent_name || 'Unknown Family'
      })) || []
      
      return transformedData
    } catch (error) {
      return this._handleError('getMyBookings', error)
    }
  }

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
      
      return {
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
        time: data.start_time && data.end_time ? `${data.start_time} - ${data.end_time}` : '',
        family: data.parent?.name || 'Unknown Family'
      }
    } catch (error) {
      return this._handleError('getBookingById', error)
    }
  }

  async updateBookingStatus(bookingId, status) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateBookingStatus', error)
    }
  }

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
  }

  async cancelBooking(bookingId) {
    try {
      this._validateId(bookingId, 'Booking ID')
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', bookingId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('cancelBooking', error)
    }
  }
}

export const bookingService = new BookingService()