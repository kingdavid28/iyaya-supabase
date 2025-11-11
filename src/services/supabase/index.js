// Import services
import { applicationService } from './applicationService'
import { bookingService } from './bookingService'
import { childrenService } from './childrenService'
import { contractService } from './contractService'
import { informationRequestService } from './informationRequestService'
import { jobService } from './jobService'
import { messagingService } from './messagingService'
import { notificationService } from './notificationService'
import { privacyService } from './privacyService'
import { realtimeService } from './realtimeService'
import { reviewService } from './reviewService'
import { storageService } from './storageService'
import { userService } from './userService'

// Import the main supabaseService for upload functionality
// Note: This creates a circular dependency issue since we're importing from parent directory
// TODO: Move uploadProfileImage to storageService and remove this import

// Export individual services (preferred approach)
export { applicationService, bookingService, childrenService, contractService, informationRequestService, jobService, messagingService, notificationService, privacyService, realtimeService, reviewService, storageService, userService }

// Facade pattern for unified access (when needed)
export class SupabaseServiceFacade {
  constructor() {
    this.user = userService
    this.children = childrenService
    this.jobs = jobService
    this.applications = applicationService
    this.bookings = bookingService
    this.messaging = messagingService
    this.notifications = notificationService
    this.privacy = privacyService
    this.storage = storageService
    this.realtime = realtimeService
    this.reviews = reviewService
    this.contracts = contractService
    this.informationRequests = informationRequestService
  }

  // === USER & PROFILE METHODS ===
  async getProfile(userId) { return this.user.getProfile(userId) }
  async updateProfile(userId, data) { return this.user.updateProfile(userId, data) }
  async deleteProfile(userId) { return this.user.deleteProfile(userId) }
  async uploadProfileImage(userId, imageData) { return this.storage.uploadProfileImage(userId, imageData) }
  async getCaregivers(filters) { return this.user.getCaregivers(filters) }
  async _getCurrentUser() { return this.user._getCurrentUser() }

  // === CHILDREN METHODS ===
  async addChild(parentId, childData) { return this.children.addChild(parentId, childData) }
  async updateChild(childId, childData) { return this.children.updateChild(childId, childData) }
  async deleteChild(childId) { return this.children.deleteChild(childId) }
  async getChildren(parentId) { return this.children.getChildren(parentId) }

  // === JOB METHODS ===
  async getJobs(filters) { return this.jobs.getJobs(filters) }
  async getMyJobs(userId) { return this.jobs.getMyJobs(userId) }
  async createJob(jobData) { return this.jobs.createJob(jobData) }
  async updateJob(jobId, data) { return this.jobs.updateJob(jobId, data) }
  async deleteJob(jobId) { return this.jobs.deleteJob(jobId) }
  async getJobById(jobId) { return this.jobs.getJobById(jobId) }

  // === APPLICATION METHODS ===
  async applyToJob(jobId, caregiverId, payload) { return this.applications.applyToJob(jobId, caregiverId, payload) }
  async getMyApplications(userId) { return this.applications.getMyApplications(userId) }
  async getJobApplications(jobId) { return this.applications.getJobApplications(jobId) }
  async getForJob(jobId) { return this.applications.getForJob(jobId) }
  async updateApplicationStatus(applicationId, status) { return this.applications.updateApplicationStatus(applicationId, status) }

  // === BOOKING METHODS ===
  async createBooking(bookingData) { return this.bookings.createBooking(bookingData) }
  async getMyBookings(userId, role) { return this.bookings.getMyBookings(userId, role) }
  async getBookingById(bookingId, userId) { return this.bookings.getBookingById(bookingId, userId) }
  async updateBookingStatus(bookingId, status, feedback) { return this.bookings.updateBookingStatus(bookingId, status) }
  async updateBooking(bookingId, data) { return this.bookings.updateBooking(bookingId, data) }
  async deleteBooking(bookingId) { return this.bookings.deleteBooking(bookingId) }
  async cancelBooking(bookingId) { return this.bookings.cancelBooking(bookingId) }
  async uploadPaymentProof(bookingId, proofData, metadata) { return this.bookings.uploadPaymentProof(bookingId, proofData, metadata) }
  async getPaymentProof(bookingId) { return this.bookings.getPaymentProof(bookingId) }

  // === CONTRACT METHODS ===
  async createContract(contractData) { return this.contracts.createContract(contractData) }
  async getContractById(contractId) { return this.contracts.getContractById(contractId) }
  async getContractsByBooking(bookingId) { return this.contracts.getContractsByBooking(bookingId) }
  async getContractsForUser(userId, role) { return this.contracts.getContractsForUser(userId, role) }
  async updateContract(contractId, updates, options) { return this.contracts.updateContract(contractId, updates, options) }
  async updateContractStatus(contractId, status, metadata) { return this.contracts.updateContractStatus(contractId, status, metadata) }
  async signContract(contractId, signer, payload) { return this.contracts.signContract(contractId, signer, payload) }
  async resendContract(contractId, actorId) { return this.contracts.resendContract(contractId, actorId) }
  async generateContractPdf(contractId, options) { return this.contracts.generateContractPdf(contractId, options) }

