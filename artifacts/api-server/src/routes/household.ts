import { Router } from "express";
import { db } from "@workspace/db";
import { users, households, householdMembers } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

async function getUserHousehold(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.householdId) return null;
  const [hh] = await db.select().from(households).where(eq(households.id, user.householdId)).limit(1);
  return hh ?? null;
}

// GET /api/household
router.get("/", async (req, res) => {
  try {
    const hh = await getUserHousehold(req.session.userId!);
    if (!hh) { res.status(404).json({ error: "No household found" }); return; }
    res.json(hh);
  } catch { res.status(500).json({ error: "Failed to fetch household" }); }
});

// PUT /api/household
router.put("/", async (req, res) => {
  try {
    const { name, memberCount, propertyType, bathroomCount, hasGarden, hasPool, propertySizeM2 } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);

    let hh;
    if (user.householdId) {
      [hh] = await db.update(households).set({
        name, memberCount, propertyType, bathroomCount, hasGarden, hasPool, propertySizeM2: propertySizeM2 ?? null, updatedAt: new Date(),
      }).where(eq(households.id, user.householdId)).returning();
    } else {
      [hh] = await db.insert(households).values({
        name, memberCount, propertyType, bathroomCount, hasGarden, hasPool, propertySizeM2: propertySizeM2 ?? null,
      }).returning();
      await db.update(users).set({ householdId: hh.id, updatedAt: new Date() }).where(eq(users.id, user.id));
    }
    res.json(hh);
  } catch { res.status(500).json({ error: "Failed to upsert household" }); }
});

// GET /api/household/members
router.get("/members", async (req, res) => {
  try {
    const hh = await getUserHousehold(req.session.userId!);
    if (!hh) { res.status(404).json({ error: "No household found" }); return; }
    const members = await db.select().from(householdMembers).where(eq(householdMembers.householdId, hh.id));
    res.json(members);
  } catch { res.status(500).json({ error: "Failed to fetch members" }); }
});

// POST /api/household/members
router.post("/members", async (req, res) => {
  try {
    const hh = await getUserHousehold(req.session.userId!);
    if (!hh) { res.status(404).json({ error: "No household found" }); return; }
    const { name, role } = req.body;
    const [member] = await db.insert(householdMembers).values({ householdId: hh.id, name, role: role ?? "member" }).returning();
    res.status(201).json(member);
  } catch { res.status(500).json({ error: "Failed to add member" }); }
});

// DELETE /api/household/members/:id
router.delete("/members/:id", async (req, res) => {
  try {
    const hh = await getUserHousehold(req.session.userId!);
    if (!hh) { res.status(404).json({ error: "No household found" }); return; }
    const memberId = parseInt(req.params.id);
    const [member] = await db.select().from(householdMembers).where(and(eq(householdMembers.id, memberId), eq(householdMembers.householdId, hh.id))).limit(1);
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    await db.delete(householdMembers).where(eq(householdMembers.id, memberId));
    res.status(204).send();
  } catch { res.status(500).json({ error: "Failed to remove member" }); }
});

export default router;
