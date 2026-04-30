import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Alert as RNAlert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, AlertTriangle, ChevronRight, CheckCircle2, Wallet,
} from 'lucide-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/ui';
import { useWallets } from '@/hooks/useWallets';
import { requestWithdrawal } from '@/api/cryptoWallets';

interface AssetOption {
  symbol: string;
  display: string;
  network: string;
  name: string;
  logo: string;
}

const ASSETS: AssetOption[] = [
  { symbol: 'BTC', display: 'BTC', network: 'Bitcoin', name: 'Bitcoin',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png' },
  { symbol: 'ETH', display: 'ETH', network: 'Ethereum (ERC-20)', name: 'Ethereum',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png' },
  { symbol: 'USDT_ERC20', display: 'USDT', network: 'Ethereum (ERC-20)', name: 'Tether USD',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png' },
  { symbol: 'USDT_POLYGON', display: 'USDT', network: 'Polygon', name: 'Tether USD',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png' },
  { symbol: 'USDT_TRX', display: 'USDT', network: 'Tron (TRC-20)', name: 'Tether USD',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png' },
  { symbol: 'USDC', display: 'USDC', network: 'Ethereum (ERC-20)', name: 'USD Coin',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png' },
  { symbol: 'SOL', display: 'SOL', network: 'Solana', name: 'Solana',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
  { symbol: 'XRP', display: 'XRP', network: 'XRP Ledger', name: 'XRP',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png' },
  { symbol: 'MATIC_POLYGON', display: 'MATIC', network: 'Polygon', name: 'Polygon',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png' },
];

type Step = 'pick' | 'form' | 'review' | 'submitting';

const baseAssetSymbol = (a: string): string => a.split(/[-_]/)[0].toUpperCase();

const formatCrypto = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 8 });

export default function WithdrawScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { crypto, prices, refresh } = useWallets();

  const [step, setStep] = useState<Step>('pick');
  const [selected, setSelected] = useState<AssetOption | null>(null);
  const [destination, setDestination] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');

  // Find current balance for selected asset.
  const balance = useMemo(() => {
    if (!selected) return 0;
    const row = crypto.find(b => b.asset.toUpperCase() === selected.symbol.toUpperCase());
    return row?.available ?? row?.total ?? 0;
  }, [selected, crypto]);

  const priceEur = selected ? (prices[baseAssetSymbol(selected.symbol)] || 0) : 0;
  const amountNum = parseFloat(amountStr) || 0;
  const amountEur = amountNum * priceEur;
  const exceedsBalance = amountNum > balance;

  const isFormValid = !!selected && destination.trim().length >= 10 && amountNum > 0 && !exceedsBalance;

  const setMax = () => {
    if (balance > 0) setAmountStr(String(balance));
  };

  const onSubmit = async () => {
    if (!selected || !isFormValid) return;
    setStep('submitting');
    try {
      const res = await requestWithdrawal({
        asset: selected.symbol,
        amount: amountNum,
        destination_address: destination.trim(),
        network: selected.network,
        note: note.trim() || undefined,
      });
      RNAlert.alert(
        t('withdraw.submittedTitle') || 'Pedido submetido',
        res.message ||
          (t('withdraw.submittedMsg', { id: res.withdrawal_id.slice(0, 8) }) ||
            'O seu pedido de levantamento aguarda aprovação.'),
        [{ text: 'OK', onPress: () => { refresh(); router.back(); } }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Falha no pedido';
      RNAlert.alert(t('withdraw.errorTitle') || 'Erro', String(msg));
      setStep('review');
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'form') setStep('pick');
            else if (step === 'review') setStep('form');
            else router.back();
          }}
          hitSlop={10}
          testID="withdraw-back"
        >
          <ArrowLeft color={theme.colors.gold} size={22} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.gold, fontSize: 18, letterSpacing: 1.5, fontWeight: '300' }}>
          {t('withdraw.title') || 'Levantar Cripto'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {step === 'pick' && (
            <PickStep onSelect={(a) => { setSelected(a); setStep('form'); }} t={t} />
          )}

          {step === 'form' && selected && (
            <FormStep
              asset={selected}
              balance={balance}
              priceEur={priceEur}
              destination={destination} onDestination={setDestination}
              amountStr={amountStr} onAmount={setAmountStr}
              note={note} onNote={setNote}
              amountNum={amountNum}
              amountEur={amountEur}
              exceedsBalance={exceedsBalance}
              onMax={setMax}
              onContinue={() => setStep('review')}
              isValid={isFormValid}
              onChangeAsset={() => setStep('pick')}
              t={t}
            />
          )}

          {(step === 'review' || step === 'submitting') && selected && (
            <ReviewStep
              asset={selected}
              amount={amountNum}
              amountEur={amountEur}
              destination={destination}
              note={note}
              submitting={step === 'submitting'}
              onSubmit={onSubmit}
              onEdit={() => setStep('form')}
              t={t}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- Step 1: Pick asset ----------

const PickStep: React.FC<{ onSelect: (a: AssetOption) => void; t: (k: string) => string }> = ({ onSelect, t }) => (
  <>
    <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>
      {(t('withdraw.chooseAsset') || 'ESCOLHA O ATIVO').toUpperCase()}
    </Text>
    {ASSETS.map((a) => (
      <TouchableOpacity
        key={a.symbol}
        onPress={() => onSelect(a)}
        activeOpacity={0.7}
        testID={`withdraw-asset-${a.symbol}`}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 14,
          padding: 14, marginBottom: 10,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1, borderColor: theme.colors.border,
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: theme.colors.bg,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: theme.colors.gold + '33',
          overflow: 'hidden',
        }}>
          <Image source={{ uri: a.logo }} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
            {a.display}
            <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>  ·  {a.name}</Text>
          </Text>
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
            {a.network}
          </Text>
        </View>
        <ChevronRight color={theme.colors.textFaint} size={18} />
      </TouchableOpacity>
    ))}
  </>
);

// ---------- Step 2: Form ----------

interface FormStepProps {
  asset: AssetOption;
  balance: number;
  priceEur: number;
  destination: string; onDestination: (s: string) => void;
  amountStr: string; onAmount: (s: string) => void;
  note: string; onNote: (s: string) => void;
  amountNum: number;
  amountEur: number;
  exceedsBalance: boolean;
  onMax: () => void;
  onContinue: () => void;
  isValid: boolean;
  onChangeAsset: () => void;
  t: (k: string, opts?: any) => string;
}

const FormStep: React.FC<FormStepProps> = ({
  asset, balance, priceEur, destination, onDestination, amountStr, onAmount,
  note, onNote, amountEur, exceedsBalance, onMax, onContinue, isValid, onChangeAsset, t,
}) => (
  <>
    {/* Asset header */}
    <TouchableOpacity
      onPress={onChangeAsset}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, marginBottom: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1, borderColor: theme.colors.gold + '33',
      }}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: theme.colors.bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: theme.colors.gold + '55',
        overflow: 'hidden',
      }}>
        <Image source={{ uri: asset.logo }} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="contain" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.gold, fontSize: 17, fontWeight: '500', letterSpacing: 0.5 }}>
          {asset.display}
        </Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 2 }}>
          {asset.network}
        </Text>
      </View>
      <Text style={{ color: theme.colors.textFaint, fontSize: 11 }}>
        {t('withdraw.change') || 'Alterar'}
      </Text>
    </TouchableOpacity>

    {/* Available balance */}
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      padding: 12, marginBottom: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1, borderColor: theme.colors.border,
    }}>
      <Wallet color={theme.colors.gold} size={16} />
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, flex: 1 }}>
        {t('withdraw.available') || 'Disponível'}
      </Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '500' }}>
        {formatCrypto(balance)} {asset.display}
      </Text>
    </View>

    {/* Destination address */}
    <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 }}>
      {(t('withdraw.destination') || 'ENDEREÇO DE DESTINO').toUpperCase()}
    </Text>
    <TextInput
      value={destination}
      onChangeText={onDestination}
      placeholder={`${asset.display} address`}
      placeholderTextColor={theme.colors.textFaint}
      autoCapitalize="none"
      autoCorrect={false}
      multiline
      numberOfLines={2}
      style={{
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        borderRadius: theme.radius.lg,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        borderWidth: 1, borderColor: theme.colors.border,
        marginBottom: 16,
        minHeight: 56,
      }}
      testID="withdraw-destination-input"
    />

    {/* Amount */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5 }}>
        {(t('withdraw.amount') || 'MONTANTE').toUpperCase()}
      </Text>
      <TouchableOpacity onPress={onMax} hitSlop={6} testID="withdraw-max-btn">
        <Text style={{ color: theme.colors.gold, fontSize: 12, fontWeight: '500' }}>
          {t('withdraw.max') || 'MAX'}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: exceedsBalance ? theme.colors.danger : theme.colors.border,
      paddingHorizontal: 14,
    }}>
      <TextInput
        value={amountStr}
        onChangeText={onAmount}
        placeholder="0.00000000"
        placeholderTextColor={theme.colors.textFaint}
        keyboardType="decimal-pad"
        style={{
          flex: 1,
          color: theme.colors.gold,
          fontSize: 24, fontWeight: '300',
          paddingVertical: 14,
        }}
        testID="withdraw-amount-input"
      />
      <Text style={{ color: theme.colors.textMuted, fontSize: 14, fontWeight: '500' }}>
        {asset.display}
      </Text>
    </View>
    {priceEur > 0 && (
      <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 6, textAlign: 'right' }}>
        ≈ {amountEur.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
      </Text>
    )}
    {exceedsBalance && (
      <Text style={{ color: theme.colors.danger, fontSize: 11, marginTop: 6 }}>
        {t('withdraw.exceedsBalance') || 'Montante excede o saldo disponível.'}
      </Text>
    )}

    {/* Optional note */}
    <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginTop: 16, marginBottom: 8 }}>
      {(t('withdraw.note') || 'NOTA (OPCIONAL)').toUpperCase()}
    </Text>
    <TextInput
      value={note}
      onChangeText={onNote}
      placeholder={t('withdraw.notePh') || 'Referência interna…'}
      placeholderTextColor={theme.colors.textFaint}
      style={{
        backgroundColor: theme.colors.surface,
        color: theme.colors.text,
        borderRadius: theme.radius.lg,
        paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 13,
        borderWidth: 1, borderColor: theme.colors.border,
      }}
      testID="withdraw-note-input"
    />

    <View style={{ height: 24 }} />
    <Button
      label={t('withdraw.continue') || 'Continuar'}
      onPress={onContinue}
      disabled={!isValid}
      testID="withdraw-continue-btn"
    />
  </>
);

