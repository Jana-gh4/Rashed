import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';

// Pages
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Upload from '@/pages/Upload';
import Results from '@/pages/Results';
import Analysis from '@/pages/Analysis';
import Baseline from '@/pages/Baseline';
import Meters from '@/pages/Meters';
import LeakDetection from '@/pages/LeakDetection';
import Forecast from '@/pages/Forecast';
import WhyIncrease from '@/pages/WhyIncrease';
import Plan from '@/pages/Plan';
import Savings from '@/pages/Savings';
import WhatIf from '@/pages/WhatIf';
import Assistant from '@/pages/Assistant';
import Settings from '@/pages/Settings';
import Reports from '@/pages/Reports';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Login />;
  return <>{children}</>;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={() => <ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/upload" component={() => <ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/results" component={() => <ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/analysis" component={() => <ProtectedRoute><Analysis /></ProtectedRoute>} />
        <Route path="/baseline" component={() => <ProtectedRoute><Baseline /></ProtectedRoute>} />
        <Route path="/meters" component={() => <ProtectedRoute><Meters /></ProtectedRoute>} />
        <Route path="/leak-detection" component={() => <ProtectedRoute><LeakDetection /></ProtectedRoute>} />
        <Route path="/forecast" component={() => <ProtectedRoute><Forecast /></ProtectedRoute>} />
        <Route path="/why-increase" component={() => <ProtectedRoute><WhyIncrease /></ProtectedRoute>} />
        <Route path="/plan" component={() => <ProtectedRoute><Plan /></ProtectedRoute>} />
        <Route path="/savings" component={() => <ProtectedRoute><Savings /></ProtectedRoute>} />
        <Route path="/what-if" component={() => <ProtectedRoute><WhatIf /></ProtectedRoute>} />
        <Route path="/assistant" component={() => <ProtectedRoute><Assistant /></ProtectedRoute>} />
        <Route path="/settings" component={() => <ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/reports" component={() => <ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
