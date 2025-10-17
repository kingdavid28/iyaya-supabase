import { SupabaseBase, supabase } from './base'

export class ApplicationService extends SupabaseBase {
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
  }

  async getMyApplications(caregiverId) {
    try {
      this._validateId(caregiverId, 'Caregiver ID')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs(*)
        `)
        .eq('caregiver_id', caregiverId)
        .order('applied_at', { ascending: false })
      
      if (error) throw error
      return data || []
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
        caregiverId: app.caregiver_id
      }))
      
      return normalizedData
    } catch (error) {
      return this._handleError('getJobApplications', error)
    }
  }

  async getParentApplications(parentId) {
    try {
      this._validateId(parentId, 'Parent ID')

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
        .eq('jobs.parent_id', parentId)
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