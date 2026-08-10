import { Router } from "express";
import { db } from "@workspace/db";
import { users, households, consumptionRecords, aiAnalyses, leakAlerts, forecasts } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { householdBaselineM3, gastatBaselineM3 } from "../lib/tariff";

const router = Router();
router.use(requireAuth);

// GET /api/dashboard — summary for home screen
router.get("/", async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
    if (!user?.householdId) {
      res.json({ needsHousehold: true });
      return;
    }
    const hhId = user.householdId;

    const [hh] = await db.select().from(households).where(eq(households.id, hhId)).limit(1);
    const recentConsumption = await db.select().from(consumptionRecords).where(eq(consumptionRecords.householdId, hhId)).orderBy(desc(consumptionRecords.createdAt)).limit(6);
    const [latestAnalysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, hhId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
    const [latestAlert] = await db.select().from(leakAlerts).where(and(eq(leakAlerts.householdId, hhId), eq(leakAlerts.isResolved, false))).orderBy(desc(leakAlerts.createdAt)).limit(1);
    const [latestForecast] = await db.select().from(forecasts).where(eq(forecasts.householdId, hhId)).orderBy(desc(forecasts.createdAt)).limit(1);

    const historicalAvg = recentConsumption.length > 0
      ? recentConsumption.reduce((s, r) => s + r.consumptionM3, 0) / recentConsumption.length
      : null;

    const baseline = hh
      ? householdBaselineM3(hh.memberCount, hh.propertyType, hh.hasGarden, hh.hasPool, historicalAvg)
      : null;

    const gastatRef = hh ? gastatBaselineM3(hh.memberCount) : null;

    res.json({
      user: { name: user.name, preferredLanguage: user.preferredLanguage, isDemoMode: user.isDemoMode },
      household: hh,
      currentConsumptionM3: latestAnalysis?.currentConsumptionM3 ?? null,
      previousConsumptionM3: latestAnalysis?.previousConsumptionM3 ?? null,
      changePercentage: latestAnalysis?.changePercentage ?? null,
      statusVsBaseline: latestAnalysis?.statusVsBaseline ?? null,
      baseline,
      gastatReferenceM3: gastatRef,
      activeAlert: latestAlert ?? null,
      latestForecast: latestForecast ?? null,
      recentConsumption,
      hasData: recentConsumption.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

// GET /api/analysis/latest
router.get("/analysis/latest", async (req, res) => {
  try {
    const [user] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, req.session.userId!)).limit(1);
    if (!user?.householdId) { res.status(404).json({ error: "No household" }); return; }
    const [analysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.householdId, user.householdId)).orderBy(desc(aiAnalyses.createdAt)).limit(1);
    if (!analysis) { res.status(404).json({ error: "No analysis found" }); return; }
    res.json(analysis);
  } catch { res.status(500).json({ error: "Failed to fetch analysis" }); }
});

export default router;
