import {
  useListDownloads,
  usePauseDownload,
  useResumeDownload,
  useRemoveDownload,
  getListDownloadsQueryKey,
} from '@workspace/api-client-react';
import { getListDownloadsQueryKey as downloadsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ServiceIcon } from '@/components/service-icon';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, Trash2, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatBytes, formatSpeed, formatEta, getStateColor, getStateLabel } from '@/lib/service-utils';
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

export default function Downloads() {
  const { data: downloads, isLoading, error, isFetching, refetch } = useListDownloads({
    query: { queryKey: downloadsQueryKey(), refetchInterval: 10000 },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pauseDownload = usePauseDownload();
  const resumeDownload = useResumeDownload();
  const removeDownload = useRemoveDownload();
  const [search, setSearch] = useState('');

  const filteredDownloads = useMemo(() => {
    if (!downloads) return [];
    const normalized = search.trim().toLowerCase();
    if (!normalized) return downloads;
    return downloads.filter((download) =>
      `${download.name} ${download.serviceName} ${download.category ?? ''}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [downloads, search]);

  const handlePause = (serviceId: number, hash: string) => {
    pauseDownload.mutate(
      { serviceId, hash },
      {
        onSuccess: (result) => {
          toast({
            title: result.success ? 'Download paused' : 'Pause failed',
            description: result.message,
          });
          queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        },
        onError: () => {
          toast({
            title: 'Pause failed',
            description: 'Failed to pause download. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleResume = (serviceId: number, hash: string) => {
    resumeDownload.mutate(
      { serviceId, hash },
      {
        onSuccess: (result) => {
          toast({
            title: result.success ? 'Download resumed' : 'Resume failed',
            description: result.message,
          });
          queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        },
        onError: () => {
          toast({
            title: 'Resume failed',
            description: 'Failed to resume download. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleRemove = (serviceId: number, hash: string) => {
    removeDownload.mutate(
      { serviceId, hash },
      {
        onSuccess: () => {
          toast({
            title: 'Download removed',
            description: 'Download has been removed successfully.',
          });
          queryClient.invalidateQueries({ queryKey: getListDownloadsQueryKey() });
        },
        onError: () => {
          toast({
            title: 'Remove failed',
            description: 'Failed to remove download. Please try again.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
          <p className="text-destructive font-medium">Failed to load downloads</p>
          <p className="text-sm text-muted-foreground mt-1">Check your API connection</p>
        </div>
      </div>
    );
  }

  if (!downloads) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Downloads</h1>
           <p className="text-muted-foreground mt-1">
             Unified queue across all download clients · refreshes every 10 seconds
           </p>
         </div>
         <div className="flex items-center gap-2">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
             <Input
               value={search}
               onChange={(event) => setSearch(event.target.value)}
               placeholder="Search downloads"
               className="pl-9"
               data-testid="input-search-downloads"
             />
           </div>
           <Button
             variant="outline"
             size="icon"
             onClick={() => void refetch()}
             disabled={isFetching}
             aria-label="Refresh downloads"
             data-testid="button-refresh-downloads"
           >
             <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
           </Button>
         </div>
      </div>

       {downloads.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center animate-slide-up">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Download className="text-primary" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No Active Downloads</h3>
              <p className="text-muted-foreground text-sm">
                Your download queue is empty. Downloads from qBittorrent, SABnzbd, and other configured clients will appear here.
              </p>
            </div>
          </div>
        </div>
       ) : filteredDownloads.length === 0 ? (
         <div className="bg-card border border-card-border rounded-lg p-12 text-center animate-slide-up">
           <Search className="mx-auto text-muted-foreground mb-3" size={28} />
           <h3 className="font-semibold">No matching downloads</h3>
           <p className="text-sm text-muted-foreground mt-1">Try a different title, client, or category.</p>
         </div>
       ) : (
        <div className="space-y-3">
           {filteredDownloads.map((download, index) => {
            const stateColor = getStateColor(download.state);
            const stateLabel = getStateLabel(download.state);
            const canPause = download.state === 'downloading' || download.state === 'seeding';
            const canResume = download.state === 'paused';

            return (
              <div
                key={`${download.serviceId}-${download.hash}`}
                className={`bg-card border border-card-border rounded-lg p-5 animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                data-testid={`download-item-${download.hash}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <ServiceIcon type={download.serviceType} size={20} className="mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{download.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">{download.serviceName}</span>
                          <span>·</span>
                          <span
                            className="font-medium font-mono"
                            style={{ color: stateColor }}
                          >
                            {stateLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {canPause && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handlePause(download.serviceId, download.hash)}
                          disabled={pauseDownload.isPending}
                          data-testid={`button-pause-${download.hash}`}
                        >
                          <Pause size={14} />
                          Pause
                        </Button>
                      )}
                      {canResume && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => handleResume(download.serviceId, download.hash)}
                          disabled={resumeDownload.isPending}
                          data-testid={`button-resume-${download.hash}`}
                        >
                          <Play size={14} />
                          Resume
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            data-testid={`button-remove-${download.hash}`}
                          >
                            <Trash2 size={14} />
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Download</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this download? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(download.serviceId, download.hash)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-remove-${download.hash}`}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-muted-foreground">
                        {formatBytes(download.downloadedSize)} / {formatBytes(download.size)}
                      </span>
                      <span className="font-mono font-semibold" data-testid={`progress-${download.hash}`}>
                        {download.progress.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={download.progress} 
                      className="h-2"
                      style={{
                        '--progress-background': stateColor,
                      } as React.CSSProperties}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span data-testid={`speed-${download.hash}`}>
                        {download.speed > 0 ? formatSpeed(download.speed) : 'Idle'}
                      </span>
                      {download.eta !== null && download.eta > 0 && (
                        <span>ETA: {formatEta(download.eta)}</span>
                      )}
                    </div>
                  </div>

                  {download.category && (
                    <div className="text-xs text-muted-foreground">
                      Category: <span className="font-mono">{download.category}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
