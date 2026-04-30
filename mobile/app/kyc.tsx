import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/ui';
import { generateSumsubLink, fetchSumsubStatus, type SumsubStatusResponse } from '@/api/kyc';

type Stage = 'idle' | 'loading' | 'webview' | 'completed' | 'error';

export default function KycScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<SumsubStatusResponse | null>(null);

  useEffect(() => {
    fetchSumsubStatus().then(setStatus);
  }, []);

  const startVerification = async () => {
    setStage('loading');
    setErrorMsg(null);
    try {
      const res = await generateSumsubLink();
      if (!res.success || !res.url) throw new Error('No URL returned');
      setUrl(res.url);
      setStage('webview');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Failed to start verification');
      setStage('error');
    }
  };

  const onWebViewMessage = (e: { nativeEvent: { data: string } }) => {
    // Sumsub posts events via window.postMessage when SDK is hosted in iframe;
    // for the external link flow we mostly rely on the user closing the screen.
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.type === 'idCheck.applicantStatus' && data.payload?.reviewStatus === 'completed') {
        setStage('completed');
      }
    } catch {
      // not JSON — ignore
    }
  };

  const finish = () => {
    Alert.alert(
      t('kyc.finishedTitle') || 'Verificação enviada',
      t('kyc.finishedMsg') || 'A nossa equipa irá rever a sua submissão. Será notificado quando concluída.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  // ----- Render -----

  if (stage === 'webview' && url) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 1, borderBottomColor: theme.colors.border,
        }}>
          <TouchableOpacity onPress={finish} hitSlop={10} testID="kyc-close">
            <ArrowLeft color={theme.colors.gold} size={22} />
          </TouchableOpacity>
          <Text style={{ color: theme.colors.gold, fontSize: 16, letterSpacing: 1.2, fontWeight: '300', flex: 1 }}>
            {t('kyc.title') || 'Verificação de Identidade'}
          </Text>
          <TouchableOpacity onPress={finish} testID="kyc-done-btn">
            <Text style={{ color: theme.colors.gold, fontSize: 13, fontWeight: '500' }}>
              {t('commonModal.done') || 'Concluído'}
            </Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: url }}
          onMessage={onWebViewMessage}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          startInLoadingState
          renderLoading={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
              <ActivityIndicator color={theme.colors.gold} />
            </View>
          )}
          style={{ flex: 1, backgroundColor: theme.colors.bg }}
          testID="kyc-webview"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft color={theme.colors.gold} size={22} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.gold, fontSize: 18, letterSpacing: 1.5, fontWeight: '300' }}>
          {t('kyc.title') || 'Verificação de Identidade'}
        </Text>
      </View>

      <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <StatusBadge status={status} t={t} />

        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: theme.colors.surface,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: theme.colors.gold + '55',
        }}>
          <ShieldCheck color={theme.colors.gold} size={42} />
        </View>

        <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '300', textAlign: 'center', letterSpacing: 0.5 }}>
            {t('kyc.heroTitle') || 'Verifique a sua identidade'}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
            {t('kyc.heroSubtitle') || 'Para cumprir requisitos regulatórios da KBEX, precisamos de validar o seu documento de identificação e uma selfie. O processo demora cerca de 2 minutos.'}
          </Text>
        </View>

        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          <Step n={1} text={t('kyc.step1') || 'Tire foto do documento (BI / Passaporte)'} />
          <Step n={2} text={t('kyc.step2') || 'Faça uma selfie de prova-de-vida'} />
          <Step n={3} text={t('kyc.step3') || 'Receba a aprovação por notificação'} />
        </View>

        {stage === 'error' && (
          <View style={{
            flexDirection: 'row', gap: 8, alignItems: 'flex-start',
            padding: 12, borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.danger + '55',
          }}>
            <AlertTriangle color={theme.colors.danger} size={18} />
            <Text style={{ color: theme.colors.text, fontSize: 12, flex: 1 }}>
              {errorMsg}
            </Text>
          </View>
        )}

        <Button
          label={
            stage === 'loading'
              ? '…'
              : (t('kyc.start') || 'Iniciar Verificação')
          }
          onPress={startVerification}
          loading={stage === 'loading'}
          disabled={stage === 'loading'}
          testID="kyc-start-btn"
        />
      </View>
    </SafeAreaView>
  );
}

const Step: React.FC<{ n: number; text: string }> = ({ n, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <View style={{
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: theme.colors.bg,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: theme.colors.gold + '55',
    }}>
      <Text style={{ color: theme.colors.gold, fontSize: 12, fontWeight: '600' }}>{n}</Text>
    </View>
    <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>{text}</Text>
  </View>
);

const StatusBadge: React.FC<{ status: SumsubStatusResponse | null; t: (k: string) => string }> = ({ status, t }) => {
  if (!status) return null;
  const reviewAnswer = status.review_result?.reviewAnswer;
  if (reviewAnswer === 'GREEN') {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.success + '22',
        borderWidth: 1, borderColor: theme.colors.success + '55',
      }}>
        <CheckCircle2 color={theme.colors.success} size={14} />
        <Text style={{ color: theme.colors.success, fontSize: 11, fontWeight: '600' }}>
          {t('kyc.statusApproved') || 'Aprovado'}
        </Text>
      </View>
    );
  }
  if (status.status === 'pending' || status.review_status === 'pending') {
    return (
      <View style={{
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.gold + '22',
        borderWidth: 1, borderColor: theme.colors.gold + '55',
      }}>
        <Text style={{ color: theme.colors.gold, fontSize: 11, fontWeight: '600' }}>
          {t('kyc.statusPending') || 'Em revisão'}
        </Text>
      </View>
    );
  }
  return null;
};
