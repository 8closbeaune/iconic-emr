import { useState, useEffect } from 'react';
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Receipt, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { format } from 'date-fns';

interface QuickSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientSelect: (patientId: string) => void;
}

interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'invoice';
  title: string;
  subtitle: string;
  status?: string;
  date?: string;
}

export default function QuickSwitcher({ isOpen, onClose, onPatientSelect }: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    searchAll(debouncedQuery);
  }, [debouncedQuery]);

  const searchAll = async (searchTerm: string) => {
    setIsLoading(true);
    const allResults: SearchResult[] = [];

    try {
      // Search patients
      const { data: patients } = await supabase
        .from('patients')
        .select('id, arabic_full_name, phone, status, created_at')
        .or(`arabic_full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(5);

      if (patients) {
        patients.forEach(patient => {
          allResults.push({
            id: patient.id,
            type: 'patient',
            title: patient.arabic_full_name,
            subtitle: patient.phone || 'No phone',
            status: patient.status,
            date: patient.created_at,
          });
        });
      }

      // Search today's appointments
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, 
          starts_at, 
          status,
          patients!inner(id, arabic_full_name, phone)
        `)
        .gte('starts_at', startOfDay.toISOString())
        .lte('starts_at', endOfDay.toISOString())
        .or(`patients.arabic_full_name.ilike.%${searchTerm}%,patients.phone.ilike.%${searchTerm}%`)
        .limit(3);

      if (appointments) {
        appointments.forEach(apt => {
          const patient = apt.patients as any;
          allResults.push({
            id: patient.id,
            type: 'appointment',
            title: patient.arabic_full_name,
            subtitle: `Appointment ${format(new Date(apt.starts_at), 'h:mm a')}`,
            status: apt.status,
            date: apt.starts_at,
          });
        });
      }

      // Search recent invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          patients!inner(id, arabic_full_name, phone)
        `)
        .or(`patients.arabic_full_name.ilike.%${searchTerm}%,patients.phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (invoices) {
        invoices.forEach(invoice => {
          const patient = invoice.patients as any;
          allResults.push({
            id: patient.id,
            type: 'invoice',
            title: patient.arabic_full_name,
            subtitle: `Invoice ${invoice.total_amount} EGP`,
            status: invoice.status,
            date: invoice.created_at,
          });
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    onPatientSelect(result.id);
    onClose();
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'patient': return User;
      case 'appointment': return Calendar;
      case 'invoice': return Receipt;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-gray-100 text-gray-800';
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'discharged': return 'bg-emerald-100 text-emerald-800';
      case 'no_show': return 'bg-rose-100 text-rose-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput 
        placeholder="Search patients, appointments, invoices..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Searching..." : "No results found."}
        </CommandEmpty>
        
        {results.length > 0 && (
          <>
            <CommandGroup heading="Patients">
              {results.filter(r => r.type === 'patient').map((result) => {
                const Icon = getIcon(result.type);
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 p-3"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                    </div>
                    {result.status && (
                      <Badge variant="secondary" className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            {results.some(r => r.type === 'appointment') && (
              <CommandGroup heading="Today's Appointments">
                {results.filter(r => r.type === 'appointment').map((result) => {
                  const Icon = getIcon(result.type);
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                      </div>
                      {result.status && (
                        <Badge variant="secondary" className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {results.some(r => r.type === 'invoice') && (
              <CommandGroup heading="Recent Invoices">
                {results.filter(r => r.type === 'invoice').map((result) => {
                  const Icon = getIcon(result.type);
                  return (
                    <CommandItem
                      key={`${result.type}-${result.id}`}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{result.title}</div>
                        <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                      </div>
                      {result.status && (
                        <Badge variant="secondary" className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}