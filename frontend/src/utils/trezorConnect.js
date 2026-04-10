import TrezorConnect from '@trezor/connect-web';

let isInitialized = false;

export const BLOCKCHAIN_CONFIG = {
  BTC: {
    coin: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    path: "m/84'/0'/0'/0/0",
    icon: '₿',
  },
  ETH: {
    coin: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    path: "m/44'/60'/0'/0/0",
    icon: 'Ξ',
  },
  LTC: {
    coin: 'ltc',
    name: 'Litecoin',
    symbol: 'LTC',
    decimals: 8,
    path: "m/84'/2'/0'/0/0",
    icon: 'Ł',
  },
};

export const initTrezor = () => {
  if (isInitialized) return;
  TrezorConnect.init({
    manifest: {
      email: 'support@kbex.io',
      appName: 'KBEX Exchange',
      appUrl: window.location.origin,
    },
    connectSrc: 'https://connect.trezor.io/9/',
  });
  isInitialized = true;
};

export const getDeviceFeatures = async () => {
  initTrezor();
  const result = await TrezorConnect.getFeatures();
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to connect device');
};

export const getAddress = async (coin, path, showOnTrezor = true) => {
  initTrezor();
  const config = BLOCKCHAIN_CONFIG[coin];
  if (!config) throw new Error(`Unsupported coin: ${coin}`);

  if (coin === 'ETH') {
    const result = await TrezorConnect.ethereumGetAddress({
      path: path || config.path,
      showOnTrezor,
    });
    if (result.success) return result.payload;
    throw new Error(result.payload?.error || 'Failed to get ETH address');
  }

  const result = await TrezorConnect.getAddress({
    path: path || config.path,
    coin: config.coin,
    showOnTrezor,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to get address');
};

export const getAddressBundle = async (coins) => {
  initTrezor();
  const results = {};
  for (const coin of coins) {
    try {
      const addr = await getAddress(coin, null, false);
      results[coin] = addr;
    } catch (err) {
      results[coin] = { error: err.message };
    }
  }
  return results;
};

export const getAccountInfo = async (coin, path) => {
  initTrezor();
  const config = BLOCKCHAIN_CONFIG[coin];
  if (!config) throw new Error(`Unsupported coin: ${coin}`);

  const result = await TrezorConnect.getAccountInfo({
    coin: config.coin,
    path: path || config.path,
    details: 'tokenBalances',
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to get account info');
};

export const formatBalance = (balance, decimals = 8) => {
  if (!balance || balance === '0') return '0';
  const str = balance.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, str.length - decimals) || '0';
  const frac = str.slice(str.length - decimals).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
};

export const signEthTransaction = async (path, transaction) => {
  initTrezor();
  const result = await TrezorConnect.ethereumSignTransaction({
    path,
    transaction,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign ETH transaction');
};

export const signBtcTransaction = async (inputs, outputs) => {
  initTrezor();
  const result = await TrezorConnect.signTransaction({
    inputs,
    outputs,
    coin: 'btc',
    push: false,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign BTC transaction');
};
