import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CalendarX, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateException, TimeRange } from '@/lib/availability';

interface ExceptionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: DateException[];
  onUpdateExceptions: (exceptions: DateException[]) => void;
}

export function ExceptionsDrawer({ 
  open, 
  onOpenChange, 
  exceptions, 
  onUpdateExceptions 
}: ExceptionsDrawerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isClosed, setIsClosed] = useState(false);
  const [overrideRanges, setOverrideRanges] = useState<TimeRange[]>([]);
  const [newRange, setNewRange] = useState<TimeRange>({ start: '09:00', end: '17:00' });

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDate(date);
    
    // Check if exception already exists for this date
    const dateString = format(date, 'yyyy-MM-dd');
    const existing = exceptions.find(e => e.date === dateString);
    
    if (existing) {
      setIsClosed(existing.closed || false);
      setOverrideRanges(existing.overrides || []);
    } else {
      setIsClosed(false);
      setOverrideRanges([]);
    }
  };

  const addOverrideRange = () => {
    if (newRange.start >= newRange.end) return;
    
    const updatedRanges = [...overrideRanges, newRange];
    // Sort by start time
    updatedRanges.sort((a, b) => a.start.localeCompare(b.start));
    
    setOverrideRanges(updatedRanges);
    setNewRange({ start: '09:00', end: '17:00' });
  };

  const removeOverrideRange = (index: number) => {
    setOverrideRanges(prev => prev.filter((_, i) => i !== index));
  };

  const saveException = () => {
    if (!selectedDate) return;
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    // Remove existing exception for this date
    const filteredExceptions = exceptions.filter(e => e.date !== dateString);
    
    // Add new exception
    const newException: DateException = {
      date: dateString,
      closed: isClosed,
      overrides: isClosed ? undefined : overrideRanges.length > 0 ? overrideRanges : undefined
    };
    
    onUpdateExceptions([...filteredExceptions, newException]);
    clearForm();
  };

  const removeException = (dateString: string) => {
    onUpdateExceptions(exceptions.filter(e => e.date !== dateString));
  };

  const clearForm = () => {
    setSelectedDate(undefined);
    setIsClosed(false);
    setOverrideRanges([]);
    setNewRange({ start: '09:00', end: '17:00' });
  };

  const formatTimeRange = (range: TimeRange) => {
    return `${range.start} - ${range.end}`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center">
            <CalendarX className="h-5 w-5 mr-2" />
            Schedule Exceptions
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Date Selection */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={{ before: new Date() }}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {selectedDate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Exception for {format(selectedDate, 'MMM dd, yyyy')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Closed all day</Label>
                      <Switch
                        checked={isClosed}
                        onCheckedChange={(checked) => {
                          setIsClosed(checked);
                          if (checked) setOverrideRanges([]);
                        }}
                      />
                    </div>

                    {!isClosed && (
                      <>
                        <Separator />
                        
                        <div>
                          <Label className="text-sm font-medium">Override Hours</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            Leave empty to use regular clinic hours
                          </p>
                          
                          {/* Existing override ranges */}
                          <div className="space-y-2 mb-3">
                            {overrideRanges.map((range, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{formatTimeRange(range)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOverrideRange(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Add new range */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <Label className="text-xs">Start</Label>
                              <Input
                                type="time"
                                value={newRange.start}
                                onChange={(e) => setNewRange(prev => ({ ...prev, start: e.target.value }))}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End</Label>
                              <Input
                                type="time"
                                value={newRange.end}
                                onChange={(e) => setNewRange(prev => ({ ...prev, end: e.target.value }))}
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={addOverrideRange}
                            disabled={newRange.start >= newRange.end}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Time Range
                          </Button>
                        </div>
                      </>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button onClick={saveException} className="flex-1">
                        Save Exception
                      </Button>
                      <Button variant="outline" onClick={clearForm}>
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Existing Exceptions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current Exceptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {exceptions.length > 0 ? (
                      exceptions
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((exception) => (
                          <div key={exception.date} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">
                                {format(new Date(exception.date + 'T00:00:00'), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {exception.closed ? (
                                  <Badge variant="destructive" className="text-xs">Closed</Badge>
                                ) : exception.overrides ? (
                                  <div className="flex flex-wrap gap-1">
                                    {exception.overrides.map((range, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {formatTimeRange(range)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Regular hours</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeException(exception.date)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No exceptions configured</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
