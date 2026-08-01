import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/app-shell';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Services from '@/pages/services';
import ServiceForm from '@/pages/service-form';
import ServiceDetail from '@/pages/service-detail';
import Downloads from '@/pages/downloads';
import Settings from '@/pages/settings';
import { Route, Switch, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/services" component={Services} />
        <Route path="/services/new" component={ServiceForm} />
        <Route path="/services/:id/edit" component={ServiceForm} />
        <Route path="/services/:id" component={ServiceDetail} />
        <Route path="/downloads" component={Downloads} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
