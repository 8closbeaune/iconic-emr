import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import ProtectedRoute from "@/components/Guards/ProtectedRoute";
import AppShell from "@/components/AppShell/AppShell";

// Route components
import Login from "@/routes/auth/Login";
import Setup from "@/routes/Setup";
import FrontDesk from "@/routes/FrontDesk";
import Patients from "@/routes/Patients";
import PatientDetail from "@/routes/PatientDetail";
import Intake from "@/routes/Intake";
import WaitingRoom from "@/routes/WaitingRoom";
import Calendar from "@/routes/Calendar";
import Clinical from "@/routes/Clinical";
import Billing from "@/routes/Billing";
import Expenses from "@/routes/Expenses";
import Analytics from "@/routes/Analytics";
import Admin from "@/routes/Admin";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMe } from "@/hooks/useMe";

function LandingRedirect() {
  const { profile, isLoading } = useMe();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    const role = profile?.role;
    if (role === 'admin') navigate('/admin', { replace: true });
    else if (role === 'intake') navigate('/intake', { replace: true });
    else if (role === 'doctor') navigate('/clinical', { replace: true });
    else navigate('/front-desk', { replace: true });
  }, [profile, isLoading, navigate]);

  return <div className="p-6 text-muted-foreground">Redirecting...</div>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={<Login />} />
          
          {/* Protected routes with app shell */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell>
                <LandingRedirect />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/setup" element={<Setup />} />
          
          <Route path="/front-desk" element={
            <ProtectedRoute>
              <AppShell>
                <FrontDesk />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/patients" element={
            <ProtectedRoute>
              <AppShell>
                <Patients />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/patients/:patientId" element={
            <ProtectedRoute>
              <AppShell>
                <PatientDetail />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/intake/*" element={
            <ProtectedRoute>
              <AppShell>
                <Intake />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/waiting-room" element={
            <ProtectedRoute>
              <AppShell>
                <WaitingRoom />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/calendar" element={
            <ProtectedRoute>
              <AppShell>
                <Calendar />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/clinical" element={
            <ProtectedRoute>
              <AppShell>
                <Clinical />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/billing" element={
            <ProtectedRoute>
              <AppShell>
                <Billing />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/expenses" element={
            <ProtectedRoute>
              <AppShell>
                <Expenses />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AppShell>
                <Analytics />
              </AppShell>
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AppShell>
                <Admin />
              </AppShell>
            </ProtectedRoute>
          } />
          
          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
