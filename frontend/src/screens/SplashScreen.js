import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants/theme';

export default function SplashScreen({ navigation }) {
  const { currentUser, isAuthLoading, hasSkippedProfile } = useApp();

  useEffect(() => {
    if (isAuthLoading) return;

    const timer = setTimeout(() => {
      if (currentUser && currentUser.isAuthenticated) {
        if (!currentUser.profileCompleted && !hasSkippedProfile) {
          navigation.replace('CreateProfile', { mode: 'create', source: 'signup', fromScreen: 'signup' });
        } else {
          navigation.replace('Home');
        }
      } else {
        navigation.replace('SignIn');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentUser, isAuthLoading, hasSkippedProfile, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>SJ</Text>
        </View>
        <Text style={styles.brandTitle}>SJ JEWELERS</Text>
        <Text style={styles.brandSubtitle}>22K GOLD & 99.9% SILVER VAULT</Text>
      </View>
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.yellowAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoLetter: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1e1b2e',
    letterSpacing: -1,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
  },
});