  // === MESSAGING METHODS ===
  async getConversations(userId) { return this.messaging.getConversations(userId) }
  async getOrCreateConversation(userId, targetUserId) { return this.messaging.getOrCreateConversation(userId, targetUserId) }
  async startConversation(participant1, participant2) { return this.messaging.getOrCreateConversation(participant1, participant2) }
  async sendMessage(conversationId, senderId, content) { return this.messaging.sendMessage(conversationId, senderId, content) }
  async getMessages(conversationId, limit) { return this.messaging.getMessages(conversationId, limit) }
  async markMessagesAsRead(conversationId, userId) { return this.messaging.markMessagesAsRead(conversationId, userId) }
  subscribeToMessages(conversationId, callback) { return this.messaging.subscribeToMessages(conversationId, callback) }

  // === NOTIFICATION METHODS ===
  async getNotifications(userId, options) { return this.notifications.getNotifications(userId, options) }
  async createNotification(notificationData) { return this.notifications.createNotification(notificationData) }
  async markNotificationAsRead(notificationId) { return this.notifications.markNotificationAsRead(notificationId) }
  async markAllNotificationsAsRead(userId) { return this.notifications.markAllNotificationsAsRead(userId) }
  async getUnreadNotificationCount(userId) { return this.notifications.getUnreadNotificationCount(userId) }
  async getNotificationCountsByType(userId) { return this.notifications.getNotificationCountsByType(userId) }
  subscribeToNotifications(userId, callback) { return this.notifications.subscribeToNotifications(userId, callback) }

  // === PRIVACY METHODS ===
  async getPrivacySettings(userId) { return this.privacy.getPrivacySettings(userId) }
  async updatePrivacySettings(userId, settings) { return this.privacy.updatePrivacySettings(userId, settings) }
  async getPrivacyNotifications(userId, options) { return this.privacy.getPrivacyNotifications(userId, options) }
  async markPrivacyNotificationAsRead(notificationId, userId) { return this.privacy.markNotificationAsRead(notificationId, userId) }
  async getViewerPermissions(targetUserId, viewerUserId, options) { return this.privacy.getViewerPermissions(targetUserId, viewerUserId, options) }
  async grantPermission(payload) { return this.privacy.grantPermission(payload) }
  async revokePermission(targetUserId, viewerUserId, fields) { return this.privacy.revokePermission(targetUserId, viewerUserId, fields) }
  async acknowledgeNotifications(userId, notificationIds) { return this.privacy.acknowledgeNotifications(userId, notificationIds) }

  // === NOTIFICATION HELPERS ===
  async notifyJobApplication(jobId, caregiverId, parentId) { return this.notifications.notifyJobApplication(jobId, caregiverId, parentId) }
  async notifyBookingRequest(bookingId, parentId, caregiverId) { return this.notifications.notifyBookingRequest(bookingId, parentId, caregiverId) }
  async notifyBookingConfirmed(bookingId, caregiverId, parentId) { return this.notifications.notifyBookingConfirmed(bookingId, caregiverId, parentId) }
  async notifyNewMessage(senderId, recipientId, content) { return this.notifications.notifyNewMessage(senderId, recipientId, content) }
  async notifyPaymentProofReceived(caregiverId, bookingId, metadata) { return this.notifications.notifyPaymentProofReceived(caregiverId, bookingId, metadata) }

  // === REVIEW METHODS ===
  async getReviews(userId, limit, offset) { return this.reviews.getReviews(userId, limit, offset) }
  async getReviewsByParent(parentId) { return this.reviews.getReviewsByParent(parentId) }
  async createReview(reviewData) { return this.reviews.createReview(reviewData) }
  async updateReview(reviewId, data) { return this.reviews.updateReview(reviewId, data) }

  // === REALTIME SUBSCRIPTIONS ===
  subscribeToApplications(jobId, callback) { return this.realtime.subscribeToApplications(jobId, callback) }
  subscribeToBookings(userId, callback) { return this.realtime.subscribeToBookings(userId, callback) }

  // === COMBINED OPERATIONS ===
  async sendMessageWithNotification(conversationId, senderId, content) {
    const message = await this.messaging.sendMessage(conversationId, senderId, content)
    if (message) {
      await this.notifications.notifyNewMessage(senderId, message.recipient_id, content)
    }
    return message
  }

  // === INFORMATION REQUEST METHODS ===
  async createInformationRequest(payload) {
    return this.informationRequests.createRequest(payload)
  }

  async getPendingInformationRequests(userId) {
    return this.informationRequests.getPendingRequests(userId)
  }

  async getSentInformationRequests(userId) {
    return this.informationRequests.getSentRequests(userId)
  }

  async respondToInformationRequest(payload) {
    return this.informationRequests.respondToRequest(payload)
  }

  async revokeInformationAccess(requestId) {
    return this.informationRequests.revokeAccess(requestId)
  }
}

// Single instance for app-wide use
export const supabaseService = new SupabaseServiceFacade()

// Default export for backward compatibility
export default supabaseService