import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Stethoscope, User, Phone, Clock, Play, GripVertical, MapPin } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/store/appStore';
import { useState } from 'react';
import React from 'react';

interface ReadyQueueProps {
  searchTerm: string;
  onPatientSelect: (patientId: string) => void;
}

interface ReadyItem {
  id: string; // appointment id
  patient_id: string;
  provider_id: string | null;
  room_id: string | null;
  starts_at: string;
  status: string;
  patients: {
    id: string;
    arabic_full_name: string;
    phone: string | null;
    updated_at: string;
  };
  providers: { display_name: string } | null;
  rooms: { name: string } | null;
}

interface SortablePatientProps {
  item: ReadyItem;
  index: number;
  onPatientSelect: (patientId: string) => void;
  onStartVisit: (item: ReadyItem) => void;
  isStarting: boolean;
}

function SortablePatient({ item, index, onPatientSelect, onStartVisit, isStarting }: SortablePatientProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background border rounded-lg p-3 hover:bg-muted/50 transition-colors"
    >
      {/* Queue Position with Drag Handle */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Badge variant="outline" className="text-xs">
            #{index + 1} in queue
          </Badge>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Ready
        </Badge>
      </div>

      {/* Patient Info */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm truncate">
              {item.patients.arabic_full_name}
            </h3>
          </div>
          
          {item.patients.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{item.patients.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Provider & Room */}
      <div className="space-y-1 mb-2 text-xs text-muted-foreground">
        {item.providers && (
          <div className="flex items-center gap-2">
            <Stethoscope className="h-3 w-3" />
            <span>{item.providers.display_name}</span>
          </div>
        )}
        {item.rooms && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3" />
            <span>{item.rooms.name}</span>
          </div>
        )}
      </div>

      {/* Wait Time */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Clock className="h-3 w-3" />
        <span>Ready for {formatDistanceToNow(new Date(item.patients.updated_at))}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onStartVisit(item)}
          disabled={isStarting}
          className="flex-1 text-xs bg-green-600 hover:bg-green-700"
        >
          <Play className="mr-1 h-3 w-3" />
          Start Visit
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPatientSelect(item.patients.id)}
          className="text-xs"
        >
          <User className="mr-1 h-3 w-3" />
          View
        </Button>
      </div>
    </div>
  );
}

export default function ReadyQueue({ searchTerm, onPatientSelect }: ReadyQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, currentClinic } = useAppStore();
  const [items, setItems] = useState<ReadyItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: fetchedItems = [], isLoading } = useQuery({
    queryKey: ['ready-queue', searchTerm],
    queryFn: async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          provider_id,
          room_id,
          starts_at,
          status,
          patients!inner(
            id,
            arabic_full_name,
            phone,
            updated_at,
            status
          ),
          providers(display_name),
          rooms(name)
        `)
        .eq('patients.status', 'ready')
        .gte('starts_at', start)
        .lte('starts_at', end)
        .order('starts_at', { ascending: true });

      if (searchTerm) {
        query = query.or(`patients.arabic_full_name.ilike.%${searchTerm}%,patients.phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as ReadyItem[]) || [];
    },
  });

  // Update local state when data changes
  React.useEffect(() => {
    if (JSON.stringify(fetchedItems) !== JSON.stringify(items)) {
      setItems(fetchedItems);
    }
  }, [fetchedItems]);

  // const { data: providers = [] } = useQuery({
  //   queryKey: ['providers'],
  //   queryFn: async () => {
  //     const { data, error } = await supabase
  //       .from('providers')
  //       .select('id, display_name')
  //       .eq('active', true)
  //       .order('display_name');
  //
  //     if (error) throw error;
  //     return data || [];
  //   },
  // });

  // const { data: rooms = [] } = useQuery({
  //   queryKey: ['rooms'],
  //   queryFn: async () => {
  //     const { data, error } = await supabase
  //       .from('rooms')
  //       .select('id, name')
  //       .eq('is_active', true)
  //       .eq('clinic_id', currentClinic?.id || '')
  //       .order('name');
  //
  //     if (error) throw error;
  //     return data || [];
  //   },
  // });

  const startVisitMutation = useMutation({
    mutationFn: async ({ appointmentId, patientId, providerId, roomId }: {
      appointmentId?: string;
      patientId: string;
      providerId?: string;
      roomId?: string;
    }) => {
      // Create visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          patient_id: patientId,
          appointment_id: appointmentId || null,
          provider_id: providerId || null,
          room_id: roomId || null,
          clinic_id: currentClinic?.id || null,
          created_by: profile?.user_id || null,
          status: 'in_chair',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (visitError) throw visitError;

      // Update patient status
      const { error: patientError } = await supabase
        .from('patients')
        .update({ status: 'in_chair' })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Update appointment status if exists
      if (appointmentId) {
        await supabase
          .from('appointments')
          .update({ status: 'in_chair' })
          .eq('id', appointmentId);
      }

      return visit;
    },
    onSuccess: () => {
      toast({
        title: "Visit started",
        description: "Patient moved to clinical console",
      });
      queryClient.invalidateQueries({ queryKey: ['ready-queue'] });
    },
    onError: (error) => {
      console.error('Error starting visit:', error);
      toast({
        title: "Error",
        description: "Failed to start visit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartVisit = (item: ReadyItem) => {
    startVisitMutation.mutate({
      appointmentId: item.id,
      patientId: item.patients.id,
      providerId: item.provider_id || undefined,
      roomId: item.room_id || undefined,
    });
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(it => it.id === String(active.id));
      const newIndex = items.findIndex(it => it.id === String(over.id));

      setItems(arrayMove(items, oldIndex, newIndex));
      
      toast({
        title: "Queue updated",
        description: "Patient order has been changed",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No patients ready for visit</p>
        {searchTerm && (
          <p className="text-xs mt-1">No results for "{searchTerm}"</p>
        )}
      </div>
    );
  }

  // Group items by provider
  const groups = items.reduce((acc: Record<string, { label: string; items: ReadyItem[] }>, it) => {
    const key = it.providers?.display_name ? it.providers.display_name : 'Unassigned';
    if (!acc[key]) acc[key] = { label: key, items: [] };
    acc[key].items.push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(groups).map((group) => (
            <div key={group.label} className="bg-muted/10 rounded-md p-2">
              <div className="text-xs font-medium mb-2 px-1">
                {group.label}
              </div>
              <SortableContext items={group.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {group.items.map((item, index) => (
                    <SortablePatient
                      key={item.id}
                      item={item}
                      index={index}
                      onPatientSelect={onPatientSelect}
                      onStartVisit={handleStartVisit}
                      isStarting={startVisitMutation.isPending}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
