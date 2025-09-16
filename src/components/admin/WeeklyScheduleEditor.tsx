import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { TimeRange, DaySchedule, validateTimeRanges } from '@/lib/availability';

const DAYS = [
  { key: 'mon' as keyof DaySchedule, label: 'Monday' },
  { key: 'tue' as keyof DaySchedule, label: 'Tuesday' },
  { key: 'wed' as keyof DaySchedule, label: 'Wednesday' },
  { key: 'thu' as keyof DaySchedule, label: 'Thursday' },
  { key: 'fri' as keyof DaySchedule, label: 'Friday' },
  { key: 'sat' as keyof DaySchedule, label: 'Saturday' },
  { key: 'sun' as keyof DaySchedule, label: 'Sunday' },
];

interface WeeklyScheduleEditorProps {
  schedule: DaySchedule;
  onChange: (schedule: Partial<DaySchedule>) => void;
}

export function WeeklyScheduleEditor({ schedule, onChange }: WeeklyScheduleEditorProps) {
  const [editingDay, setEditingDay] = useState<keyof DaySchedule | null>(null);
  const [newRange, setNewRange] = useState<TimeRange>({ start: '09:00', end: '17:00' });

  const addRange = (day: keyof DaySchedule) => {
    if (newRange.start >= newRange.end) return;
    
    const currentRanges = schedule[day] as TimeRange[];
    const updatedRanges = [...currentRanges, newRange];
    
    if (!validateTimeRanges(updatedRanges)) {
      return; // Don't add overlapping ranges
    }
    
    // Sort ranges by start time
    updatedRanges.sort((a, b) => a.start.localeCompare(b.start));
    
    onChange({ [day]: updatedRanges });
    setEditingDay(null);
    setNewRange({ start: '09:00', end: '17:00' });
  };

  const removeRange = (day: keyof DaySchedule, index: number) => {
    const currentRanges = schedule[day] as TimeRange[];
    const updatedRanges = currentRanges.filter((_, i) => i !== index);
    onChange({ [day]: updatedRanges });
  };

  const formatTimeRange = (range: TimeRange) => {
    return `${range.start} - ${range.end}`;
  };

  return (
    <div className="space-y-4">
      {DAYS.map(({ key, label }) => {
        const dayRanges = schedule[key] as TimeRange[];
        const isEditing = editingDay === key;
        
        return (
          <Card key={key} className="border-l-4 border-l-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-medium">{label}</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDay(isEditing ? null : key)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Range
                </Button>
              </div>

              {/* Existing ranges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {dayRanges.length > 0 ? (
                  dayRanges.map((range, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center px-3 py-1"
                    >
                      {formatTimeRange(range)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeRange(key, index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Closed
                  </Badge>
                )}
              </div>

              {/* Add new range form */}
              {isEditing && (
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">Start Time</Label>
                      <Input
                        type="time"
                        value={newRange.start}
                        onChange={(e) => setNewRange(prev => ({ ...prev, start: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">End Time</Label>
                      <Input
                        type="time"
                        value={newRange.end}
                        onChange={(e) => setNewRange(prev => ({ ...prev, end: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDay(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => addRange(key)}
                      disabled={newRange.start >= newRange.end}
                    >
                      Add Range
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
