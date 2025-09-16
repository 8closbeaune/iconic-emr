import { useQuery } from '@tanstack/react-query';
import { useClinicSettings } from './useClinicSettings';
import { useToast } from './use-toast';
import { 
  parseAvailability, 
  generateSlots, 
  AvailabilityConfig,
  SlotTime
} from '@/lib/availability';
import { 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  format,
  addMinutes
} from 'date-fns';

export interface AvailableSlot {
  start: Date;
  end: Date;
  roomId?: string;
}

/**
 * Hook to validate appointment times against availability
 */
export function useAvailabilityValidation() {
  const { settings } = useClinicSettings();
  const { toast } = useToast();

  /**
   * Check if a time slot is available for booking
   */
  const isTimeSlotAvailable = (
    startTime: Date,
    endTime: Date,
    roomId?: string
  ): boolean => {
    if (!settings?.availability) return true; // Fallback to allowing if no config

    try {
      const availableRanges = parseAvailability(
        settings.availability,
        startTime,
        roomId
      );

      // Check if the entire appointment duration falls within available ranges
      for (const range of availableRanges) {
        if (
          startTime >= range.start && 
          endTime <= range.end
        ) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error validating availability:', error);
      return true; // Fallback to allowing
    }
  };

  /**
   * Get available slots for a specific date and room
   */
  const getAvailableSlots = (
    date: Date,
    roomId?: string
  ): AvailableSlot[] => {
    if (!settings?.availability) return [];

    try {
      const availableRanges = parseAvailability(
        settings.availability,
        date,
        roomId
      );

      const slots = generateSlots(availableRanges, settings.availability.slot_minutes);
      
      return slots.map(slot => ({
        start: slot.start,
        end: slot.end,
        roomId
      }));
    } catch (error) {
      console.error('Error generating available slots:', error);
      return [];
    }
  };

  /**
   * Validate appointment and show error if needed
   */
  const validateAndNotify = (
    startTime: Date,
    endTime: Date,
    roomId?: string
  ): boolean => {
    const isValid = isTimeSlotAvailable(startTime, endTime, roomId);
    
    if (!isValid) {
      const timeStr = `${format(startTime, 'MMM dd, HH:mm')} - ${format(endTime, 'HH:mm')}`;
      toast({
        title: 'Time slot not available',
        description: `${timeStr} is outside clinic operating hours`,
        variant: 'destructive'
      });
    }
    
    return isValid;
  };

  /**
   * Get non-bookable periods for calendar dimming
   */
  const getNonBookablePeriods = (
    date: Date,
    roomId?: string
  ): { start: Date; end: Date }[] => {
    if (!settings?.availability) return [];

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const availableRanges = parseAvailability(
      settings.availability,
      date,
      roomId
    );

    const nonBookable: { start: Date; end: Date }[] = [];
    
    // Add period before first available time
    if (availableRanges.length > 0) {
      const firstAvailable = availableRanges[0].start;
      if (firstAvailable > dayStart) {
        nonBookable.push({
          start: dayStart,
          end: firstAvailable
        });
      }
    } else {
      // Entire day is non-bookable
      return [{ start: dayStart, end: dayEnd }];
    }

    // Add gaps between available ranges
    for (let i = 0; i < availableRanges.length - 1; i++) {
      const current = availableRanges[i];
      const next = availableRanges[i + 1];
      
      if (current.end < next.start) {
        nonBookable.push({
          start: current.end,
          end: next.start
        });
      }
    }

    // Add period after last available time
    const lastAvailable = availableRanges[availableRanges.length - 1];
    if (lastAvailable && lastAvailable.end < dayEnd) {
      nonBookable.push({
        start: lastAvailable.end,
        end: dayEnd
      });
    }

    return nonBookable;
  };

  return {
    isTimeSlotAvailable,
    getAvailableSlots,
    validateAndNotify,
    getNonBookablePeriods,
    availability: settings?.availability,
    isLoading: !settings
  };
}