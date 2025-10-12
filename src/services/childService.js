// services/childService.js
import { supabaseService } from './supabase';

class ChildService {
  async createChild(childData) {
    try {
      const user = await supabaseService.user._getCurrentUser();
      if (!user) throw new Error('Authentication required');
      
      return await supabaseService.children.addChild(user.id, childData);
    } catch (error) {
      console.error('Error creating child:', error);
      throw error;
    }
  }

  async updateChild(childId, childData) {
    try {
      return await supabaseService.children.updateChild(childId, childData);
    } catch (error) {
      console.error('Error updating child:', error);
      throw error;
    }
  }

  async getChildren(parentId = null) {
    try {
      return await supabaseService.children.getChildren(parentId);
    } catch (error) {
      console.error('Error fetching children:', error);
      throw error;
    }
  }

  async deleteChild(childId) {
    try {
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
