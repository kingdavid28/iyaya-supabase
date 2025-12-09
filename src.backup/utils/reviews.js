const toIsoStringOrNull = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const normalizeCaregiverReviews = (reviews = []) => {
  return (reviews || []).map((review) => {
    const createdAt = review.created_at || review.createdAt || null;
    const booking = review.booking || {};
    const caregiver = review.reviewee || review.caregiver || {};
    const reviewer = review.reviewer || {};

    const bookingId = review.booking_id || booking.id || null;
    const bookingDateRaw = review.booking_date || booking.date || booking.start_time || booking.startDate || null;
    const caregiverId = review.caregiver_id || caregiver.id || null;
    const caregiverName = review.caregiver_name || caregiver.name || null;
    const jobTitle =
      review.jobTitle ||
      review.booking_title ||
      review.bookingTitle ||
      review.job?.title ||
      booking.job?.title ||
      null;

    const reviewerId = reviewer.id || review.reviewer_id || null;
    const reviewerName = reviewer.name || review.reviewer_name || 'Parent';
    const reviewerAvatar = reviewer.profile_image || review.reviewer_avatar || null;
    const reviewerRole = review.reviewer_type || review.reviewerRole || reviewer.role || null;

    return {
      id: review.id,
      rating: review.rating ?? 0,
      comment: review.comment ?? '',
      createdAt,
      timestamp: createdAt,
      reviewerId,
      reviewerName,
      reviewerAvatar,
      reviewerRole,
      parentName: reviewerName,
      jobTitle,
      bookingId,
      bookingDate: toIsoStringOrNull(bookingDateRaw),
      caregiverId,
      caregiverName,
      read: review.read ?? true,
      images: Array.isArray(review.images) ? review.images : [],
    };
  });
};

export const normalizeCaregiverReviewsForList = (reviews = []) => {
  return normalizeCaregiverReviews(reviews).map((review) => ({
    ...review,
    subjectName: review.jobTitle || review.caregiverName || undefined,
    subjectSubtitle: review.bookingDate || undefined,
  }));
};
