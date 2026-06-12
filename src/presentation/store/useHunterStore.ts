/**
 * SelfGlow — Hunter Store (Zustand)
 *
 * Global state management for the Hunter's RPG profile.
 * Binds the Drizzle ORM database layer to reactive UI state.
 *
 * All mutations flow through this store:
 *   UI Action → Store Action → Drizzle DB Write → State Update
 */

import { create } from "zustand";
import { eq, and } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import {
  hunterProfile,
  shadowArmy,
  users,
  workoutSessions,
  exerciseLogs,
} from "../../db/schema";

import {
  resolveRank,
  getRankProgress,
  getShadow,
  COIN_REWARDS,
  SHADOW_ARMY,
  BASE_WORKOUT_XP,
  getStreakMultiplier,
  type Rank,
} from "../../core/constants/solo_leveling_constants";

import {
  computeLevelUps,
  resolveLevel,
  getLevelProgress,
  calculateSessionXp,
} from "../../domain/usecases/XpEngine";
import { SoundEngine } from "../../core/utils/SoundEngine";

import {
  evaluateDailyCompliance,
  type ComplianceResult,
} from "../../domain/usecases/PenaltySystem";

import { seedExercises } from "../../db/seeders/exerciseSeeder";
import {
  generateSystemPlan,
  generateDailyMissions,
} from "../../domain/usecases/WorkoutGenerator";

// ═══════════════════════════════════════════════════════════════════
//  STATE TYPES
// ═══════════════════════════════════════════════════════════════════

/** Shape of a hunter profile row as returned by Drizzle select */
export interface HunterProfileRow {
  id: number;
  userId: number;
  rank: string;
  xp: number;
  totalXp: number;
  coins: number;
  streak: number;
  lastWorkoutDate: string | null;
  lastPenaltyDate: string | null;
  lastFullyCompletedDate: string | null;
  bossesDefeated: number;
}

/** Shadow soldier as stored in the database */
export interface ShadowArmyRow {
  id: number;
  userId: number;
  shadowName: string;
  arisen: number;
  arisenDate: string | null;
  coinsCost: number;
  bossesRequired: number;
}

/** Derived computed state for the UI */
export interface HunterDerivedState {
  currentRank: Rank;
  nextRank: Rank | null;
  rankPercentage: number;
  xpIntoRank: number;
  xpForNextRank: number;
  currentLevel: number;
  levelPercentage: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** Result of an XP award operation */
export interface XpAwardResult {
  xpAwarded: number;
  newTotalXp: number;
  previousLevel: number;
  newLevel: number;
  levelsCrossed: number[];
  previousRank: Rank;
  newRank: Rank;
  rankChanged: boolean;
}

/** Result of arising a shadow */
export interface AriseShadowResult {
  success: boolean;
  error: string | null;
  shadowName: string;
  coinsRemaining: number;
}

export interface ExerciseLogPayload {
  exerciseId: number;
  setsCompleted: number;
  repsPerSet: number[];
  weightPerSet: number[];
  personalRecord: number; // 0 or 1
}

export interface SessionPayload {
  planDayId?: number;
  durationMinutes: number;
  exercises: ExerciseLogPayload[];
}

// ═══════════════════════════════════════════════════════════════════
//  STORE INTERFACE
// ═══════════════════════════════════════════════════════════════════

interface HunterState {
  // ── Core State ────────────────────────────────────────────────
  hunterProfile: HunterProfileRow | null;
  arisenShadows: ShadowArmyRow[];
  derived: HunterDerivedState | null;
  isLoading: boolean;
  error: string | null;
  penaltyActive: boolean;
  lastComplianceResult: ComplianceResult | null;

  // ── Actions ───────────────────────────────────────────────────

