/**
 * SelfGlow — Solo Leveling Fitness RPG
 * Complete Drizzle ORM SQLite Schema
 *
 * 10 tables defining the full relational data model:
 *   users, hunter_profile, exercises, workout_plans, plan_days,
 *   workout_sessions, exercise_logs, personal_records,
 *   daily_missions, shadow_army
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════
//  1. USERS — Core player identity & onboarding data
// ═══════════════════════════════════════════════════════════════════

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  age: integer("age"),
  weight: real("weight"),
  height: real("height"),
  fitnessGoal: text("fitness_goal"),
  /** JSON-encoded array of target muscle group strings, e.g. '["chest","back"]' */
  targetMuscles: text("target_muscles"),
  /** One of: 'beginner' | 'intermediate' | 'advanced' */
  fitnessLevel: text("fitness_level"),
  /** One of: 'none' | 'dumbbells' | 'full_gym' | 'resistance_bands' */
  equipment: text("equipment"),
  language: text("language").default("ar").notNull(),
  /** Unix epoch timestamp (seconds) */
  createdAt: integer("created_at"),
  /** 0 = false, 1 = true — has the player seen the awakening cinematic */
  awakeningShown: integer("awakening_shown").default(0).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  2. HUNTER PROFILE — RPG progression layer tied to a user
// ═══════════════════════════════════════════════════════════════════

export const hunterProfile = sqliteTable("hunter_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  /** Current rank: E → D → C → B → A → S → SS → SSS */
  rank: text("rank").default("E").notNull(),
  /** XP within the current rank bracket */
  xp: integer("xp").default(0).notNull(),
  /** Lifetime accumulated XP (never decreases) */
  totalXp: integer("total_xp").default(0).notNull(),
  /** In-game currency */
  coins: integer("coins").default(0).notNull(),
  /** Consecutive workout-day streak */
  streak: integer("streak").default(0).notNull(),
  /** ISO 8601 date string of last completed workout */
  lastWorkoutDate: text("last_workout_date"),
  /** ISO 8601 date string of last penalty applied */
  lastPenaltyDate: text("last_penalty_date"),
  /** ISO 8601 date string of last day with ALL exercises fully completed */
  lastFullyCompletedDate: text("last_fully_completed_date"),
  /** Total bosses defeated lifetime */
  bossesDefeated: integer("bosses_defeated").default(0).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  3. EXERCISES — Master exercise catalogue
// ═══════════════════════════════════════════════════════════════════

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  /** e.g. 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' */
  muscleGroup: text("muscle_group").notNull(),
  /** e.g. 'none' | 'dumbbells' | 'barbell' | 'machine' | 'cable' */
  equipmentNeeded: text("equipment_needed"),
  /** 'beginner' | 'intermediate' | 'advanced' */
  difficulty: text("difficulty"),
  setsDefault: integer("sets_default"),
  repsDefault: integer("reps_default"),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  videoUrl: text("video_url"),
});

// ═══════════════════════════════════════════════════════════════════
//  4. WORKOUT PLANS — Generated multi-day training programmes
// ═══════════════════════════════════════════════════════════════════

export const workoutPlans = sqliteTable("workout_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  daysPerWeek: integer("days_per_week").notNull(),
  equipment: text("equipment"),
  goal: text("goal"),
  /** Unix epoch timestamp (seconds) */
  generatedAt: integer("generated_at"),
  /** 0 = inactive, 1 = active */
  isActive: integer("is_active").default(1).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  5. PLAN DAYS — Individual training day within a plan
// ═══════════════════════════════════════════════════════════════════

export const planDays = sqliteTable("plan_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: integer("plan_id")
    .references(() => workoutPlans.id, { onDelete: "cascade" })
    .notNull(),
  /** 1 = Monday … 7 = Sunday */
  dayOfWeek: integer("day_of_week").notNull(),
  /** Primary muscle focus for this day, e.g. 'chest_triceps' */
  muscleFocus: text("muscle_focus"),
  /**
   * JSON payload: array of exercise assignments
   * e.g. '[{"exerciseId":1,"sets":4,"reps":12},...]'
   */
  exercises: text("exercises"),
});

// ═══════════════════════════════════════════════════════════════════
//  6. WORKOUT SESSIONS — A single training session instance
// ═══════════════════════════════════════════════════════════════════

