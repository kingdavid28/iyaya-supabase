// services/childService.js
import { supabaseService } from './supabase';

class ChildService {
  async createChild(childData, userId = null) {
    try {
      if (!userId) {
        throw new Error('User ID is required to add child');
      }

      console.log('🔍 Creating child for user:', userId);
      return await supabaseService.children.addChild(userId, childData);
    } catch (error) {
      console.error('Error creating child:', error);
      throw error;
    }
  }

  async updateChild(childId, childData, userId = null) {
    try {
      console.log('🔍 Updating child:', childId);
      return await supabaseService.children.updateChild(childId, childData);
    } catch (error) {
      console.error('Error updating child:', error);
      throw error;
    }
  }

  async deleteChild(childId, userId = null) {
    try {
      console.log('🗑️ Deleting child:', childId);
      return await supabaseService.children.deleteChild(childId);
    } catch (error) {
      console.error('Error deleting child:', error);
      throw error;
    }
  }

  // Helper method to generate unique child IDs on client side if needed
  generateChildId() {
    return `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const childService = new ChildService();
export default childService;
