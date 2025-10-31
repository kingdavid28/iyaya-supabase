// src/utils/uploadValidation.js
const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

const unsafeFileNamePattern = /[^a-zA-Z0-9._-]/g

export const sanitizeFileName = (fileName = '') => {
  const trimmed = fileName.trim()
  if (!trimmed) {
    return `attachment-${Date.now()}`
  }

  const parts = trimmed.split('/')
  const baseName = parts.pop() || trimmed
  const sanitized = baseName.replace(unsafeFileNamePattern, '_')
  return sanitized.length ? sanitized : `attachment-${Date.now()}`
}

export const validateUpload = ({
  size,
  mimeType,
  fileName,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  allowedMimeTypes = DEFAULT_ALLOWED_MIME_TYPES,
}) => {
  if (!size || Number.isNaN(size) || size <= 0) {
    throw new Error('Attachment size is invalid.')
  }

  if (size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1)
    throw new Error(`Attachment exceeds the ${maxMb}MB limit.`)
  }

  if (!mimeType) {
    throw new Error('Attachment type could not be determined.')
  }

  const isAllowedType = allowedMimeTypes.some((allowed) => {
    if (allowed.endsWith('/*')) {
      const category = allowed.split('/')[0]
      return mimeType.startsWith(`${category}/`)
    }
    return allowed === mimeType
  })

  if (!isAllowedType) {
    throw new Error('This file type is not supported for messaging attachments.')
  }

  const sanitizedFileName = sanitizeFileName(fileName)

  return {
    size,
    mimeType,
    fileName: sanitizedFileName,
  }
}

export const ATTACHMENT_VALIDATION_DEFAULTS = {
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  maxSizeBytes: DEFAULT_MAX_SIZE_BYTES,
}