  /**
   * Load the hunter profile and arisen shadows from the database.
   * Computes derived state (rank progress, level progress).
   */
  fetchHunter: (
    userId: number,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<void>;

  /**
   * Award XP to the hunter. Handles level-ups and rank-ups by:
   * 1. Computing new total XP and detecting level crossings
   * 2. Resolving the new rank from the updated total
   * 3. Persisting to the database via Drizzle
   * 4. Updating the Zustand state
   */
  addXp: (
    amount: number,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<XpAwardResult | null>;

  /**
   * Run the daily compliance penalty check.
   * If the player missed a workout or daily missions,
   * sets `penaltyActive = true` to trigger the red overlay.
   */
  triggerPenaltyCheck: (
    userId: number,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<ComplianceResult>;

  /**
   * Attempt to arise (unlock) a shadow soldier.
   * Validates:
   * - Shadow exists in the constants registry
   * - Sufficient coins
   * - Sufficient bosses defeated
   * - Not already arisen
   * On success: deducts coins, inserts shadow row, updates state.
   */
  ariseShadow: (
    userId: number,
    shadowName: string,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<AriseShadowResult>;

  /** Dismiss the penalty overlay (after the player acknowledges it) */
  dismissPenalty: () => void;

  /**
   * Complete the onboarding flow by creating a new user and associated hunter profile.
   */
  completeOnboarding: (
    userData: typeof users.$inferInsert,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<boolean>;

  /**
   * Log a completed workout session, updating XP, Coins, and creating logs.
   */
  logWorkoutSession: (
    sessionData: SessionPayload,
    db: BaseSQLiteDatabase<"sync" | "async", any, any>
  ) => Promise<boolean>;

  /** Reset the store to its initial state */
  reset: () => void;
}

// ═══════════════════════════════════════════════════════════════════
//  DERIVED STATE CALCULATOR
// ═══════════════════════════════════════════════════════════════════

function computeDerived(profile: HunterProfileRow): HunterDerivedState {
  const rankProgress = getRankProgress(profile.totalXp);
  const levelProgress = getLevelProgress(profile.totalXp);

  return {
    currentRank: rankProgress.currentRank,
    nextRank: rankProgress.nextRank,
    rankPercentage: rankProgress.percentage,
    xpIntoRank: rankProgress.xpIntoRank,
    xpForNextRank: rankProgress.xpForNextRank,
    currentLevel: levelProgress.currentLevel,
    levelPercentage: levelProgress.percentage,
    xpIntoLevel: levelProgress.xpIntoLevel,
    xpForNextLevel: levelProgress.xpNeeded,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  INITIAL STATE
// ═══════════════════════════════════════════════════════════════════

const INITIAL_STATE = {
  hunterProfile: null as HunterProfileRow | null,
  arisenShadows: [] as ShadowArmyRow[],
  derived: null as HunterDerivedState | null,
  isLoading: false,
  error: null as string | null,
  penaltyActive: false,
  lastComplianceResult: null as ComplianceResult | null,
};

// ═══════════════════════════════════════════════════════════════════
//  STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════

export const useHunterStore = create<HunterState>((set, get) => ({
  ...INITIAL_STATE,

  // ────────────────────────────────────────────────────────────────
  //  fetchHunter
  // ────────────────────────────────────────────────────────────────
  fetchHunter: async (userId, db) => {
    set({ isLoading: true, error: null });

    try {
      // Fetch hunter profile
      const profiles = await db
        .select()
        .from(hunterProfile)
        .where(eq(hunterProfile.userId, userId))
        .limit(1);

      if (profiles.length === 0) {
        set({
          hunterProfile: null,
          derived: null,
          arisenShadows: [],
          isLoading: false,
          error: "Hunter profile not found",
        });
        return;
      }

      const profile = profiles[0] as HunterProfileRow;

      // Fetch arisen shadows
      const shadows = await db
        .select()
        .from(shadowArmy)
        .where(
          and(
            eq(shadowArmy.userId, userId),
            eq(shadowArmy.arisen, 1)
          )
        );

      const derived = computeDerived(profile);

      set({
        hunterProfile: profile,
        arisenShadows: shadows as ShadowArmyRow[],
        derived,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch hunter profile";
      set({ isLoading: false, error: message });
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  addXp
  // ────────────────────────────────────────────────────────────────
  addXp: async (amount, db) => {
    const { hunterProfile: currentProfile } = get();
    if (!currentProfile) return null;

    try {
      const previousRank = resolveRank(currentProfile.totalXp);
      const levelUpResult = computeLevelUps(currentProfile.totalXp, amount);
      const newRank = resolveRank(levelUpResult.newTotalXp);
      const rankChanged = previousRank !== newRank;

      const newXp = currentProfile.xp + amount;
      const newTotalXp = levelUpResult.newTotalXp;

      // Persist to database
      await db
        .update(hunterProfile)
        .set({
          xp: newXp,
          totalXp: newTotalXp,
          rank: newRank,
        })
        .where(eq(hunterProfile.userId, currentProfile.userId));

      // Update local state
      const updatedProfile: HunterProfileRow = {
        ...currentProfile,
        xp: newXp,
        totalXp: newTotalXp,
        rank: newRank,
      };

      set({
        hunterProfile: updatedProfile,
        derived: computeDerived(updatedProfile),
      });

      return {
        xpAwarded: amount,
        newTotalXp,
        previousLevel: levelUpResult.previousLevel,
        newLevel: levelUpResult.newLevel,
        levelsCrossed: levelUpResult.levelsCrossed,
        previousRank,
        newRank,
        rankChanged,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add XP";
      set({ error: message });
      return null;
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  triggerPenaltyCheck
  // ────────────────────────────────────────────────────────────────
  triggerPenaltyCheck: async (userId, db) => {
    try {
      const result = await evaluateDailyCompliance(userId, db);

      if (result.penalised) {
        // Re-fetch the profile from the DB to get the updated values
        const profiles = await db
          .select()
          .from(hunterProfile)
          .where(eq(hunterProfile.userId, userId))
          .limit(1);

        if (profiles.length > 0) {
          const updatedProfile = profiles[0] as HunterProfileRow;
          set({
            hunterProfile: updatedProfile,
            derived: computeDerived(updatedProfile),
            penaltyActive: true,
            lastComplianceResult: result,
          });
        } else {
          set({
            penaltyActive: true,
            lastComplianceResult: result,
          });
        }
      } else {
        set({
          penaltyActive: false,
          lastComplianceResult: result,
        });
      }

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to evaluate compliance";
      set({ error: message });
      return {
        penalised: false,
        xpDeducted: 0,
        streakReset: false,
        reason: null,
      };
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  ariseShadow
  // ────────────────────────────────────────────────────────────────
  ariseShadow: async (userId, shadowName, db) => {
    const { hunterProfile: currentProfile, arisenShadows } = get();
    const failResult = (error: string): AriseShadowResult => ({
      success: false,
      error,
      shadowName,
      coinsRemaining: currentProfile?.coins ?? 0,
    });

    if (!currentProfile) {
      return failResult("Hunter profile not loaded");
    }

    // 1. Validate the shadow exists in the constants registry
    const shadowDef = getShadow(shadowName);
    if (!shadowDef) {
      return failResult(`Unknown shadow: "${shadowName}"`);
    }

    // 2. Check if already arisen
    const alreadyArisen = arisenShadows.some(
      (s) => s.shadowName === shadowName
    );
    if (alreadyArisen) {
      return failResult(`${shadowDef.name} has already been arisen`);
    }

    // 3. Check bosses defeated requirement
    if (currentProfile.bossesDefeated < shadowDef.bossesRequired) {
      return failResult(
        `Requires ${shadowDef.bossesRequired} bosses defeated ` +
          `(current: ${currentProfile.bossesDefeated})`
      );
    }

    // 4. Check coin balance
    if (currentProfile.coins < shadowDef.coinsCost) {
      return failResult(
        `Insufficient coins: need ${shadowDef.coinsCost}, ` +
          `have ${currentProfile.coins}`
      );
    }

    try {
      const newCoins = currentProfile.coins - shadowDef.coinsCost;
      const today = new Date().toISOString().split("T")[0];

      // Deduct coins from hunter profile
      await db
        .update(hunterProfile)
        .set({ coins: newCoins })
        .where(eq(hunterProfile.userId, userId));

      // Insert the arisen shadow into the shadow_army table
      await db.insert(shadowArmy).values({
        userId,
        shadowName: shadowDef.key,
        arisen: 1,
        arisenDate: today,
        coinsCost: shadowDef.coinsCost,
        bossesRequired: shadowDef.bossesRequired,
      });

      // Re-fetch arisen shadows from DB for consistency
      const updatedShadows = await db
        .select()
        .from(shadowArmy)
        .where(
          and(eq(shadowArmy.userId, userId), eq(shadowArmy.arisen, 1))
        );

      // Update local state
      const updatedProfile: HunterProfileRow = {
        ...currentProfile,
        coins: newCoins,
      };

      set({
        hunterProfile: updatedProfile,
        arisenShadows: updatedShadows as ShadowArmyRow[],
        derived: computeDerived(updatedProfile),
      });

      return {
        success: true,
        error: null,
        shadowName: shadowDef.name,
        coinsRemaining: newCoins,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to arise shadow";
      set({ error: message });
      return failResult(message);
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  completeOnboarding
  // ────────────────────────────────────────────────────────────────
  completeOnboarding: async (userData, db) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Insert into users table
      const insertResult = await db.insert(users).values({
        ...userData,
        createdAt: Math.floor(Date.now() / 1000),
        awakeningShown: 1,
      }).returning({ insertedId: users.id });
      
      const newUserId = insertResult[0].insertedId;
      
      // 2. Insert into hunter_profile table with defaults
      await db.insert(hunterProfile).values({
        userId: newUserId,
        rank: 'E',
        xp: 0,
        totalXp: 0,
        coins: 0,
        streak: 0,
        bossesDefeated: 0,
      });
      
      // 3. Seed exercise dictionary (idempotent)
      await seedExercises(db);

      // 4. Generate Workout Plan
      await generateSystemPlan(
        newUserId,
        userData.fitnessGoal || 'general_fitness',
        userData.fitnessLevel || 'beginner',
        userData.equipment || 'none',
        db
      );

      // 5. Generate initial Daily Missions
      await generateDailyMissions(newUserId, db);

      // 6. Fetch the newly created profile and set state
      await get().fetchHunter(newUserId, db);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete onboarding";
      set({ isLoading: false, error: message });
      return false;
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  logWorkoutSession
  // ────────────────────────────────────────────────────────────────
  logWorkoutSession: async (sessionData, db) => {
    const { hunterProfile: currentProfile, arisenShadows } = get();
    if (!currentProfile) return false;

    set({ isLoading: true, error: null });

    try {
      // 1. Calculate total volume
      let totalVolume = 0;
      let totalPRs = 0;
      sessionData.exercises.forEach((ex) => {
        totalPRs += ex.personalRecord;
        for (let i = 0; i < ex.setsCompleted; i++) {
          totalVolume += ex.repsPerSet[i] * ex.weightPerSet[i];
        }
      });

      // 2. Determine shadow multipliers
      let shadowMultiplier = 1.0;
      arisenShadows.forEach((s) => {
        if (s.shadowName === 'kasaka') shadowMultiplier += 0.10;
        if (s.shadowName === 'igris') shadowMultiplier += 0.20;
        if (s.shadowName === 'beru') shadowMultiplier += 0.40;
      });

      // Streak multiplier
      const newStreak = currentProfile.streak + 1;
      const streakMultiplier = getStreakMultiplier(newStreak);
      const finalMultiplier = shadowMultiplier * streakMultiplier;

      // 3. Calculate XP
      const sessionXp = calculateSessionXp(
        sessionData.durationMinutes,
        totalVolume,
        totalPRs,
        finalMultiplier
      );

      // Add base + calculated session XP
      const totalXpAwarded = BASE_WORKOUT_XP + sessionXp;
      const coinsEarned =
        COIN_REWARDS.workout_complete + totalPRs * COIN_REWARDS.personal_record;

      const today = new Date().toISOString().split("T")[0];

      // 4. Insert Workout Session
      const insertedSession = await db
        .insert(workoutSessions)
        .values({
          userId: currentProfile.userId,
          planDayId: sessionData.planDayId,
          date: today,
          durationMinutes: sessionData.durationMinutes,
          xpEarned: totalXpAwarded,
          coinsEarned,
          totalVolume,
          completed: 1,
        })
        .returning({ insertedId: workoutSessions.id });

      const sessionId = insertedSession[0].insertedId;

      // 5. Batch insert exercise logs
      if (sessionData.exercises.length > 0) {
        const logsData = sessionData.exercises.map((ex) => ({
          sessionId,
          exerciseId: ex.exerciseId,
          setsCompleted: ex.setsCompleted,
          repsPerSet: JSON.stringify(ex.repsPerSet),
          weightPerSet: JSON.stringify(ex.weightPerSet),
          personalRecord: ex.personalRecord,
        }));
        await db.insert(exerciseLogs).values(logsData);
      }

      // 6. Award XP and Coins
      const levelUpResult = computeLevelUps(currentProfile.totalXp, totalXpAwarded);
      const newRank = resolveRank(levelUpResult.newTotalXp);
      const newCoins = currentProfile.coins + coinsEarned;

      await db
        .update(hunterProfile)
        .set({
          xp: currentProfile.xp + totalXpAwarded,
          totalXp: levelUpResult.newTotalXp,
          rank: newRank,
          coins: newCoins,
          streak: newStreak,
          lastWorkoutDate: today,
          lastFullyCompletedDate: today,
        })
        .where(eq(hunterProfile.userId, currentProfile.userId));

      // 7. Refetch
      await get().fetchHunter(currentProfile.userId, db);

      // 8. Sound Feedback
      if (levelUpResult.levelsCrossed.length > 0) {
        await SoundEngine.playLevelUp();
      }

      return true;
    } catch (err) {
      console.error(err);
      set({
        error: err instanceof Error ? err.message : "Failed to log workout",
        isLoading: false,
      });
      return false;
    }
  },

  // ────────────────────────────────────────────────────────────────
  //  dismissPenalty
  // ────────────────────────────────────────────────────────────────
  dismissPenalty: () => {
    set({ penaltyActive: false });
  },

  // ────────────────────────────────────────────────────────────────
  //  reset
  // ────────────────────────────────────────────────────────────────
  reset: () => {
    set({ ...INITIAL_STATE });
  },
}));
