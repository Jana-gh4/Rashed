import { Router } from "express";
import { db } from "@workspace/db";
import { users, savingsEstimates, tariffConfigs, aiAnalyses } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { calculateSavings } from "../lib/tariff";

const router = Router();
router.use(requireAuth);

async function getUserHouseholdId(userId: number) {
  const [u] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.householdId ?? null;
}

// GET /api/savings
router.get("/", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }
    const estimates = await db.select().from(savingsEstimates).where(eq(savingsEstimates.householdId, hhId)).orderBy(desc(savingsEstimates.createdAt)).limit(10);
    res.json(estimates);
  } catch { res.status(500).json({ error: "Failed to fetch savings" }); }
});

// POST /api/savings/what-if — dynamic what-if simulation
router.post("/what-if", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household" }); return; }

    const targetM3: number = req.body.targetM3;
    const reductionPercent: number | undefined = req.body.reductionPercent;

    const [analysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, hhId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
    if (!analysis?.currentConsumptionM3) { res.status(404).json({ error: "No consumption data available" }); return; }

    const [tariff] = await db.select().from(tariffConfigs).where(eq(tariffConfigs.isActive, true)).limit(1);
    if (!tariff) { res.status(404).json({ error: "No tariff configuration available" }); return; }

    const tiers = tariff.tiers as { min_m3: number; max_m3: number | null; rate_sar_per_m3: number }[];
    const current = analysis.currentConsumptionM3;
    const finalTarget = targetM3 ?? (reductionPercent ? current * (1 - reductionPercent / 100) : current * 0.85);

    const result = calculateSavings(current, finalTarget, tiers);

    res.json({
      currentM3: current,
      targetM3: Math.round(finalTarget * 10) / 10,
      ...result,
      tariffVersion: tariff.version,
      verificationStatus: tariff.verificationStatus,
      // Annual projections
      annualSavingSar: Math.round(result.savingSar * 12 * 100) / 100,
      annualSavingM3: Math.round(result.savingM3 * 12 * 100) / 100,
    });
  } catch { res.status(500).json({ error: "Simulation failed" }); }
});

export default router;
