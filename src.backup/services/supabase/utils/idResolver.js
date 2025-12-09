import { supabase } from '../../../config/supabase';
import { isValidUUID } from '../../../utils/id';

const columnCache = new Map(); // columnName -> boolean supported

export const resolveSupabaseUserId = async (rawId) => {
  if (!rawId) {
    return null;
  }

  if (isValidUUID(rawId)) {
    return rawId.trim();
  }

  const candidate = rawId.trim();
  if (!candidate) {
    return null;
  }

  const lookupColumns = ['legacy_id', 'auth_provider_id', 'provider_id'];

  for (const column of lookupColumns) {
    if (columnCache.has(column) && columnCache.get(column) === false) {
      continue;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq(column, candidate)
        .maybeSingle();

      if (error) {
        if (error.code === '42703') {
          columnCache.set(column, false);
          continue;
        }

        console.warn(`resolveSupabaseUserId lookup error on ${column}:`, error.message);
        continue;
      }

      columnCache.set(column, true);

      if (data?.id && isValidUUID(data.id)) {
        return data.id;
      }
    } catch (lookupError) {
      console.warn(`resolveSupabaseUserId unexpected error on ${column}:`, lookupError?.message || lookupError);
    }
  }

  return null;
};
