import { Router } from "express";
import { db } from "@workspace/db";
import { users, meters, meterReadings } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function getUserHouseholdId(userId: number): Promise<number | null> {
  const [user] = await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.householdId ?? null;
}

async function assertMeterOwnership(meterId: number, householdId: number) {
  const [m] = await db.select().from(meters).where(and(eq(meters.id, meterId), eq(meters.householdId, householdId))).limit(1);
  return m ?? null;
}

// GET /api/meters
router.get("/", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.json([]); return; }

    const result = await db.select().from(meters).where(eq(meters.householdId, hhId));

    // Attach last reading to each meter
    const enriched = await Promise.all(result.map(async (m) => {
      const [last] = await db.select().from(meterReadings).where(eq(meterReadings.meterId, m.id)).orderBy(desc(meterReadings.readingDate)).limit(1);
      return { ...m, lastReadingValue: last?.readingValue ?? null, lastReadingDate: last?.readingDate?.toISOString() ?? null };
    }));

    res.json(enriched);
  } catch { res.status(500).json({ error: "Failed to fetch meters" }); }
});

// POST /api/meters
router.post("/", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household found" }); return; }
    const { meterId, meterType, label, isActive } = req.body;
    const [m] = await db.insert(meters).values({ householdId: hhId, meterId, meterType, label, isActive: isActive ?? true, dataClassification: "user_data" }).returning();
    res.status(201).json({ ...m, lastReadingValue: null, lastReadingDate: null });
  } catch { res.status(500).json({ error: "Failed to create meter" }); }
});

// GET /api/meters/:id
router.get("/:id", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household found" }); return; }
    const m = await assertMeterOwnership(parseInt(req.params.id), hhId);
    if (!m) { res.status(404).json({ error: "Meter not found" }); return; }
    const [last] = await db.select().from(meterReadings).where(eq(meterReadings.meterId, m.id)).orderBy(desc(meterReadings.readingDate)).limit(1);
    res.json({ ...m, lastReadingValue: last?.readingValue ?? null, lastReadingDate: last?.readingDate?.toISOString() ?? null });
  } catch { res.status(500).json({ error: "Failed to fetch meter" }); }
});

// PATCH /api/meters/:id
router.patch("/:id", async (req, res) => {
  try {
    const hhId = await getUserHouseholdId(req.session.userId!);
    if (!hhId) { res.status(404).json({ error: "No household found" }); return; }
    const m = await assertMeterOwnership(parseInt(req.params.id), hhId);
    if (!m) { res.status(404).json({ error: "Meter not found" }); return; }
    const { label, isActive } = req.body;
    const [updated] = await db.update(meters).set({ label, isActive, updatedAt: new Date() }).where(eq(meters.id, m.id)).returning();
    res.json(updated);
  } catch { res.status(500).json({ error: "Failed to update meter" }); }
});

export default router;
