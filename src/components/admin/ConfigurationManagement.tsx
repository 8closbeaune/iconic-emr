import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Building2, DoorOpen, Plus, Edit3, Clock, MapPin, Calendar } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useMe } from '@/hooks/useMe';
import { AddRoomModal } from './AddRoomModal';
import { EditRoomModal } from './EditRoomModal';
import { AvailabilityEditor } from './AvailabilityEditor';

export function ConfigurationManagement() {
  const { useRooms, updateRoom } = useAdmin();
  const { currentClinic } = useMe();
  const { data: rooms, isLoading } = useRooms();
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  // Mock clinic settings - in real app, fetch from clinic_settings table
  const [slotDuration, setSlotDuration] = useState(15);
  const [workingHours, setWorkingHours] = useState({
    start: '09:00',
    end: '18:00'
  });
  const [allowOverbooking, setAllowOverbooking] = useState(false);

  const handleToggleRoomActive = async (room: any, active: boolean) => {
    try {
      await updateRoom.mutateAsync({
        id: room.id,
        is_active: active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditRoom = (room: any) => {
    setSelectedRoom(room);
    setShowEditRoomModal(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading configuration...</div>;
  }

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general" className="flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          General
        </TabsTrigger>
        <TabsTrigger value="availability" className="flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          Availability
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="mt-6">
        <div className="space-y-6">
          {/* Clinic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Clinic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentClinic ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Clinic Name</Label>
                    <Input value={currentClinic.name} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={currentClinic.phone || 'Not set'} readOnly className="bg-muted" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Address</Label>
                    <Input value={currentClinic.address || 'Not set'} readOnly className="bg-muted" />
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No clinic selected</p>
              )}
            </CardContent>
          </Card>

          {/* Rooms Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <DoorOpen className="h-5 w-5 mr-2" />
                  Treatment Rooms ({rooms?.length || 0})
                </div>
                <Button onClick={() => setShowAddRoomModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms?.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DoorOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{room.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(room.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={room.is_active}
                        onCheckedChange={(checked) => handleToggleRoomActive(room, checked)}
                        disabled={updateRoom.isPending}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRoom(room)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {rooms?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DoorOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No treatment rooms configured yet.</p>
                  <p className="text-sm">Add your first room to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legacy Calendar Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Basic Calendar Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Default Slot Duration</Label>
                  <Select value={slotDuration.toString()} onValueChange={(value) => setSlotDuration(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="20">20 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Overbooking</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow scheduling multiple patients in the same time slot
                    </p>
                  </div>
                  <Switch
                    checked={allowOverbooking}
                    onCheckedChange={setAllowOverbooking}
                  />
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">Basic Working Hours</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  For advanced availability management, use the Availability tab
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Start Time</Label>
                    <Input
                      type="time"
                      value={workingHours.start}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">End Time</Label>
                    <Input
                      type="time"
                      value={workingHours.end}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="availability" className="mt-6">
        <AvailabilityEditor />
      </TabsContent>

      <AddRoomModal
        open={showAddRoomModal}
        onOpenChange={setShowAddRoomModal}
      />

      <EditRoomModal
        open={showEditRoomModal}
        onOpenChange={setShowEditRoomModal}
        room={selectedRoom}
      />
    </Tabs>
  );
}