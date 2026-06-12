/**
 * SelfGlow — System Dictionary (Exercise Seeder)
 *
 * Injects fundamental fitness exercises into the Drizzle SQLite database.
 * Ensures the system has a valid catalogue to build Workout Plans from.
 */

import { count } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { exercises } from "../schema";

export async function seedExercises(
  db: BaseSQLiteDatabase<"sync" | "async", any, any>
): Promise<void> {
  // Prevent duplicate seeding by checking if the catalogue already exists
  const [result] = await db.select({ value: count() }).from(exercises);
  if (result.value > 0) {
    console.log("[SYSTEM] Exercise dictionary already populated.");
    return;
  }

  console.log("[SYSTEM] Initializing exercise dictionary...");

  type ExerciseInsert = typeof exercises.$inferInsert;

  const exerciseCatalogue: ExerciseInsert[] = [
    // ── CHEST ────────────────────────────────────────────────────────
    {
      nameEn: "Push-ups",
      nameAr: "تمرين الضغط",
      muscleGroup: "chest",
      equipmentNeeded: "none",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 12,
    },
    {
      nameEn: "Dumbbell Bench Press",
      nameAr: "ضغط الصدر بالدمبل",
      muscleGroup: "chest",
      equipmentNeeded: "dumbbells",
      difficulty: "intermediate",
      setsDefault: 4,
      repsDefault: 10,
    },
    {
      nameEn: "Incline Dumbbell Press",
      nameAr: "ضغط الصدر المائل بالدمبل",
      muscleGroup: "chest",
      equipmentNeeded: "dumbbells",
      difficulty: "intermediate",
      setsDefault: 3,
      repsDefault: 10,
    },
    {
      nameEn: "Barbell Bench Press",
      nameAr: "ضغط الصدر بالبار",
      muscleGroup: "chest",
      equipmentNeeded: "full_gym",
      difficulty: "advanced",
      setsDefault: 4,
      repsDefault: 8,
    },

    // ── BACK ─────────────────────────────────────────────────────────
    {
      nameEn: "Pull-ups",
      nameAr: "العقلة",
      muscleGroup: "back",
      equipmentNeeded: "none",
      difficulty: "advanced",
      setsDefault: 3,
      repsDefault: 8,
    },
    {
      nameEn: "Dumbbell Rows",
      nameAr: "تجديف بالدمبل",
      muscleGroup: "back",
      equipmentNeeded: "dumbbells",
      difficulty: "intermediate",
      setsDefault: 3,
      repsDefault: 12,
    },
    {
      nameEn: "Lat Pulldown",
      nameAr: "سحب للأسفل",
      muscleGroup: "back",
      equipmentNeeded: "full_gym",
      difficulty: "beginner",
      setsDefault: 4,
      repsDefault: 12,
    },
    {
      nameEn: "Barbell Deadlift",
      nameAr: "الرفعة المميتة",
      muscleGroup: "back",
      equipmentNeeded: "full_gym",
      difficulty: "advanced",
      setsDefault: 3,
      repsDefault: 5,
    },

    // ── LEGS ─────────────────────────────────────────────────────────
    {
      nameEn: "Bodyweight Squats",
      nameAr: "قرفصاء بوزن الجسم",
      muscleGroup: "legs",
      equipmentNeeded: "none",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 15,
    },
    {
      nameEn: "Lunges",
      nameAr: "الطعنات",
      muscleGroup: "legs",
      equipmentNeeded: "none",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 12, // per leg
    },
    {
      nameEn: "Goblet Squats",
      nameAr: "قرفصاء جوبلت",
      muscleGroup: "legs",
      equipmentNeeded: "dumbbells",
      difficulty: "intermediate",
      setsDefault: 4,
      repsDefault: 10,
    },
    {
      nameEn: "Barbell Squats",
      nameAr: "قرفصاء بالبار",
      muscleGroup: "legs",
      equipmentNeeded: "full_gym",
      difficulty: "advanced",
      setsDefault: 4,
      repsDefault: 8,
    },

    // ── SHOULDERS ────────────────────────────────────────────────────
    {
      nameEn: "Pike Push-ups",
      nameAr: "ضغط بيك",
      muscleGroup: "shoulders",
      equipmentNeeded: "none",
      difficulty: "intermediate",
      setsDefault: 3,
      repsDefault: 10,
    },
    {
      nameEn: "Dumbbell Overhead Press",
      nameAr: "ضغط الكتف بالدمبل",
      muscleGroup: "shoulders",
      equipmentNeeded: "dumbbells",
      difficulty: "intermediate",
      setsDefault: 3,
      repsDefault: 10,
    },
    {
      nameEn: "Lateral Raises",
      nameAr: "رفرفة جانبية",
      muscleGroup: "shoulders",
      equipmentNeeded: "dumbbells",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 15,
    },

    // ── ARMS ─────────────────────────────────────────────────────────
    {
      nameEn: "Dumbbell Bicep Curls",
      nameAr: "بايسبس بالدمبل",
      muscleGroup: "arms",
      equipmentNeeded: "dumbbells",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 12,
    },
    {
      nameEn: "Tricep Dips",
      nameAr: "ترايسبس ديبس",
      muscleGroup: "arms",
      equipmentNeeded: "none",
      difficulty: "intermediate",
      setsDefault: 3,
      repsDefault: 10,
    },
    {
      nameEn: "Cable Tricep Pushdown",
      nameAr: "دفع الترايسبس بالكابل",
      muscleGroup: "arms",
      equipmentNeeded: "full_gym",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 15,
    },

    // ── CORE & FULLBODY ──────────────────────────────────────────────
    {
      nameEn: "Plank",
      nameAr: "البلانك",
      muscleGroup: "core",
      equipmentNeeded: "none",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 1, // interpreted as 1 minute/duration based
    },
    {
      nameEn: "Crunches",
      nameAr: "طحن البطن",
      muscleGroup: "core",
      equipmentNeeded: "none",
      difficulty: "beginner",
      setsDefault: 3,
      repsDefault: 20,
    },
    {
      nameEn: "Burpees",
      nameAr: "بيربيز",
      muscleGroup: "core", // Fullbody technically, but usually taxes core/cardio heavily
      equipmentNeeded: "none",
      difficulty: "advanced",
      setsDefault: 3,
      repsDefault: 10,
    },
  ];

  await db.insert(exercises).values(exerciseCatalogue);
  console.log(`[SYSTEM] Successfully injected ${exerciseCatalogue.length} exercises.`);
}
