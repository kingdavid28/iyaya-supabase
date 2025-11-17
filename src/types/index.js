/**
 * Type definitions and interfaces for the Iyaya app
 * Using JSDoc for type annotations in JavaScript
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} name - User's full name
 * @property {string} email - User's email address
 * @property {string} phone - User's phone number
 * @property {'parent'|'caregiver'} role - User role
 * @property {string} avatar - Avatar URL
 * @property {boolean} verified - Whether user is verified
 * @property {Date} createdAt - Account creation date
 * @property {Date} updatedAt - Last update date
 */

/**
 * @typedef {Object} Location
 * @property {number} latitude - Latitude coordinate
 * @property {number} longitude - Longitude coordinate
 * @property {string} address - Formatted address
 * @property {string} city - City name
 * @property {string} [state] - State/province (optional)
 * @property {string} [zipCode] - ZIP/postal code (optional)
 * @property {string} country - Country name
 */

/**
 * @typedef {Object} DaySchedule
 * @property {boolean} available - Whether available on this day
 * @property {TimeSlot[]} slots - Available time slots
 */

/**
 * @typedef {Object} TimeSlot
 * @property {string} start - Start time (HH:MM format)
 * @property {string} end - End time (HH:MM format)
 */

/**
 * @typedef {Object} Availability
 * @property {DaySchedule} monday - Monday schedule
 * @property {DaySchedule} tuesday - Tuesday schedule
 * @property {DaySchedule} wednesday - Wednesday schedule
 * @property {DaySchedule} thursday - Thursday schedule
 * @property {DaySchedule} friday - Friday schedule
 * @property {DaySchedule} saturday - Saturday schedule
 * @property {DaySchedule} sunday - Sunday schedule
 */

/**
 * @typedef {Object} CaregiverProfile
 * @property {string} userId - Reference to User ID
 * @property {number} age - Caregiver's age
 * @property {number} experience - Years of experience
 * @property {number} hourlyRate - Hourly rate in dollars
 * @property {string} bio - Biography/description
 * @property {string[]} specialties - Array of specialties
 * @property {string[]} certifications - Array of certifications
 * @property {Availability} availability - Availability schedule
 * @property {Location} location - Location information
 * @property {number} rating - Average rating (0-5)
 * @property {number} reviewCount - Number of reviews
 */

/**
 * @typedef {Object} Child
 * @property {string} id - Child ID
 * @property {string} name - Child's name
 * @property {number} age - Child's age
 * @property {string} gender - Child's gender
 * @property {string[]} specialNeeds - Special needs or requirements
 * @property {string} notes - Additional notes
 */

/**
 * @typedef {Object} ParentProfile
 * @property {string} userId - Reference to User ID
 * @property {Child[]} children - Array of children
 * @property {string} address - Home address
 * @property {Location} location - Location information
 * @property {string} emergencyContact - Emergency contact info
 */

/**
 * @typedef {Object} Job
 * @property {string} id - Job ID
 * @property {string} parentId - Parent user ID
 * @property {string} title - Job title
 * @property {string} description - Job description
 * @property {number} hourlyRate - Offered hourly rate
 * @property {Date} startDate - Job start date
 * @property {Date} [endDate] - Job end date (if applicable)
 * @property {string[]} requirements - Job requirements
 * @property {Location} location - Job location
 * @property {'active'|'filled'|'cancelled'} status - Job status
 * @property {Date} createdAt - Job creation date
 * @property {JobApplication[]} applications - Job applications
 */

/**
 * @typedef {Object} JobApplication
 * @property {string} id - Application ID
 * @property {string} jobId - Job ID
 * @property {string} caregiverId - Caregiver user ID
 * @property {string} message - Application message
 * @property {'pending'|'accepted'|'rejected'|'withdrawn'} status - Application status
 * @property {Date} appliedAt - Application date
 * @property {Date} [respondedAt] - Response date (optional)
 */

/**
 * @typedef {Object} Booking
 * @property {string} id - Booking ID
 * @property {string} jobId - Related job ID
 * @property {string} parentId - Parent user ID
 * @property {string} caregiverId - Caregiver user ID
 * @property {Date} startTime - Booking start time
 * @property {Date} endTime - Booking end time
 * @property {number} totalAmount - Total booking amount
 * @property {'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'} status - Booking status
 * @property {string} [notes] - Booking notes (optional)
 * @property {Payment} payment - Payment information
 * @property {Date} createdAt - Booking creation date
 */

/**
 * @typedef {Object} Payment
 * @property {string} id - Payment ID
 * @property {string} bookingId - Related booking ID
 * @property {number} amount - Payment amount
 * @property {'pending'|'completed'|'failed'|'refunded'} status - Payment status
 * @property {string} method - Payment method
 * @property {string} [transactionId] - External transaction ID (optional)
 * @property {Date} [processedAt] - Payment processing date (optional)
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} conversationId - Conversation ID
 * @property {string} senderId - Sender user ID
 * @property {string} receiverId - Receiver user ID
 * @property {string} content - Message content
 * @property {'text'|'image'|'file'|'system'} type - Message type
 * @property {boolean} read - Whether message is read
 * @property {Date} sentAt - Message sent time
 * @property {Date} [readAt] - Message read time (optional)
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id - Conversation ID
 * @property {string[]} participants - Array of participant user IDs
 * @property {Message} lastMessage - Last message in conversation
 * @property {Date} updatedAt - Last update time
 */

/**
 * @typedef {Object} Review
 * @property {string} id - Review ID
 * @property {string} bookingId - Related booking ID
 * @property {string} reviewerId - Reviewer user ID
 * @property {string} revieweeId - Reviewee user ID
 * @property {number} rating - Rating (1-5)
 * @property {string} comment - Review comment
 * @property {Date} createdAt - Review creation date
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether request was successful
 * @property {*} data - Response data
 * @property {string} message - Response message
 * @property {Object} [error] - Error information (optional)
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {*[]} items - Array of items
 * @property {number} total - Total number of items
 * @property {number} page - Current page number
 * @property {number} limit - Items per page
 * @property {boolean} hasMore - Whether more items available
 */

export {}; // Make this a module
