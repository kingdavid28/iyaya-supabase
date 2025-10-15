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

  async getForJob(jobId) {
    return await this.getJobApplications(jobId)
  }

  async updateApplicationStatus(applicationId, status) {
    try {
      this._validateId(applicationId, 'Application ID')
      
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
      
      const { data, error } = await supabase
        .from('applications')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', applicationId)
        .select()
      
      if (error) {
        console.error('❌ Supabase update error:', error)
        throw error
      }
      if (!data || data.length === 0) {
        console.error('❌ No data returned after update')
        throw new Error('Failed to update application')
      }
      console.log('✅ Application updated successfully:', data[0])
      return data[0]
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