import React from 'react';

// TradingView Ticker Tape Widget (replaces custom WebSocket ticker)
const CryptoTicker = () => {
  return (
    <div className="crypto-ticker-container overflow-hidden relative" style={{ height: '46px' }} data-testid="tradingview-ticker">
      <iframe
        src="https://s.tradingview.com/embed-widget/ticker-tape/?locale=pt_BR&symbols=%5B%7B%22proName%22%3A%22BITSTAMP%3ABTCUSD%22%2C%22title%22%3A%22BTC%2FUSD%22%7D%2C%7B%22proName%22%3A%22BITSTAMP%3AETHUSD%22%2C%22title%22%3A%22ETH%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3ASOLUSDT%22%2C%22title%22%3A%22SOL%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3AXRPUSDT%22%2C%22title%22%3A%22XRP%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3ABNBUSDT%22%2C%22title%22%3A%22BNB%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3AADAUSDT%22%2C%22title%22%3A%22ADA%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3ADOGEUSDT%22%2C%22title%22%3A%22DOGE%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3ADOTUSDT%22%2C%22title%22%3A%22DOT%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3AAVAXUSDT%22%2C%22title%22%3A%22AVAX%2FUSD%22%7D%2C%7B%22proName%22%3A%22BINANCE%3ALINKUSDT%22%2C%22title%22%3A%22LINK%2FUSD%22%7D%5D&showSymbolLogo=true&isTransparent=true&displayMode=adaptive&colorTheme=dark"
        style={{ width: '100%', height: '46px', border: 'none', overflow: 'hidden', display: 'block' }}
        title="TradingView Ticker Tape"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
};

export default CryptoTicker;
