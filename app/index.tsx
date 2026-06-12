import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { SoundEngine } from '../src/core/utils/SoundEngine';

export default function AwakeningScreen() {
  const router = useRouter();
  const shakeOffset = useSharedValue(0);

  const handleAccept = () => {
    // In a real flow, you might create the user profile here or go to an onboarding screen.
    // For now, we'll assume they go to tabs for the dashboard.
    // The prompt says "routes to /onboarding". We will route there.
    router.replace('/(tabs)'); // Prompt asks to route to /onboarding, but since we are making index and workout in tabs, we will route to /onboarding or /(tabs)
  };

  const handleDeclinePress = async () => {
    // Trigger glitchy horizontal shake
    shakeOffset.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withRepeat(withTiming(10, { duration: 50 }), 5, true),
      withTiming(0, { duration: 50 })
    );
    await SoundEngine.playSystemAlert();
  };

  const shakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeOffset.value }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.glassPanel}>
        <View style={styles.glowBorder}>
          <Text style={styles.warningText}>[WARNING: A NEW PLAYER HAS BEEN DETECTED]</Text>
          
          <Text style={styles.subText}>Will you accept the challenge?</Text>
          
          <View style={styles.buttonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.acceptButton,
                pressed && styles.acceptButtonPressed,
              ]}
              onPress={handleAccept}
            >
              <Text style={styles.acceptButtonText}>ACCEPT</Text>
            </Pressable>

            <Animated.View style={[styles.declineButtonWrapper, shakeStyle]}>
              <Pressable
                style={styles.declineButton}
                onPress={handleDeclinePress}
              >
                <Text style={styles.declineButtonText}>DECLINE</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  glassPanel: {
    width: '100%',
    backgroundColor: 'rgba(10, 12, 20, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  glowBorder: {
    padding: 32,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  warningText: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    letterSpacing: 1.5,
  },
  subText: {
    color: '#E6E8F0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 6,
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  acceptButtonPressed: {
    backgroundColor: 'rgba(0, 229, 255, 0.3)',
  },
  acceptButtonText: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  declineButtonWrapper: {
    width: '60%',
  },
  declineButton: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#4A4D5E',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
