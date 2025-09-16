import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { MoreHorizontal, Eye, UserCheck, UserX, Calendar, RotateCcw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useUpdatePatientStatusMutation } from './usePatientsQuery';
import type { Patient } from './types';
import { STATUS_CONFIG } from './types';

interface PatientRowProps {
  patient: Patient;
  onViewDetails: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  isMobile?: boolean;
}

export default function PatientRow({ patient, onViewDetails, onEdit, isMobile }: PatientRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const updateStatusMutation = useUpdatePatientStatusMutation();
  const navigate = useNavigate();

  const handleStatusUpdate = async (status: Patient['status']) => {
    await updateStatusMutation.mutateAsync({
      patientId: patient.id,
      status,
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const ActionsMenu = () => (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View Full Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(patient)}>
          <Eye className="mr-2 h-4 w-4" />
          Quick Edit
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {patient.status !== 'arrived' && (
          <DropdownMenuItem
            onClick={() => handleStatusUpdate('arrived')}
            disabled={updateStatusMutation.isPending}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Mark Arrived
          </DropdownMenuItem>
        )}
        
        {patient.status !== 'planned' && (
          <DropdownMenuItem
            onClick={() => handleStatusUpdate('planned')}
            disabled={updateStatusMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Planned
          </DropdownMenuItem>
        )}
        
        {patient.status !== 'no_show' && (
          <DropdownMenuItem
            onClick={() => handleStatusUpdate('no_show')}
            disabled={updateStatusMutation.isPending}
          >
            <UserX className="mr-2 h-4 w-4" />
            Mark No Show
          </DropdownMenuItem>
        )}
        
        {patient.status !== 'cancelled' && (
          <DropdownMenuItem
            onClick={() => handleStatusUpdate('cancelled')}
            disabled={updateStatusMutation.isPending}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Cancel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {/* Avatar */}
              <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center text-sm font-medium">
                {getInitials(patient.arabic_full_name)}
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link 
                  to={`/patients/${patient.id}`}
                  className="font-medium text-sm truncate hover:text-primary transition-colors block" 
                  dir="auto"
                >
                  {patient.arabic_full_name}
                </Link>
                {patient.phone && (
                  <p className="text-sm text-muted-foreground">{patient.phone}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <Badge className={cn("text-xs", STATUS_CONFIG[patient.status].color)}>
                    {STATUS_CONFIG[patient.status].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(patient.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <ActionsMenu />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center text-xs font-medium">
            {getInitials(patient.arabic_full_name)}
          </div>
          <div>
            <Link 
              to={`/patients/${patient.id}`}
              className="font-medium hover:text-primary transition-colors" 
              dir="auto"
            >
              {patient.arabic_full_name}
            </Link>
            {patient.latin_name && (
              <p className="text-sm text-muted-foreground">{patient.latin_name}</p>
            )}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        {patient.phone || (
          <span className="text-muted-foreground text-sm">No phone</span>
        )}
      </TableCell>
      
      <TableCell>
        <Badge className={cn("text-xs", STATUS_CONFIG[patient.status].color)}>
          {STATUS_CONFIG[patient.status].label}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div>
          <p className="text-sm">{format(new Date(patient.created_at), 'MMM d, yyyy')}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(patient.created_at), 'h:mm a')}
          </p>
        </div>
      </TableCell>
      
      <TableCell>
        {patient.created_by ? (
          <span className="text-sm text-muted-foreground">Staff Member</span>
        ) : (
          <span className="text-sm text-muted-foreground">System</span>
        )}
      </TableCell>
      
      <TableCell>
        <ActionsMenu />
      </TableCell>
    </TableRow>
  );
}