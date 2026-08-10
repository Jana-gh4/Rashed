import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { users, households } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function safeUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    preferredLanguage: u.preferredLanguage,
    isDemoMode: u.isDemoMode,
    createdAt: u.createdAt,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }
    const { name, email, password, preferredLanguage } = parsed.data;

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({
      name,
      email: email.toLowerCase(),
      passwordHash,
      preferredLanguage: preferredLanguage as "ar" | "en",
    }).returning();

    req.session.userId = user.id;
    res.status(201).json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.userId = user.id;
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/auth/me
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { name, preferredLanguage } = req.body as { name?: string; preferredLanguage?: "ar" | "en" };
    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (preferredLanguage) updates.preferredLanguage = preferredLanguage;

    const [user] = await db.update(users).set(updates).where(eq(users.id, req.session.userId!)).returning();
    res.json(safeUser(user));
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;
