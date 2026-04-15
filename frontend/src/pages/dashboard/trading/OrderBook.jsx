import React, { useMemo } from 'react';

const OrderBook = ({ orderBook, ticker, pricePrecision = 2, qtyPrecision = 4 }) => {
  const maxTotal = useMemo(() => {
    const allTotals = [...orderBook.bids, ...orderBook.asks].map(o => o.qty);
    return Math.max(...allTotals, 1);
  }, [orderBook]);

  const formatPrice = (p) => p.toFixed(pricePrecision);
  const formatQty = (q) => {
    if (q >= 1000) return q.toFixed(2);
    return q.toFixed(qtyPrecision);
  };
  const formatTotal = (t) => {
    if (t >= 1000) return (t / 1000).toFixed(2) + 'K';
    return t.toFixed(2);
  };

  const asks = [...orderBook.asks].reverse().slice(-15);
  const bids = orderBook.bids.slice(0, 15);

  return (
    <div className="flex flex-col h-full text-xs font-mono" data-testid="order-book">
      <div className="px-2 py-1.5 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-gray-300 text-xs font-sans font-medium">Order Book</span>
      </div>

      <div className="grid grid-cols-3 gap-0 px-2 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sells) - red */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        {asks.map((ask, i) => (
          <div key={`a-${i}`} className="relative grid grid-cols-3 gap-0 px-2 py-[1.5px] hover:bg-zinc-800/50">
            <div className="absolute right-0 top-0 bottom-0 bg-red-500/10"
              style={{ width: `${(ask.qty / maxTotal) * 100}%` }} />
            <span className="text-red-400 relative z-10">{formatPrice(ask.price)}</span>
            <span className="text-gray-300 text-right relative z-10">{formatQty(ask.qty)}</span>
            <span className="text-gray-500 text-right relative z-10">{formatTotal(ask.total)}</span>
          </div>
        ))}
      </div>

      {/* Spread / Current Price */}
      <div className="px-2 py-1.5 border-y border-zinc-800/50 bg-zinc-900/80">
        {ticker && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${ticker.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {ticker.lastPrice.toFixed(pricePrecision)}
            </span>
            <span className={`text-[10px] ${ticker.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {ticker.priceChangePercent >= 0 ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Bids (buys) - green */}
      <div className="flex-1 overflow-hidden">
        {bids.map((bid, i) => (
          <div key={`b-${i}`} className="relative grid grid-cols-3 gap-0 px-2 py-[1.5px] hover:bg-zinc-800/50">
            <div className="absolute right-0 top-0 bottom-0 bg-green-500/10"
              style={{ width: `${(bid.qty / maxTotal) * 100}%` }} />
            <span className="text-green-400 relative z-10">{formatPrice(bid.price)}</span>
            <span className="text-gray-300 text-right relative z-10">{formatQty(bid.qty)}</span>
            <span className="text-gray-500 text-right relative z-10">{formatTotal(bid.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