export const workoutSessions = sqliteTable("workout_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  planDayId: integer("plan_day_id").references(() => planDays.id),
  /** ISO 8601 date string */
  date: text("date").notNull(),
  durationMinutes: integer("duration_minutes"),
  xpEarned: integer("xp_earned"),
  coinsEarned: integer("coins_earned"),
  /** Total volume moved (sets × reps × weight) */
  totalVolume: real("total_volume"),
  /** 0 = in progress, 1 = completed */
  completed: integer("completed").default(0).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  7. EXERCISE LOGS — Per-exercise performance within a session
// ═══════════════════════════════════════════════════════════════════

export const exerciseLogs = sqliteTable("exercise_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id")
    .references(() => workoutSessions.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id)
    .notNull(),
  setsCompleted: integer("sets_completed"),
  /** JSON array of reps per set, e.g. '[12,10,8,6]' */
  repsPerSet: text("reps_per_set"),
  /** JSON array of weight per set in kg, e.g. '[40,45,50,55]' */
  weightPerSet: text("weight_per_set"),
  /** 0 = no PR, 1 = new personal record achieved */
  personalRecord: integer("personal_record").default(0).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  8. PERSONAL RECORDS — All-time bests per exercise per user
// ═══════════════════════════════════════════════════════════════════

export const personalRecords = sqliteTable("personal_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  exerciseId: integer("exercise_id")
    .references(() => exercises.id)
    .notNull(),
  bestWeight: real("best_weight"),
  bestReps: integer("best_reps"),
  /** best single-set volume = weight × reps */
  bestVolume: real("best_volume"),
  /** ISO 8601 date string */
  achievedDate: text("achieved_date"),
});

// ═══════════════════════════════════════════════════════════════════
//  9. DAILY MISSIONS — Time-limited challenge quests
// ═══════════════════════════════════════════════════════════════════

export const dailyMissions = sqliteTable("daily_missions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  /** ISO 8601 date string */
  date: text("date").notNull(),
  titleAr: text("title_ar"),
  titleEn: text("title_en"),
  xpReward: integer("xp_reward"),
  coinsReward: integer("coins_reward"),
  /** 0 = incomplete, 1 = completed */
  completed: integer("completed").default(0).notNull(),
  /** 0 = not yet awarded, 1 = XP has been credited to the profile */
  xpAwarded: integer("xp_awarded").default(0).notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  10. SHADOW ARMY — Collectible shadow soldiers with passive bonuses
// ═══════════════════════════════════════════════════════════════════

export const shadowArmy = sqliteTable("shadow_army", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  shadowName: text("shadow_name").notNull(),
  /** 0 = locked, 1 = arisen / unlocked */
  arisen: integer("arisen").default(0).notNull(),
  /** ISO 8601 date string of when the shadow was arisen */
  arisenDate: text("arisen_date"),
  /** Cost in coins to arise this shadow */
  coinsCost: integer("coins_cost").notNull(),
  /** Number of bosses required to be eligible */
  bossesRequired: integer("bosses_required").notNull(),
});

// ═══════════════════════════════════════════════════════════════════
//  RELATIONS — Drizzle relational query helpers
// ═══════════════════════════════════════════════════════════════════

export const usersRelations = relations(users, ({ one, many }) => ({
  hunterProfile: one(hunterProfile, {
    fields: [users.id],
    references: [hunterProfile.userId],
  }),
  workoutPlans: many(workoutPlans),
  workoutSessions: many(workoutSessions),
  personalRecords: many(personalRecords),
  dailyMissions: many(dailyMissions),
  shadowArmy: many(shadowArmy),
}));

export const hunterProfileRelations = relations(hunterProfile, ({ one }) => ({
  user: one(users, {
    fields: [hunterProfile.userId],
    references: [users.id],
  }),
}));

export const workoutPlansRelations = relations(
  workoutPlans,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutPlans.userId],
      references: [users.id],
    }),
    planDays: many(planDays),
  })
);

export const planDaysRelations = relations(planDays, ({ one }) => ({
  workoutPlan: one(workoutPlans, {
    fields: [planDays.planId],
    references: [workoutPlans.id],
  }),
}));

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    planDay: one(planDays, {
      fields: [workoutSessions.planDayId],
      references: [planDays.id],
    }),
    exerciseLogs: many(exerciseLogs),
  })
);

export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [exerciseLogs.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(exercises, {
    fields: [exerciseLogs.exerciseId],
    references: [exercises.id],
  }),
}));

export const personalRecordsRelations = relations(
  personalRecords,
  ({ one }) => ({
    user: one(users, {
      fields: [personalRecords.userId],
      references: [users.id],
    }),
    exercise: one(exercises, {
      fields: [personalRecords.exerciseId],
      references: [exercises.id],
    }),
  })
);

export const dailyMissionsRelations = relations(dailyMissions, ({ one }) => ({
  user: one(users, {
    fields: [dailyMissions.userId],
    references: [users.id],
  }),
}));

export const shadowArmyRelations = relations(shadowArmy, ({ one }) => ({
  user: one(users, {
    fields: [shadowArmy.userId],
    references: [users.id],
  }),
}));
