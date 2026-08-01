import { useGetDashboard, getGetDashboardQueryKey } from '@workspace/api-client-react';
import { StatCard } from '@/components/stat-card';
import { ServiceIcon } from '@/components/service-icon';
import { StatusBadge } from '@/components/status-badge';
import { Server, Download, Activity, TrendingUp } from 'lucide-react';
import { formatSpeed } from '@/lib/service-utils';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 15000 },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive font-medium">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">Check your API connection</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const activeServices = dashboard.services.filter(s => s.online).length;

  return (
    <div className="p-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
         <p className="text-muted-foreground mt-1">
           System overview and live monitoring · refreshes every 15 seconds
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Services Online"
          value={`${activeServices}/${dashboard.services.length}`}
          icon={Server}
          trend={`${dashboard.services.length} total configured`}
          className="animate-slide-up stagger-1"
          data-testid="stat-services-online"
        />
        <StatCard
          label="Active Downloads"
          value={dashboard.activeDownloads}
          icon={Download}
          trend={`${dashboard.totalDownloads} total`}
          className="animate-slide-up stagger-2"
          data-testid="stat-active-downloads"
        />
        <StatCard
          label="Download Speed"
          value={formatSpeed(dashboard.totalDownloadSpeed)}
          icon={TrendingUp}
          className="animate-slide-up stagger-3"
          data-testid="stat-download-speed"
        />
        <StatCard
          label="Recent Activity"
          value={dashboard.recentActivity?.length || 0}
          icon={Activity}
          trend="Last 24 hours"
          className="animate-slide-up stagger-4"
          data-testid="stat-recent-activity"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Status */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden animate-slide-up stagger-5">
          <div className="p-5 border-b border-card-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Service Status</h2>
            <Link 
              href="/services" 
              className="text-sm text-primary hover:underline font-medium"
              data-testid="link-view-all-services"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-card-border">
            {dashboard.services.length === 0 ? (
              <div className="p-8 text-center">
                <Server className="mx-auto text-muted-foreground mb-3" size={32} />
                <p className="text-muted-foreground text-sm">No services configured</p>
                <Link 
                  href="/services/new"
                  className="inline-block mt-3 text-sm text-primary hover:underline font-medium"
                  data-testid="link-add-first-service"
                >
                  Add your first service
                </Link>
              </div>
            ) : (
              dashboard.services.slice(0, 6).map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`service-item-${service.id}`}
                >
                  <ServiceIcon type={service.type} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{service.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {service.version || 'Version unknown'}
                    </p>
                  </div>
                  <StatusBadge online={service.online} />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-card-border rounded-lg overflow-hidden animate-slide-up stagger-6">
          <div className="p-5 border-b border-card-border">
            <h2 className="font-semibold text-lg">Recent Activity</h2>
          </div>
          <div className="divide-y divide-card-border max-h-[400px] overflow-y-auto">
            {!dashboard.recentActivity || dashboard.recentActivity.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="mx-auto text-muted-foreground mb-3" size={32} />
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </div>
            ) : (
              dashboard.recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4"
                  data-testid={`activity-item-${item.id}`}
                >
                  <ServiceIcon type={item.serviceType} size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.event} · {item.serviceName}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
