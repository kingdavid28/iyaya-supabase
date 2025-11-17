import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'
import { notificationService } from './notificationService'

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

      const resolvedParentId = await this._ensureUserId(parentId, 'Parent ID')
      const resolvedCaregiverId = await this._ensureUserId(caregiverId, 'Caregiver ID')

      const dbBookingData = {
        parent_id: resolvedParentId,
        caregiver_id: resolvedCaregiverId,
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
      invalidateCache('bookings:')
      return data
    } catch (error) {
      return this._handleError('createBooking', error)
    }
  }

  async getMyBookings(userId, role) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      if (!['parent', 'caregiver'].includes(role)) {
        throw new Error('Role must be either "parent" or "caregiver"')
      }

      const cacheKey = `bookings:${role}:${resolvedUserId}`
      return await getCachedOrFetch(cacheKey, async () => {
        let query = supabase
          .from('bookings')
          .select(`
            *,
            parent:users!parent_id(
              id,
              name,
              email,
              phone,
              profile_image
            ),
            caregiver:users!caregiver_id(
              id,
              name,
              email,
              phone,
              profile_image
            ),
            contracts:job_contracts!job_contracts_booking_id_fkey(*)
          `)

        if (role === 'parent') {
          query = query.eq('parent_id', resolvedUserId)
        } else {
          query = query.eq('caregiver_id', resolvedUserId)
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query
        if (error) throw error

        const transformedData = data?.map(booking => {
          const { contracts: bookingContracts = [], job_contracts: legacyContracts = [], ...bookingRest } = booking
          const contractRecords = Array.isArray(bookingContracts) && bookingContracts.length > 0
            ? bookingContracts
            : (Array.isArray(legacyContracts) ? legacyContracts : [])

          const latestContractRecord = contractRecords.reduce((latest, current) => {
            if (!current) return latest
            if (!latest) return current
            const latestCreated = new Date(latest.created_at || latest.createdAt || 0).getTime()
            const currentCreated = new Date(current.created_at || current.createdAt || 0).getTime()
            return currentCreated > latestCreated ? current : latest
          }, null)

          const latestContract = latestContractRecord ? {
            id: latestContractRecord.id,
            bookingId: latestContractRecord.booking_id,
            parentId: latestContractRecord.parent_id,
            caregiverId: latestContractRecord.caregiver_id,
            status: latestContractRecord.status,
            terms: latestContractRecord.terms || {},
            version: latestContractRecord.version,
            effectiveDate: latestContractRecord.effective_date,
            expiryDate: latestContractRecord.expiry_date,
            parentSignedAt: latestContractRecord.parent_signed_at,
            parentSignature: latestContractRecord.parent_signature,
            parentSignatureHash: latestContractRecord.parent_signature_hash,
            parentSignedIp: latestContractRecord.parent_signed_ip,
            caregiverSignedAt: latestContractRecord.caregiver_signed_at,
            caregiverSignature: latestContractRecord.caregiver_signature,
            caregiverSignatureHash: latestContractRecord.caregiver_signature_hash,
            caregiverSignedIp: latestContractRecord.caregiver_signed_ip,
            contractHash: latestContractRecord.contract_hash,
            metadata: latestContractRecord.metadata || {},
            createdAt: latestContractRecord.created_at || latestContractRecord.createdAt,
            updatedAt: latestContractRecord.updated_at || latestContractRecord.updatedAt
          } : null

          return {
            ...bookingRest,
            clientId: booking.parent ? {
              _id: booking.parent.id || booking.parent_id,
              id: booking.parent.id || booking.parent_id,
              name: booking.parent?.name || 'Unknown Parent',
              email: booking.parent?.email,
              profileImage: booking.parent?.profile_image || null,
              avatar: booking.parent?.profile_image || null
            } : {
              _id: booking.parent_id,
              id: booking.parent_id,
              name: 'Unknown Parent',
              email: null,
              profileImage: null,
              avatar: null
            },
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
            family: booking.parent?.name || 'Unknown Family',
            latestContract
          }
        }) || []

        return transformedData
      }, 30 * 1000)
    } catch (error) {
      return this._handleError('getMyBookings', error)
    }
  }

  async getBookingById(bookingId, userId) {
    try {
      this._validateId(bookingId, 'Booking ID')
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .or(`parent_id.eq.${resolvedUserId},caregiver_id.eq.${resolvedUserId}`)
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
      invalidateCache('bookings:')
      return data
    } catch (error) {
      return this._handleError('updateBookingStatus', error)
    }
  }

  async updateStatus(bookingId, status) {
    try {
      return await this.updateBookingStatus(bookingId, status)
    } catch (error) {
      logger.error('Update booking status failed:', error)
      throw new Error('Failed to update booking status')
    }
  }

  async uploadPaymentProof(bookingId, paymentProof, { storagePath, mimeType, uploadedBy, paymentType = 'deposit' } = {}) {
    try {
      this._validateId(bookingId, 'Booking ID')

      const fieldsToUpdate = {
        payment_proof: paymentProof,
        payment_proof_uploaded_at: new Date().toISOString()
      }

      const nowIso = new Date().toISOString()

      if (paymentType === 'deposit') {
        fieldsToUpdate.deposit_paid = true
        fieldsToUpdate.deposit_paid_at = nowIso
        fieldsToUpdate.status = 'confirmed'
      } else if (paymentType === 'final_payment') {
        fieldsToUpdate.final_payment_paid = true
        fieldsToUpdate.final_payment_paid_at = nowIso
        fieldsToUpdate.payment_status = 'paid'
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(fieldsToUpdate)
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error

      if (storagePath) {
        const { error: proofError } = await supabase
          .from('payment_proofs')
          .insert({
            booking_id: bookingId,
            storage_path: storagePath || '',
            public_url: paymentProof,
            mime_type: mimeType || 'image/jpeg',
            uploaded_by: uploadedBy || (await this._getCurrentUser())?.id || null,
            payment_type: paymentType
          })

        if (proofError) {
          console.warn('⚠️ Failed to insert payment proof audit record:', proofError)
        }
      }

      invalidateCache('bookings:')

      let latestProofRecord = null

      try {
        const { data: proofRecord, error: fetchProofError } = await supabase
          .from('payment_proofs')
          .select('*')
          .eq('booking_id', bookingId)
          .order('uploaded_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchProofError && fetchProofError.code !== 'PGRST116') {
          throw fetchProofError
        }

        latestProofRecord = proofRecord || null
      } catch (fetchError) {
        console.warn('⚠️ Failed to fetch latest payment proof record:', fetchError)
      }

      try {
        const notificationResult = await notificationService.notifyPaymentProofReceived(
          data?.caregiver_id,
          bookingId,
          {
            parentId: data?.parent_id,
            paymentType,
            totalAmount: data?.total_amount,
            paymentProofUrl: latestProofRecord?.public_url || paymentProof,
            paymentProofId: latestProofRecord?.id || null,
            paymentProofStoragePath: latestProofRecord?.storage_path || storagePath || null,
            bookingDeepLink: {
              tab: 'bookings',
              screen: 'BookingDetails',
              params: {
                bookingId,
                caregiverId: data?.caregiver_id,
                parentId: data?.parent_id
              }
            }
          }
        )

        console.log('📬 Payment proof notification dispatched:', {
          notificationId: notificationResult?.id || null,
          bookingId,
          caregiverId: data?.caregiver_id,
          parentId: data?.parent_id
        })
      } catch (notifyError) {
        console.warn('⚠️ Failed to send payment proof notification:', notifyError)
      }

      return {
        booking: data,
        paymentProof: latestProofRecord
      }
    } catch (error) {
      return this._handleError('uploadPaymentProof', error)
    } finally {
      // Close the payment proof upload process
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
      invalidateCache('bookings:')
      return data
    } catch (error) {
      return this._handleError('cancelBooking', error)
    }
  }

  async updateBooking(bookingId, updates) {
    try {
      this._validateId(bookingId, 'Booking ID')

      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be a valid object')
      }

      const normalizedUpdates = { ...updates }

      if (normalizedUpdates.startTime && !normalizedUpdates.start_time) {
        normalizedUpdates.start_time = normalizedUpdates.startTime
        delete normalizedUpdates.startTime
      }

      if (normalizedUpdates.endTime && !normalizedUpdates.end_time) {
        normalizedUpdates.end_time = normalizedUpdates.endTime
        delete normalizedUpdates.endTime
      }

      if (normalizedUpdates.totalAmount && !normalizedUpdates.total_amount) {
        normalizedUpdates.total_amount = normalizedUpdates.totalAmount
        delete normalizedUpdates.totalAmount
      }

      if (normalizedUpdates.hourlyRate && !normalizedUpdates.hourly_rate) {
        normalizedUpdates.hourly_rate = normalizedUpdates.hourlyRate
        delete normalizedUpdates.hourlyRate
      }

      if (normalizedUpdates.contactPhone && !normalizedUpdates.contact_phone) {
        normalizedUpdates.contact_phone = normalizedUpdates.contactPhone
        delete normalizedUpdates.contactPhone
      }

      if (normalizedUpdates.specialInstructions && !normalizedUpdates.special_instructions) {
        normalizedUpdates.special_instructions = normalizedUpdates.specialInstructions
        delete normalizedUpdates.specialInstructions
      }

      if (normalizedUpdates.emergencyContact && !normalizedUpdates.emergency_contact) {
        normalizedUpdates.emergency_contact = normalizedUpdates.emergencyContact
        delete normalizedUpdates.emergencyContact
      }

      const { data, error } = await supabase
        .from('bookings')
        .update({
          ...normalizedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error
      invalidateCache('bookings:')
      return data
    } catch (error) {
      return this._handleError('updateBooking', error)
    }
  }

  async deleteBooking(bookingId) {
    try {
      this._validateId(bookingId, 'Booking ID')

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error
      invalidateCache('bookings:')
      return { success: true }
    } catch (error) {
      return this._handleError('deleteBooking', error)
    }
  }
}

export const bookingService = new BookingService()