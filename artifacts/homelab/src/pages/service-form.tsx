import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCreateService,
  useGetService,
  useUpdateService,
  getGetServiceQueryKey,
  getListServicesQueryKey,
  useTestServiceConnection,
  type ServiceInputType,
  type ServiceTestInputType,
  type ServiceTestResult,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceIcon } from '@/components/service-icon';
import { getServiceConfig, SERVICE_CONFIGS } from '@/lib/service-utils';
import { ArrowLeft, Save, Wifi, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

const serviceFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Service type is required'),
  url: z.string().url('Must be a valid URL'),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  enabled: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServiceForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const serviceId = params.id && params.id !== 'new' ? Number(params.id) : null;
  const isEditing = serviceId !== null;

  const { data: service, isLoading } = useGetService(serviceId!, {
    query: {
      enabled: !!serviceId,
      queryKey: getGetServiceQueryKey(serviceId!),
    },
  });

  const createService = useCreateService();
  const updateService = useUpdateService();
  const testConnection = useTestServiceConnection();
  const [testResult, setTestResult] = useState<ServiceTestResult | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      type: '',
      url: '',
      apiKey: '',
      username: '',
      password: '',
      enabled: true,
    },
  });

  useEffect(() => {
    if (service && isEditing) {
      form.reset({
        name: service.name,
        type: service.type,
        url: service.url,
        apiKey: service.apiKey || '',
        username: service.username || '',
        password: '',
        enabled: service.enabled,
      });
    }
  }, [service, isEditing, form]);

  const runConnectionTest = async () => {
    const valid = await form.trigger(['type', 'url']);
    if (!valid) {
      toast({
        title: 'Complete the service details first',
        description: 'Select a service type and enter a valid URL before testing.',
        variant: 'destructive',
      });
      return;
    }

    const values = form.getValues();
    setTestResult(null);
    testConnection.mutate(
      {
        data: {
          type: values.type as ServiceTestInputType,
          url: values.url,
          apiKey: values.apiKey,
          username: values.username,
          password: values.password,
        },
      },
      {
        onSuccess: (result) => setTestResult(result),
        onError: (error) => {
          setTestResult({
            success: false,
            online: false,
            message: error instanceof Error ? error.message : 'Could not reach the test endpoint',
            responseTimeMs: null,
            version: null,
          });
        },
      },
    );
  };

  const onSubmit = (values: ServiceFormValues) => {
    if (isEditing) {
      const { type: _type, ...updateValues } = values;
      updateService.mutate(
        { id: serviceId, data: updateValues },
        {
          onSuccess: () => {
            toast({
              title: 'Service updated',
              description: 'Service configuration has been updated successfully.',
            });
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetServiceQueryKey(serviceId) });
            setLocation(`/services/${serviceId}`);
          },
          onError: () => {
            toast({
              title: 'Update failed',
              description: 'Failed to update service. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      createService.mutate(
        { data: { ...values, type: values.type as ServiceInputType } },
        {
          onSuccess: (newService) => {
            toast({
              title: 'Service added',
              description: 'Service has been added successfully.',
            });
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            setLocation(`/services/${newService.id}`);
          },
          onError: () => {
            toast({
              title: 'Creation failed',
              description: 'Failed to add service. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="p-8 max-w-2xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl animate-slide-up">
      <div className="mb-6">
        <Link href="/services" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} />
          Back to Services
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Service' : 'Add New Service'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isEditing ? 'Update service configuration' : 'Configure a new media service'}
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Plex Server" {...field} data-testid="input-service-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="Select a service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(SERVICE_CONFIGS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <ServiceIcon type={key} size={16} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service URL</FormLabel>
                  <FormControl>
                    <Input placeholder="http://192.168.1.100:32400" {...field} data-testid="input-service-url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter API key if required" {...field} data-testid="input-service-apikey" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} data-testid="input-service-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Optional)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} data-testid="input-service-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-4 space-y-3">
              <div>
                <p className="font-medium">Test before saving</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The check runs from the server and does not save this configuration.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void runConnectionTest()}
                disabled={testConnection.isPending}
                data-testid="button-test-connection"
              >
                {testConnection.isPending ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                {testConnection.isPending ? 'Testing connection…' : 'Test Connection'}
              </Button>
              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    testResult.success
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                  role="status"
                  data-testid="connection-test-result"
                >
                  {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-medium">{testResult.success ? 'Connection successful' : 'Connection failed'}</p>
                    <p className="mt-0.5 opacity-90">
                      {testResult.message}
                      {testResult.responseTimeMs != null ? ` · ${testResult.responseTimeMs}ms` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                className="gap-2"
                disabled={createService.isPending || updateService.isPending}
                data-testid="button-save-service"
              >
                <Save size={16} />
                {isEditing ? 'Update Service' : 'Add Service'}
              </Button>
              <Link href="/services">
                <Button type="button" variant="outline" data-testid="button-cancel">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
