// src/utils/gatingEngine.ts

export type SubscriptionPlan = "free" | "silver" | "gold" | "premium";

/**
 * Maps subscription tiers to a relative numeric strength value
 * to easily calculate hierarchical permissions.
 */
export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 1,
  silver: 2,
  gold: 3,
  premium: 4,
};

/**
 * Checks if a student's current tier satisfies the minimum required resource plan
 */
export const isPlanAuthorized = (
  studentPlan: string | undefined | null,
  requiredPlan: string | undefined | null
): boolean => {
  // Normalize fields safely falling back to 'free' baseline values
  const normalizedStudent = (studentPlan?.toLowerCase() || "free") as SubscriptionPlan;
  const normalizedRequired = (requiredPlan?.toLowerCase() || "free") as SubscriptionPlan;

  const studentWeight = PLAN_HIERARCHY[normalizedStudent] || 1;
  const requiredWeight = PLAN_HIERARCHY[normalizedRequired] || 1;

  // Hierarchical compliance check
  return studentWeight >= requiredWeight;
};