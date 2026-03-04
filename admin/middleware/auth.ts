import { supabase } from '@/config/supabase';

export async function requireAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  return user?.role === 'admin';
}

export function withAdminAuth(handler: Function) {
  return async (req: any, res: any) => {
    const userId = req.user?.id; // Assuming auth middleware sets req.user
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const isAdmin = await requireAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    return handler(req, res);
  };
}