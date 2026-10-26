import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../constants/theme';
import { RootStackParamList } from './types';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { ActiveTripScreen } from '../screens/trip/ActiveTripScreen';
import { TripDetailsScreen } from '../screens/trip/TripDetailsScreen';
import { MergeOffersScreen } from '../screens/merge/MergeOffersScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: THEME.colors.background,
    card: THEME.colors.background,
    text: THEME.colors.text,
    border: THEME.colors.border,
    primary: THEME.colors.primary,
  },
};

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashIconCircle}>
          <Ionicons name="bus-outline" size={44} color={THEME.colors.primaryLight} />
        </View>
        <Text style={styles.splashTitle}>CargoXpress</Text>
        <Text style={styles.splashSubtitle}>Driver Fleet Operations</Text>
        <ActivityIndicator
          size="large"
          color={THEME.colors.primaryLight}
          style={styles.spinner}
        />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NavigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: THEME.colors.background },
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} />
            <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
            <Stack.Screen name="MergeOffers" component={MergeOffersScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  splashTitle: {
    ...THEME.typography.titleLarge,
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  splashSubtitle: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  spinner: {
    marginTop: THEME.spacing.xl,
  },
});
