import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Phone, Calendar } from 'lucide-react';
import { useSearchPatients } from '@/hooks/useFrontDeskActions';
import { SearchResult } from './AddPatientModal';
import { format } from 'date-fns';

interface PatientSearchStepProps {
  onSearchResults: (results: SearchResult[], term: string) => void;
  onSelectExisting: (patient: SearchResult) => void;
}

export default function PatientSearchStep({ onSearchResults, onSelectExisting }: PatientSearchStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: searchResults = [], isLoading } = useSearchPatients(searchTerm);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    // Keep for manual submit, but results update live
    onSearchResults(searchResults, searchTerm);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'in_chair': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'arrived': return 'Arrived';
      case 'ready': return 'Ready';
      case 'in_chair': return 'In Chair';
      case 'completed': return 'Completed';
      default: return 'Planned';
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Patient
        </DialogTitle>
        <DialogDescription>
          Search by Arabic name or phone number
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 mt-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ابحث بالاسم العربي أو رقم الهاتف"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-right"
              dir="rtl"
              autoFocus
            />
          </div>
          {/* Search button optional; results update live */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!searchTerm.trim() || isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        <div className="space-y-3">
          {searchResults.length > 0 ? (
            <>
              <h3 className="font-medium text-sm">
                {searchTerm.trim() ? `Found ${searchResults.length} patients:` : 'Latest patients'}
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((patient) => (
                  <Card key={patient.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm" dir="rtl">
                            {patient.arabic_full_name}
                          </div>
                          {patient.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={getStatusColor(patient.status)}>
                              {getStatusLabel(patient.status)}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(patient.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => onSelectExisting(patient)}
                        >
                          Select
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 space-y-3">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">No patients found</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new patient with the search term
                </p>
              </div>
              <Button className="w-full" onClick={() => onSearchResults([], searchTerm)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create New Patient
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}