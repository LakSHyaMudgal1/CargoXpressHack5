import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
  loading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'cube-outline',
  title,
  description,
  actionTitle,
  onAction,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={36} color={THEME.colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="outline"
          size="medium"
          loading={loading}
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl,
    paddingHorizontal: THEME.spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    ...THEME.typography.titleSmall,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    ...THEME.typography.bodyMedium,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.spacing.md,
  },
  actionButton: {
    marginTop: THEME.spacing.sm,
    minWidth: 160,
  },
});
