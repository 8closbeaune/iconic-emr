import { format, parse, startOfDay, addMinutes, isAfter, isBefore, isSameDay } from 'date-fns';

export interface TimeRange {
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
}

export interface DateException {
  date: string; // "YYYY-MM-DD" format
  closed?: boolean;
  overrides?: TimeRange[];
}

export interface DaySchedule {
  mon: TimeRange[];
  tue: TimeRange[];
  wed: TimeRange[];
  thu: TimeRange[];
  fri: TimeRange[];
  sat: TimeRange[];
  sun: TimeRange[];
  exceptions: DateException[];
}

export interface AvailabilityConfig {
  timezone: string;
  slot_minutes: number;
  clinic: DaySchedule;
  rooms: Record<string, DaySchedule>;
}

export interface SlotTime {
  start: Date;
  end: Date;
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Parse availability configuration for a specific date and room
 * Returns array of available time ranges in local timezone
 */
export function parseAvailability(
  availabilityJson: AvailabilityConfig,
  date: Date,
  roomId?: string
): SlotTime[] {
  const dayOfWeek = DAYS[date.getDay()];
  
  // Get clinic hours for the day
  const clinicRanges = availabilityJson.clinic[dayOfWeek] || [];
  
  // Get room hours for the day (if room specified)
  const roomRanges = roomId && availabilityJson.rooms[roomId] 
    ? availabilityJson.rooms[roomId][dayOfWeek] || []
    : clinicRanges;
  
  // Intersect clinic and room hours
  let effectiveRanges = intersectRanges(
    timeRangesToSlots(clinicRanges, date),
    timeRangesToSlots(roomRanges, date)
  );
  
  // Apply exceptions (room exceptions first, then clinic exceptions)
  if (roomId && availabilityJson.rooms[roomId]) {
    effectiveRanges = applyExceptions(effectiveRanges, availabilityJson.rooms[roomId].exceptions, date);
  }
  effectiveRanges = applyExceptions(effectiveRanges, availabilityJson.clinic.exceptions, date);
  
  return effectiveRanges;
}

/**
 * Convert time ranges to slot times for a specific date
 */
function timeRangesToSlots(ranges: TimeRange[], date: Date): SlotTime[] {
  const baseDate = startOfDay(date);
  
  return ranges.map(range => {
    const [startHour, startMinute] = range.start.split(':').map(Number);
    const [endHour, endMinute] = range.end.split(':').map(Number);
    
    const start = new Date(baseDate);
    start.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date(baseDate);
    end.setHours(endHour, endMinute, 0, 0);
    
    return { start, end };
  });
}

/**
 * Intersect two arrays of time ranges
 * Returns overlapping portions only
 */
export function intersectRanges(rangesA: SlotTime[], rangesB: SlotTime[]): SlotTime[] {
  const intersections: SlotTime[] = [];
  
  for (const rangeA of rangesA) {
    for (const rangeB of rangesB) {
      const start = rangeA.start > rangeB.start ? rangeA.start : rangeB.start;
      const end = rangeA.end < rangeB.end ? rangeA.end : rangeB.end;
      
      if (start < end) {
        intersections.push({ start, end });
      }
    }
  }
  
  return mergeOverlappingRanges(intersections);
}

/**
 * Apply date exceptions to time ranges
 */
export function applyExceptions(
  ranges: SlotTime[], 
  exceptions: DateException[], 
  date: Date
): SlotTime[] {
  const dateString = format(date, 'yyyy-MM-dd');
  const exception = exceptions.find(e => e.date === dateString);
  
  if (!exception) return ranges;
  
  // If closed, return empty array
  if (exception.closed) return [];
  
  // If overrides specified, use those instead
  if (exception.overrides) {
    return timeRangesToSlots(exception.overrides, date);
  }
  
  return ranges;
}

/**
 * Generate appointment slots from available time ranges
 */
export function generateSlots(ranges: SlotTime[], slotMinutes: number): SlotTime[] {
  const slots: SlotTime[] = [];
  
  for (const range of ranges) {
    let current = new Date(range.start);
    
    while (addMinutes(current, slotMinutes) <= range.end) {
      const slotEnd = addMinutes(current, slotMinutes);
      slots.push({
        start: new Date(current),
        end: slotEnd
      });
      current = slotEnd;
    }
  }
  
  return slots;
}

/**
 * Merge overlapping time ranges
 */
function mergeOverlappingRanges(ranges: SlotTime[]): SlotTime[] {
  if (ranges.length === 0) return ranges;
  
  // Sort by start time
  const sorted = ranges.sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: SlotTime[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    // If current overlaps with last, merge them
    if (current.start <= last.end) {
      last.end = current.end > last.end ? current.end : last.end;
    } else {
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Validate time ranges don't overlap within a day
 */
export function validateTimeRanges(ranges: TimeRange[]): boolean {
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const rangeA = ranges[i];
      const rangeB = ranges[j];
      
      // Convert to minutes for easier comparison
      const aStart = timeToMinutes(rangeA.start);
      const aEnd = timeToMinutes(rangeA.end);
      const bStart = timeToMinutes(rangeB.start);
      const bEnd = timeToMinutes(rangeB.end);
      
      // Check for overlap
      if (aStart < bEnd && aEnd > bStart) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a room's hours extend outside clinic hours
 */
export function validateRoomHours(
  clinicRanges: TimeRange[], 
  roomRanges: TimeRange[]
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  for (const roomRange of roomRanges) {
    const roomStart = timeToMinutes(roomRange.start);
    const roomEnd = timeToMinutes(roomRange.end);
    
    let validRange = false;
    
    for (const clinicRange of clinicRanges) {
      const clinicStart = timeToMinutes(clinicRange.start);
      const clinicEnd = timeToMinutes(clinicRange.end);
      
      if (roomStart >= clinicStart && roomEnd <= clinicEnd) {
        validRange = true;
        break;
      }
    }
    
    if (!validRange) {
      warnings.push(`Room hours ${roomRange.start}-${roomRange.end} extend outside clinic hours`);
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings
  };
}

/**
 * Create default availability configuration
 */
export function createDefaultAvailability(): AvailabilityConfig {
  const defaultWeekHours: TimeRange[] = [{ start: '09:00', end: '17:00' }];
  
  return {
    timezone: 'Africa/Cairo',
    slot_minutes: 15,
    clinic: {
      mon: defaultWeekHours,
      tue: defaultWeekHours,
      wed: defaultWeekHours,
      thu: defaultWeekHours,
      fri: [],
      sat: [{ start: '10:00', end: '14:00' }],
      sun: [],
      exceptions: []
    },
    rooms: {}
  };
}