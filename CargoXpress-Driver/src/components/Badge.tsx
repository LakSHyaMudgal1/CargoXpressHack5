import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'small' | 'medium';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return { bg: THEME.colors.successBg, text: THEME.colors.success };
      case 'warning':
        return { bg: THEME.colors.warningBg, text: THEME.colors.warning };
      case 'danger':
        return { bg: THEME.colors.dangerBg, text: THEME.colors.danger };
      case 'info':
        return { bg: THEME.colors.infoBg, text: THEME.colors.info };
      case 'neutral':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: THEME.colors.textSecondary };
      case 'primary':
      default:
        return { bg: 'rgba(37, 99, 235, 0.15)', text: THEME.colors.primaryLight };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        size === 'small' ? styles.smallBadge : styles.mediumBadge,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          size === 'small' ? styles.smallText : styles.mediumText,
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: THEME.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediumBadge: {
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs,
  },
  smallBadge: {
    paddingHorizontal: THEME.spacing.xs + 2,
    paddingVertical: 2,
  },
  text: {
    ...THEME.typography.badge,
  },
  mediumText: {
    fontSize: 11,
  },
  smallText: {
    fontSize: 9.5,
  },
});
