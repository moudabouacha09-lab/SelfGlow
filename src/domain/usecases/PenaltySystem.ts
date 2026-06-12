/**
 * SelfGlow — Penalty System
 *
 * Evaluates whether the player missed a scheduled workout or
 * daily missions by system midnight. If non-compliant, applies
 * an XP deduction, resets the streak, and flags the UI to
 * render the unskippable red penalty overlay.
 */

import { eq, and } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import { hunterProfile } from "../../db/schema";
import { workoutSessions } from "../../db/schema";
import { dailyMissions } from "../../db/schema";
import { workoutPlans } from "../../db/schema";
import { planDays } from "../../db/schema";

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/** XP deducted when the player fails daily compliance */
const PENALTY_XP_DEDUCTION = 200;

// ═══════════════════════════════════════════════════════════════════
//  DATE HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get yesterday's date string in ISO 8601 format (YYYY-MM-DD).
 * Compliance checks are always evaluated against the previous day.
 */
function getYesterdayISO(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/** Get today's date string in ISO 8601 format (YYYY-MM-DD). */
function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get the day-of-week number for a given ISO date string.
 * Returns 1 = Monday … 7 = Sunday (matching plan_days.day_of_week).
 */
function getDayOfWeek(isoDate: string): number {
  const d = new Date(isoDate + "T00:00:00");
  const jsDay = d.getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

// ═══════════════════════════════════════════════════════════════════
//  COMPLIANCE RESULT TYPE
// ═══════════════════════════════════════════════════════════════════

export interface ComplianceResult {
  /** True if the player was penalised */
  penalised: boolean;
  /** XP deducted (0 if not penalised) */
  xpDeducted: number;
  /** Whether the streak was reset */
  streakReset: boolean;
  /** Reason for penalty, null if compliant */
  reason: string | null;
}

// ═══════════════════════════════════════════════════════════════════
//  CORE EVALUATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate daily compliance for a given user.
 *
 * Runs the following checks against yesterday's date:
 * 1. Was a workout session completed (if one was scheduled)?
 * 2. Were all daily missions completed?
 *
 * If either check fails, penalties are applied:
 * - Deduct {@link PENALTY_XP_DEDUCTION} XP (floored at 0)
 * - Reset streak to 0
 * - Record today as `last_penalty_date`
 *
 * Idempotency: If `last_penalty_date` is already today,
 * the penalty is skipped to prevent double-penalising.
 *
 * @param userId - The user's database ID
 * @param db     - Drizzle database instance
 * @returns Whether the red penalty overlay should be shown
 */
export async function evaluateDailyCompliance(
  userId: number,
  db: BaseSQLiteDatabase<"sync" | "async", any, any>
): Promise<ComplianceResult> {
  const yesterday = getYesterdayISO();
  const today = getTodayISO();

  // ── 1. Fetch the hunter profile ──────────────────────────────
  const profiles = await db
    .select()
    .from(hunterProfile)
    .where(eq(hunterProfile.userId, userId))
    .limit(1);

  if (profiles.length === 0) {
    return {
      penalised: false,
      xpDeducted: 0,
      streakReset: false,
      reason: null,
    };
  }

  const profile = profiles[0];

  // ── 2. Idempotency guard — don't double-penalise ──────────────
  if (profile.lastPenaltyDate === today) {
    return {
      penalised: false,
      xpDeducted: 0,
      streakReset: false,
      reason: null,
    };
  }

  // ── 3. Check if yesterday was a scheduled workout day ─────────
  let workoutMissed = false;

  // Find the user's active plan
  const activePlans = await db
    .select()
    .from(workoutPlans)
    .where(
      and(eq(workoutPlans.userId, userId), eq(workoutPlans.isActive, 1))
    )
    .limit(1);

  if (activePlans.length > 0) {
    const activePlan = activePlans[0];
    const yesterdayDow = getDayOfWeek(yesterday);

    // Check if yesterday had a scheduled plan day
    const scheduledDays = await db
      .select()
      .from(planDays)
      .where(
        and(
          eq(planDays.planId, activePlan.id),
          eq(planDays.dayOfWeek, yesterdayDow)
        )
      )
      .limit(1);

    if (scheduledDays.length > 0) {
      // A workout was scheduled — did the user complete one?
      const completedSessions = await db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutSessions.date, yesterday),
            eq(workoutSessions.completed, 1)
          )
        )
        .limit(1);

      if (completedSessions.length === 0) {
        workoutMissed = true;
      }
    }
  }

  // ── 4. Check if any daily missions went uncompleted ───────────
  let missionsMissed = false;

  const uncompletedMissions = await db
    .select()
    .from(dailyMissions)
    .where(
      and(
        eq(dailyMissions.userId, userId),
        eq(dailyMissions.date, yesterday),
        eq(dailyMissions.completed, 0)
      )
    )
    .limit(1);

  if (uncompletedMissions.length > 0) {
    missionsMissed = true;
  }

  // ── 5. Apply penalties if non-compliant ────────────────────────
  if (!workoutMissed && !missionsMissed) {
    return {
      penalised: false,
      xpDeducted: 0,
      streakReset: false,
      reason: null,
    };
  }

  // Calculate the actual deduction (XP cannot go below 0)
  const actualDeduction = Math.min(profile.xp, PENALTY_XP_DEDUCTION);
  const newXp = profile.xp - actualDeduction;

  // Build the penalty reason string
  const reasons: string[] = [];
  if (workoutMissed) reasons.push("Missed scheduled workout");
  if (missionsMissed) reasons.push("Uncompleted daily missions");
  const reason = reasons.join(" + ");

  // Write the penalty to the database
  await db
    .update(hunterProfile)
    .set({
      xp: newXp,
      streak: 0,
      lastPenaltyDate: today,
    })
    .where(eq(hunterProfile.userId, userId));

  return {
    penalised: true,
    xpDeducted: actualDeduction,
    streakReset: true,
    reason,
  };
}
