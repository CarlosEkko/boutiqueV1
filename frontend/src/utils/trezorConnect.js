let TrezorConnect = null;
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

const loadTrezor = async () => {
  if (TrezorConnect) return TrezorConnect;
  const module = await import('@trezor/connect-web');
  TrezorConnect = module.default;
  return TrezorConnect;
};

export const initTrezor = async () => {
  if (isInitialized) return;
  const tc = await loadTrezor();
  tc.init({
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
  await initTrezor();
  const tc = await loadTrezor();
  const result = await tc.getFeatures();
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to connect device');
};

export const getAddress = async (coin, path, showOnTrezor = true) => {
  await initTrezor();
  const tc = await loadTrezor();
  const config = BLOCKCHAIN_CONFIG[coin];
  if (!config) throw new Error(`Unsupported coin: ${coin}`);

  if (coin === 'ETH') {
    const result = await tc.ethereumGetAddress({
      path: path || config.path,
      showOnTrezor,
    });
    if (result.success) return result.payload;
    throw new Error(result.payload?.error || 'Failed to get ETH address');
  }

  const result = await tc.getAddress({
    path: path || config.path,
    coin: config.coin,
    showOnTrezor,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to get address');
};

export const getAddressBundle = async (coins) => {
  await initTrezor();
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
  await initTrezor();
  const tc = await loadTrezor();
  const config = BLOCKCHAIN_CONFIG[coin];
  if (!config) throw new Error(`Unsupported coin: ${coin}`);

  const result = await tc.getAccountInfo({
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
  await initTrezor();
  const tc = await loadTrezor();
  const result = await tc.ethereumSignTransaction({
    path,
    transaction,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign ETH transaction');
};

export const signBtcTransaction = async (inputs, outputs) => {
  await initTrezor();
  const tc = await loadTrezor();
  const result = await tc.signTransaction({
    inputs,
    outputs,
    coin: 'btc',
    push: false,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign BTC transaction');
};
