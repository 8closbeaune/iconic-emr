import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center medical-shadow">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-destructive/10 text-destructive p-3 rounded-full">
              <ShieldX className="h-6 w-6" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Access Denied</CardTitle>
            <CardDescription className="text-base">
              You don't have permission to access this page
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your current role doesn't include access to this feature. Contact your administrator if you believe this is an error.
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="w-full"
            variant="default"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}