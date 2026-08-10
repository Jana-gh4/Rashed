/**
 * Deterministic tariff calculations — Gemini never touches this.
 * All monetary values produced here must be labeled as estimates
 * and must reference the tariff config version used.
 */

export interface TariffTier {
  min_m3: number;
  max_m3: number | null; // null = unbounded
  rate_sar_per_m3: number;
}

export interface TariffConfig {
  id: number;
  version: string;
  tiers: TariffTier[];
  verificationStatus: string;
}

/**
 * Calculate cost for a given consumption volume using tiered pricing.
 * Returns the total cost in SAR.
 * NOTE: This is an estimate — tariff is unverified_estimate.
 */
export function calculateCost(
  consumptionM3: number,
  tiers: TariffTier[]
): number {
  let remaining = consumptionM3;
  let total = 0;

  const sorted = [...tiers].sort((a, b) => a.min_m3 - b.min_m3);

  for (const tier of sorted) {
    if (remaining <= 0) break;
    const tierMax = tier.max_m3 ?? Infinity;
    const tierSize = tierMax - tier.min_m3;
    const used = Math.min(remaining, tierSize);
    total += used * tier.rate_sar_per_m3;
    remaining -= used;
  }

  return Math.round(total * 100) / 100;
}

/**
 * Calculate savings between two consumption volumes.
 */
export function calculateSavings(
  currentM3: number,
  targetM3: number,
  tiers: TariffTier[]
): {
  currentCostSar: number;
  targetCostSar: number;
  savingSar: number;
  savingM3: number;
  reductionPercent: number;
} {
  const currentCostSar = calculateCost(currentM3, tiers);
  const targetCostSar = calculateCost(targetM3, tiers);
  const savingM3 = currentM3 - targetM3;
  const savingSar = currentCostSar - targetCostSar;
  const reductionPercent =
    currentM3 > 0 ? (savingM3 / currentM3) * 100 : 0;

  return {
    currentCostSar,
    targetCostSar,
    savingSar: Math.round(savingSar * 100) / 100,
    savingM3: Math.round(savingM3 * 100) / 100,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
  };
}

/**
 * GASTAT reference baseline: 102.1 L/person/day
 * Returns m³/month for a given household size (30-day month approximation).
 * Always label this as "GASTAT-derived statistical reference".
 */
export function gastatBaselineM3(memberCount: number): number {
  const GASTAT_LPD = 102.1; // liters per person per day (GASTAT 2023)
  return Math.round(((GASTAT_LPD * memberCount * 30) / 1000) * 10) / 10;
}

/**
 * Household-specific baseline computed from profile + history.
 * Returns an estimated range [min, max] in m³.
 */
export function householdBaselineM3(
  memberCount: number,
  propertyType: string,
  hasGarden: boolean,
  hasPool: boolean,
  historicalAvgM3: number | null
): { min: number; max: number; basis: string } {
  const gastat = gastatBaselineM3(memberCount);

  // Profile adjustment factors
  let factor = 1.0;
  if (propertyType === "villa") factor += 0.2;
  if (hasGarden) factor += 0.15;
  if (hasPool) factor += 0.25;

  const profileEstimate = Math.round(gastat * factor * 10) / 10;

  if (historicalAvgM3 && historicalAvgM3 > 0) {
    // Blend historical (70%) with profile estimate (30%)
    const blended = historicalAvgM3 * 0.7 + profileEstimate * 0.3;
    const range = blended * 0.15; // ±15%
    return {
      min: Math.round((blended - range) * 10) / 10,
      max: Math.round((blended + range) * 10) / 10,
      basis: "household_history_and_profile",
    };
  }

  const range = profileEstimate * 0.2; // ±20% when no history
  return {
    min: Math.round((profileEstimate - range) * 10) / 10,
    max: Math.round((profileEstimate + range) * 10) / 10,
    basis: "household_profile_gastat_reference",
  };
}
