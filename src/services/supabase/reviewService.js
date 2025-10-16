import { SupabaseBase, supabase } from './base'

export class ReviewService extends SupabaseBase {
  async getReviews(revieweeId, limit = 20) {
    try {
      this._validateId(revieweeId, 'Reviewee ID')

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(
            id,
            name,
            profile_image
          )
        `)
        .eq('reviewee_id', revieweeId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      return this._handleError('getReviews', error)
    }
  }

  async createReview(reviewData) {
    try {
      await this._ensureAuthenticated()
      this._validateRequiredFields(reviewData, ['reviewer_id', 'reviewee_id', 'rating'], 'createReview')

      const payload = {
        reviewer_id: reviewData.reviewer_id,
        reviewee_id: reviewData.reviewee_id,
        booking_id: reviewData.booking_id || null,
        rating: reviewData.rating,
        comment: reviewData.comment?.trim() || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        images: reviewData.images || null
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert([payload])
        .select(`
          *,
          reviewer:users!reviews_reviewer_id_fkey(
            id,
            name,
            profile_image
          ),
          reviewee:users!reviews_reviewee_id_fkey(
            id,
            name,
            profile_image
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      return this._handleError('createReview', error)
    }
  }

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