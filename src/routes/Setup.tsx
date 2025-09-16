import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Setup() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md medical-shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-warning text-warning-foreground p-3 rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-xl">Setup Required</CardTitle>
          <CardDescription>
            Your account needs to be configured before you can access IconiDent OS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This usually happens when:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your profile hasn't been created yet</li>
              <li>You haven't been assigned to a clinic</li>
              <li>There are no clinics in the system</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleRetry} 
            className="w-full flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Setup</span>
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            If this problem persists, please contact your system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}