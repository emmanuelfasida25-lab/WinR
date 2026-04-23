import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import paymentRouter from "./payment";
import dashboardRouter from "./dashboard";
import transactionsRouter from "./transactions";
import withdrawalsRouter from "./withdrawals";
import affiliateRouter from "./affiliate";
import notificationsRouter from "./notifications";
import supportRouter from "./support";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(meRouter);
router.use(paymentRouter);
router.use(dashboardRouter);
router.use(transactionsRouter);
router.use(withdrawalsRouter);
router.use(affiliateRouter);
router.use(notificationsRouter);
router.use(supportRouter);
router.use("/admin", adminRouter);

export default router;
