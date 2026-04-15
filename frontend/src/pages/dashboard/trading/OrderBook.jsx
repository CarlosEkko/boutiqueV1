import React, { useMemo, useRef, useState, useEffect } from 'react';

const OrderBook = ({ orderBook, ticker, pricePrecision = 2, qtyPrecision = 4 }) => {
  const asksRef = useRef(null);
  const bidsRef = useRef(null);
  const [visibleRows, setVisibleRows] = useState(25);

  // Dynamically calculate how many rows fit
  useEffect(() => {
    const calculateRows = () => {
      if (asksRef.current) {
        const containerHeight = asksRef.current.clientHeight;
        const rowHeight = 18; // ~18px per row
        const rows = Math.max(15, Math.floor(containerHeight / rowHeight));
        setVisibleRows(rows);
      }
    };
    calculateRows();
    window.addEventListener('resize', calculateRows);
    return () => window.removeEventListener('resize', calculateRows);
  }, []);

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

  const asks = [...orderBook.asks].reverse().slice(-visibleRows);
  const bids = orderBook.bids.slice(0, visibleRows);

  const Row = ({ price, qty, total, side }) => (
    <div className="relative grid grid-cols-3 gap-0 px-2 py-[2px] hover:bg-zinc-800/50">
      <div className={`absolute right-0 top-0 bottom-0 ${side === 'ask' ? 'bg-red-500/10' : 'bg-green-500/10'}`}
        style={{ width: `${(qty / maxTotal) * 100}%` }} />
      <span className={`${side === 'ask' ? 'text-red-400' : 'text-green-400'} relative z-10`}>{formatPrice(price)}</span>
      <span className="text-gray-300 text-right relative z-10">{formatQty(qty)}</span>
      <span className="text-gray-500 text-right relative z-10">{formatTotal(total)}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full text-xs font-mono" data-testid="order-book">
      <div className="px-2 py-1.5 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <span className="text-gray-300 text-xs font-sans font-medium">Order Book</span>
      </div>

      <div className="grid grid-cols-3 gap-0 px-2 py-1 text-[10px] text-gray-500 border-b border-zinc-800/50 shrink-0">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (sells) - red, fill from bottom up */}
      <div ref={asksRef} className="flex-1 overflow-hidden flex flex-col justify-end min-h-0">
        {asks.map((ask, i) => (
          <Row key={`a-${i}`} price={ask.price} qty={ask.qty} total={ask.total} side="ask" />
        ))}
      </div>

      {/* Spread / Current Price */}
      <div className="px-2 py-1 border-y border-zinc-800/50 bg-zinc-900/80 shrink-0">
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

      {/* Bids (buys) - green, fill from top down */}
      <div ref={bidsRef} className="flex-1 overflow-hidden min-h-0">
        {bids.map((bid, i) => (
          <Row key={`b-${i}`} price={bid.price} qty={bid.qty} total={bid.total} side="bid" />
        ))}
      </div>
    </div>
  );
};

export default OrderBook;
