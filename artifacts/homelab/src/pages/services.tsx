import {
  useListServices,
  useGetServiceStatus,
  getGetServiceStatusQueryKey,
  type Service,
} from '@workspace/api-client-react';
import { ServiceIcon } from '@/components/service-icon';
import { StatusBadge } from '@/components/status-badge';
import { Link } from 'wouter';
import { Plus, ExternalLink, Search, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getServiceConfig } from '@/lib/service-utils';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const config = getServiceConfig(service.type);
  const { data: status, isLoading: statusLoading } = useGetServiceStatus(service.id, {
    query: {
      queryKey: getGetServiceStatusQueryKey(service.id),
      refetchInterval: 15000,
    },
  });

  return (
    <div
      className={`bg-card border border-card-border rounded-lg overflow-hidden hover:border-primary/50 transition-all animate-slide-up stagger-${Math.min(index + 1, 6)}`}
      data-testid={`service-card-${service.id}`}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-muted">
              <ServiceIcon type={service.type} size={24} />
            </div>
            <div>
              <h3 className="font-semibold">{service.name}</h3>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
          <StatusBadge online={Boolean(status?.online)} loading={statusLoading} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Connection</span>
            <span className="text-xs font-mono">
              {status?.responseTimeMs != null ? `${status.responseTimeMs}ms` : statusLoading ? 'Checking' : 'No response'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="text-xs font-mono">{status?.version || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">URL</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-service-url-${service.id}`}
            >
              Open <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <Link href={`/services/${service.id}`} className="block">
          <Button variant="outline" className="w-full" size="sm" data-testid={`button-view-service-${service.id}`}>
            View Details
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Services() {
  const { data: services, isLoading, error } = useListServices();
  const [search, setSearch] = useState('');

  const filteredServices = useMemo(() => {
    if (!services) return [];
    const normalized = search.trim().toLowerCase();
    if (!normalized) return services;
    return services.filter((service) =>
      `${service.name} ${service.type} ${service.url}`.toLowerCase().includes(normalized),
    );
  }, [services, search]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive font-medium">Failed to load services</p>
          <p className="text-sm text-muted-foreground mt-1">Check your API connection</p>
        </div>
      </div>
    );
  }

  if (!services) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground mt-1">
             Manage your media stack · live health checks every 15 seconds
          </p>
        </div>
         <div className="flex items-center gap-2">
           <div className="relative w-56">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
             <Input
               value={search}
               onChange={(event) => setSearch(event.target.value)}
               placeholder="Search services"
               className="pl-9"
               data-testid="input-search-services"
             />
           </div>
           <Link href="/services/new">
             <Button className="gap-2" data-testid="button-add-service">
               <Plus size={16} />
               Add Service
             </Button>
           </Link>
         </div>
      </div>

      {services.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center animate-slide-up">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Plus className="text-primary" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Services Yet</h3>
              <p className="text-muted-foreground text-sm">
                Add your first media service to start monitoring your homelab. Connect Plex, Sonarr, Radarr, qBittorrent, and more.
              </p>
            </div>
            <Link href="/services/new">
              <Button className="gap-2" data-testid="button-add-first-service">
                <Plus size={16} />
                Add Your First Service
              </Button>
            </Link>
          </div>
        </div>
       ) : filteredServices.length === 0 ? (
         <div className="bg-card border border-card-border rounded-lg p-12 text-center animate-slide-up">
           <Activity className="mx-auto text-muted-foreground mb-3" size={28} />
           <h3 className="font-semibold">No matching services</h3>
           <p className="text-sm text-muted-foreground mt-1">Try a different name or service type.</p>
         </div>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredServices.map((service, index) => (
             <ServiceCard key={service.id} service={service} index={index} />
           ))}
        </div>
      )}
    </div>
  );
}