// ---------- Step 3: Review ----------

interface ReviewProps {
  asset: AssetOption;
  amount: number;
  amountEur: number;
  destination: string;
  note: string;
  submitting: boolean;
  onSubmit: () => void;
  onEdit: () => void;
  t: (k: string, opts?: any) => string;
}

const ReviewStep: React.FC<ReviewProps> = ({ asset, amount, amountEur, destination, note, submitting, onSubmit, onEdit, t }) => (
  <>
    <Text style={{ color: theme.colors.gold, fontSize: 22, fontWeight: '300', letterSpacing: 0.5, marginBottom: 6 }}>
      {t('withdraw.reviewTitle') || 'Confirmar Levantamento'}
    </Text>
    <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginBottom: 24 }}>
      {t('withdraw.reviewSubtitle') || 'Verifique os detalhes antes de submeter para aprovação.'}
    </Text>

    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1, borderColor: theme.colors.gold + '33',
      padding: 16,
      gap: 14,
      marginBottom: 16,
    }}>
      <ReviewRow label={t('withdraw.asset') || 'Ativo'} value={`${asset.display} · ${asset.network}`} />
      <ReviewRow
        label={t('withdraw.amount') || 'Montante'}
        value={`${formatCrypto(amount)} ${asset.display}`}
        valueColor={theme.colors.gold}
        valueSize={18}
      />
      {amountEur > 0 && (
        <ReviewRow
          label="≈ EUR"
          value={amountEur.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })}
        />
      )}
      <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 2 }} />
      <View style={{ gap: 6 }}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.2 }}>
          {(t('withdraw.destination') || 'DESTINO').toUpperCase()}
        </Text>
        <Text
          style={{ color: theme.colors.text, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
          selectable
        >
          {destination}
        </Text>
      </View>
      {note ? (
        <>
          <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 2 }} />
          <ReviewRow label={t('withdraw.note') || 'Nota'} value={note} />
        </>
      ) : null}
    </View>

    <View style={{
      flexDirection: 'row', gap: 10, alignItems: 'flex-start',
      padding: 14, marginBottom: 16,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.warning + '55',
    }}>
      <AlertTriangle color={theme.colors.warning} size={16} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.warning, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
          {t('withdraw.warningTitle') || 'Atenção'}
        </Text>
        <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17 }}>
          {t('withdraw.warning1') || 'Os pedidos de levantamento requerem aprovação manual da equipa de compliance da KBEX.'}
        </Text>
        <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
          {t('withdraw.warning2') || 'Verifique o endereço — transferências on-chain são irreversíveis.'}
        </Text>
      </View>
    </View>

    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      padding: 12, marginBottom: 20,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.success + '33',
    }}>
      <CheckCircle2 color={theme.colors.success} size={14} />
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, flex: 1 }}>
        {t('withdraw.notifyHint') || 'Será notificado por push quando o pedido for aprovado.'}
      </Text>
    </View>

    <Button
      label={submitting ? '…' : (t('withdraw.confirm') || 'Confirmar Pedido')}
      onPress={onSubmit}
      loading={submitting}
      disabled={submitting}
      testID="withdraw-confirm-btn"
    />
    <View style={{ height: 10 }} />
    <Button
      label={t('withdraw.edit') || 'Editar'}
      onPress={onEdit}
      variant="ghost"
      disabled={submitting}
      testID="withdraw-edit-btn"
    />
  </>
);

const ReviewRow: React.FC<{ label: string; value: string; valueColor?: string; valueSize?: number }> = ({
  label, value, valueColor = theme.colors.text, valueSize = 14,
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
    <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{label}</Text>
    <Text style={{ color: valueColor, fontSize: valueSize, fontWeight: '500', flexShrink: 1, textAlign: 'right' }}>
      {value}
    </Text>
  </View>
);
