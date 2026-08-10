import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { households } from "./households";
import { aiAnalyses } from "./analyses";
import { dataClassificationEnum } from "./meters";

export const forecasts = pgTable("forecasts", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  analysisId: integer("analysis_id").references(() => aiAnalyses.id),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  projectedM3: real("projected_m3").notNull(),
  projectedMinM3: real("projected_min_m3"),
  projectedMaxM3: real("projected_max_m3"),
  confidenceNote: text("confidence_note"),
  method: text("method").notNull().default("linear_trend"),
  dataClassification: dataClassificationEnum("data_classification")
    .notNull()
    .default("ai_inferred_data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertForecastSchema = createInsertSchema(forecasts).omit({
  id: true,
  createdAt: true,
});
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type Forecast = typeof forecasts.$inferSelect;
