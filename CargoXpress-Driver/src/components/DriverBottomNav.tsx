import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { AppNavigationProp } from '../navigation/types';

interface DriverBottomNavProps {
  currentScreen: 'Dashboard' | 'ActiveTrip' | 'MergeOffers' | 'Profile';
  pendingOffersCount?: number;
}

export const DriverBottomNav: React.FC<DriverBottomNavProps> = ({
  currentScreen,
  pendingOffersCount = 0,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();

  const navItems: Array<{
    screen: 'Dashboard' | 'ActiveTrip' | 'MergeOffers' | 'Profile';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeCount?: number;
  }> = [
    {
      screen: 'Dashboard',
      label: 'Cockpit',
      icon: currentScreen === 'Dashboard' ? 'speedometer' : 'speedometer-outline',
    },
    {
      screen: 'ActiveTrip',
      label: 'Route',
      icon: currentScreen === 'ActiveTrip' ? 'map' : 'map-outline',
    },
    {
      screen: 'MergeOffers',
      label: 'Merges',
      icon: currentScreen === 'MergeOffers' ? 'git-merge' : 'git-merge-outline',
      badgeCount: pendingOffersCount,
    },
    {
      screen: 'Profile',
      label: 'Profile',
      icon: currentScreen === 'Profile' ? 'person' : 'person-outline',
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.barInner}>
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <TouchableOpacity
              key={item.screen}
              style={styles.navButton}
              activeOpacity={0.7}
              onPress={() => {
                if (!isActive) {
                  navigation.navigate(item.screen);
                }
              }}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={isActive ? THEME.colors.primaryLight : THEME.colors.textMuted}
                />
                {item.badgeCount && item.badgeCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badgeCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive ? styles.activeLabel : styles.inactiveLabel,
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
  },
  barInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.sm,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: THEME.colors.primaryLight,
  },
  inactiveLabel: {
    color: THEME.colors.textMuted,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primaryLight,
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -10,
    backgroundColor: THEME.colors.secondary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default DriverBottomNav;

