import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propertyTypeEnum = pgEnum("property_type", [
  "villa",
  "apartment",
  "townhouse",
  "other",
]);

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  memberCount: integer("member_count").notNull().default(1),
  propertyType: propertyTypeEnum("property_type").notNull().default("villa"),
  bathroomCount: integer("bathroom_count").notNull().default(1),
  hasGarden: boolean("has_garden").notNull().default(false),
  hasPool: boolean("has_pool").notNull().default(false),
  propertySizeM2: real("property_size_m2"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertHouseholdSchema = createInsertSchema(households).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type Household = typeof households.$inferSelect;

// ─── household_members ────────────────────────────────────────────────────────

export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertHouseholdMemberSchema = createInsertSchema(
  householdMembers
).omit({ id: true, createdAt: true });
export type InsertHouseholdMember = z.infer<typeof insertHouseholdMemberSchema>;
export type HouseholdMember = typeof householdMembers.$inferSelect;
