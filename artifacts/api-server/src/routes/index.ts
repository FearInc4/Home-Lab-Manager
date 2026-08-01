import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import downloadsRouter from "./downloads";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(downloadsRouter);
router.use(dashboardRouter);

export default router;
