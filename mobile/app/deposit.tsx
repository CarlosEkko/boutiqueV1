import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert as RNAlert, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft, Copy, AlertTriangle, CheckCircle2, ChevronRight,
} from 'lucide-react-native';
import { theme } from '@/theme';
import { Button } from '@/components/ui';
import { fetchDepositAddress, initializeCryptoVault, type DepositAddress } from '@/api/cryptoWallets';

interface AssetOption {
  symbol: string;        // sent to backend (e.g. USDT_ERC20)
  display: string;       // shown in UI (e.g. USDT)
  network: string;       // human-readable network
  name: string;
  logo: string;
  warning?: string;
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
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    warning: 'Rede Tron (TRC-20) — taxas mais baixas, ~30s.' },
  { symbol: 'USDC', display: 'USDC', network: 'Ethereum (ERC-20)', name: 'USD Coin',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png' },
  { symbol: 'SOL', display: 'SOL', network: 'Solana', name: 'Solana',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/5426.png' },
  { symbol: 'XRP', display: 'XRP', network: 'XRP Ledger', name: 'XRP',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png' },
  { symbol: 'MATIC_POLYGON', display: 'MATIC', network: 'Polygon', name: 'Polygon',
    logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png' },
];

export default function DepositScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { asset: presetAsset } = useLocalSearchParams<{ asset?: string }>();

  const [selected, setSelected] = useState<AssetOption | null>(
    presetAsset ? ASSETS.find(a => a.symbol === presetAsset || a.display === presetAsset) ?? null : null
  );
  const [address, setAddress] = useState<DepositAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAddress = async (option: AssetOption) => {
    setLoading(true);
    setError(null);
    setAddress(null);
    try {
      const res = await fetchDepositAddress(option.symbol);
      setAddress(res);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || '';
      // If vault not initialized, try to initialize then retry once.
      if (typeof detail === 'string' && detail.toLowerCase().includes('not initialized')) {
        try {
          await initializeCryptoVault();
          const res = await fetchDepositAddress(option.symbol);
          setAddress(res);
        } catch (e2: any) {
          setError(e2?.response?.data?.detail || e2?.message || 'Falha ao inicializar carteira');
        }
      } else {
        setError(detail || 'Endereço indisponível');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selected) loadAddress(selected);
  }, [selected]);

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onShare = () => {
    if (!address) return;
    RNAlert.alert(
      t('deposit.shareTitle') || 'Endereço de Depósito',
      `${selected?.display} (${selected?.network})\n\n${address.address}`,
      [
        { text: t('deposit.copy') || 'Copiar', onPress: onCopy },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

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
          {t('deposit.title') || 'Depositar Cripto'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {!selected ? (
          <>
            <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, marginBottom: 12 }}>
              {(t('deposit.chooseAsset') || 'ESCOLHA O ATIVO').toUpperCase()}
            </Text>
            {ASSETS.map((a) => (
              <AssetRow key={a.symbol} asset={a} onPress={() => setSelected(a)} />
            ))}
          </>
        ) : (
          <DepositPanel
            asset={selected}
            address={address}
            loading={loading}
            error={error}
            copied={copied}
            onCopy={onCopy}
            onShare={onShare}
            onChangeAsset={() => { setSelected(null); setAddress(null); }}
            t={t}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const AssetRow: React.FC<{ asset: AssetOption; onPress: () => void }> = ({ asset, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    testID={`deposit-asset-${asset.symbol}`}
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
      <Image source={{ uri: asset.logo }} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="contain" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '500' }}>
        {asset.display}
        <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>  ·  {asset.name}</Text>
      </Text>
      <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
        {asset.network}
      </Text>
    </View>
    <ChevronRight color={theme.colors.textFaint} size={18} />
  </TouchableOpacity>
);

interface PanelProps {
  asset: AssetOption;
  address: DepositAddress | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onChangeAsset: () => void;
  t: (k: string, opts?: any) => string;
}

const DepositPanel: React.FC<PanelProps> = ({ asset, address, loading, error, copied, onCopy, onShare, onChangeAsset, t }) => {
  return (
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
          {t('deposit.change') || 'Alterar'}
        </Text>
      </TouchableOpacity>

      {/* QR + address */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 64 }}>
          <ActivityIndicator color={theme.colors.gold} size="large" />
          <Text style={{ color: theme.colors.textMuted, fontSize: 12, marginTop: 12 }}>
            {t('deposit.generating') || 'A gerar endereço seguro…'}
          </Text>
        </View>
      ) : error ? (
        <View style={{
          flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          padding: 14, borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
          borderWidth: 1, borderColor: theme.colors.danger + '55',
        }}>
          <AlertTriangle color={theme.colors.danger} size={18} />
          <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : address ? (
        <>
          <View style={{
            backgroundColor: '#ffffff',
            padding: 18,
            borderRadius: theme.radius.lg,
            alignSelf: 'center',
            marginBottom: 16,
            borderWidth: 2,
            borderColor: theme.colors.gold,
          }}>
            <QRCode
              value={address.address}
              size={220}
              backgroundColor="#ffffff"
              color="#0a0a0a"
            />
          </View>

          <Text style={{ color: theme.colors.textMuted, fontSize: 11, letterSpacing: 1.5, textAlign: 'center', marginBottom: 8 }}>
            {(t('deposit.depositAddress') || 'ENDEREÇO DE DEPÓSITO').toUpperCase()}
          </Text>
          <View style={{
            backgroundColor: theme.colors.surface,
            padding: 14, borderRadius: theme.radius.lg,
            borderWidth: 1, borderColor: theme.colors.border,
            marginBottom: 16,
          }}>
            <Text
              style={{ color: theme.colors.text, fontSize: 13, fontFamily: 'Courier', letterSpacing: 0.3 }}
              selectable
              testID="deposit-address-text"
            >
              {address.address}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                onPress={onCopy}
                activeOpacity={0.8}
                testID="deposit-copy-btn"
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  paddingVertical: 14,
                  borderRadius: theme.radius.lg,
                  backgroundColor: copied ? theme.colors.success : theme.colors.gold,
                }}
              >
                {copied ? (
                  <CheckCircle2 color="#0a0a0a" size={18} />
                ) : (
                  <Copy color="#0a0a0a" size={18} />
                )}
                <Text style={{ color: '#0a0a0a', fontWeight: '600', fontSize: 14, letterSpacing: 0.5 }}>
                  {copied
                    ? (t('deposit.copied') || 'Copiado!')
                    : (t('deposit.copy') || 'Copiar')}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onShare}
              activeOpacity={0.8}
              testID="deposit-share-btn"
              style={{
                paddingVertical: 14, paddingHorizontal: 18,
                borderRadius: theme.radius.lg,
                borderWidth: 1, borderColor: theme.colors.gold + '55',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: theme.colors.gold, fontWeight: '500', fontSize: 14 }}>
                {t('deposit.share') || 'Partilhar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Warnings */}
          <View style={{
            marginTop: 24, padding: 14,
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1, borderColor: theme.colors.warning + '55',
            flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertTriangle color={theme.colors.warning} size={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.warning, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                {t('deposit.warningTitle') || 'Atenção'}
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17 }}>
                {t('deposit.warning1', { asset: asset.display, network: asset.network }) ||
                  `Envie apenas ${asset.display} via rede ${asset.network} para este endereço.`}
              </Text>
              <Text style={{ color: theme.colors.text, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
                {t('deposit.warning2') || 'Depósitos noutra rede serão perdidos definitivamente.'}
              </Text>
              {asset.warning && (
                <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
                  {asset.warning}
                </Text>
              )}
            </View>
          </View>

          <Text style={{ color: theme.colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 16 }}>
            {t('deposit.confirmations') || 'O saldo aparece após confirmações na rede (~10-30 min)'}
          </Text>
        </>
      ) : null}
    </>
  );
};
