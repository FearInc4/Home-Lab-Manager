import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import { GetDashboardResponse } from "@workspace/api-zod";
import {
  checkServiceStatus,
  getQbittorrentDownloads,
  getSabnzbdDownloads,
} from "../lib/serviceConnector";

const router: IRouter = Router();

router.get("/dashboard", async (_req, res): Promise<void> => {
  const services = await db.select().from(servicesTable).where(eq(servicesTable.enabled, true));

  // Check all service statuses in parallel
  const statusResults = await Promise.allSettled(
    services.map(svc => checkServiceStatus(svc).then(s => ({ svc, s })))
  );

  const servicesSummary = statusResults.map((r, i) => {
    const svc = services[i];
    if (r.status === "fulfilled") {
      return {
        id: svc.id,
        name: svc.name,
        type: svc.type,
        online: r.value.s.online,
        version: r.value.s.version ?? null,
      };
    }
    return { id: svc.id, name: svc.name, type: svc.type, online: false, version: null };
  });

  // Fetch downloads from download clients
  const downloadClients = services.filter(s => ["qbittorrent", "sabnzbd"].includes(s.type));
  const downloadResults = await Promise.allSettled(
    downloadClients.map(svc => {
      if (svc.type === "qbittorrent") return getQbittorrentDownloads(svc);
      if (svc.type === "sabnzbd") return getSabnzbdDownloads(svc);
      return Promise.resolve([]);
    })
  );
  const allDownloads = downloadResults.flatMap(r => r.status === "fulfilled" ? r.value : []);
  const activeDownloads = allDownloads.filter(d => d.state === "downloading");
  const totalSpeed = activeDownloads.reduce((sum, d) => sum + d.speed, 0);

  const dashboard = GetDashboardResponse.parse({
    services: servicesSummary,
    totalDownloads: allDownloads.length,
    activeDownloads: activeDownloads.length,
    totalDownloadSpeed: totalSpeed,
    recentActivity: [],
  });

  res.json(dashboard);
});

export default router;
