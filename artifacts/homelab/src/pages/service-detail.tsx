import { useParams, useLocation, Link } from 'wouter';
import {
  useGetService,
  useGetServiceStatus,
  useGetServiceStats,
  useDeleteService,
  useRestartService,
  getGetServiceQueryKey,
  getGetServiceStatusQueryKey,
  getGetServiceStatsQueryKey,
  getListServicesQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ServiceIcon } from '@/components/service-icon';
import { StatusBadge } from '@/components/status-badge';
import { ArrowLeft, Edit, Trash2, RotateCw, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { getServiceConfig } from '@/lib/service-utils';

export default function ServiceDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const serviceId = Number(params.id);

  const { data: service, isLoading: serviceLoading } = useGetService(serviceId, {
    query: { enabled: !!serviceId, queryKey: getGetServiceQueryKey(serviceId) },
  });

  const { data: status, isLoading: statusLoading } = useGetServiceStatus(serviceId, {
    query: {
      enabled: !!serviceId,
      queryKey: getGetServiceStatusQueryKey(serviceId),
      refetchInterval: 15000,
    },
  });

  const { data: stats, isLoading: statsLoading } = useGetServiceStats(serviceId, {
    query: {
      enabled: !!serviceId,
      queryKey: getGetServiceStatsQueryKey(serviceId),
      refetchInterval: 30000,
    },
  });

  const deleteService = useDeleteService();
  const restartService = useRestartService();

  const handleDelete = () => {
    deleteService.mutate(
      { id: serviceId },
      {
        onSuccess: () => {
          toast({
            title: 'Service deleted',
            description: 'Service has been removed successfully.',
          });
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          setLocation('/services');
        },
        onError: () => {
          toast({
            title: 'Deletion failed',
            description: 'Failed to delete service. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleRestart = () => {
    restartService.mutate(
      { id: serviceId },
      {
        onSuccess: (result) => {
          toast({
            title: result.success ? 'Service restarted' : 'Restart failed',
            description: result.message,
            variant: result.success ? 'default' : 'destructive',
          });
          queryClient.invalidateQueries({ queryKey: getGetServiceStatusQueryKey(serviceId) });
        },
        onError: () => {
          toast({
            title: 'Restart failed',
            description: 'Failed to restart service. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (serviceLoading) {
    return (
      <div className="p-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-8">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="text-destructive font-medium">Service not found</p>
          <Link href="/services" className="text-sm text-primary hover:underline mt-2 inline-block">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  const config = getServiceConfig(service.type);

  return (
    <div className="p-8 max-w-4xl space-y-6 animate-slide-up">
      <div>
        <Link href="/services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} />
          Back to Services
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <ServiceIcon type={service.type} size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
              <p className="text-muted-foreground mt-1">{config.label}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRestart}
              disabled={restartService.isPending}
              data-testid="button-restart-service"
            >
              <RotateCw size={16} className={restartService.isPending ? 'animate-spin' : ''} />
              Restart
            </Button>
            <Link href={`/services/${serviceId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-edit-service">
                <Edit size={16} />
                Edit
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" data-testid="button-delete-service">
                  <Trash2 size={16} />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Service</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{service.name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-4">Status</h2>
        {statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connection</span>
              <StatusBadge online={status.online} />
            </div>
            {status.version && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono text-sm">{status.version}</span>
              </div>
            )}
            {status.responseTimeMs !== null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Response Time</span>
                <span className="font-mono text-sm">{status.responseTimeMs}ms</span>
              </div>
            )}
            {status.error && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Error</span>
                <span className="text-destructive text-sm">{status.error}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Checked</span>
              <span className="font-mono text-sm">{new Date(status.checkedAt).toLocaleString()}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No status available</p>
        )}
      </div>

      {/* Configuration Card */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-4">Configuration</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">URL</span>
            <a
              href={service.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1 font-mono text-sm"
              data-testid="link-service-url"
            >
              {service.url}
              <ExternalLink size={14} />
            </a>
          </div>
          {service.apiKey && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">API Key</span>
              <span className="font-mono text-sm">••••••••{service.apiKey.slice(-4)}</span>
            </div>
          )}
          {service.username && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-mono text-sm">{service.username}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Enabled</span>
            <span className="font-mono text-sm">{service.enabled ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Added</span>
            <span className="font-mono text-sm">{new Date(service.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-4">Statistics</h2>
        {statsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : stats?.data && Object.keys(stats.data).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(stats.data).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-mono text-sm">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No statistics available</p>
        )}
      </div>
    </div>
  );
}
