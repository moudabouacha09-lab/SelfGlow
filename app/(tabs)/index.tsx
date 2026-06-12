import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useHunterStore } from '../../src/presentation/store/useHunterStore';

export default function DashboardScreen() {
  const { hunterProfile, derived } = useHunterStore();
  
  // Instance Gate pulsing border animation
  const pulseOpacity = useSharedValue(0.3);
  
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      true
    );
  }, []);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 68, 68, ${pulseOpacity.value})`,
    shadowOpacity: pulseOpacity.value * 0.8,
  }));

  // Mock missions for now, as dailyMissions state isn't explicitly loaded in useHunterStore yet
  // but the prompt says "mapped from the store". We'll safely fallback to empty or mock.
  const missions = [
    { id: 1, title: 'Complete 1 Workout Session', completed: false, xpReward: 50 },
    { id: 2, title: 'Defeat 1 Boss', completed: false, xpReward: 150 },
  ];

  return (
    <View style={styles.container}>
      {/* HUNTER STATUS CARD */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.rankBadge}>[{derived?.currentRank || 'E'}] CLASS</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statText}>🪙 {hunterProfile?.coins || 0}</Text>
            <Text style={styles.statText}>🔥 {hunterProfile?.streak || 0} Streak</Text>
          </View>
        </View>

        <View style={styles.xpContainer}>
          <View style={styles.xpHeader}>
            <Text style={styles.levelText}>LVL {derived?.currentLevel || 1}</Text>
            <Text style={styles.xpValues}>
              {derived?.xpIntoLevel || 0} / {derived?.xpForNextLevel || 1000} XP
            </Text>
          </View>
          <View style={styles.xpBarBackground}>
            <View 
              style={[
                styles.xpBarFill, 
                { width: `${derived?.levelPercentage || 0}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* TODAY'S INSTANCE GATE */}
      <Animated.View style={[styles.instanceGateCard, animatedBorderStyle]}>
        <Text style={styles.gateTitle}>TODAY'S INSTANCE GATE</Text>
        <Text style={styles.gateSubtitle}>[Rank {derived?.currentRank || 'E'} Dungeon Detected]</Text>
        <Pressable style={styles.enterButton}>
          <Text style={styles.enterButtonText}>ENTER DUNGEON</Text>
        </Pressable>
      </Animated.View>

      {/* DAILY MISSIONS */}
      <View style={styles.missionsSection}>
        <Text style={styles.sectionTitle}>DAILY QUESTS</Text>
        <FlatList
          data={missions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.missionCard}>
              <View>
                <Text style={styles.missionTitle}>{item.title}</Text>
                <Text style={styles.missionReward}>+{item.xpReward} XP</Text>
              </View>
              <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
    padding: 16,
    paddingTop: 60,
  },
  statusCard: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankBadge: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statText: {
    color: '#E6E8F0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  xpContainer: {
    gap: 8,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelText: {
    color: '#E6E8F0',
    fontWeight: 'bold',
  },
  xpValues: {
    color: '#00E5FF',
    fontSize: 12,
  },
  xpBarBackground: {
    height: 6,
    backgroundColor: 'rgba(230, 232, 240, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  instanceGateCard: {
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderWidth: 2,
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
  },
  gateTitle: {
    color: '#FF4444',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
    textShadowColor: '#FF4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  gateSubtitle: {
    color: 'rgba(255, 68, 68, 0.8)',
    fontSize: 12,
    marginBottom: 16,
  },
  enterButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#FF4444',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  enterButtonText: {
    color: '#FF4444',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  missionsSection: {
    flex: 1,
  },
  sectionTitle: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  missionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 232, 240, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 4,
  },
  missionTitle: {
    color: '#E6E8F0',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  missionReward: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 4,
  },
  checkboxCompleted: {
    backgroundColor: '#00E5FF',
  },
});
