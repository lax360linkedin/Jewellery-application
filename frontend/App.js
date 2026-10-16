import React from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';
import { AppProvider } from './src/context/AppContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.outerContainer}>
        <StatusBar style="light" backgroundColor={COLORS.primaryPurple} />
        <View style={styles.phoneShell}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <ErrorBoundary>
              <AppProvider>
                <AppNavigator />
              </AppProvider>
            </ErrorBoundary>
          </SafeAreaView>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    backgroundColor: Platform.OS === 'web' ? '#0f0d19' : COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 440 : '100%',
    height: '100%',
    backgroundColor: COLORS.bgLavender,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 30,
    }),
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
});
