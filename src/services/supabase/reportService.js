import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class ReportService extends SupabaseBase {
  async _requireAdmin() {
    const user = await this._getCurrentUser()
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required')
    }
    return user
  }

  async createReport(reportData) {
    try {
      const user = await this._getCurrentUser()
      if (!user) throw new Error('Authentication required')

      const { data, error } = await supabase
        .from('user_reports')
        .insert([{
          ...reportData,
          reporter_id: user.id
        }])
        .select()
        .single()

      if (error) throw error
      
      // Invalidate cache
      invalidateCache(`reports:${user.id}`)
      
      return data
    } catch (error) {
      return this._handleError('createReport', error)
    }
  }

  async getMyReports(userId) {
    try {
      const resolvedUserId = await this._ensureUserId(userId, 'User ID')
      
      const cacheKey = `reports:${resolvedUserId}`
      return await getCachedOrFetch(cacheKey, async () => {
        const { data, error } = await supabase
          .from('user_reports')
          .select(`
            *,
            reporter:reporter_id(id, name, email),
            reported_user:reported_user_id(id, name, email),
            reviewer:reviewed_by(id, name, email)
          `)
          .or(`reporter_id.eq.${resolvedUserId},reported_user_id.eq.${resolvedUserId}`)
          .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
      }, 2 * 60 * 1000)
    } catch (error) {
      return this._handleError('getMyReports', error, [])
    }
  }

  async getReports(filters = {}) {
    try {
      await this._requireAdmin()

      let query = supabase
        .from('user_reports')
        .select(`
          *,
          reporter:reporter_id(id, name, email),
          reported_user:reported_user_id(id, name, email),
          reviewer:reviewed_by(id, name, email)
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.report_type) {
        query = query.eq('report_type', filters.report_type)
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50)

      if (error) throw error
      return data || []
    } catch (error) {
      return this._handleError('getReports', error, [])
    }
  }

  async getReportById(reportId) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reporter:reporter_id(id, name, email, role),
          reported_user:reported_user_id(id, name, email, role),
          reviewer:reviewed_by(id, name, email),
          booking:booking_id(id, start_date, end_date),
          job:job_id(id, title)
        `)
        .eq('id', reportId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('getReportById', error, null)
    }
  }

  async updateReportStatus(reportId, updates) {
    try {
      const user = await this._requireAdmin()

      const updateData = {
        ...updates,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('user_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single()

      if (error) throw error
      
      // Invalidate relevant caches
      invalidateCache(`report:${reportId}`)
      
      return data
    } catch (error) {
      return this._handleError('updateReportStatus', error)
    }
  }

  async getReportStats() {
    try {
      await this._requireAdmin()

      const { data, error } = await supabase
        .from('user_reports')
        .select('status, severity, report_type, created_at')

      if (error) throw error

      const stats = {
        total: data.length,
        byStatus: {},
        bySeverity: {},
        byType: {},
        recent: data.filter(r => 
          new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length
      }

      data.forEach(report => {
        stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1
        stats.bySeverity[report.severity] = (stats.bySeverity[report.severity] || 0) + 1
        stats.byType[report.report_type] = (stats.byType[report.report_type] || 0) + 1
      })

      return stats
    } catch (error) {
      return this._handleError('getReportStats', error, {})
    }
  }
}

export const reportService = new ReportService()