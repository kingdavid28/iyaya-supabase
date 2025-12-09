export const DOCUMENT_TYPE_LABELS = {
  id: 'Identification Document',
  certification: 'Certification',
  reference: 'Reference',
  medical: 'Medical Clearance',
  insurance: 'Insurance',
  other: 'Other Document',
};

export const PORTFOLIO_CATEGORY_LABELS = {
  activity: 'Activity',
  meal_prep: 'Meal Preparation',
  educational: 'Educational',
  outdoor: 'Outdoor',
  craft: 'Arts & Crafts',
  other: 'Other',
};

export const formatDateDisplay = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const parseJsonSafe = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return value;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn('Failed to parse JSON field in profileAssets helpers:', error?.message);
      return value;
    }
  }

  return value;
};

export const normalizeDocumentEntry = (doc, index = 0) => {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  const rawType = doc.type || doc.category || doc.documentType || 'other';
  const normalizedType = DOCUMENT_TYPE_LABELS[rawType] ? rawType : 'other';
  const label = doc.label || doc.name || doc.fileName || `Document ${index + 1}`;

  return {
    id: doc.id || doc.uuid || `${normalizedType}-${index}`,
    type: normalizedType,
    typeLabel: DOCUMENT_TYPE_LABELS[normalizedType],
    label,
    description: doc.description || null,
    url: doc.url || doc.link || doc.originalUrl || null,
    originalUrl: doc.originalUrl || doc.url || null,
    fileName: doc.fileName || doc.name || label,
    uploadedAtRaw: doc.uploadedAt || doc.created_at || doc.createdAt,
    uploadedAt: formatDateDisplay(doc.uploadedAt || doc.created_at || doc.createdAt),
    verified: Boolean(doc.verified || doc.isVerified || doc.status === 'verified'),
    mimeType: doc.mimeType || doc.type || null,
    metadata: doc.metadata || null,
    source: doc,
  };
};

const normalizePortfolioImage = (item, index = 0) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const rawCategory = item.category || item.type || 'other';
  const normalizedCategory = PORTFOLIO_CATEGORY_LABELS[rawCategory] ? rawCategory : 'other';

  return {
    id: item.id || item.uuid || `${normalizedCategory}-${index}`,
    url: item.url || item.imageUrl || item.previewUrl || null,
    caption: item.caption || item.description || '',
    category: normalizedCategory,
    categoryLabel: PORTFOLIO_CATEGORY_LABELS[normalizedCategory],
    uploadedAtRaw: item.uploadedAt || item.created_at || item.createdAt,
    uploadedAt: formatDateDisplay(item.uploadedAt || item.created_at || item.createdAt),
    source: item,
  };
};

const normalizePortfolioVideo = (item, index = 0) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  return {
    id: item.id || item.uuid || `video-${index}`,
    url: item.url || item.videoUrl || item.sourceUrl || null,
    caption: item.caption || item.description || '',
    thumbnail: item.thumbnail || item.poster || null,
    uploadedAtRaw: item.uploadedAt || item.created_at || item.createdAt,
    uploadedAt: formatDateDisplay(item.uploadedAt || item.created_at || item.createdAt),
    source: item,
  };
};

export const normalizePortfolio = (rawPortfolio) => {
  const resolved = parseJsonSafe(rawPortfolio) || {};

  const images = Array.isArray(resolved.images)
    ? resolved.images.map(normalizePortfolioImage).filter(Boolean)
    : [];

  const videos = Array.isArray(resolved.videos)
    ? resolved.videos.map(normalizePortfolioVideo).filter(Boolean)
    : [];

  return {
    images,
    videos,
  };
};