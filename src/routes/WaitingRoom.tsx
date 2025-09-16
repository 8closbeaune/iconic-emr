import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function WaitingRoom() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Waiting Room</h1>
          <p className="text-muted-foreground">
            Patient queue management: Arrived → Ready → In-chair
          </p>
        </div>

        <Card className="medical-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Queue Management</span>
            </CardTitle>
            <CardDescription>
              Coming soon: Real-time patient queue with status tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This section will handle patient queue management with status transitions and real-time updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}