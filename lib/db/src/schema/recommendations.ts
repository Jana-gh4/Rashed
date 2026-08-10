import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { households } from "./households";
import { aiAnalyses } from "./analyses";
import { dataClassificationEnum } from "./meters";

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => aiAnalyses.id),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  estimatedWaterSavingM3: real("estimated_water_saving_m3"),
  estimatedCostSavingSar: real("estimated_cost_saving_sar"),
  priority: integer("priority").notNull().default(1),
  category: text("category").notNull().default("general"),
  isCompleted: boolean("is_completed").notNull().default(false),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(
  recommendations
).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// ─── conservation_plans ───────────────────────────────────────────────────────

export const conservationPlans = pgTable("conservation_plans", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  goalDescriptionAr: text("goal_description_ar").notNull(),
  goalDescriptionEn: text("goal_description_en").notNull(),
  targetReductionPercent: real("target_reduction_percent").notNull(),
  targetM3: real("target_m3"),
  isActive: boolean("is_active").notNull().default(true),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertConservationPlanSchema = createInsertSchema(
  conservationPlans
).omit({ id: true, createdAt: true });
export type InsertConservationPlan = z.infer<
  typeof insertConservationPlanSchema
>;
export type ConservationPlan = typeof conservationPlans.$inferSelect;
