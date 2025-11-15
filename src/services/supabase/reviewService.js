import { SupabaseBase, supabase } from './base';
import { getCachedOrFetch, invalidateCache } from './cache';

export class ReviewService extends SupabaseBase {
  _normalizeRating(rawRating) {
    const numeric = typeof rawRating === 'number' ? rawRating : Number(rawRating);

    if (!Number.isFinite(numeric)) {
      throw new Error('Invalid rating value');
    }

    const clamped = Math.min(5, Math.max(1, numeric));
    return Math.round(clamped * 10) / 10;
  }

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

      const rating = this._normalizeRating(reviewData.rating)

      const payload = {
        reviewer_id: reviewData.reviewer_id,
        reviewee_id: reviewData.reviewee_id,
        booking_id: reviewData.booking_id || null,
        rating,
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

      // Update caregiver's overall rating and review count
      await this._updateCaregiverRating(reviewData.reviewee_id)

      invalidateCache(`reviews:${reviewData.reviewee_id}`)

      return data
    } catch (error) {
      return this._handleError('createReview', error)
    }
  }

  async updateReview(reviewId, updates) {
    try {
      this._validateId(reviewId, 'Review ID')

      const { data, error } = await supabase
        .from('reviews')
        .update({
          ...updates,
          rating: typeof updates.rating !== 'undefined' ? this._normalizeRating(updates.rating) : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select()
        .single()

      if (error) throw error

      // Update caregiver's overall rating and review count after review update
      if (data?.reviewee_id) {
        await this._updateCaregiverRating(data.reviewee_id)
      }

      return data
    } catch (error) {
      return this._handleError('updateReview', error)
    }
  }

  async deleteReview(reviewId) {
    try {
      this._validateId(reviewId, 'Review ID')

      const { data, error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .select('id, reviewee_id')
        .maybeSingle()

      if (error) throw error

      if (data?.reviewee_id) {
        await this._updateCaregiverRating(data.reviewee_id)
        invalidateCache(`reviews:${data.reviewee_id}`)
      }

      return data
    } catch (error) {
      return this._handleError('deleteReview', error)
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

  async testRatingUpdate(caregiverId) {
    try {
      console.log('🔄 Testing rating update for caregiver:', caregiverId)

      // Get all reviews for this caregiver
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', caregiverId)

      if (reviewsError) throw reviewsError

      console.log('Found reviews:', reviews?.length || 0)

      if (!reviews || reviews.length === 0) {
        console.log('No reviews found')
        return
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
      const averageRating = totalRating / reviews.length

      console.log('Calculated rating:', averageRating)

      // Update caregiver's rating
      const { error: updateError } = await supabase
        .from('users')
        .update({
          rating: Math.round(averageRating * 10) / 10,
          updated_at: new Date().toISOString()
        })
        .eq('id', caregiverId)

      if (updateError) throw updateError

      console.log('✅ Rating updated successfully')

    } catch (error) {
      console.error('Error testing rating update:', error)
      throw error
    }
  }

  async _updateCaregiverRating(caregiverId) {
    try {
      // Get all reviews for this caregiver
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', caregiverId)

      if (reviewsError) throw reviewsError

      if (!reviews || reviews.length === 0) {
        // No reviews, reset rating
        await supabase
          .from('users')
          .update({
            rating: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', caregiverId)
        return
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
      const averageRating = totalRating / reviews.length

      // Update caregiver's rating and review count
      const updateData = {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updated_at: new Date().toISOString()
      }

      // For now, we'll just update the rating. Review count can be calculated from the reviews table
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', caregiverId)

      if (updateError) throw updateError

      // Invalidate relevant caches
      invalidateCache(`profile:${caregiverId}`)
      invalidateCache(`caregivers:*`)

    } catch (error) {
      console.error('Error updating caregiver rating:', error)
      // Don't throw error - this is not critical for the review creation
    }
  }
}

export const reviewService = new ReviewService()