import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useHunterStore } from '../src/presentation/store/useHunterStore';
import { users } from '../src/db/schema';

type UserInsert = typeof users.$inferInsert;

export default function OnboardingScreen() {
  const router = useRouter();
  const expoDb = useSQLiteContext();
  const db = drizzle(expoDb);
  const completeOnboarding = useHunterStore((state) => state.completeOnboarding);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('build_muscle');
  const [targetMuscles, setTargetMuscles] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState('beginner');
  const [equipment, setEquipment] = useState('none');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMuscle = (muscle: string) => {
    if (targetMuscles.includes(muscle)) {
      setTargetMuscles(targetMuscles.filter((m) => m !== muscle));
    } else {
      setTargetMuscles([...targetMuscles, muscle]);
    }
  };

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAwaken = async () => {
    setIsSubmitting(true);
    
    const userData: UserInsert = {
      name: name || 'Player',
      age: age ? parseInt(age, 10) : null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      fitnessGoal,
      targetMuscles: JSON.stringify(targetMuscles),
      fitnessLevel,
      equipment,
      language: 'en',
    };

    const success = await completeOnboarding(userData, db);
    setIsSubmitting(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      console.error("Onboarding failed");
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <View
            key={idx}
            style={[
              styles.stepIndicator,
              idx === step && styles.stepIndicatorActive,
              idx < step && styles.stepIndicatorCompleted,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>IDENTIFY YOURSELF</Text>
            <Text style={styles.headerSubtitle}>Enter your Hunter name.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Hunter Name"
              placeholderTextColor="#4A4D5E"
              value={name}
              onChangeText={setName}
            />
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>BASE STATS</Text>
            <Text style={styles.headerSubtitle}>Provide your physical parameters.</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Age"
              placeholderTextColor="#4A4D5E"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Weight (kg)"
              placeholderTextColor="#4A4D5E"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Height (cm)"
              placeholderTextColor="#4A4D5E"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>PRIMARY OBJECTIVE</Text>
            <Text style={styles.headerSubtitle}>What is your main goal?</Text>
            <View style={styles.cardContainer}>
              {[
                { id: 'lose_fat', label: 'Lose Weight' },
                { id: 'build_muscle', label: 'Build Muscle' },
                { id: 'improve_endurance', label: 'Endurance' },
                { id: 'general_fitness', label: 'Stay Active' },
              ].map((goal) => (
                <Pressable
                  key={goal.id}
                  style={[
                    styles.card,
                    fitnessGoal === goal.id && styles.cardActive,
                  ]}
                  onPress={() => setFitnessGoal(goal.id)}
                >
                  <Text
                    style={[
                      styles.cardText,
                      fitnessGoal === goal.id && styles.cardTextActive,
                    ]}
                  >
                    {goal.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>TARGET MUSCLES</Text>
            <Text style={styles.headerSubtitle}>Select areas to focus on.</Text>
            <View style={styles.cardContainer}>
              {['chest', 'back', 'shoulders', 'arms', 'legs', 'core'].map((muscle) => {
                const isActive = targetMuscles.includes(muscle);
                return (
                  <Pressable
                    key={muscle}
                    style={[styles.card, isActive && styles.cardActive]}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text style={[styles.cardText, isActive && styles.cardTextActive]}>
                      {muscle.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>CURRENT RANK</Text>
            <Text style={styles.headerSubtitle}>Assess your current fitness level.</Text>
            <View style={styles.cardContainer}>
              {[
                { id: 'beginner', label: 'E-Rank (Beginner)' },
                { id: 'intermediate', label: 'D-Rank (Novice)' },
                { id: 'advanced', label: 'C-Rank (Advanced)' },
              ].map((level) => (
                <Pressable
                  key={level.id}
                  style={[
                    styles.card,
                    fitnessLevel === level.id && styles.cardActive,
                  ]}
                  onPress={() => setFitnessLevel(level.id)}
                >
                  <Text
                    style={[
                      styles.cardText,
                      fitnessLevel === level.id && styles.cardTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.headerTitle}>EQUIPMENT AVAILABILITY</Text>
            <Text style={styles.headerSubtitle}>Where will you train?</Text>
            <View style={styles.cardContainer}>
              {[
                { id: 'none', label: 'Home (No Equipment)' },
                { id: 'dumbbells', label: 'Dumbbells Only' },
                { id: 'full_gym', label: 'Full Gym Access' },
              ].map((eq) => (
                <Pressable
                  key={eq.id}
                  style={[
                    styles.card,
                    equipment === eq.id && styles.cardActive,
                  ]}
                  onPress={() => setEquipment(eq.id)}
                >
                  <Text
                    style={[
                      styles.cardText,
                      equipment === eq.id && styles.cardTextActive,
                    ]}
                  >
                    {eq.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderStepIndicator()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.backButton, step === 1 && { opacity: 0 }]}
          onPress={handleBack}
          disabled={step === 1}
        >
          <Text style={styles.backButtonText}>BACK</Text>
        </Pressable>

        {step < 6 ? (
          <Pressable style={[styles.button, styles.nextButton]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>NEXT</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.button, styles.awakenButton]}
            onPress={handleAwaken}
            disabled={isSubmitting}
          >
            <Text style={styles.awakenButtonText}>
              {isSubmitting ? 'AWAKENING...' : 'AWAKEN'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
    paddingTop: 60,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  stepIndicator: {
    height: 4,
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 2,
  },
  stepIndicatorActive: {
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  stepIndicatorCompleted: {
    backgroundColor: 'rgba(0, 229, 255, 0.4)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#00E5FF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerSubtitle: {
    color: '#E6E8F0',
    fontSize: 14,
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 8,
    color: '#00E5FF',
    fontSize: 18,
    padding: 16,
    marginBottom: 16,
  },
  cardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  cardActive: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  cardText: {
    color: '#4A4D5E',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardTextActive: {
    color: '#00E5FF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#0A0C14',
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A4D5E',
  },
  backButtonText: {
    color: '#4A4D5E',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  nextButton: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  nextButtonText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  awakenButton: {
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  awakenButtonText: {
    color: '#0A0C14',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
});
