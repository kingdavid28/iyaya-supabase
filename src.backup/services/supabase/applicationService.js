import { SupabaseBase, supabase } from './base'

export class ApplicationService extends SupabaseBase {
  async applyToJob(jobId, caregiverId, applicationData = {}) {
    try {
      this._validateId(jobId, 'Job ID')
      const resolvedCaregiverId = await this._ensureUserId(caregiverId, 'Caregiver ID')

      const { message, proposedRate } = (applicationData && typeof applicationData === 'object' && !Array.isArray(applicationData))
        ? applicationData
        : { message: applicationData }

      const normalizedMessage = typeof message === 'string' ? message.trim() : ''

      const normalizedProposedRate = (() => {
        if (proposedRate === undefined || proposedRate === null || proposedRate === '') {
          return null
        }
        const cleaned = String(proposedRate).replace(/[^0-9.,-]/g, '').replace(/,/g, '')
        const parsed = Number.parseFloat(cleaned)
        if (!Number.isFinite(parsed) || parsed <= 0) {
          return null
        }
        return Math.round(parsed * 100) / 100
      })()
      
      const basePayload = {
        job_id: jobId,
        caregiver_id: resolvedCaregiverId,
        message: normalizedMessage || '',
        status: 'pending',
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      const insertPayload = normalizedProposedRate !== null
        ? { ...basePayload, proposed_rate: normalizedProposedRate }
        : basePayload

      const executeInsert = async (payload) => {
        return await supabase
          .from('applications')
          .insert([payload])
          .select()
          .single()
      }

      let { data, error } = await executeInsert(insertPayload)

      if (error && normalizedProposedRate !== null && (error.code === 'PGRST204' || error.message?.includes('proposed_rate'))) {
        console.warn('⚠️ Falling back without proposed_rate column in applications.applyToJob:', error.message)
        ;({ data, error } = await executeInsert(basePayload))
        ;({ data, error } = await performInsert(fallbackPayload))
      }
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('applyToJob', error)
    }
  }

  async getMyApplications(caregiverId) {
    try {
      const resolvedCaregiverId = await this._ensureUserId(caregiverId, 'Caregiver ID')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs(*)
        `)
        .eq('caregiver_id', resolvedCaregiverId)
        .order('applied_at', { ascending: false })
      
      if (error) throw error
      return (data || []).map(app => ({
        ...app,
        bookingId: app.booking_id || app.bookingId,
        contractId: app.contract_id || app.contractId,
        proposedRate: app.proposed_rate ?? app.proposedRate ?? null,
      }))
    } catch (error) {
      return this._handleError('getMyApplications', error)
    }
  }

  async getJobApplications(jobId) {
    try {
      this._validateId(jobId, 'Job ID')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          users!caregiver_id(
            id,
            name,
            email,
            phone,
            profile_image
          )
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false })
      
      if (error) throw error
      
      // Normalize the data to match expected format
      const normalizedData = (data || []).map(app => ({
        ...app,
        caregiver: app.users || {},
        caregiverId: app.caregiver_id,
        booking_id: app.booking_id || app.bookingId,
        contract_id: app.contract_id || app.contractId,
        proposedRate: app.proposed_rate ?? app.proposedRate ?? null,
      }))
      
      return normalizedData
    } catch (error) {
      return this._handleError('getJobApplications', error)
    }
  }

  async getParentApplications(parentId) {
    try {
      const resolvedParentId = await this._ensureUserId(parentId, 'Parent ID')

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(
            id,
            title,
            location,
            status,
            parent_id,
            date,
            start_time,
            end_time,
            hourly_rate
          ),
          caregiver:users!caregiver_id(
            id,
            name,
            email,
            phone,
            profile_image
          )
        `)
        .eq('jobs.parent_id', resolvedParentId)
        .order('applied_at', { ascending: false })

      if (error) throw error

      return (data || []).map(app => ({
        id: app.id,
        jobId: app.jobs?.id,
        jobTitle: app.jobs?.title || 'Job Listing',
        jobLocation: app.jobs?.location || 'Location not specified',
        jobStatus: app.jobs?.status,
        jobDate: app.jobs?.date,
        jobStartTime: app.jobs?.start_time,
        jobEndTime: app.jobs?.end_time,
        jobHourlyRate: app.jobs?.hourly_rate,
        bookingId: app.booking_id || app.bookingId,
        contractId: app.contract_id || app.contractId,
        proposedRate: app.proposed_rate ?? app.proposedRate ?? null,
        caregiverId: app.caregiver?.id || app.caregiver_id,
        caregiverName: app.caregiver?.name || 'Caregiver',
        caregiverEmail: app.caregiver?.email || null,
        caregiverPhone: app.caregiver?.phone || null,
        caregiverProfileImage: app.caregiver?.profile_image || null,
        status: app.status,
        message: app.message,
        appliedAt: app.applied_at || app.created_at,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        raw: app
      }))
    } catch (error) {
      return this._handleError('getParentApplications', error)
    }
  }

  async promoteApplication(applicationId, options = {}) {
    try {
      this._validateId(applicationId, 'Application ID')

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw sessionError
      }

      const session = sessionData?.session
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Authentication required to promote application.')
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || supabase.supabaseUrl
      if (!supabaseUrl) {
        throw new Error('Supabase URL is not configured.')
      }

      const functionUrl = `${supabaseUrl}/functions/v1/promote-application`
      const payload = {
        applicationId,
        contractTerms: options.contractTerms && typeof options.contractTerms === 'object'
          ? options.contractTerms
          : {},
        createdBy: options.createdBy || session?.user?.id || null
      }

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        let message = 'Promotion failed.'
        try {
          const errorBody = await response.json()
          message = errorBody?.message || errorBody?.error || message
        } catch (parseError) {
          // ignore parse failure and use default message
        }
        throw new Error(message)
      }

      return await response.json()
    } catch (error) {
      return this._handleError('promoteApplication', error)
    }
  }

  async getForJob(jobId) {
    return await this.getJobApplications(jobId)
  }

  async updateApplicationStatus(applicationId, status, jobId = null) {
    try {
      this._validateId(applicationId, 'Application ID')
      if (jobId) {
        this._validateId(jobId, 'Job ID')
      }

      const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn', 'shortlisted']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
      }
      
      // First check if application exists
      const { data: existingApp, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('id', applicationId)
        .single()
      
      if (checkError || !existingApp) {
        console.error('❌ Application not found:', { applicationId, checkError })
        throw new Error('Application not found')
      }
      
      const query = supabase
        .from('applications')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', applicationId)

      if (jobId) {
        query.eq('job_id', jobId)
      }

      const { error: updateError } = await query

      if (updateError) {
        console.error('❌ Supabase update error:', updateError)
        throw updateError
      }

      // Attempt to fetch the updated record. Some RLS policies allow UPDATE but not SELECT,
      // so treat fetch failure gracefully and return a minimal payload instead.
      const { data: updatedRows, error: fetchError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .maybeSingle()

      if (fetchError) {
        console.warn('⚠️ Unable to fetch updated application after update:', fetchError.message)
        return { id: applicationId, status }
      }

      if (!updatedRows) {
        console.warn('⚠️ Update succeeded but no representation returned – falling back to minimal payload')
        return { id: applicationId, status }
      }

      console.log('✅ Application updated successfully:', updatedRows)
      return updatedRows
    } catch (error) {
      return this._handleError('updateApplicationStatus', error)
    }
  }

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
  }
}

export const applicationService = new ApplicationService()