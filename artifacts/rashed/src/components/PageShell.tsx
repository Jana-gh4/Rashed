import { type ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { useAuth } from '@/lib/auth';
import { DemoBanner } from './DemoBadge';

interface PageShellProps {
  children: ReactNode;
  hideNav?: boolean;
  className?: string;
}

export function PageShell({ children, hideNav = false, className = '' }: PageShellProps) {
  const { user } = useAuth();
  const isDemo = user?.isDemoMode;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {isDemo && <DemoBanner />}
      <main className={`flex-1 overflow-y-auto ${hideNav ? '' : 'pb-20'} ${className}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
