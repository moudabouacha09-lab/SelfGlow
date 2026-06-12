/**
 * SelfGlow — System Architect (Workout & Quest Generator)
 *
 * Automatically generates customized multi-day workout plans
 * and assigns daily missions based on the Hunter's current stats.
 */

import { eq, inArray } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { exercises, workoutPlans, planDays, dailyMissions } from "../../db/schema";

/**
 * Determine training frequency based on fitness level.
 */
function getDaysPerWeek(level: string): number {
  switch (level) {
    case "beginner":
      return 3;
    case "intermediate":
      return 4;
    case "advanced":
      return 5;
    default:
      return 3;
  }
}

/**
 * Map the user's equipment choice to an array of valid equipment requirements.
 */
function getValidEquipment(userEquipment: string): string[] {
  switch (userEquipment) {
    case "none":
      return ["none"];
    case "dumbbells":
    case "resistance_bands":
      // Can do bodyweight + dumbbell/band exercises
      return ["none", "dumbbells", "resistance_bands"];
    case "full_gym":
      // Can do everything
      return ["none", "dumbbells", "resistance_bands", "full_gym", "barbell", "machine", "cable"];
    default:
      return ["none"];
  }
}

/**
 * Generate a personalized multi-day system plan.
 */
export async function generateSystemPlan(
  userId: number,
  userGoal: string,
  userLevel: string,
  userEquipment: string,
  db: BaseSQLiteDatabase<"sync" | "async", any, any>
): Promise<void> {
  const daysPerWeek = getDaysPerWeek(userLevel);
  const validEquipment = getValidEquipment(userEquipment);

  // 1. Query valid exercises from the seed dictionary
  const availableExercises = await db
    .select()
    .from(exercises)
    .where(inArray(exercises.equipmentNeeded, validEquipment));

  if (availableExercises.length === 0) {
    console.warn(`[SYSTEM] No valid exercises found for equipment: ${userEquipment}`);
    return;
  }

  // Group exercises by muscle group for distribution
  const groupedExercises: Record<string, typeof availableExercises> = {
    chest: [],
    back: [],
    legs: [],
    shoulders: [],
    arms: [],
    core: [],
  };

  for (const ex of availableExercises) {
    if (groupedExercises[ex.muscleGroup]) {
      groupedExercises[ex.muscleGroup].push(ex);
    } else {
      // Fallback
      groupedExercises["core"].push(ex);
    }
  }

  // Helper to grab a random exercise from a group
  const getRandomEx = (group: string) => {
    const arr = groupedExercises[group];
    if (!arr || arr.length === 0) {
      // Fallback to whatever is available
      return availableExercises[Math.floor(Math.random() * availableExercises.length)];
    }
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // 2. Create the master Workout Plan entry
  const planName = `${userLevel.toUpperCase()} PROTOCOL: ${userGoal.replace('_', ' ').toUpperCase()}`;
  const insertedPlan = await db.insert(workoutPlans).values({
    userId,
    name: planName,
    daysPerWeek,
    equipment: userEquipment,
    goal: userGoal,
    generatedAt: Math.floor(Date.now() / 1000),
    isActive: 1,
  }).returning({ insertedId: workoutPlans.id });

  const planId = insertedPlan[0].insertedId;

  // 3. Generate the Plan Days
  // Basic distribution logic for MVP
  const dayRoutines = [
    { dow: 1, focus: "chest_triceps", muscles: ["chest", "arms", "chest", "core"] },
    { dow: 3, focus: "back_biceps", muscles: ["back", "arms", "back", "core"] },
    { dow: 5, focus: "legs_shoulders", muscles: ["legs", "shoulders", "legs", "core"] },
    { dow: 2, focus: "full_body", muscles: ["chest", "back", "legs", "shoulders"] },
    { dow: 4, focus: "core_cardio", muscles: ["core", "core", "arms", "legs"] },
  ];

  const planDaysData = [];

  for (let i = 0; i < daysPerWeek; i++) {
    const routine = dayRoutines[i % dayRoutines.length];
    
    // Pick specific exercises for this day
    const dayExercises = routine.muscles.map((muscle) => {
      const ex = getRandomEx(muscle);
      return {
        exerciseId: ex.id,
        sets: ex.setsDefault || 3,
        reps: ex.repsDefault || 10,
      };
    });

    planDaysData.push({
      planId,
      dayOfWeek: routine.dow, // 1 = Monday, etc.
      muscleFocus: routine.focus,
      exercises: JSON.stringify(dayExercises),
    });
  }

  await db.insert(planDays).values(planDaysData);
  console.log(`[SYSTEM] Workout Plan generated for Player ID: ${userId}`);
}

/**
 * Generate 3 random daily missions for the user.
 */
export async function generateDailyMissions(
  userId: number,
  db: BaseSQLiteDatabase<"sync" | "async", any, any>
): Promise<void> {
  const sideQuests = [
    { titleEn: "Drink 2L Water", titleAr: "شرب 2 لتر من الماء", xpReward: 30, coinsReward: 10 },
    { titleEn: "10,000 Steps", titleAr: "10,000 خطوة", xpReward: 50, coinsReward: 20 },
    { titleEn: "Stretch for 10 mins", titleAr: "إطالة لمدة 10 دقائق", xpReward: 20, coinsReward: 5 },
    { titleEn: "Sleep 8 Hours", titleAr: "نوم 8 ساعات", xpReward: 40, coinsReward: 15 },
    { titleEn: "Avoid Sugar Today", titleAr: "تجنب السكر اليوم", xpReward: 50, coinsReward: 20 },
  ];

  // Shuffle and pick 3
  const shuffled = sideQuests.sort(() => 0.5 - Math.random());
  const selectedQuests = shuffled.slice(0, 3);

  const todayIso = new Date().toISOString().split("T")[0];

  const missionsData = selectedQuests.map((quest) => ({
    userId,
    date: todayIso,
    titleEn: quest.titleEn,
    titleAr: quest.titleAr,
    xpReward: quest.xpReward,
    coinsReward: quest.coinsReward,
    completed: 0,
    xpAwarded: 0,
  }));

  await db.insert(dailyMissions).values(missionsData);
  console.log(`[SYSTEM] Daily missions deployed for Player ID: ${userId}`);
}
