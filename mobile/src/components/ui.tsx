import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { theme } from '@/theme';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label, onPress, variant = 'primary', loading, disabled, testID,
}) => {
  const bg =
    variant === 'primary' ? theme.colors.gold :
    variant === 'secondary' ? theme.colors.surface :
    'transparent';
  const color =
    variant === 'primary' ? '#0a0a0a' : theme.colors.text;
  const border = variant === 'ghost' ? theme.colors.borderStrong : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      activeOpacity={0.8}
      style={{
        backgroundColor: bg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: theme.radius.lg,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: border,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={{ color, fontWeight: '600', fontSize: 15, letterSpacing: 0.5 }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface CardProps {
  children: React.ReactNode;
  style?: object;
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View
    style={[{
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
    }, style]}
  >
    {children}
  </View>
);

interface RowProps {
  label: string;
  value: string | number;
  color?: string;
}

export const Row: React.FC<RowProps> = ({ label, value, color }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
    <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: color || theme.colors.text, fontSize: 14, fontWeight: '500' }}>
      {value}
    </Text>
  </View>
);
