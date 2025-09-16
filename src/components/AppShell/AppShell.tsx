import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { GlobalPasswordChangeCheck } from '@/components/auth/GlobalPasswordChangeCheck';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className={cn(
        "flex",
        isMobile ? "flex-col h-[calc(100vh-4rem)]" : "h-[calc(100vh-4rem)]"
      )}>
        {!isMobile && <Sidebar />}
        <main className={cn(
          "flex-1 overflow-auto",
          isMobile && "pb-16" // Add bottom padding for mobile nav
        )}>
          {children}
        </main>
      </div>
      {isMobile && <BottomNav />}
      <GlobalPasswordChangeCheck />
    </div>
  );
}