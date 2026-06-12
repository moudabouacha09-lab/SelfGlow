import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

import { useHunterStore, type SessionPayload } from '../../src/presentation/store/useHunterStore';
import { SoundEngine } from '../../src/core/utils/SoundEngine';

export default function WorkoutScreen() {
  const router = useRouter();
  const expoDb = useSQLiteContext();
  const db = drizzle(expoDb);
  const { logWorkoutSession } = useHunterStore();

  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('60');

  // Combat State
  const [startTime] = useState<number>(Date.now());
  const [setsLog, setSetsLog] = useState<{ reps: number; weight: number }[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(60);
  const [isDanger, setIsDanger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const holdProgress = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  // ── TIMER LOGIC ──────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isResting && restTime > 0) {
      interval = setInterval(() => {
        setRestTime((prev) => {
          if (prev <= 6 && !isDanger) {
            setIsDanger(true);
            Vibration.vibrate([0, 500, 200, 500]); // intense vibration
            pulseOpacity.value = withRepeat(
              withSequence(
                withTiming(0.4, { duration: 250 }),
                withTiming(1, { duration: 250 })
              ),
              -1,
              true
            );
          }
          return prev - 1;
        });
      }, 1000);
    } else if (restTime === 0) {
      setIsResting(false);
      setIsDanger(false);
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = 1;
    }
    return () => clearInterval(interval);
  }, [isResting, restTime, isDanger]);

  // ── LONG PRESS TO LOG SET ────────────────────────────────────────
  const handlePressIn = () => {
    if (isResting) return;
    holdProgress.value = withTiming(1, {
      duration: 2000,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const handlePressOut = () => {
    if (isResting) return;
    holdProgress.value = withTiming(0, { duration: 300 });
  };

  const handleLongPress = async () => {
    if (isResting) return;
    
    // Log the set
    setSetsLog((prev) => [...prev, { reps: parseInt(reps, 10) || 0, weight: parseFloat(weight) || 0 }]);
    
    // Play sound and haptics
    await SoundEngine.playHeavyConfirm();
    
    // Trigger rest
    Vibration.vibrate(100);
    holdProgress.value = 0;
    setRestTime(60);
    setIsResting(true);
    setIsDanger(false);
  };

  const holdBarStyle = useAnimatedStyle(() => {
    return {
      width: `${holdProgress.value * 100}%`,
      opacity: holdProgress.value > 0 ? 1 : 0,
    };
  });

  const timerColor = isDanger ? '#FF4444' : '#00E5FF';

  // ── FINISH WORKOUT ───────────────────────────────────────────────
  const handleFinishWorkout = async () => {
    setIsSubmitting(true);
    
    const durationMinutes = Math.max(1, Math.floor((Date.now() - startTime) / 60000));
    
    // We'll map the sets to a specific mock exercise (e.g. ID 2 = Dumbbell Bench Press)
    const sessionData: SessionPayload = {
      durationMinutes,
      exercises: [],
    };

    if (setsLog.length > 0) {
      sessionData.exercises.push({
        exerciseId: 2, // Map to DB ID 2
        setsCompleted: setsLog.length,
        repsPerSet: setsLog.map(s => s.reps),
        weightPerSet: setsLog.map(s => s.weight),
        personalRecord: 0,
      });
    }

    const success = await logWorkoutSession(sessionData, db);
    setIsSubmitting(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      console.error("Failed to log workout.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACTIVE COMBAT</Text>
        <Text style={styles.subtitle}>Current Target: Chest (Bench Press)</Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>Sets Logged: {setsLog.length}</Text>
        <Text style={styles.statText}>
          Duration: {Math.floor((Date.now() - startTime) / 60000)}m
        </Text>
      </View>

      {/* REST TIMER OR INPUTS */}
      {isResting ? (
        <Animated.View style={[styles.timerContainer, { opacity: pulseOpacity }]}>
          <View style={[styles.timerCircle, { borderColor: timerColor, shadowColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor, textShadowColor: timerColor }]}>
              {restTime}s
            </Text>
            <Text style={[styles.restLabel, { color: timerColor }]}>RESTING</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.inputSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>REPS</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={reps}
              onChangeText={setReps}
              placeholderTextColor="#4A4D5E"
            />
          </View>
          <Text style={styles.multiplyIcon}>×</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor="#4A4D5E"
            />
          </View>
        </View>
      )}

      <View style={{ flex: 1 }} />

      {/* HARDCORE LOG BUTTON */}
      <View style={styles.actionContainer}>
        {!isResting && (
          <Text style={styles.hintText}>HOLD TO LOG SET</Text>
        )}
        <Pressable
          style={[styles.logButton, isResting && styles.logButtonDisabled]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={handleLongPress}
          delayLongPress={2000}
          disabled={isResting || isSubmitting}
        >
          <View style={styles.logButtonBackground}>
            <Animated.View style={[styles.logButtonProgress, holdBarStyle]} />
          </View>
          <Text style={styles.logButtonText}>
            {isResting ? 'RECOVERING...' : 'CONFIRM STRIKE'}
          </Text>
        </Pressable>
      </View>

      {/* FINISH WORKOUT BUTTON */}
      <View style={styles.finishContainer}>
        <Pressable 
          style={styles.finishButton} 
          onPress={handleFinishWorkout}
          disabled={isSubmitting}
        >
          <Text style={styles.finishButtonText}>
            {isSubmitting ? 'EXTRACTING...' : 'FINISH WORKOUT'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#00E5FF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#E6E8F0',
    fontSize: 14,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  inputSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  input: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  multiplyIcon: {
    color: '#4A4D5E',
    fontSize: 32,
    marginHorizontal: 16,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  restLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 8,
  },
  actionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  hintText: {
    color: '#4A4D5E',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 12,
  },
  logButton: {
    width: '100%',
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  logButtonDisabled: {
    borderColor: '#4A4D5E',
    opacity: 0.5,
  },
  logButtonBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#111827',
  },
  logButtonProgress: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00E5FF',
    opacity: 0.8,
  },
  logButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    zIndex: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  finishContainer: {
    width: '100%',
  },
  finishButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#0A0C14',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 14,
  },
});
