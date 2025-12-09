import { logger } from "./logger"

// Error codes constants
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

class ErrorHandler {
  process(error) {
    // Skip processing completely empty errors to reduce noise
    if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
      // Return minimal error without logging
      return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        title: "Unexpected Error",
        message: "An unexpected error occurred.",
        userMessage: "Something unexpected happened. Please try again.",
        recoverable: true,
        retryable: true,
        originalError: null,
      };
    }
    
    // Enhanced error logging only for valid errors
    logger.error("Processing error:", error);


    // Determine error type and create standardized error object
    if (this.isNetworkError(error)) {
      return this.createNetworkError(error)
    }

    if (this.isValidationError(error)) {
      return this.createValidationError(error)
    }

    if (this.isAuthError(error)) {
      return this.createAuthError(error)
    }

    if (this.isPermissionError(error)) {
      return this.createPermissionError(error)
    }

    if (this.isServerError(error)) {
      return this.createServerError(error)
    }

    return this.createUnknownError(error)
  }

  isNetworkError(error) {
    return (
      error.code === "NETWORK_ERROR" ||
      error.code === "ECONNABORTED" ||
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Network Error") ||
      error.message?.includes("timeout") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("fetch") ||
      error.name === "TypeError" ||
      !error.response
    )
  }

  isValidationError(error) {
    return (
      error.code === "VALIDATION_ERROR" ||
      (error.response && error.response.status >= 400 && error.response.status < 500) ||
      error.message?.includes("validation") ||
      error.message?.includes("required") ||
      error.message?.includes("invalid")
    )
  }

  isAuthError(error) {
    return (
      error.code === "AUTH_ERROR" ||
      error.code?.startsWith("auth/") ||
      (error.response && error.response.status === 401) ||
      error.message?.includes("authentication") ||
      error.message?.includes("unauthorized")
    )
  }

  isPermissionError(error) {
    return (
      error.code === "PERMISSION_ERROR" ||
      (error.response && error.response.status === 403) ||
      error.message?.includes("permission") ||
      error.message?.includes("forbidden")
    )
  }

  isServerError(error) {
    return error.code === "SERVER_ERROR" || (error.response && error.response.status >= 500)
  }

  createNetworkError(error) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      title: "Connection Problem",
      message: "Please check your internet connection and try again.",
      userMessage: "Unable to connect to the server. Please check your internet connection.",
      recoverable: true,
      retryable: true,
      originalError: error,
    }
  }

  createValidationError(error) {
    return {
      code: ERROR_CODES.VALIDATION_ERROR,
      title: "Invalid Input",
      message: error.message || "Please check your input and try again.",
      userMessage: this.getUserFriendlyMessage(error.message) || "Please correct the highlighted fields.",
      recoverable: true,
      retryable: false,
      originalError: error,
    }
  }

  createAuthError(error) {
    return {
      code: ERROR_CODES.AUTH_ERROR,
      title: "Authentication Error",
      message: error.message || "Authentication failed.",
      userMessage: "Please sign in again to continue.",
      recoverable: true,
      retryable: false,
      requiresReauth: true,
      originalError: error,
    }
  }

  createPermissionError(error) {
    return {
      code: ERROR_CODES.PERMISSION_ERROR,
      title: "Access Denied",
      message: error.message || "You do not have permission to perform this action.",
      userMessage: "You don't have permission to access this feature.",
      recoverable: false,
      retryable: false,
      originalError: error,
    }
  }

  createServerError(error) {
    return {
      code: ERROR_CODES.SERVER_ERROR,
      title: "Server Error",
      message: "A server error occurred. Please try again later.",
      userMessage: "Something went wrong on our end. Please try again in a few minutes.",
      recoverable: true,
      retryable: true,
      originalError: error,
    }
  }

  createUnknownError(error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      title: "Unexpected Error",
      message: error?.message || "An unexpected error occurred.",
      userMessage: "Something unexpected happened. Please try again.",
      recoverable: true,
      retryable: true,
      originalError: error || null,
    }
  }

  getUserFriendlyMessage(message) {
    if (!message) return null

    const messageMap = {
      "Email is required": "Please enter your email address",
      "Password is required": "Please enter your password",
      "Invalid email address": "Please enter a valid email address",
      "Password must be at least": "Password is too short",
      "Name is required": "Please enter your name",
      "Phone number is required": "Please enter your phone number",
      "validation failed": "Please check your input",
      "required field": "This field is required",
      "invalid format": "Please check the format",
    }

    for (const [key, value] of Object.entries(messageMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return value
      }
    }

    return null
  }

  // Error reporting (React Native compatible)
  reportError(error, context = {}) {
    try {
      const errorReport = {
        timestamp: new Date().toISOString(),
        error: this.process(error),
        context,
        platform: 'react-native',
        // Remove browser-specific properties
      }

      // Send to error reporting service
      this.sendToErrorService(errorReport)
    } catch (reportingError) {
      console.error('Failed to create error report:', reportingError);
    }
  }

  sendToErrorService(errorReport) {
    // Implementation would depend on your error reporting service
    // For now, just log it
    logger.error("Error Report:", errorReport)
  }
}

export const errorHandler = new ErrorHandler()
