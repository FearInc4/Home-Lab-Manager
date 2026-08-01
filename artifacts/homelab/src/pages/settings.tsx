import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="p-8 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your homelab manager preferences
        </p>
      </div>

      <div className="bg-card border border-card-border rounded-lg p-12 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <SettingsIcon className="text-primary" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Settings Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Configuration options for themes, notifications, refresh intervals, and more will be available here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
