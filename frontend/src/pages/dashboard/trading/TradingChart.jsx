import React, { useState, useEffect } from 'react';

const TradingChart = ({ symbol = 'BTCUSDT' }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey(prev => prev + 1);
  }, [symbol]);

  return (
    <div className="h-full w-full" key={key} data-testid="trading-chart">
      <iframe
        src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:${symbol}&interval=60&hide_top_toolbar=0&hide_legend=0&save_image=0&hide_volume=0&theme=dark&style=1&locale=pt_BR&enable_publishing=0&backgroundColor=rgba(0,0,0,0)&gridColor=rgba(40,40,40,0.5)&studies=%5B%5D`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="TradingView Chart"
        allowFullScreen
      />
    </div>
  );
};

export default TradingChart;
