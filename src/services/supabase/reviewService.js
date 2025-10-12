import { SupabaseBase, supabase } from './base'

export class ReviewService extends SupabaseBase {
  async getReviewsByParent(parentId) {
    try {
      this._validateId(parentId, 'Parent ID')
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewee:users!reviews_reviewee_id_fkey(name)
        `)
        .eq('reviewer_id', parentId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data?.map(review => ({
        ...review,
        caregiver_name: review.reviewee?.name || 'Caregiver'
      })) || []
    } catch (error) {
      return this._handleError('getReviewsByParent', error)
    }
  }

  async updateReview(reviewId, updates) {
    try {
      this._validateId(reviewId, 'Review ID')
      
      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('updateReview', error)
    }
  }
}

export const reviewService = new ReviewService()