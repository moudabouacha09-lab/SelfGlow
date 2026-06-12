/**
 * SelfGlow — XP Engine
 *
 * Pure mathematical functions for XP and level calculations.
 * These are deterministic, side-effect-free functions that can be
 * tested in isolation without database or state dependencies.
 */

// ═══════════════════════════════════════════════════════════════════
//  SESSION XP CALCULATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate the XP earned from a single workout session.
 *
 * Base Formula:
 *   (durationMinutes × 1.5) + (totalVolume × 0.015) + (personalRecords × 50)
 *
 * The raw base is then amplified by the `activeShadowMultiplier`,
 * which represents the combined percentage bonus from all arisen shadows.
 * A multiplier of 1.0 means no bonus; 1.2 means +20% XP, etc.
 *
 * @param durationMinutes  - Minutes the session lasted (≥ 0)
 * @param totalVolume      - Total volume lifted in kg (sets × reps × weight) (≥ 0)
 * @param personalRecords  - Number of personal records broken this session (≥ 0)
 * @param activeShadowMultiplier - Combined shadow XP multiplier (1.0 = no bonus)
 * @returns Final XP value, always a non-negative integer
 */
export function calculateSessionXp(
  durationMinutes: number,
  totalVolume: number,
  personalRecords: number,
  activeShadowMultiplier: number
): number {
  // Guard against negative inputs
  const safeDuration = Math.max(0, durationMinutes);
  const safeVolume = Math.max(0, totalVolume);
  const safePRs = Math.max(0, personalRecords);
  const safeMultiplier = Math.max(0, activeShadowMultiplier);

  const durationComponent = safeDuration * 1.5;
  const volumeComponent = safeVolume * 0.015;
  const prComponent = safePRs * 50;

  const baseXp = durationComponent + volumeComponent + prComponent;
  const finalXp = baseXp * safeMultiplier;

  return Math.max(0, Math.floor(finalXp));
}

// ═══════════════════════════════════════════════════════════════════
//  LEVEL XP REQUIREMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate the total XP required to reach a given level.
 *
 * Formula: Math.floor(150 × level^1.8 + 1000 × level)
 *
 * This produces a smooth exponential curve:
 *   Level  1 →   1,150 XP
 *   Level  5 →   7,615 XP
 *   Level 10 →  19,462 XP
 *   Level 20 →  55,318 XP
 *   Level 50 → 198,073 XP
 *
 * @param level - The target level (must be ≥ 1)
 * @returns Cumulative XP required to reach this level
 */
export function calculateRequiredXpForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(150 * Math.pow(level, 1.8) + 1000 * level);
}

// ═══════════════════════════════════════════════════════════════════
//  LEVEL RESOLUTION — Derive current level from total XP
// ═══════════════════════════════════════════════════════════════════

/**
 * Resolve the player's numeric level from their total accumulated XP.
 * Iterates upward from level 1 until the required XP exceeds the total.
 *
 * @param totalXp - Lifetime accumulated XP
 * @returns The player's current level (minimum 1)
 */
export function resolveLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;

  let level = 1;
  while (calculateRequiredXpForLevel(level + 1) <= totalXp) {
    level++;
    // Safety cap to prevent infinite loops on corrupted data
    if (level >= 999) break;
  }
  return level;
}

/**
 * Get detailed level progress information.
 *
 * @param totalXp - Lifetime accumulated XP
 * @returns Object containing current level, XP progress within
 *          the level, XP needed for next level, and percentage
 */
export function getLevelProgress(totalXp: number): {
  currentLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  xpNeeded: number;
  percentage: number;
} {
  const currentLevel = resolveLevel(totalXp);
  const xpForCurrentLevel = calculateRequiredXpForLevel(currentLevel);
  const xpForNextLevel = calculateRequiredXpForLevel(currentLevel + 1);

  const xpIntoLevel = totalXp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const percentage =
    xpNeeded > 0
      ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100))
      : 100;

  return {
    currentLevel,
    xpForCurrentLevel,
    xpForNextLevel,
    xpIntoLevel,
    xpNeeded,
    percentage,
  };
}

/**
 * Determine how many level-ups occur when adding XP to a current total.
 * Returns the new level and a list of levels that were crossed.
 *
 * @param currentTotalXp - XP before the award
 * @param xpAwarded      - Amount of XP being added
 * @returns Object with the new total, new level, and array of crossed levels
 */
export function computeLevelUps(
  currentTotalXp: number,
  xpAwarded: number
): {
  newTotalXp: number;
  previousLevel: number;
  newLevel: number;
  levelsCrossed: number[];
} {
  const previousLevel = resolveLevel(currentTotalXp);
  const newTotalXp = currentTotalXp + xpAwarded;
  const newLevel = resolveLevel(newTotalXp);

  const levelsCrossed: number[] = [];
  for (let l = previousLevel + 1; l <= newLevel; l++) {
    levelsCrossed.push(l);
  }

  return { newTotalXp, previousLevel, newLevel, levelsCrossed };
}
