import {
  pgTable,
  serial,
  text,
  real,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tariffConfigs = pgTable("tariff_configs", {
  id: serial("id").primaryKey(),
  version: text("version").notNull().unique(),
  source: text("source").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  // JSON tiers: [{min_m3, max_m3, rate_sar_per_m3}]
  tiers: jsonb("tiers").notNull(),
  includedCharges: text("included_charges"),
  calculationMethod: text("calculation_method").notNull().default("tiered"),
  // always "unverified_estimate" until team updates
  verificationStatus: text("verification_status")
    .notNull()
    .default("unverified_estimate"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTariffConfigSchema = createInsertSchema(
  tariffConfigs
).omit({ id: true, createdAt: true });
export type InsertTariffConfig = z.infer<typeof insertTariffConfigSchema>;
export type TariffConfig = typeof tariffConfigs.$inferSelect;

// ─── savings_estimates ────────────────────────────────────────────────────────

import { integer } from "drizzle-orm/pg-core";
import { households } from "./households";
import { dataClassificationEnum } from "./meters";

export const savingsEstimates = pgTable("savings_estimates", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  tariffConfigId: integer("tariff_config_id")
    .notNull()
    .references(() => tariffConfigs.id),
  tariffVersion: text("tariff_version").notNull(),
  periodLabel: text("period_label").notNull(),
  currentCostSar: real("current_cost_sar").notNull(),
  projectedCostSar: real("projected_cost_sar").notNull(),
  savingSar: real("saving_sar").notNull(),
  savingM3: real("saving_m3").notNull(),
  reductionPercent: real("reduction_percent").notNull(),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSavingsEstimateSchema = createInsertSchema(
  savingsEstimates
).omit({ id: true, createdAt: true });
export type InsertSavingsEstimate = z.infer<typeof insertSavingsEstimateSchema>;
export type SavingsEstimate = typeof savingsEstimates.$inferSelect;
