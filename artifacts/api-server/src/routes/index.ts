import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import householdRouter from "./household";
import metersRouter from "./meters";
import billsRouter from "./bills";
import dashboardRouter from "./dashboard";
import assistantRouter from "./assistant";
import savingsRouter from "./savings";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/household", householdRouter);
router.use("/meters", metersRouter);
router.use("/bills", billsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/assistant", assistantRouter);
router.use("/savings", savingsRouter);

export default router;
