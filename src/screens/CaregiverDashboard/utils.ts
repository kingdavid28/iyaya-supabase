import { formatTimeRange } from '../../utils/dateUtils';

const defaultScheduleSource = {
  start_time: null,
  end_time: null,
  startTime: null,
  endTime: null,
  workingHours: null,
  schedule: null,
  time: null,
};

const defaultChildrenSummarySource = {
  childrenSummary: null,
  children: null,
  childrenAges: null,
  childrenCount: null,
};

const defaultProfileStatsSource = {
  rating: null,
  reviewCount: null,
  reviews: null,
};

export const formatPeso = (value) => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '₱0';
  return `₱${numeric.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
};

export const buildJobScheduleLabel = (input) => {
  if (!input) return null;

  const source = { ...defaultScheduleSource, ...input };
  const { schedule, workingHours, time, start_time, end_time, startTime, endTime } = source;

  if (schedule && typeof schedule === 'string') return schedule;
  if (workingHours && typeof workingHours === 'string') return workingHours;
  if (time && typeof time === 'string') return time;

  const start = start_time || startTime;
  const end = end_time || endTime;

  if (!start && !end) return null;
  return formatTimeRange(start, end) ?? null;
};

export const ensureString = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  try {
    const stringified = String(value);
    return stringified === '[object Object]' ? fallback : stringified;
  } catch {
    return fallback;
  }
};

export const resolveChildrenSummary = (job) => {
  const source = job ? { ...defaultChildrenSummarySource, ...job } : defaultChildrenSummarySource;
  if (source.childrenSummary) return String(source.childrenSummary);

  const childrenList = Array.isArray(source.children) ? source.children : [];
  if (childrenList.length) {
    const count = childrenList.length;
    const ages = source.childrenAges ? ` (${String(source.childrenAges)})` : '';
    return `${count} child${count > 1 ? 'ren' : ''}${ages}`;
  }

  const parsedCount = Number(source.childrenCount);
  if (Number.isFinite(parsedCount) && parsedCount > 0) {
    const ages = source.childrenAges ? ` (${String(source.childrenAges)})` : '';
    return `${parsedCount} child${parsedCount > 1 ? 'ren' : ''}${ages}`;
  }

  return 'Child details available';
};

export const getRatingStats = (profile) => {
  const source = profile ? { ...defaultProfileStatsSource, ...profile } : defaultProfileStatsSource;
  const rawProfileRating = Number(source.rating);
  const profileRating = Number.isFinite(rawProfileRating) ? rawProfileRating : 0;

  const rawReviewCount = Number.isFinite(Number(source.reviewCount))
    ? Number(source.reviewCount)
    : Number.isFinite(Number(source.reviews))
    ? Number(source.reviews)
    : 0;

  const profileReviewCount = Math.max(0, rawReviewCount);
  const ratingStatValue = profileReviewCount > 0 ? profileRating.toFixed(1) : '—';
  const ratingStatSubtitle =
    profileReviewCount === 0
      ? 'No reviews yet'
      : profileReviewCount === 1
      ? '1 review'
      : `${profileReviewCount} reviews`;
  const ratingStatCTA = profileReviewCount > 0 ? 'See feedback' : 'Build reputation';

  return {
    rating: profileRating,
    ratingDisplay: ratingStatValue,
    reviewCount: profileReviewCount,
    subtitle: ratingStatSubtitle,
    ctaLabel: ratingStatCTA,
  };
};
