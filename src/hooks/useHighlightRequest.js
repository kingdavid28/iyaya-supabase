import { useCallback } from 'react';
import { messagingService } from '../services/supabase/messagingService';

export const useHighlightRequest = ({
  userId,
  reviews,
  onStart,
  onComplete,
  onError,
  onInfo,
  onNavigateToChat
}) => {
  const requestHighlight = useCallback(async (targetParentId, targetParentName) => {
    try {
      // Validate inputs
      if (!userId) {
        onError?.('Authentication required. Please log in again.');
        return;
      }

      // Start loading state
      onStart?.();

      // Create highlight request message content
      const averageRating = reviews?.length > 0
        ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(1)
        : '0.0';

      const reviewCount = reviews?.length || 0;

      const highlightMessage = `🌟 Highlight Request\n\nHi! I'm a caregiver with ${averageRating}⭐ rating from ${reviewCount} reviews. I'd love to be featured to help more families find reliable childcare.\n\nWould you consider highlighting my profile?\n\nThank you!\n- ${userId}`;

      // For now, send a general highlight request (could be to a specific parent or broadcast)
      // If targetParentId is provided, send to that parent; otherwise, send to a general system
      let success = false;
      let conversationId = null;

      if (targetParentId) {
        // Send to specific parent
        try {
          const conversation = await messagingService.getOrCreateConversation(userId, targetParentId);
          if (conversation?.id) {
            const messageResult = await messagingService.sendMessage(
              conversation.id,
              userId,
              highlightMessage
            );
            success = !!messageResult;
            conversationId = conversation.id;
          }
        } catch (error) {
          console.error('Failed to send targeted highlight request:', error);
        }
      } else {
        // For general highlight requests, we could:
        // 1. Send to a system/admin user
        // 2. Store in a highlight_requests table
        // 3. Send to all recent clients
        // For now, show info that this feature needs backend implementation
        onInfo?.('General highlight requests require backend implementation. Please contact support.');
        onComplete?.({ targetParentName, success: false, needsImplementation: true });
        return;
      }

      if (success) {
        // Success - call completion callback
        onComplete?.({
          targetParentName,
          success: true,
          conversationId
        });

        // Optionally navigate to chat
        if (onNavigateToChat && targetParentId) {
          setTimeout(() => {
            onNavigateToChat({ id: targetParentId, name: targetParentName });
          }, 1500); // Delay to let user see success message
        }

        return true;
      } else {
        throw new Error('Failed to send highlight request');
      }

    } catch (error) {
      console.error('Highlight request failed:', error);

      // Handle specific error cases
      if (error.message?.includes('Authentication')) {
        onError?.('Please log in again to send highlight requests.');
      } else if (error.message?.includes('conversation')) {
        onError?.('Unable to create conversation. Please try again.');
      } else {
        onError?.(error.message || 'Failed to send highlight request. Please try again.');
      }

      // Call completion callback with failure
      onComplete?.({
        targetParentName,
        success: false,
        error: error.message
      });

      return false;
    }
  }, [userId, reviews, onStart, onComplete, onError, onInfo, onNavigateToChat]);

  return requestHighlight;
};
