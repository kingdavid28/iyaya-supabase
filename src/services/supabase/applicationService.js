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
  }

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
  }

  async getForJob(jobId) {
    return await this.getJobApplications(jobId)
  }

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