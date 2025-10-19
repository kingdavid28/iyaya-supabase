import { SupabaseBase, supabase } from './base'
import { getCachedOrFetch, invalidateCache } from './cache'

export class ReviewService extends SupabaseBase {
  async getReviews(revieweeId, limit = 20, offset = 0) {
    try {
      this._validateId(revieweeId, 'Reviewee ID')

      const cacheKey = `reviews:${revieweeId}:${offset}:${limit}`
      return await getCachedOrFetch(cacheKey, async () => {
        const to = offset + limit - 1
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            reviewer:users!reviews_reviewer_id_fkey(
              id,
              name,
              profile_image
            )
          `)
          .eq('reviewee_id', revieweeId)
          .order('created_at', { ascending: false })
          .range(offset, Math.max(offset, to))

        if (error) throw error

        return data || []
      })
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
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert([payload])
        .select(`
          id,
          rating,
          comment,
          created_at,
          updated_at,
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

      invalidateCache(`reviews:${reviewData.reviewee_id}`)

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
          reviewee:users!reviews_reviewee_id_fkey(name, profile_image)
        `)
        .eq('reviewer_id', parentId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data?.map(review => ({
        ...review,
        caregiver_name: review.reviewee?.name || 'Caregiver',
        caregiver_avatar: review.reviewee?.profile_image || review.caregiver_avatar || null
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

      if (data?.reviewee_id) {
        invalidateCache(`reviews:${data.reviewee_id}`)
      }
      return data
    } catch (error) {
      return this._handleError('updateReview', error)
    }
  }
}

export const reviewService = new ReviewService()