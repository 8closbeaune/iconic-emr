import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Search, Download, Calendar, User, Database } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { format } from 'date-fns';

export function AuditManagement() {
  const { useAuditLog } = useAdmin();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  
  const { data: auditLog, isLoading } = useAuditLog(
    dateFrom, 
    dateTo, 
    tableFilter === "ALL" ? "" : tableFilter, 
    userFilter
  );

  const getOperationBadgeVariant = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'insert': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      default: return 'outline';
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation.toLowerCase()) {
      case 'insert': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      default: return '❓';
    }
  };

  const formatJsonDiff = (oldData: any, newData: any) => {
    if (!oldData && newData) {
      return 'New record created';
    }
    if (oldData && !newData) {
      return 'Record deleted';
    }
    if (oldData && newData) {
      const changes = [];
      for (const key in newData) {
        if (oldData[key] !== newData[key]) {
          changes.push(`${key}: "${oldData[key]}" → "${newData[key]}"`);
        }
      }
      return changes.length > 0 ? changes.join(', ') : 'No visible changes';
    }
    return 'No change data';
  };

  const handleExport = () => {
    if (!auditLog?.length) return;
    
    const csv = [
      ['Timestamp', 'User', 'Operation', 'Table', 'Record ID', 'Changes'].join(','),
      ...auditLog.map(entry => [
        entry.changed_at,
        (entry as any).profiles?.full_name || entry.changed_by || 'System',
        entry.operation,
        entry.table_name,
        entry.row_pk || '',
        `"${formatJsonDiff(entry.old_data, entry.new_data)}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Audit Log ({auditLog?.length || 0} entries)
            </div>
            <Button onClick={handleExport} disabled={!auditLog?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                From Date
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                To Date
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Table
              </Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All tables</SelectItem>
                  <SelectItem value="patients">patients</SelectItem>
                  <SelectItem value="appointments">appointments</SelectItem>
                  <SelectItem value="visits">visits</SelectItem>
                  <SelectItem value="profiles">profiles</SelectItem>
                  <SelectItem value="invoices">invoices</SelectItem>
                  <SelectItem value="payments">payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                User ID
              </Label>
              <Input
                placeholder="Filter by user ID"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Audit Log Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading audit log...</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.changed_at), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.profiles?.full_name ? (
                          <Badge variant="outline">{entry.profiles.full_name}</Badge>
                        ) : entry.changed_by ? (
                          <Badge variant="outline">{entry.changed_by.slice(0, 8)}...</Badge>
                        ) : (
                          <Badge variant="secondary">System</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOperationBadgeVariant(entry.operation)}>
                          {getOperationIcon(entry.operation)} {entry.operation}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.table_name}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.row_pk?.slice(0, 8) || 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-xs text-muted-foreground truncate" title={formatJsonDiff(entry.old_data, entry.new_data)}>
                          {formatJsonDiff(entry.old_data, entry.new_data)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {auditLog?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit entries found for the selected filters.</p>
              <p className="text-sm">Try adjusting your filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}