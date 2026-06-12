/**
 * SelfGlow — Boss Gate Scheduler
 *
 * Determines whether a Boss Gate is currently active based on
 * a fixed interval from the player's initial awakening timestamp.
 *
 * Boss Gates trigger every 48 hours (172,800 seconds) from the
 * awakening time. Once triggered, the gate stays active for a
 * 72-hour (259,200 second) window. If the player doesn't defeat
 * the boss within that window, the gate closes and the next cycle
 * begins.
 *
 * The boss type rotates through a fixed 4-boss sequence:
 *   0 → Upper Body
 *   1 → Lower Body
 *   2 → Full Body
 *   3 → Shadow Monarch
 */

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/** Interval between Boss Gate activations (48 hours in seconds) */
const BOSS_GATE_INTERVAL_SECONDS = 172_800;

/** Duration a Boss Gate stays active once triggered (72 hours in seconds) */
const BOSS_GATE_ACTIVE_WINDOW_SECONDS = 259_200;

/** Number of distinct boss types in the rotation */
const BOSS_ROTATION_COUNT = 4;

// ═══════════════════════════════════════════════════════════════════
//  BOSS TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

export const BOSS_TYPES = [
  "Upper Body",
  "Lower Body",
  "Full Body",
  "Shadow Monarch",
] as const;

export type BossType = (typeof BOSS_TYPES)[number];

export interface BossGateInfo {
  /** The boss ID in the rotation (0–3) */
  bossId: number;
  /** Human-readable boss type name */
  bossType: BossType;
  /** Unix timestamp (seconds) when this gate opened */
  gateOpenedAt: number;
  /** Unix timestamp (seconds) when this gate expires */
  gateExpiresAt: number;
  /** Seconds remaining before the gate closes */
  secondsRemaining: number;
  /** Which cycle number this is (0-indexed, since awakening) */
  cycleNumber: number;
}

// ═══════════════════════════════════════════════════════════════════
//  CORE EVALUATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Evaluate whether a Boss Gate is currently active.
 *
 * @param awakeningUnixTime - The Unix timestamp (seconds) of the player's
 *                            initial awakening / account creation
 * @param currentUnixTime   - The current Unix timestamp (seconds)
 * @returns BossGateInfo if a gate is active, or `null` if the player
 *          is between cycles (gate has closed, next hasn't opened yet)
 */
export function evaluateBossGate(
  awakeningUnixTime: number,
  currentUnixTime: number
): BossGateInfo | null {
  // Guard: current time must be after awakening
  if (currentUnixTime < awakeningUnixTime) {
    return null;
  }

  // Elapsed seconds since the player's awakening
  const elapsed = currentUnixTime - awakeningUnixTime;

  // Determine which cycle we are in (0-indexed)
  // Each cycle begins at: awakeningTime + (cycleNumber × INTERVAL)
  const cycleNumber = Math.floor(elapsed / BOSS_GATE_INTERVAL_SECONDS);

  // When did this cycle's gate open?
  const gateOpenedAt =
    awakeningUnixTime + cycleNumber * BOSS_GATE_INTERVAL_SECONDS;

  // How many seconds since this gate opened?
  const secondsIntoGate = currentUnixTime - gateOpenedAt;

  // Check if we are still within the active window
  if (secondsIntoGate > BOSS_GATE_ACTIVE_WINDOW_SECONDS) {
    // The gate has expired — the next cycle hasn't started yet
    return null;
  }

  // Determine boss type from rotation
  const bossId = cycleNumber % BOSS_ROTATION_COUNT;
  const bossType = BOSS_TYPES[bossId];

  const gateExpiresAt = gateOpenedAt + BOSS_GATE_ACTIVE_WINDOW_SECONDS;
  const secondsRemaining = gateExpiresAt - currentUnixTime;

  return {
    bossId,
    bossType,
    gateOpenedAt,
    gateExpiresAt,
    secondsRemaining: Math.max(0, secondsRemaining),
    cycleNumber,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  HELPER — Next Gate Timestamp
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate when the next Boss Gate will open.
 * Useful for displaying a countdown timer in the UI.
 *
 * @param awakeningUnixTime - The Unix timestamp (seconds) of awakening
 * @param currentUnixTime   - The current Unix timestamp (seconds)
 * @returns Unix timestamp (seconds) of the next gate opening
 */
export function getNextBossGateTime(
  awakeningUnixTime: number,
  currentUnixTime: number
): number {
  if (currentUnixTime < awakeningUnixTime) {
    return awakeningUnixTime;
  }

  const elapsed = currentUnixTime - awakeningUnixTime;
  const currentCycle = Math.floor(elapsed / BOSS_GATE_INTERVAL_SECONDS);
  const currentGateOpened =
    awakeningUnixTime + currentCycle * BOSS_GATE_INTERVAL_SECONDS;
  const secondsIntoGate = currentUnixTime - currentGateOpened;

  // If we're within the active window, the "current" gate is still open
  // The "next" gate is the one after that
  if (secondsIntoGate <= BOSS_GATE_ACTIVE_WINDOW_SECONDS) {
    return (
      awakeningUnixTime + (currentCycle + 1) * BOSS_GATE_INTERVAL_SECONDS
    );
  }

  // Gate has expired, so the next cycle is the next gate
  return (
    awakeningUnixTime + (currentCycle + 1) * BOSS_GATE_INTERVAL_SECONDS
  );
}

/**
 * Format a number of seconds into a human-readable countdown string.
 * e.g. 90061 → "25h 1m 1s"
 *
 * @param totalSeconds - Number of seconds remaining
 * @returns Formatted countdown string
 */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}
