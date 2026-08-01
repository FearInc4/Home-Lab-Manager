import express, { type Express } from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./lib/logger";
import {
  checkServiceStatus,
  getQbittorrentDownloads,
  getSabnzbdDownloads,
  getServiceStats,
  pauseQbittorrent,
  pauseSabnzbd,
  resumeQbittorrent,
  resumeSabnzbd,
  deleteQbittorrent,
  deleteSabnzbd,
  restartPlex,
  restartSonarrLike,
  testServiceConnection,
} from "./lib/serviceConnector";

type StoredService = {
  id: number;
  name: string;
  type: string;
  url: string;
  apiKey: string | null;
  username: string | null;
  password: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const port = Number(process.env.PORT ?? 8787);
const dataDir =
  process.env.HOMELAB_DATA_DIR ??
  path.join(os.homedir(), "Library", "Application Support", "Homelab Manager");
const dataFile = path.join(dataDir, "services.json");
const staticDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "public",
);

async function ensureStore(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(dataFile)) {
    await writeFile(dataFile, "[]\n", "utf8");
  }
}

async function readServices(): Promise<StoredService[]> {
  await ensureStore();
  try {
    const content = await readFile(dataFile, "utf8");
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as StoredService[]) : [];
  } catch (error) {
    logger.error({ error, dataFile }, "Could not read local service store");
    throw new Error(`Could not read local data file: ${dataFile}`);
  }
}

async function writeServices(services: StoredService[]): Promise<void> {
  await ensureStore();
  await writeFile(dataFile, `${JSON.stringify(services, null, 2)}\n`, "utf8");
}

function toPublicService(service: StoredService) {
  return {
    id: service.id,
    name: service.name,
    type: service.type,
    url: service.url,
    apiKey: service.apiKey,
    username: service.username,
    enabled: service.enabled,
    createdAt: service.createdAt,
  };
}

function asConnectorService(service: StoredService) {
  return {
    ...service,
    createdAt: new Date(service.createdAt),
    updatedAt: new Date(service.updatedAt),
  };
}

function getId(req: express.Request): number {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new Error("Invalid service id");
  return id;
}

function getDownloadServiceId(req: express.Request): number {
  const raw = Array.isArray(req.params.serviceId)
    ? req.params.serviceId[0]
    : req.params.serviceId;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new Error("Invalid service id");
  return id;
}

function serviceNotFound(res: express.Response): void {
  res.status(404).json({ error: "Service not found" });
}

const app: Express = express();
app.use(cors());
app.use(express.json());

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", mode: "local" });
});

app.get("/api/services", async (_req, res): Promise<void> => {
  const services = await readServices();
  res.json(services.map(toPublicService));
});

app.post("/api/services/test", async (req, res): Promise<void> => {
  const { type, url, apiKey, username, password } = req.body as Record<
    string,
    string | undefined
  >;
  if (!type || !url) {
    res.status(400).json({ error: "Service type and URL are required" });
    return;
  }

  try {
    const status = await testServiceConnection({
      type,
      url,
      apiKey,
      username,
      password,
    });
    res.json({
      success: status.online,
      online: status.online,
      message: status.online
        ? `Connected${status.version ? ` · version ${status.version}` : ""}`
        : status.error ?? "Connection failed",
      responseTimeMs: status.responseTimeMs,
      version: status.version,
    });
  } catch (error: unknown) {
    res.json({
      success: false,
      online: false,
      message: error instanceof Error ? error.message : String(error),
      responseTimeMs: null,
      version: null,
    });
  }
});

app.post("/api/services", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  if (
    typeof body.name !== "string" ||
    typeof body.type !== "string" ||
    typeof body.url !== "string"
  ) {
    res.status(400).json({ error: "Name, type, and URL are required" });
    return;
  }

  const services = await readServices();
  const now = new Date().toISOString();
  const service: StoredService = {
    id: services.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    name: body.name,
    type: body.type,
    url: body.url,
    apiKey: typeof body.apiKey === "string" ? body.apiKey : null,
    username: typeof body.username === "string" ? body.username : null,
    password: typeof body.password === "string" ? body.password : null,
    enabled: body.enabled !== false,
    createdAt: now,
    updatedAt: now,
  };
  services.push(service);
  await writeServices(services);
  res.status(201).json(toPublicService(service));
});

app.get("/api/services/:id", async (req, res): Promise<void> => {
  const services = await readServices();
  const service = services.find((item) => item.id === getId(req));
  if (!service) {
    serviceNotFound(res);
    return;
  }
  res.json(toPublicService(service));
});

app.patch("/api/services/:id", async (req, res): Promise<void> => {
  const services = await readServices();
  const index = services.findIndex((item) => item.id === getId(req));
  if (index < 0) {
    serviceNotFound(res);
    return;
  }

  const current = services[index];
  const body = req.body as Record<string, unknown>;
  const next: StoredService = {
    ...current,
    ...(typeof body.name === "string" ? { name: body.name } : {}),
    ...(typeof body.url === "string" ? { url: body.url } : {}),
    ...(typeof body.apiKey === "string" ? { apiKey: body.apiKey } : {}),
    ...(typeof body.username === "string" ? { username: body.username } : {}),
    ...(typeof body.password === "string" ? { password: body.password } : {}),
    ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
    updatedAt: new Date().toISOString(),
  };
  services[index] = next;
  await writeServices(services);
  res.json(toPublicService(next));
});

