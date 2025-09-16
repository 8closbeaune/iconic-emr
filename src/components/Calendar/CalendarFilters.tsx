import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, X } from 'lucide-react';
import { useProviders, useRooms } from '@/hooks/useCalendarData';
import { CalendarFilters } from '@/hooks/useCalendarData';

interface CalendarFiltersProps {
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  onExport: (type: 'csv' | 'pdf') => void;
}

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'arrived', label: 'Arrived' },
  { value: 'ready', label: 'Ready' },
  { value: 'in_chair', label: 'In Chair' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

export default function CalendarFiltersComponent({ filters, onFiltersChange, onExport }: CalendarFiltersProps) {
  const { data: providers = [] } = useProviders();
  const { data: rooms = [] } = useRooms();

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const updateFilter = (key: keyof CalendarFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' || !value ? undefined : (value as any),
    });
  };

  return (
    <div className="flex items-center gap-3 p-4 border-b bg-card/50">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 flex-1">
        {/* Provider Filter */}
        <Select
          value={filters.providerId ?? 'all'}
          onValueChange={(value) => updateFilter('providerId', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.display_name}
                {provider.specialty && (
                  <span className="text-muted-foreground ml-1">({provider.specialty})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Room Filter */}
        <Select
          value={filters.roomId ?? 'all'}
          onValueChange={(value) => updateFilter('roomId', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) => updateFilter('status', value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Export Options */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('csv')}
          className="text-xs"
        >
          <Download className="h-4 w-4 mr-1" />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('pdf')}
          className="text-xs"
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
      </div>
    </div>
  );
}