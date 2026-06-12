import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useHunterStore } from '../../src/presentation/store/useHunterStore';
import { SHADOW_ARMY, type ShadowSoldier } from '../../src/core/constants/solo_leveling_constants';
import { SoundEngine } from '../../src/core/utils/SoundEngine';

interface ShadowCardProps {
  shadow: ShadowSoldier;
  isArisen: boolean;
  canAfford: boolean;
  onArise: (shadowKey: string) => void;
  isArising: boolean;
}

const ShadowCard: React.FC<ShadowCardProps> = ({ shadow, isArisen, canAfford, onArise, isArising }) => {
  const pulseOpacity = useSharedValue(0.4);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!isArisen && canAfford) {
      pulseOpacity.value = withRepeat(
        withTiming(1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 0.4;
    }
  }, [isArisen, canAfford]);

  const animatedAriseBtn = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    shadowOpacity: pulseOpacity.value * 0.8,
  }));

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!isArisen && canAfford && !isArising) {
      // Scale down then up for feedback
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      onArise(shadow.key);
    }
  };

  if (isArisen) {
    // Unlocked / Arisen State
    return (
      <Animated.View style={[styles.card, styles.cardArisen, animatedCardStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.shadowNameArisen}>{shadow.name.toUpperCase()}</Text>
        </View>
        <Ionicons name="body" size={48} color="#8B5CF6" style={styles.shadowIcon} />
        <View style={styles.bonusContainer}>
          <Text style={styles.bonusLabel}>PASSIVE BONUS</Text>
          <Text style={styles.bonusText}>{shadow.bonus}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>ACTIVE</Text>
        </View>
      </Animated.View>
    );
  }

  // Locked State
  return (
    <Animated.View style={[styles.card, styles.cardLocked, animatedCardStyle]}>
      <View style={styles.cardHeader}>
        <Text style={styles.shadowNameLocked}>{shadow.name.toUpperCase()}</Text>
        <Ionicons name="lock-closed" size={16} color="#4A4D5E" />
      </View>
      <Ionicons name="body-outline" size={48} color="#4A4D5E" style={styles.shadowIconLocked} />
      
      <View style={styles.requirementsContainer}>
        <Text style={styles.requirementText}>
          <Ionicons name="server" size={12} color={canAfford ? "#00E5FF" : "#FF4444"} /> {shadow.coinsCost} Coins
        </Text>
        <Text style={styles.requirementText}>
          <Ionicons name="skull" size={12} color="#4A4D5E" /> {shadow.bossesRequired} Bosses
        </Text>
      </View>

      {canAfford ? (
        <Pressable onPress={handlePress} disabled={isArising}>
          <Animated.View style={[styles.ariseButton, animatedAriseBtn]}>
            <Text style={styles.ariseButtonText}>{isArising ? "..." : "ARISE"}</Text>
          </Animated.View>
        </Pressable>
      ) : (
        <View style={styles.lockedFooter}>
          <Text style={styles.lockedFooterText}>REQUIREMENTS NOT MET</Text>
        </View>
      )}
    </Animated.View>
  );
};

export default function ShadowArmyScreen() {
  const expoDb = useSQLiteContext();
  const db = drizzle(expoDb);
  
  const { hunterProfile, arisenShadows, ariseShadow } = useHunterStore();
  const [processingShadow, setProcessingShadow] = React.useState<string | null>(null);

  const handleArise = async (shadowKey: string) => {
    if (!hunterProfile) return;
    setProcessingShadow(shadowKey);
    const result = await ariseShadow(hunterProfile.userId, shadowKey, db);
    setProcessingShadow(null);
    if (!result.success) {
      console.warn("Arise failed:", result.error);
    } else {
      await SoundEngine.playArise();
    }
  };

  const arisenCount = arisenShadows.length;
  const totalCount = SHADOW_ARMY.length;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SHADOW ARMY</Text>
        <Text style={styles.headerSubtitle}>Arisen: {arisenCount}/{totalCount}</Text>
        
        <View style={styles.economyBar}>
          <Text style={styles.economyText}>🪙 {hunterProfile?.coins || 0} Coins</Text>
          <Text style={styles.economyText}>💀 {hunterProfile?.bossesDefeated || 0} Bosses Defeated</Text>
        </View>
      </View>

      {/* GRID */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {SHADOW_ARMY.map((shadow) => {
            const isArisen = arisenShadows.some((s) => s.shadowName === shadow.key);
            const canAfford = 
              (hunterProfile?.coins ?? 0) >= shadow.coinsCost && 
              (hunterProfile?.bossesDefeated ?? 0) >= shadow.bossesRequired;

            return (
              <View key={shadow.key} style={styles.gridItem}>
                <ShadowCard 
                  shadow={shadow} 
                  isArisen={isArisen} 
                  canAfford={canAfford}
                  onArise={handleArise}
                  isArising={processingShadow === shadow.key}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#8B5CF6',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  headerSubtitle: {
    color: '#E6E8F0',
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  economyBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(230, 232, 240, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#111827',
  },
  economyText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'space-between',
  },
  cardLocked: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
  },
  cardArisen: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  shadowNameLocked: {
    color: '#4A4D5E',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 14,
  },
  shadowNameArisen: {
    color: '#8B5CF6',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 16,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  shadowIcon: {
    opacity: 0.9,
    marginBottom: 16,
    textShadowColor: '#8B5CF6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  shadowIconLocked: {
    opacity: 0.3,
    marginBottom: 16,
  },
  requirementsContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  requirementText: {
    color: '#E6E8F0',
    fontSize: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  ariseButton: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  ariseButtonText: {
    color: '#00E5FF',
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  lockedFooter: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  lockedFooterText: {
    color: '#FF4444',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  bonusContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bonusLabel: {
    color: 'rgba(139, 92, 246, 0.6)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bonusText: {
    color: '#FFF',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  statusBadgeText: {
    color: '#0A0C14',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
