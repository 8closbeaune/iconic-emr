import { useState, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Users,
  MapPin
} from 'lucide-react';
import { 
  useCalendarAppointments, 
  CalendarAppointment, 
  CalendarFilters 
} from '@/hooks/useCalendarData';
import { useFrontDeskRealtime } from '@/hooks/useFrontDeskRealtime';
import CalendarFiltersComponent from '@/components/Calendar/CalendarFilters';
import AppointmentCard, { getStatusBackgroundColor } from '@/components/Calendar/AppointmentCard';
import AddAppointmentModal from '@/components/Calendar/AddAppointmentModal';
import AppointmentDetailsDrawer from '@/components/Calendar/AppointmentDetailsDrawer';
import { exportAppointmentsToCSV, exportAppointmentsToPDF, getExportFilename } from '@/utils/calendarExport';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarAppointment;
}

export default function Calendar() {
  const { toast } = useToast();
  
  // Enable real-time updates
  useFrontDeskRealtime();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('week');
  const [filters, setFilters] = useState<CalendarFilters>({});
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time?: string;
    provider?: string;
    room?: string;
  } | null>(null);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (currentView) {
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        };
      case 'day':
        return {
          start: currentDate,
          end: addDays(currentDate, 1),
        };
      default:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 0 }),
          end: endOfWeek(currentDate, { weekStartsOn: 0 }),
        };
    }
  }, [currentDate, currentView]);

  // Fetch appointments
  const { data: appointments = [], isLoading } = useCalendarAppointments(
    dateRange.start,
    dateRange.end,
    filters
  );

  // Provider color palette and deterministic mapping
  const COLORS = ['#4f46e5','#16a34a','#06b6d4','#f59e0b','#ef4444','#8b5cf6','#10b981','#e11d48'];
  const hash = (s: string) => s.split('').reduce((a,b)=>((a<<5)-a)+b.charCodeAt(0),0);
  const colorFor = (provId: string | undefined) => {
    if (!provId) return COLORS[0];
    const idx = Math.abs(hash(provId)) % COLORS.length;
    return COLORS[idx];
  };

  // Convert appointments to calendar events with extended props and local timezone parsing
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map(appointment => {
      const start = appointment.starts_at ? new Date(appointment.starts_at) : new Date();
      let end = appointment.ends_at ? new Date(appointment.ends_at) : new Date(start.getTime() + 30*60000);
      // Ensure end > start
      if (end <= start) end = new Date(start.getTime() + 30*60000);

      const providerId = appointment.provider_id || appointment.providers?.id;
      const providerName = appointment.providers?.display_name || '';
      const roomName = appointment.rooms?.name || '';

      return {
        id: appointment.id,
        title: appointment.patients?.arabic_full_name || 'Patient',
        start,
        end,
        resource: appointment,
        // Extended props for rendering
        patient_name_ar: appointment.patients?.arabic_full_name,
        provider_id: providerId,
        provider_name: providerName,
        room_name: roomName,
        status: appointment.status,
        backgroundColor: colorFor(providerId as string | undefined),
        borderColor: colorFor(providerId as string | undefined),
      } as unknown as CalendarEvent;
    });
  }, [appointments]);

  // Handle slot selection (clicking empty time slot)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const timeStr = format(start, 'HH:mm');
    setSelectedSlot({
      date: start,
      time: timeStr,
    });
    setIsAddModalOpen(true);
  };

  // Handle event selection (clicking appointment)
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedAppointment(event.resource);
    setIsDrawerOpen(true);
  };

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Handle navigation
  const handleNavigate = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  // Helper for pretty status and chip classes
  const prettyStatus = (s: string) => ({
    planned: 'Planned', arrived: 'Arrived', in_chair: 'In Chair', completed: 'Completed', cancelled: 'Cancelled'
  } as any)[s] || s;
  const chipClass = (s: string) => ({
    planned: 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-white/20 text-white',
    arrived: 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-yellow-300 text-black',
    in_chair: 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-sky-300 text-black',
    completed: 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-emerald-300 text-black',
    cancelled: 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-neutral-400 text-black',
  } as any)[s] ?? 'inline-block mt-0.5 px-1.5 py-0.5 rounded bg-white/20 text-white';

  // Custom event component for better styling
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const appt: any = event.resource;
    const bg = (event as any).backgroundColor || getStatusBackgroundColor(appt.status) || '#4f46e5';
    const providerName = (event as any).provider_name || appt.providers?.display_name;
    const roomName = (event as any).room_name || appt.rooms?.name;

    return (
      <div className="p-2 rounded text-sm text-white/95" style={{ backgroundColor: bg, borderLeft: `4px solid ${bg}` }}>
        <div className="font-semibold truncate" dir="rtl">{(event as any).patient_name_ar}</div>
        <div className="opacity-90 text-xs">{format(event.start, 'HH:mm')}–{format(event.end, 'HH:mm')}</div>
        <div className="opacity-90 truncate text-xs">{roomName}{roomName && providerName ? ' · ' : ''}{providerName}</div>
        <div><span className={chipClass(appt.status)}>{prettyStatus(appt.status)}</span></div>
      </div>
    );
  };

  // Export handlers
  const handleExport = (type: 'csv' | 'pdf') => {
    if (appointments.length === 0) {
      toast({
        title: "No Data",
        description: "No appointments to export",
        variant: "destructive",
      });
      return;
    }

    const filename = getExportFilename(currentView, currentDate);
    const title = `${currentView.charAt(0).toUpperCase() + currentView.slice(1)} Appointments - ${format(currentDate, 'MMMM yyyy')}`;

    if (type === 'csv') {
      exportAppointmentsToCSV(appointments, filename);
    } else {
      exportAppointmentsToPDF(appointments, filename, title);
    }

    toast({
      title: "Export Complete",
      description: `${appointments.length} appointments exported successfully`,
    });
  };

  // Handle add walk-in
  const handleAddWalkIn = () => {
    setSelectedSlot({
      date: new Date(),
      time: format(new Date(), 'HH:mm'),
    });
    setIsAddModalOpen(true);
  };

  // Agenda Day view component
  function groupByHourThenProvider(events: CalendarEvent[]) {
    const groups: Record<string, any[]> = {};
    events.forEach(ev => {
      const hour = format(ev.start, 'HH:00');
      if (!groups[hour]) groups[hour] = [];
      groups[hour].push(ev);
    });
    // For each hour sort by start
    return Object.keys(groups).sort().map(hour => ({ hour, items: groups[hour].sort((a,b)=>a.start.getTime()-b.start.getTime()) }));
  }

  function AgendaDay({ date, events, colorFor, onOpen }: { date: Date; events: CalendarEvent[]; colorFor: any; onOpen: (id:string)=>void }) {
    const groups = groupByHourThenProvider(events.filter(e => e.start.toDateString() === date.toDateString()));
    return (
      <div className="space-y-4">
        {groups.map(g => (
          <section key={g.hour}>
            <h3 className="text-sm font-semibold mb-2">{g.hour}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map((ev: any) => (
                <div key={ev.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">{(ev as any).patient_name_ar}</div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-white" style={{ backgroundColor: colorFor(ev.provider_id) }}>
                      {((ev as any).provider_name || '').split(' ').map((p:any)=>p[0]).join('').slice(0,3)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(ev.start, 'HH:mm')} - {format(ev.end, 'HH:mm')} · {ev.room_name}</div>
                  <div className="mt-2"><span className={chipClass(ev.status)}>{prettyStatus(ev.status)}</span></div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onOpen(ev.id)}>View</Button>
                    {ev.status === 'planned' && format(new Date(), 'yyyy-MM-dd') === format(ev.start, 'yyyy-MM-dd') && (
                      <Button size="sm" onClick={() => onOpen(ev.id)}>Check-in</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-6 w-6" />
                Calendar
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage appointments and scheduling
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleAddWalkIn} variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Add Walk-in
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <CalendarFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
      />

      {/* Calendar Navigation and View Controls */}
      <div className="flex items-center justify-between p-4 border-b bg-card/30">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold min-w-48 text-center">
            {format(currentDate, currentView === 'month' ? 'MMMM yyyy' : 
                   currentView === 'week' ? "'Week of' MMM d, yyyy" : 
                   'EEEE, MMM d, yyyy')}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate(new Date())}
          >
            Today
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['month', 'week', 'day', 'agenda'] as View[]).map((view) => (
            <Button
              key={view}
              variant={currentView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange(view)}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4 border-b bg-card/20">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-blue-500" />
            <span>Total: <strong>{appointments.length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span>Completed: <strong>{appointments.filter(a => a.status === 'completed').length}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span>In Chair: <strong>{appointments.filter(a => a.status === 'in_chair').length}</strong></span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4">
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          {Array.from(new Map(appointments.map(a => [a.provider_id || a.providers?.id, a.providers?.display_name || 'Unassigned']))).map(([pid, name]) => (
            <div key={pid} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: colorFor(pid as string | undefined) }} />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>

        {currentView === 'agenda' ? (
          // Agenda Day view
          <div className="space-y-4">
            <AgendaDay date={currentDate} events={events} colorFor={colorFor} onOpen={(id) => {
              const found = appointments.find(a => a.id === id);
              if (found) { setSelectedAppointment(found); setIsDrawerOpen(true); }
            }} />
          </div>
        ) : (
        <div style={{ height: 'calc(100vh - 300px)' }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={handleViewChange}
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
            step={15}
            timeslots={4}
            defaultView={Views.WEEK}
            toolbar={false}
            components={{
              event: EventComponent,
            }}
            eventPropGetter={(event) => {
              const appointment = event.resource as any;
              const bg = (event as any).backgroundColor || colorFor(appointment.provider_id);
              return {
                style: {
                  backgroundColor: bg,
                  border: 'none',
                  borderRadius: '8px',
                  minHeight: 28,
                  color: '#fff',
                  padding: '2px'
                },
              };
            }}
            dayPropGetter={(date) => ({
              style: {
                backgroundColor: date.getDay() === 0 || date.getDay() === 6 ? '#fafafa' : 'white',
              },
            })}
          />
        </div>
        )}
      </div>

      {/* Modals and Drawers */}
      <AddAppointmentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSlot(null);
        }}
        selectedDate={selectedSlot?.date}
        selectedTime={selectedSlot?.time}
        selectedProvider={selectedSlot?.provider}
        selectedRoom={selectedSlot?.room}
      />

      <AppointmentDetailsDrawer
        appointment={selectedAppointment}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppointment(null);
        }}
      />
    </div>
  );
}
