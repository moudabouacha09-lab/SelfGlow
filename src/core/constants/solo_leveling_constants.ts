/**
 * SelfGlow — Solo Leveling Fitness RPG
 * Core Constants Registry
 *
 * All RPG balance values, rank thresholds, economy rates,
 * and Shadow Army definitions live here as the single source of truth.
 */

// ═══════════════════════════════════════════════════════════════════
//  RANKS
// ═══════════════════════════════════════════════════════════════════

/** Hunter rank progression ladder (lowest → highest) */
export const RANKS = ["E", "D", "C", "B", "A", "S", "SS", "SSS"] as const;
export type Rank = (typeof RANKS)[number];

/** Cumulative total XP required to reach each rank */
export const RANK_XP_REQUIREMENTS: Record<Rank, number> = {
  E: 0,
  D: 1_000,
  C: 3_500,
  B: 7_000,
  A: 15_000,
  S: 25_000,
  SS: 40_000,
  SSS: 60_000,
} as const;

/**
 * Resolve the rank a player should hold given their total XP.
 * Iterates from highest rank downward, returning the first match.
 */
export function resolveRank(totalXp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_XP_REQUIREMENTS[RANKS[i]]) {
      return RANKS[i];
    }
  }
  return "E";
}

/**
 * Get the XP progress within the current rank bracket.
 * Returns { current, required, percentage }.
 */
export function getRankProgress(totalXp: number): {
  currentRank: Rank;
  nextRank: Rank | null;
  xpIntoRank: number;
  xpForNextRank: number;
  percentage: number;
} {
  const currentRank = resolveRank(totalXp);
  const currentIdx = RANKS.indexOf(currentRank);
  const isMaxRank = currentIdx === RANKS.length - 1;

  const nextRank = isMaxRank ? null : RANKS[currentIdx + 1];
  const currentThreshold = RANK_XP_REQUIREMENTS[currentRank];
  const nextThreshold = isMaxRank
    ? RANK_XP_REQUIREMENTS[currentRank]
    : RANK_XP_REQUIREMENTS[nextRank!];

  const xpIntoRank = totalXp - currentThreshold;
  const xpForNextRank = nextThreshold - currentThreshold;
  const percentage = isMaxRank
    ? 100
    : Math.min(100, Math.round((xpIntoRank / xpForNextRank) * 100));

  return { currentRank, nextRank, xpIntoRank, xpForNextRank, percentage };
}

// ═══════════════════════════════════════════════════════════════════
//  COIN ECONOMY
// ═══════════════════════════════════════════════════════════════════

/** Coin payouts for in-game events */
export const COIN_REWARDS = {
  workout_complete: 40,
  daily_mission: 30,
  boss_defeat: 300,
  personal_record: 100,
} as const;

export type CoinEvent = keyof typeof COIN_REWARDS;

// ═══════════════════════════════════════════════════════════════════
//  XP ECONOMY
// ═══════════════════════════════════════════════════════════════════

/**
 * Base XP earned per completed workout.
 * Actual XP is modified by shadow bonuses, streak multipliers, etc.
 */
export const BASE_WORKOUT_XP = 100;

/** XP awarded per streak day (bonus for consistency) */
export const STREAK_XP_PER_DAY = 10;

/** Maximum daily XP cap to prevent abuse */
export const DAILY_XP_CAP = 500;

/** XP penalty for missing a scheduled workout day */
export const PENALTY_XP = 50;

// ═══════════════════════════════════════════════════════════════════
//  BOSS FIGHTS
// ═══════════════════════════════════════════════════════════════════

/** XP required to trigger a boss encounter */
export const BOSS_XP_THRESHOLD = 500;

/** Bosses respawn every N days */
export const BOSS_RESPAWN_DAYS = 7;

// ═══════════════════════════════════════════════════════════════════
//  SHADOW ARMY
// ═══════════════════════════════════════════════════════════════════

export interface ShadowSoldier {
  /** Internal key, lowercase */
  key: string;
  /** Display name */
  name: string;
  /** Cost in coins to arise (unlock) */
  coinsCost: number;
  /** Minimum bosses defeated to be eligible */
  bossesRequired: number;
  /** Human-readable description of the passive bonus */
  bonus: string;
}

export const SHADOW_ARMY: readonly ShadowSoldier[] = [
  {
    key: "kasaka",
    name: "Kasaka",
    coinsCost: 200,
    bossesRequired: 1,
    bonus: "+10% workout XP",
  },
  {
    key: "iron",
    name: "Iron",
    coinsCost: 350,
    bossesRequired: 2,
    bonus: "-50% penalty metrics",
  },
  {
    key: "tank",
    name: "Tank",
    coinsCost: 400,
    bossesRequired: 3,
    bonus: "1 free penalty skip/week",
  },
  {
    key: "igris",
    name: "Igris",
    coinsCost: 600,
    bossesRequired: 4,
    bonus: "+20% all XP",
  },
  {
    key: "greed",
    name: "Greed",
    coinsCost: 500,
    bossesRequired: 5,
    bonus: "+40% coins",
  },
  {
    key: "kaisel",
    name: "Kaisel",
    coinsCost: 1_000,
    bossesRequired: 6,
    bonus: "+50% boss XP",
  },
  {
    key: "beru",
    name: "Beru",
    coinsCost: 1_500,
    bossesRequired: 8,
    bonus: "+40% all XP + 15XP/streak",
  },
  {
    key: "bellion",
    name: "Bellion",
    coinsCost: 2_500,
    bossesRequired: 10,
    bonus: "x3 full clearance + immunity",
  },
] as const;

/**
 * Lookup a shadow soldier by key. Returns undefined if not found.
 */
export function getShadow(key: string): ShadowSoldier | undefined {
  return SHADOW_ARMY.find((s) => s.key === key);
}

// ═══════════════════════════════════════════════════════════════════
//  STREAK BONUSES
// ═══════════════════════════════════════════════════════════════════

/** Streak milestone multipliers applied to XP */
export const STREAK_MILESTONES: { days: number; multiplier: number }[] = [
  { days: 3, multiplier: 1.1 },
  { days: 7, multiplier: 1.25 },
  { days: 14, multiplier: 1.4 },
  { days: 30, multiplier: 1.6 },
  { days: 60, multiplier: 1.8 },
  { days: 100, multiplier: 2.0 },
];

/**
 * Returns the XP multiplier for a given streak length.
 * Falls through to the highest milestone ≤ current streak.
 */
export function getStreakMultiplier(streak: number): number {
  let multiplier = 1.0;
  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone.days) {
      multiplier = milestone.multiplier;
    } else {
      break;
    }
  }
  return multiplier;
}

// ═══════════════════════════════════════════════════════════════════
//  FITNESS LEVEL MAPPINGS
// ═══════════════════════════════════════════════════════════════════

export const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

export const EQUIPMENT_OPTIONS = [
  "none",
  "dumbbells",
  "resistance_bands",
  "full_gym",
] as const;
export type Equipment = (typeof EQUIPMENT_OPTIONS)[number];

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const FITNESS_GOALS = [
  "build_muscle",
  "lose_fat",
  "increase_strength",
  "improve_endurance",
  "general_fitness",
] as const;
export type FitnessGoal = (typeof FITNESS_GOALS)[number];
