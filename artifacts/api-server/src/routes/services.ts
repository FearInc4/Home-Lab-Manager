import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  CreateServiceBody,
  CreateServiceResponse,
  GetServiceParams,
  GetServiceResponse,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
  ListServicesResponse,
  GetServiceStatusParams,
  GetServiceStatusResponse,
  RestartServiceParams,
  RestartServiceResponse,
  GetServiceStatsParams,
  GetServiceStatsResponse,
} from "@workspace/api-zod";
import {
  checkServiceStatus,
  getServiceStats,
  restartSonarrLike,
  restartPlex,
} from "../lib/serviceConnector";

const router: IRouter = Router();

// List services
router.get("/services", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable).orderBy(servicesTable.createdAt);
  const parsed = ListServicesResponse.parse(
    services.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      url: s.url,
      apiKey: s.apiKey ?? null,
      username: s.username ?? null,
      enabled: s.enabled,
      createdAt: s.createdAt.toISOString(),
    }))
  );
  res.json(parsed);
});

// Create service
router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, type, url, apiKey, username, password, enabled } = parsed.data;
  const [service] = await db.insert(servicesTable).values({
    name,
    type,
    url,
    apiKey: apiKey ?? null,
    username: username ?? null,
    password: password ?? null,
    enabled: enabled ?? true,
  }).returning();
  const result = CreateServiceResponse.parse({
    id: service.id,
    name: service.name,
    type: service.type,
    url: service.url,
    apiKey: service.apiKey ?? null,
    username: service.username ?? null,
    enabled: service.enabled,
    createdAt: service.createdAt.toISOString(),
  });
  res.status(201).json(result);
});

// Get service
router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(GetServiceResponse.parse({
    id: service.id,
    name: service.name,
    type: service.type,
    url: service.url,
    apiKey: service.apiKey ?? null,
    username: service.username ?? null,
    enabled: service.enabled,
    createdAt: service.createdAt.toISOString(),
  }));
});

// Update service
router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateServiceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const update: Record<string, unknown> = {};
  if (body.data.name !== undefined) update.name = body.data.name;
  if (body.data.url !== undefined) update.url = body.data.url;
  if (body.data.apiKey !== undefined) update.apiKey = body.data.apiKey;
  if (body.data.username !== undefined) update.username = body.data.username;
  if (body.data.password !== undefined) update.password = body.data.password;
  if (body.data.enabled !== undefined) update.enabled = body.data.enabled;
  const [service] = await db.update(servicesTable).set(update).where(eq(servicesTable.id, params.data.id)).returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(UpdateServiceResponse.parse({
    id: service.id,
    name: service.name,
    type: service.type,
    url: service.url,
    apiKey: service.apiKey ?? null,
    username: service.username ?? null,
    enabled: service.enabled,
    createdAt: service.createdAt.toISOString(),
  }));
});

// Delete service
router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.sendStatus(204);
});

// Get service status
router.get("/services/:id/status", async (req, res): Promise<void> => {
  const params = GetServiceStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  const status = await checkServiceStatus(service);
  res.json(GetServiceStatusResponse.parse({
    serviceId: service.id,
    ...status,
  }));
});

// Restart service
router.post("/services/:id/restart", async (req, res): Promise<void> => {
  const params = RestartServiceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  try {
    if (["sonarr", "radarr", "lidarr", "readarr", "prowlarr"].includes(service.type)) {
      await restartSonarrLike(service);
    } else if (service.type === "plex") {
      await restartPlex(service);
    }
    res.json(RestartServiceResponse.parse({ success: true, message: "Restart command sent" }));
  } catch (err: unknown) {
    res.json(RestartServiceResponse.parse({ success: false, message: String(err instanceof Error ? err.message : err) }));
  }
});

// Get service stats
router.get("/services/:id/stats", async (req, res): Promise<void> => {
  const params = GetServiceStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  const data = await getServiceStats(service);
  res.json(GetServiceStatsResponse.parse({ serviceId: service.id, type: service.type, data }));
});

export default router;
