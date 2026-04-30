import React, { useState } from 'react';
import {
  View, Text, TextInput, Modal, TouchableOpacity, Alert as RNAlert,
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, ArrowUp, ArrowDown } from 'lucide-react-native';
import { theme } from '@/theme';
import { Button } from './ui';
import { createAlert } from '@/api/alerts';

interface CreateAlertSheetProps {
  visible: boolean;
  onClose: () => void;
  asset: string;
  currentPrice: number;
  currency?: string;
  onCreated?: () => void;
}

const formatPrice = (n: number, currency = 'EUR') =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const CreateAlertSheet: React.FC<CreateAlertSheetProps> = ({
  visible, onClose, asset, currentPrice, currency = 'EUR', onCreated,
}) => {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [targetStr, setTargetStr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const target = parseFloat(targetStr);
  const valid = !isNaN(target) && target > 0;
  const deltaPct = valid ? ((target - currentPrice) / currentPrice) * 100 : 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      await createAlert({
        asset,
        direction,
        target_price: target,
        currency,
      });
      onCreated?.();
      setTargetStr('');
      onClose();
      RNAlert.alert(
        t('alerts.createdTitle') || 'Alerta criado',
        t('alerts.createdMsg', { asset }) || `Vai receber notificação push assim que ${asset} atingir o objetivo.`,
      );
    } catch (err: any) {
      RNAlert.alert(
        'Error',
        err?.response?.data?.detail || err?.message || 'Failed to create alert'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={{
            backgroundColor: theme.colors.bgElevated,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 28,
            borderTopWidth: 1,
            borderTopColor: theme.colors.gold + '33',
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: theme.colors.gold, fontSize: 18, letterSpacing: 1.5, fontWeight: '300' }}>
              {(t('alerts.newTitle') || 'Definir Alerta').toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X color={theme.colors.textMuted} size={22} />
            </TouchableOpacity>
          </View>

          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
          }}>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {asset} · {t('markets.currentPrice') || 'Current Price'}
            </Text>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '500' }}>
              {formatPrice(currentPrice, currency)}
            </Text>
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 10 }}>
            {(t('alerts.direction') || 'Notify when price is').toUpperCase()}
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <DirectionPill
              label={t('alerts.above') || 'Above'}
              icon={<ArrowUp size={16} color={direction === 'above' ? '#0a0a0a' : theme.colors.gold} />}
              active={direction === 'above'}
              onPress={() => setDirection('above')}
              testID="alert-dir-above"
            />
            <DirectionPill
              label={t('alerts.below') || 'Below'}
              icon={<ArrowDown size={16} color={direction === 'below' ? '#0a0a0a' : theme.colors.gold} />}
              active={direction === 'below'}
              onPress={() => setDirection('below')}
              testID="alert-dir-below"
            />
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 }}>
            {(t('alerts.targetPrice') || `Target Price (${currency})`).toUpperCase()}
          </Text>
          <TextInput
            value={targetStr}
            onChangeText={setTargetStr}
            keyboardType="decimal-pad"
            placeholder={currentPrice.toFixed(2)}
            placeholderTextColor={theme.colors.textFaint}
            style={{
              backgroundColor: theme.colors.surface,
              color: theme.colors.gold,
              fontSize: 28,
              fontWeight: '300',
              padding: 16,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              textAlign: 'center',
            }}
            testID="alert-target-input"
          />

          {valid && (
            <Text style={{
              color: deltaPct >= 0 ? theme.colors.success : theme.colors.danger,
              fontSize: 12, textAlign: 'center', marginTop: 8,
            }}>
              {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(2)}% {t('alerts.fromCurrent') || 'from current'}
            </Text>
          )}

          <View style={{ height: 24 }} />
          <Button
            label={submitting ? '…' : (t('alerts.create') || 'Criar Alerta')}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!valid || submitting}
            testID="alert-create-submit"
          />
        </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const DirectionPill: React.FC<{
  label: string; icon: React.ReactNode; active: boolean; onPress: () => void; testID: string;
}> = ({ label, icon, active, onPress, testID }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    testID={testID}
    style={{
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: theme.radius.lg,
      backgroundColor: active ? theme.colors.gold : theme.colors.surface,
      borderWidth: 1,
      borderColor: active ? theme.colors.gold : theme.colors.border,
    }}
  >
    {icon}
    <Text style={{
      color: active ? '#0a0a0a' : theme.colors.text,
      fontWeight: '600',
      fontSize: 14,
    }}>
      {label}
    </Text>
  </TouchableOpacity>
);
