import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

/**
 * SelfGlow — Sound & Haptics Engine
 *
 * Immersive sensory feedback mapped to Solo Leveling aesthetic.
 * Currently uses Haptics predominantly while Audio `.mp3` assets are placeholders.
 */
class SoundEngineManager {
  /**
   * Used for system alerts, warnings, and the Awakening decline glitch.
   */
  async playSystemAlert() {
    try {
      if (__DEV__) console.log('[SoundEngine] Playing: system_alert_blip.mp3');
    } catch (e) {
      console.error(e);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  /**
   * Used for heavy confirmations like the "CONFIRM STRIKE" 2-second hold.
   */
  async playHeavyConfirm() {
    try {
      if (__DEV__) console.log('[SoundEngine] Playing: heavy_thud.mp3');
    } catch (e) {
      console.error(e);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Used when successfully unlocking/arising a Shadow Soldier.
   */
  async playArise() {
    try {
      if (__DEV__) console.log('[SoundEngine] Playing: magical_arise_synth.mp3');
    } catch (e) {
      console.error(e);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  /**
   * Used when the XP Engine detects a Level Up or Rank Up.
   */
  async playLevelUp() {
    try {
      if (__DEV__) console.log('[SoundEngine] Playing: level_up_chime.mp3');
    } catch (e) {
      console.error(e);
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  }
}

export const SoundEngine = new SoundEngineManager();
