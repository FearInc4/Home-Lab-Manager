import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  ListDownloadsResponse,
  PauseDownloadParams,
  PauseDownloadResponse,
  ResumeDownloadParams,
  ResumeDownloadResponse,
  RemoveDownloadParams,
  RemoveDownloadResponse,
} from "@workspace/api-zod";
import {
  getQbittorrentDownloads,
  getSabnzbdDownloads,
  pauseQbittorrent,
  resumeQbittorrent,
  deleteQbittorrent,
  pauseSabnzbd,
  resumeSabnzbd,
  deleteSabnzbd,
} from "../lib/serviceConnector";

const router: IRouter = Router();

// List all downloads across all download clients
router.get("/downloads", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable).where(eq(servicesTable.enabled, true));
  const downloadClients = services.filter(s => ["qbittorrent", "sabnzbd"].includes(s.type));

  const results = await Promise.allSettled(
    downloadClients.map(svc => {
      if (svc.type === "qbittorrent") return getQbittorrentDownloads(svc);
      if (svc.type === "sabnzbd") return getSabnzbdDownloads(svc);
      return Promise.resolve([]);
    })
  );

  const allDownloads = results.flatMap((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return [];
  });

  res.json(ListDownloadsResponse.parse(allDownloads));
});

// Pause a download
router.post("/downloads/:serviceId/:hash/pause", async (req, res): Promise<void> => {
  const params = PauseDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.serviceId));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  try {
    if (service.type === "qbittorrent") await pauseQbittorrent(service, params.data.hash);
    else if (service.type === "sabnzbd") await pauseSabnzbd(service, params.data.hash);
    res.json(PauseDownloadResponse.parse({ success: true, message: "Download paused" }));
  } catch (err: unknown) {
    res.json(PauseDownloadResponse.parse({ success: false, message: String(err instanceof Error ? err.message : err) }));
  }
});

// Resume a download
router.post("/downloads/:serviceId/:hash/resume", async (req, res): Promise<void> => {
  const params = ResumeDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.serviceId));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  try {
    if (service.type === "qbittorrent") await resumeQbittorrent(service, params.data.hash);
    else if (service.type === "sabnzbd") await resumeSabnzbd(service, params.data.hash);
    res.json(ResumeDownloadResponse.parse({ success: true, message: "Download resumed" }));
  } catch (err: unknown) {
    res.json(ResumeDownloadResponse.parse({ success: false, message: String(err instanceof Error ? err.message : err) }));
  }
});

// Remove a download
router.delete("/downloads/:serviceId/:hash", async (req, res): Promise<void> => {
  const params = RemoveDownloadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.serviceId));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  try {
    if (service.type === "qbittorrent") await deleteQbittorrent(service, params.data.hash);
    else if (service.type === "sabnzbd") await deleteSabnzbd(service, params.data.hash);
    res.json(RemoveDownloadResponse.parse({ success: true, message: "Download removed" }));
  } catch (err: unknown) {
    res.json(RemoveDownloadResponse.parse({ success: false, message: String(err instanceof Error ? err.message : err) }));
  }
});

export default router;
