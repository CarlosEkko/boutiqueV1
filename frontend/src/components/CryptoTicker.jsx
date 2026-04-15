import React, { useEffect, useRef, memo } from 'react';

const CryptoTicker = memo(() => {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const container = containerRef.current;

    // Create widget wrapper
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetWrapper.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.textContent = JSON.stringify({
      symbols: [
        { proName: 'BITSTAMP:BTCUSD', title: 'BTC/USD' },
        { proName: 'BITSTAMP:ETHUSD', title: 'ETH/USD' },
        { proName: 'COINBASE:SOLUSD', title: 'SOL/USD' },
        { proName: 'COINBASE:XRPUSD', title: 'XRP/USD' },
        { proName: 'COINBASE:BNBUSD', title: 'BNB/USD' },
        { proName: 'COINBASE:ADAUSD', title: 'ADA/USD' },
        { proName: 'COINBASE:DOGEUSD', title: 'DOGE/USD' },
        { proName: 'CRYPTO:DOTUSD', title: 'DOT/USD' },
        { proName: 'COINBASE:AVAXUSD', title: 'AVAX/USD' },
        { proName: 'COINBASE:LINKUSD', title: 'LINK/USD' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'pt_BR',
    });

    widgetWrapper.appendChild(script);
    container.appendChild(widgetWrapper);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: '46px', overflow: 'hidden' }}
      data-testid="tradingview-ticker"
    />
  );
});

CryptoTicker.displayName = 'CryptoTicker';

export default CryptoTicker;
