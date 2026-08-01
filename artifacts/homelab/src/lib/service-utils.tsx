import { Server, Film, Music, BookOpen, Download, Activity, Container, Eye, Search, Globe, FileText } from 'lucide-react';
import { SiPlex, SiJellyfin } from 'react-icons/si';
import type { LucideIcon } from 'lucide-react';
import type { IconType } from 'react-icons';

type ServiceIcon = LucideIcon | IconType;

export const SERVICE_CONFIGS: Record<string, { icon: ServiceIcon; color: string; label: string }> = {
  plex: { icon: SiPlex, color: 'hsl(28 100% 50%)', label: 'Plex' },
  jellyfin: { icon: SiJellyfin, color: 'hsl(266 60% 60%)', label: 'Jellyfin' },
  sonarr: { icon: Film, color: 'hsl(190 80% 50%)', label: 'Sonarr' },
  radarr: { icon: Film, color: 'hsl(48 95% 55%)', label: 'Radarr' },
  lidarr: { icon: Music, color: 'hsl(160 70% 50%)', label: 'Lidarr' },
  readarr: { icon: BookOpen, color: 'hsl(280 70% 60%)', label: 'Readarr' },
  qbittorrent: { icon: Download, color: 'hsl(210 90% 60%)', label: 'qBittorrent' },
  sabnzbd: { icon: Download, color: 'hsl(48 100% 50%)', label: 'SABnzbd' },
  tautulli: { icon: Activity, color: 'hsl(28 100% 50%)', label: 'Tautulli' },
  overseerr: { icon: Eye, color: 'hsl(210 100% 55%)', label: 'Overseerr' },
  prowlarr: { icon: Search, color: 'hsl(190 80% 50%)', label: 'Prowlarr' },
  bazarr: { icon: FileText, color: 'hsl(160 70% 50%)', label: 'Bazarr' },
  portainer: { icon: Container, color: 'hsl(200 90% 55%)', label: 'Portainer' },
  other: { icon: Server, color: 'hsl(215 15% 62%)', label: 'Other' },
};

export function getServiceConfig(type: string) {
  return SERVICE_CONFIGS[type] || SERVICE_CONFIGS.other;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function getStateColor(state: string): string {
  const stateColors: Record<string, string> = {
     downloading: 'hsl(146 56% 42%)',
    paused: 'hsl(40 90% 55%)',
     completed: 'hsl(146 56% 42%)',
    error: 'hsl(0 72% 51%)',
    queued: 'hsl(215 15% 62%)',
     seeding: 'hsl(164 48% 47%)',
    checking: 'hsl(48 95% 55%)',
    stalled: 'hsl(20 85% 58%)',
  };
  return stateColors[state] || 'hsl(215 15% 62%)';
}

export function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    downloading: 'Downloading',
    paused: 'Paused',
    completed: 'Completed',
    error: 'Error',
    queued: 'Queued',
    seeding: 'Seeding',
    checking: 'Checking',
    stalled: 'Stalled',
  };
  return labels[state] || state;
}