app.delete("/api/services/:id", async (req, res): Promise<void> => {
  const services = await readServices();
  const next = services.filter((item) => item.id !== getId(req));
  if (next.length === services.length) {
    serviceNotFound(res);
    return;
  }
  await writeServices(next);
  res.sendStatus(204);
});

app.get("/api/services/:id/status", async (req, res): Promise<void> => {
  const services = await readServices();
  const service = services.find((item) => item.id === getId(req));
  if (!service) {
    serviceNotFound(res);
    return;
  }
  const status = await checkServiceStatus(asConnectorService(service));
  res.json({ serviceId: service.id, ...status });
});

app.post("/api/services/:id/restart", async (req, res): Promise<void> => {
  const services = await readServices();
  const service = services.find((item) => item.id === getId(req));
  if (!service) {
    serviceNotFound(res);
    return;
  }

  try {
    const connectorService = asConnectorService(service);
    if (["sonarr", "radarr", "lidarr", "readarr", "prowlarr"].includes(service.type)) {
      await restartSonarrLike(connectorService);
    } else if (service.type === "plex") {
      await restartPlex(connectorService);
    }
    res.json({ success: true, message: "Restart command sent" });
  } catch (error: unknown) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/services/:id/stats", async (req, res): Promise<void> => {
  const services = await readServices();
  const service = services.find((item) => item.id === getId(req));
  if (!service) {
    serviceNotFound(res);
    return;
  }
  const data = await getServiceStats(asConnectorService(service));
  res.json({ serviceId: service.id, type: service.type, data });
});

app.get("/api/downloads", async (_req, res): Promise<void> => {
  const services = await readServices();
  const clients = services.filter(
    (service) => service.enabled && ["qbittorrent", "sabnzbd"].includes(service.type),
  );
  const results = await Promise.allSettled(
    clients.map((service) =>
      service.type === "qbittorrent"
        ? getQbittorrentDownloads(asConnectorService(service))
        : getSabnzbdDownloads(asConnectorService(service)),
    ),
  );
  res.json(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
});

async function runDownloadAction(
  req: express.Request,
  res: express.Response,
  action: "pause" | "resume" | "delete",
): Promise<void> {
  const services = await readServices();
  const service = services.find((item) => item.id === getDownloadServiceId(req));
  if (!service) {
    serviceNotFound(res);
    return;
  }

  try {
    const connectorService = asConnectorService(service);
    const hash = Array.isArray(req.params.hash) ? req.params.hash[0] : req.params.hash;
    if (service.type === "qbittorrent") {
      if (action === "pause") await pauseQbittorrent(connectorService, hash);
      if (action === "resume") await resumeQbittorrent(connectorService, hash);
      if (action === "delete") await deleteQbittorrent(connectorService, hash);
    } else if (service.type === "sabnzbd") {
      if (action === "pause") await pauseSabnzbd(connectorService, hash);
      if (action === "resume") await resumeSabnzbd(connectorService, hash);
      if (action === "delete") await deleteSabnzbd(connectorService, hash);
    }
    res.json({ success: true, message: `Download ${action}d` });
  } catch (error: unknown) {
    res.json({
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

app.post("/api/downloads/:serviceId/:hash/pause", (req, res) =>
  runDownloadAction(req, res, "pause"),
);
app.post("/api/downloads/:serviceId/:hash/resume", (req, res) =>
  runDownloadAction(req, res, "resume"),
);
app.delete("/api/downloads/:serviceId/:hash", (req, res) =>
  runDownloadAction(req, res, "delete"),
);

app.get("/api/dashboard", async (_req, res): Promise<void> => {
  const services = (await readServices()).filter((service) => service.enabled);
  const statusResults = await Promise.allSettled(
    services.map((service) =>
      checkServiceStatus(asConnectorService(service)).then((status) => ({ service, status })),
    ),
  );
  const summary = statusResults.map((result, index) => {
    const service = services[index];
    return {
      id: service.id,
      name: service.name,
      type: service.type,
      online: result.status === "fulfilled" && result.value.status.online,
      version: result.status === "fulfilled" ? result.value.status.version : null,
    };
  });

  const clients = services.filter((service) =>
    ["qbittorrent", "sabnzbd"].includes(service.type),
  );
  const downloadResults = await Promise.allSettled(
    clients.map((service) =>
      service.type === "qbittorrent"
        ? getQbittorrentDownloads(asConnectorService(service))
        : getSabnzbdDownloads(asConnectorService(service)),
    ),
  );
  const downloads = downloadResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const active = downloads.filter((download) => download.state === "downloading");
  res.json({
    services: summary,
    totalDownloads: downloads.length,
    activeDownloads: active.length,
    totalDownloadSpeed: active.reduce((total, download) => total + download.speed, 0),
    recentActivity: [],
  });
});

if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  logger.info({ port, dataFile }, "Local Homelab Manager listening");
});