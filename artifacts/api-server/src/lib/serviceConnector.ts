import { logger } from "./logger";
import type { Service } from "@workspace/db";

export interface ServiceStatusResult {
  online: boolean;
  version: string | null;
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface DownloadItem {
  hash: string;
  name: string;
  serviceId: number;
  serviceName: string;
  serviceType: string;
  state: "downloading" | "paused" | "completed" | "error" | "queued" | "seeding" | "checking" | "stalled";
  progress: number;
  size: number;
  downloadedSize: number;
  speed: number;
  eta: number | null;
  category: string | null;
  savePath: string | null;
  addedAt: string;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// ---------- Status checks ----------

async function checkSonarrLike(service: Service, appName: string): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/api/v3/system/status`;
    const res = await fetchWithTimeout(url, {
      headers: { "X-Api-Key": service.apiKey ?? "" },
    });
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const data = await res.json() as { version?: string };
    return { online: true, version: data.version ?? null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkPlex(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/identity`;
    const res = await fetchWithTimeout(url, {
      headers: { "X-Plex-Token": service.apiKey ?? "", Accept: "application/json" },
    });
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const data = await res.json() as { MediaContainer?: { version?: string } };
    return { online: true, version: data.MediaContainer?.version ?? null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkJellyfin(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/System/Info/Public`;
    const res = await fetchWithTimeout(url);
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const data = await res.json() as { Version?: string };
    return { online: true, version: data.Version ?? null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkQbittorrent(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/api/v2/app/version`;
    let res = await fetchWithTimeout(url);
    if (res.status === 403 && service.username && service.password) {
      const loginRes = await fetchWithTimeout(`${normalizeUrl(service.url)}/api/v2/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `username=${encodeURIComponent(service.username)}&password=${encodeURIComponent(service.password)}`,
      });
      if (!loginRes.ok) {
        const responseTimeMs = Date.now() - start;
        return { online: false, version: null, responseTimeMs, error: `Login failed (HTTP ${loginRes.status})`, checkedAt };
      }
      const cookie = loginRes.headers.get("set-cookie");
      res = await fetchWithTimeout(url, cookie ? { headers: { Cookie: cookie } } : {});
    }
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const version = await res.text();
    return { online: true, version: version.trim() || null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkSabnzbd(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/api?mode=version&output=json&apikey=${encodeURIComponent(service.apiKey ?? "")}`;
    const res = await fetchWithTimeout(url);
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const data = await res.json() as { version?: string };
    return { online: true, version: data.version ?? null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkTautulli(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const url = `${normalizeUrl(service.url)}/api/v2?cmd=get_tautulli_info&apikey=${encodeURIComponent(service.apiKey ?? "")}`;
    const res = await fetchWithTimeout(url);
    const responseTimeMs = Date.now() - start;
    if (!res.ok) return { online: false, version: null, responseTimeMs, error: `HTTP ${res.status}`, checkedAt };
    const data = await res.json() as { response?: { data?: { tautulli_version?: string } } };
    return { online: true, version: data.response?.data?.tautulli_version ?? null, responseTimeMs, error: null, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

async function checkGeneric(service: Service): Promise<ServiceStatusResult> {
  const checkedAt = new Date().toISOString();
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(normalizeUrl(service.url));
    const responseTimeMs = Date.now() - start;
    return { online: res.ok || res.status < 500, version: null, responseTimeMs, error: res.ok ? null : `HTTP ${res.status}`, checkedAt };
  } catch (err: unknown) {
    return { online: false, version: null, responseTimeMs: null, error: String(err instanceof Error ? err.message : err), checkedAt };
  }
}

export async function checkServiceStatus(service: Service): Promise<ServiceStatusResult> {
  switch (service.type) {
    case "sonarr":
    case "radarr":
    case "lidarr":
    case "readarr":
    case "prowlarr":
      return checkSonarrLike(service, service.type);
    case "plex":
      return checkPlex(service);
    case "jellyfin":
      return checkJellyfin(service);
    case "qbittorrent":
      return checkQbittorrent(service);
    case "sabnzbd":
      return checkSabnzbd(service);
    case "tautulli":
      return checkTautulli(service);
    default:
      return checkGeneric(service);
  }
}

export async function testServiceConnection(input: {
  type: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
}): Promise<ServiceStatusResult> {
  const now = new Date();
  return checkServiceStatus({
    id: 0,
    name: "Connection test",
    type: input.type,
    url: input.url,
    apiKey: input.apiKey ?? null,
    username: input.username ?? null,
    password: input.password ?? null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  });
}

// ---------- Stats ----------

async function getSonarrStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const headers = { "X-Api-Key": service.apiKey ?? "" };
  try {
    const [wantedRes, queueRes, seriesRes] = await Promise.allSettled([
      fetchWithTimeout(`${base}/api/v3/wanted/missing?pageSize=1`, { headers }),
      fetchWithTimeout(`${base}/api/v3/queue/status`, { headers }),
      fetchWithTimeout(`${base}/api/v3/series`, { headers }),
    ]);
    const wanted = wantedRes.status === "fulfilled" && wantedRes.value.ok
      ? await wantedRes.value.json() as { totalRecords?: number }
      : null;
    const queue = queueRes.status === "fulfilled" && queueRes.value.ok
      ? await queueRes.value.json() as { totalCount?: number; count?: number }
      : null;
    const series = seriesRes.status === "fulfilled" && seriesRes.value.ok
      ? await seriesRes.value.json() as unknown[]
      : null;
    return {
      totalSeries: Array.isArray(series) ? series.length : null,
      missingEpisodes: wanted?.totalRecords ?? null,
      queueCount: queue?.totalCount ?? queue?.count ?? null,
    };
  } catch { return {}; }
}

async function getRadarrStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const headers = { "X-Api-Key": service.apiKey ?? "" };
  try {
    const [moviesRes, queueRes, wantedRes] = await Promise.allSettled([
      fetchWithTimeout(`${base}/api/v3/movie`, { headers }),
      fetchWithTimeout(`${base}/api/v3/queue/status`, { headers }),
      fetchWithTimeout(`${base}/api/v3/wanted/missing?pageSize=1`, { headers }),
    ]);
    const movies = moviesRes.status === "fulfilled" && moviesRes.value.ok
      ? await moviesRes.value.json() as unknown[]
      : null;
    const queue = queueRes.status === "fulfilled" && queueRes.value.ok
      ? await queueRes.value.json() as { totalCount?: number }
      : null;
    const wanted = wantedRes.status === "fulfilled" && wantedRes.value.ok
      ? await wantedRes.value.json() as { totalRecords?: number }
      : null;
    return {
      totalMovies: Array.isArray(movies) ? movies.length : null,
      missingMovies: wanted?.totalRecords ?? null,
      queueCount: queue?.totalCount ?? null,
    };
  } catch { return {}; }
}

async function getPlexStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const headers = { "X-Plex-Token": service.apiKey ?? "", Accept: "application/json" };
  try {
    const [sessionsRes, librariesRes] = await Promise.allSettled([
      fetchWithTimeout(`${base}/status/sessions`, { headers }),
      fetchWithTimeout(`${base}/library/sections`, { headers }),
    ]);
    const sessions = sessionsRes.status === "fulfilled" && sessionsRes.value.ok
      ? await sessionsRes.value.json() as { MediaContainer?: { size?: number } }
      : null;
    const libraries = librariesRes.status === "fulfilled" && librariesRes.value.ok
      ? await librariesRes.value.json() as { MediaContainer?: { Directory?: unknown[] } }
      : null;
    return {
      activeSessions: sessions?.MediaContainer?.size ?? 0,
      libraryCount: libraries?.MediaContainer?.Directory?.length ?? null,
    };
  } catch { return {}; }
}

async function getJellyfinStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const headers = { "X-Emby-Token": service.apiKey ?? "" };
  try {
    const sessionsRes = await fetchWithTimeout(`${base}/Sessions`, { headers });
    const sessions = sessionsRes.ok ? await sessionsRes.json() as unknown[] : null;
    return {
      activeSessions: Array.isArray(sessions) ? sessions.filter((s: unknown) => (s as { NowPlayingItem?: unknown }).NowPlayingItem).length : 0,
      totalSessions: Array.isArray(sessions) ? sessions.length : null,
    };
  } catch { return {}; }
}

async function getTautulliStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const key = encodeURIComponent(service.apiKey ?? "");
  try {
    const [activityRes, historyRes] = await Promise.allSettled([
      fetchWithTimeout(`${base}/api/v2?cmd=get_activity&apikey=${key}`),
      fetchWithTimeout(`${base}/api/v2?cmd=get_history&length=1&apikey=${key}`),
    ]);
    const activity = activityRes.status === "fulfilled" && activityRes.value.ok
      ? await activityRes.value.json() as { response?: { data?: { stream_count?: number } } }
      : null;
    const history = historyRes.status === "fulfilled" && historyRes.value.ok
      ? await historyRes.value.json() as { response?: { data?: { total_count?: string } } }
      : null;
    return {
      activeStreams: activity?.response?.data?.stream_count ?? 0,
      totalPlays: history?.response?.data?.total_count ?? null,
    };
  } catch { return {}; }
}

async function getQbittorrentStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  try {
    const [torrentsRes, transferRes] = await Promise.allSettled([
      fetchWithTimeout(`${base}/api/v2/torrents/info`),
      fetchWithTimeout(`${base}/api/v2/transfer/info`),
    ]);
    const torrents = torrentsRes.status === "fulfilled" && torrentsRes.value.ok
      ? await torrentsRes.value.json() as unknown[]
      : null;
    const transfer = transferRes.status === "fulfilled" && transferRes.value.ok
      ? await transferRes.value.json() as { dl_info_speed?: number; up_info_speed?: number }
      : null;
    return {
      totalTorrents: Array.isArray(torrents) ? torrents.length : null,
      downloadSpeed: transfer?.dl_info_speed ?? 0,
      uploadSpeed: transfer?.up_info_speed ?? 0,
    };
  } catch { return {}; }
}

async function getSabnzbdStats(service: Service): Promise<Record<string, unknown>> {
  const base = normalizeUrl(service.url);
  const key = encodeURIComponent(service.apiKey ?? "");
  try {
    const res = await fetchWithTimeout(`${base}/api?mode=queue&output=json&apikey=${key}`);
    if (!res.ok) return {};
    const data = await res.json() as { queue?: { noofslots?: number; speed?: string; status?: string } };
    return {
      queueCount: data.queue?.noofslots ?? 0,
      speed: data.queue?.speed ?? "0",
      status: data.queue?.status ?? "Unknown",
    };
  } catch { return {}; }
}

export async function getServiceStats(service: Service): Promise<Record<string, unknown>> {
  switch (service.type) {
    case "sonarr":
    case "lidarr":
    case "readarr":
      return getSonarrStats(service);
    case "radarr":
      return getRadarrStats(service);
    case "plex":
      return getPlexStats(service);
    case "jellyfin":
      return getJellyfinStats(service);
    case "tautulli":
      return getTautulliStats(service);
    case "qbittorrent":
      return getQbittorrentStats(service);
    case "sabnzbd":
      return getSabnzbdStats(service);
    default:
      return {};
  }
}

// ---------- Downloads ----------

function mapQbittorrentState(state: string): DownloadItem["state"] {
  const map: Record<string, DownloadItem["state"]> = {
    downloading: "downloading",
    uploading: "seeding",
    stalledDL: "stalled",
    stalledUP: "seeding",
    pausedDL: "paused",
    pausedUP: "paused",
    queuedDL: "queued",
    queuedUP: "queued",
    checkingDL: "checking",
    checkingUP: "checking",
    checkingResumeData: "checking",
    error: "error",
    missingFiles: "error",
    forcedDL: "downloading",
    forcedUP: "seeding",
    moving: "checking",
  };
  return map[state] ?? "downloading";
}

export async function getQbittorrentDownloads(service: Service): Promise<DownloadItem[]> {
  const base = normalizeUrl(service.url);
  try {
    const res = await fetchWithTimeout(`${base}/api/v2/torrents/info`);
    if (!res.ok) return [];
    const torrents = await res.json() as Array<{
      hash: string; name: string; state: string; progress: number;
      size: number; downloaded: number; dlspeed: number; eta: number;
      category: string; save_path: string; added_on: number;
    }>;
    return torrents.map(t => ({
      hash: t.hash,
      name: t.name,
      serviceId: service.id,
      serviceName: service.name,
      serviceType: service.type,
      state: mapQbittorrentState(t.state),
      progress: Math.round(t.progress * 100),
      size: t.size,
      downloadedSize: t.downloaded,
      speed: t.dlspeed,
      eta: t.eta >= 0 && t.eta < 8640000 ? t.eta : null,
      category: t.category || null,
      savePath: t.save_path || null,
      addedAt: new Date(t.added_on * 1000).toISOString(),
    }));
  } catch (err) {
    logger.warn({ err, serviceId: service.id }, "Failed to fetch qbittorrent downloads");
    return [];
  }
}

export async function getSabnzbdDownloads(service: Service): Promise<DownloadItem[]> {
  const base = normalizeUrl(service.url);
  const key = encodeURIComponent(service.apiKey ?? "");
  try {
    const res = await fetchWithTimeout(`${base}/api?mode=queue&output=json&apikey=${key}&limit=100`);
    if (!res.ok) return [];
    const data = await res.json() as {
      queue?: {
        slots?: Array<{
          nzo_id: string; filename: string; status: string; percentage: string;
          mb: string; mbleft: string; mbspeed: string; timeleft: string; cat: string;
        }>
      }
    };
    const slots = data.queue?.slots ?? [];
    return slots.map(s => {
      const totalMb = parseFloat(s.mb) || 0;
      const leftMb = parseFloat(s.mbleft) || 0;
      const speedMb = parseFloat(s.mbspeed) || 0;
      const totalBytes = Math.round(totalMb * 1024 * 1024);
      const downloadedBytes = Math.round((totalMb - leftMb) * 1024 * 1024);
      const progress = totalMb > 0 ? Math.round(((totalMb - leftMb) / totalMb) * 100) : 0;
      // Parse timeleft "HH:MM:SS"
      const parts = s.timeleft.split(":").map(Number);
      const eta = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : null;
      const stateMap: Record<string, DownloadItem["state"]> = {
        Downloading: "downloading", Paused: "paused", Queued: "queued",
        Checking: "checking", Failed: "error", Completed: "completed",
      };
      return {
        hash: s.nzo_id,
        name: s.filename,
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        state: stateMap[s.status] ?? "downloading",
        progress,
        size: totalBytes,
        downloadedSize: downloadedBytes,
        speed: Math.round(speedMb * 1024 * 1024),
        eta,
        category: s.cat || null,
        savePath: null,
        addedAt: new Date().toISOString(),
      };
    });
  } catch (err) {
    logger.warn({ err, serviceId: service.id }, "Failed to fetch sabnzbd downloads");
    return [];
  }
}

// ---------- Download actions ----------

export async function pauseQbittorrent(service: Service, hash: string): Promise<void> {
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api/v2/torrents/pause`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `hashes=${encodeURIComponent(hash)}`,
  });
}

export async function resumeQbittorrent(service: Service, hash: string): Promise<void> {
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api/v2/torrents/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `hashes=${encodeURIComponent(hash)}`,
  });
}

export async function deleteQbittorrent(service: Service, hash: string): Promise<void> {
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api/v2/torrents/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `hashes=${encodeURIComponent(hash)}&deleteFiles=false`,
  });
}

export async function pauseSabnzbd(service: Service, hash: string): Promise<void> {
  const key = encodeURIComponent(service.apiKey ?? "");
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api?mode=pause_nzo&value=${encodeURIComponent(hash)}&apikey=${key}`);
}

export async function resumeSabnzbd(service: Service, hash: string): Promise<void> {
  const key = encodeURIComponent(service.apiKey ?? "");
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api?mode=resume_nzo&value=${encodeURIComponent(hash)}&apikey=${key}`);
}

export async function deleteSabnzbd(service: Service, hash: string): Promise<void> {
  const key = encodeURIComponent(service.apiKey ?? "");
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api?mode=delete&value=${encodeURIComponent(hash)}&apikey=${key}`);
}

// ---------- Restart ----------

export async function restartSonarrLike(service: Service): Promise<void> {
  await fetchWithTimeout(`${normalizeUrl(service.url)}/api/v3/command`, {
    method: "POST",
    headers: { "X-Api-Key": service.apiKey ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Restart" }),
  });
}

export async function restartPlex(service: Service): Promise<void> {
  await fetchWithTimeout(`${normalizeUrl(service.url)}/:/prefs`, {
    method: "PUT",
    headers: { "X-Plex-Token": service.apiKey ?? "" },
  });
}
