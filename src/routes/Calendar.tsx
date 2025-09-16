import { useState, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map(appointment => ({
      id: appointment.id,
      title: appointment.patients.arabic_full_name,
      start: new Date(appointment.starts_at),
      end: new Date(appointment.ends_at),
      resource: appointment,
    }));
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

  // Custom event component for better styling
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const appointment = event.resource;
    return (
      <div className={`h-full p-1 rounded text-xs ${getStatusBackgroundColor(appointment.status)} border-l-2`}>
        <div className="font-medium truncate" dir="rtl">
          {appointment.patients.arabic_full_name}
        </div>
        {appointment.patients.phone && (
          <div className="text-muted-foreground truncate text-xs">
            {appointment.patients.phone}
          </div>
        )}
        {appointment.providers && (
          <div className="text-muted-foreground truncate text-xs">
            {appointment.providers.display_name}
          </div>
        )}
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
          {(['month', 'week', 'day'] as View[]).map((view) => (
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
              const appointment = event.resource;
              return {
                style: {
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
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