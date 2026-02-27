import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './src/hooks/useAuth';
import LoginScreen from './src/components/auth/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import GlobalErrorBoundary from './src/components/common/GlobalErrorBoundary';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import * as Notifications from 'expo-notifications';

// Create a client
const queryClient = new QueryClient();

// Custom theme matching web app colors
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32', // Green from web app
    secondary: '#8D6E63', // Brown
    tertiary: '#FFB74D', // Gold
    error: '#f44336',
    primaryContainer: '#C8E6C9',
    secondaryContainer: '#D7CCC8',
  },
};

import { initDatabase } from './src/services/database';
import { useEffect } from 'react';

function AppContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    initDatabase();
    registerForPushNotificationsAsync().then(token => {
      // Logic to save token to user profile can go here later
      console.log('Push token:', token);
    });

    const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      {user ? <MainNavigator /> : <LoginScreen />}
    </>
  );
}

import { FamilyProvider } from './src/context/FamilyContext';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <GlobalErrorBoundary>
          <FamilyProvider>
            <AppContent />
          </FamilyProvider>
        </GlobalErrorBoundary>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
