import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { db } from '../src/db/client';
import migrations from '../drizzle/migrations';
import { PenaltyOverlay } from '../src/presentation/components/PenaltyOverlay';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (error) {
      console.error('Migration failed: ', error);
    }
  }, [error]);

  if (!success) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#00E5FF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0C14' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <PenaltyOverlay />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C14',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0C14',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
