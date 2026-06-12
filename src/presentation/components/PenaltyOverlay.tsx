import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useHunterStore } from '../store/useHunterStore';
import { SoundEngine } from '../../core/utils/SoundEngine';

export function PenaltyOverlay() {
  const penaltyActive = useHunterStore((state) => state.penaltyActive);
  const dismissPenalty = useHunterStore((state) => state.dismissPenalty);
  const lastComplianceResult = useHunterStore((state) => state.lastComplianceResult);
  
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (penaltyActive) {
      SoundEngine.playSystemAlert();
      setCountdown(3);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [penaltyActive]);

  if (!penaltyActive) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dialog}>
        <Text style={styles.title}>[PENALTY TRIGGERED]</Text>
        <Text style={styles.message}>
          {lastComplianceResult?.reason || 'Daily compliance failed.'}
        </Text>
        <Text style={styles.subMessage}>
          Streak reset to 0. XP deducted.
        </Text>

        <View style={styles.buttonContainer}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Dismiss in {countdown}s</Text>
          ) : (
            <Pressable
              style={styles.button}
              onPress={dismissPenalty}
              android_ripple={{ color: '#ffaaaa' }}
            >
              <Text style={styles.buttonText}>ACKNOWLEDGE</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 68, 68, 0.85)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#0A0C14',
    padding: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF4444',
    width: '85%',
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
  },
  title: {
    color: '#FF4444',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
  },
  message: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subMessage: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  countdownText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#0A0C14',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
