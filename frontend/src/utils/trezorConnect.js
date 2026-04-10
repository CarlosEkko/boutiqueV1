/**
 * Trezor Connect - CDN-based loader
 * Loads Trezor Connect from the official CDN to avoid SES lockdown issues
 */

let TrezorConnect = null;
let loadPromise = null;

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

const loadTrezorFromCDN = () => {
  if (TrezorConnect) return Promise.resolve(TrezorConnect);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.TrezorConnect) {
      TrezorConnect = window.TrezorConnect;
      resolve(TrezorConnect);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect.trezor.io/9/trezor-connect.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if (window.TrezorConnect) {
        TrezorConnect = window.TrezorConnect;
        resolve(TrezorConnect);
      } else {
        loadPromise = null;
        reject(new Error('Trezor Connect carregou mas não está disponível. Verifique se o Trezor Bridge está instalado.'));
      }
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Não foi possível carregar Trezor Connect. Verifique a sua ligação à internet e se connect.trezor.io não está bloqueado.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

export const initTrezor = async () => {
  const tc = await loadTrezorFromCDN();
  tc.manifest({
    email: 'support@kbex.io',
    appUrl: window.location.origin,
  });
  return tc;
};

export const getDeviceFeatures = async () => {
  const tc = await initTrezor();
  const result = await tc.getFeatures();
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to connect device');
};

export const getAddress = async (coin, path, showOnTrezor = true) => {
  const tc = await initTrezor();
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

export const getAccountInfo = async (coin, path) => {
  const tc = await initTrezor();
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
  const tc = await initTrezor();
  const result = await tc.ethereumSignTransaction({
    path,
    transaction,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign ETH transaction');
};

export const signBtcTransaction = async (inputs, outputs) => {
  const tc = await initTrezor();
  const result = await tc.signTransaction({
    inputs,
    outputs,
    coin: 'btc',
    push: false,
  });
  if (result.success) return result.payload;
  throw new Error(result.payload?.error || 'Failed to sign BTC transaction');
};
