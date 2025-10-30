import { addDays, format, isDate, isToday, isTomorrow, parseISO } from 'date-fns';

export const parseDate = (d) => {
  try {
    if (!d) return null;
    
    // Handle string special cases
    if (typeof d === 'string') {
      const lowerD = d.toLowerCase();
      if (lowerD === 'today') return new Date();
      if (lowerD === 'tomorrow') return addDays(new Date(), 1);
    }
    
    // Try parsing with date-fns first, then fallback to native Date
    let parsedDate;
    try {
      parsedDate = typeof d === 'string' ? parseISO(d) : new Date(d);
    } catch {
      parsedDate = new Date(d);
    }
    
    return isDate(parsedDate) && !isNaN(parsedDate.getTime()) ? parsedDate : null;
  } catch (_) {
    return null;
  }
};

export const normalizeTime = (value) => {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // If value already includes AM/PM, return uppercase variant
  if (/am|pm/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ').toUpperCase();
  }

  const parts = trimmed.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] !== undefined ? parseInt(parts[1], 10) : 0;

  if (!Number.isFinite(hours) || hours < 0 || hours > 23) {
    return trimmed;
  }

  const normalizedMinutes = Number.isFinite(minutes) ? minutes : 0;
  const hh = String(hours).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, normalizedMinutes))).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const to12h = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return '';
  
  const s = hhmm.trim();
  
  // If already in AM/PM format, normalize case
  if (/am|pm/i.test(s)) {
    return s.toUpperCase().replace('AM', 'AM').replace('PM', 'PM');
  }
  
  // Parse 24h format
  const [hStr, mStr = '00'] = s.split(':');
  const hNum = parseInt(hStr, 10);
  const mNum = parseInt(mStr, 10);
  
  if (isNaN(hNum) || isNaN(mNum)) return s;
  
  const period = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12; // Convert 0 or 12 to 12
  const mm = String(mNum).padStart(2, '0');
  
  return `${h12}:${mm} ${period}`;
};

export const formatTimeRange = (start, end) => {
  const s = to12h(start);
  const e = to12h(end);
  
  if (s && e) return `${s} - ${e}`;
  return s || e || '';
};

export const timeStringToMinutes = (t) => {
  if (!t || typeof t !== 'string') return null;
  
  const s = t.trim();
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2] || '0', 10);
    const mer = ampmMatch[3].toUpperCase();
    
    if (mer === 'PM' && h !== 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    
    return h * 60 + m;
  }
  
  // Handle 24h format
  const parts = s.split(':');
  if (parts.length >= 1) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  
  return null;
};

export const getDuration = (start, end) => {
  const sm = timeStringToMinutes(start);
  const em = timeStringToMinutes(end);
  
  if (sm == null || em == null || em <= sm) return '';
  
  const diff = em - sm;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export const formatDateFriendly = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return String(dateStr || '');
  
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  
  return format(d, 'EEE, MMM d');
};

export const buildSchedule = (dateStr, start, end) => {
  const friendly = formatDateFriendly(dateStr);
  const range = formatTimeRange(start, end);
  const dur = getDuration(start, end);
  
  const parts = [friendly];
  if (range) parts.push(range);
  if (dur) parts.push(dur);
  
  return parts.join(' • ');
};

export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  
  const birth = parseDate(birthDate);
  if (!birth) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};
