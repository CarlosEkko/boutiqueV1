import React from 'react';

const MarketTrades = ({ trades, pricePrecision = 2 }) => {
  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full text-xs font-mono" data-testid="market-trades">
      <div className="px-2 py-1.5 border-b border-zinc-800">
        <span className="text-gray-300 text-xs font-sans font-medium">Market Trades</span>
      </div>

      <div className="grid grid-cols-3 gap-0 px-2 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {trades.map((trade) => (
          <div key={trade.id} className="grid grid-cols-3 gap-0 px-2 py-[1.5px] hover:bg-zinc-800/30">
            <span className={trade.isBuyerMaker ? 'text-red-400' : 'text-green-400'}>
              {trade.price.toFixed(pricePrecision)}
            </span>
            <span className="text-gray-300 text-right">
              {trade.qty >= 1 ? trade.qty.toFixed(4) : trade.qty.toFixed(6)}
            </span>
            <span className="text-gray-500 text-right">{formatTime(trade.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTrades;
