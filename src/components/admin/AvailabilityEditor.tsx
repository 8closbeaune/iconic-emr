import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Building2, Calendar, Plus, Copy, Trash2, Globe } from 'lucide-react';
import { useClinicSettings } from '@/hooks/useClinicSettings';
import { useAdmin } from '@/hooks/useAdmin';
import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import { ExceptionsDrawer } from './ExceptionsDrawer';
import { AvailabilityConfig, TimeRange, DaySchedule } from '@/lib/availability';

const TIMEZONES = [
  { value: 'Africa/Cairo', label: 'Cairo (UTC+2)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (UTC+3)' },
];

const SLOT_DURATIONS = [5, 10, 15, 20, 30];

export function AvailabilityEditor() {
  const { settings, debouncedSave, isLoading } = useClinicSettings();
  const { useRooms } = useAdmin();
  const { data: rooms } = useRooms();
  
  const [localAvailability, setLocalAvailability] = useState<AvailabilityConfig | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [showExceptions, setShowExceptions] = useState(false);

  // Initialize local state when settings are loaded
  useEffect(() => {
    if (settings?.availability) {
      setLocalAvailability(settings.availability);
    }
  }, [settings]);

  // Auto-save when local availability changes
  useEffect(() => {
    if (localAvailability && settings) {
      debouncedSave({
        availability: localAvailability,
        timezone: localAvailability.timezone,
        slot_minutes: localAvailability.slot_minutes,
      });
    }
  }, [localAvailability, debouncedSave, settings]);

  const updateAvailability = (updates: Partial<AvailabilityConfig>) => {
    setLocalAvailability(prev => prev ? { ...prev, ...updates } : null);
  };

  const updateClinicSchedule = (schedule: Partial<DaySchedule>) => {
    setLocalAvailability(prev => prev ? {
      ...prev,
      clinic: { ...prev.clinic, ...schedule }
    } : null);
  };

  const updateRoomSchedule = (roomId: string, schedule: Partial<DaySchedule>) => {
    setLocalAvailability(prev => prev ? {
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomId]: { ...prev.rooms[roomId], ...schedule }
      }
    } : null);
  };

  const copyClinicToRoom = (roomId: string) => {
    if (!localAvailability) return;
    
    setLocalAvailability(prev => prev ? {
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomId]: { ...prev.clinic }
      }
    } : null);
  };

  const clearRoomSchedule = (roomId: string) => {
    setLocalAvailability(prev => prev ? {
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomId]: {
          mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
          exceptions: []
        }
      }
    } : null);
  };

  if (isLoading || !localAvailability) {
    return <div className="flex items-center justify-center p-8">Loading availability settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Availability Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Timezone
              </Label>
              <Select 
                value={localAvailability.timezone} 
                onValueChange={(value) => updateAvailability({ timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Slot Duration
              </Label>
              <Select 
                value={localAvailability.slot_minutes.toString()} 
                onValueChange={(value) => updateAvailability({ slot_minutes: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_DURATIONS.map(duration => (
                    <SelectItem key={duration} value={duration.toString()}>
                      {duration} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowExceptions(true)}
              className="flex items-center"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Manage Exceptions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clinic & Rooms Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="clinic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clinic" className="flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Clinic Hours
              </TabsTrigger>
              <TabsTrigger value="rooms" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Room Hours ({rooms?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clinic" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Clinic Operating Hours</h3>
                </div>
                
                <WeeklyScheduleEditor
                  schedule={localAvailability.clinic}
                  onChange={updateClinicSchedule}
                />
              </div>
            </TabsContent>

            <TabsContent value="rooms" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Room List */}
                <div className="lg:col-span-1">
                  <h3 className="font-medium mb-3">Treatment Rooms</h3>
                  <div className="space-y-2">
                    {rooms?.map(room => (
                      <div
                        key={room.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedRoom === room.id 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedRoom(room.id)}
                      >
                        <div className="font-medium">{room.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {localAvailability.rooms[room.id] ? 'Custom hours' : 'No hours set'}
                        </div>
                      </div>
                    ))}
                    
                    {rooms?.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No rooms configured</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room Schedule Editor */}
                <div className="lg:col-span-3">
                  {selectedRoom ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">
                          {rooms?.find(r => r.id === selectedRoom)?.name} Hours
                        </h3>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyClinicToRoom(selectedRoom)}
                            className="flex items-center"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Clinic Hours
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clearRoomSchedule(selectedRoom)}
                            className="flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear All
                          </Button>
                        </div>
                      </div>

                      <WeeklyScheduleEditor
                        schedule={localAvailability.rooms[selectedRoom] || {
                          mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [],
                          exceptions: []
                        }}
                        onChange={(schedule) => updateRoomSchedule(selectedRoom, schedule)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <div className="text-center">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Select a room to configure its hours</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ExceptionsDrawer
        open={showExceptions}
        onOpenChange={setShowExceptions}
        exceptions={localAvailability.clinic.exceptions}
        onUpdateExceptions={(exceptions) => updateClinicSchedule({ exceptions })}
      />
    </div>
  );
}