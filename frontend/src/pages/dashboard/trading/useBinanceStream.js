import { useState, useEffect, useRef, useCallback } from 'react';

const BINANCE_WS = 'wss://stream.binance.com:9443/stream';

export const useBinanceStream = (symbol) => {
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [ticker, setTicker] = useState(null);
  const wsRef = useRef(null);
  const tradesRef = useRef([]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const pair = symbol.toLowerCase();
    const streams = `${pair}@depth20@100ms/${pair}@trade/${pair}@ticker`;
    const ws = new WebSocket(`${BINANCE_WS}?streams=${streams}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const stream = data.stream;
      const payload = data.data;

      if (stream?.includes('@depth')) {
        setOrderBook({
          bids: (payload.bids || []).slice(0, 20).map(([price, qty]) => ({
            price: parseFloat(price),
            qty: parseFloat(qty),
            total: parseFloat(price) * parseFloat(qty),
          })),
          asks: (payload.asks || []).slice(0, 20).map(([price, qty]) => ({
            price: parseFloat(price),
            qty: parseFloat(qty),
            total: parseFloat(price) * parseFloat(qty),
          })),
        });
      } else if (stream?.includes('@trade')) {
        const newTrade = {
          id: payload.t,
          price: parseFloat(payload.p),
          qty: parseFloat(payload.q),
          time: payload.T,
          isBuyerMaker: payload.m,
        };
        tradesRef.current = [newTrade, ...tradesRef.current].slice(0, 50);
        setTrades([...tradesRef.current]);
      } else if (stream?.includes('@ticker')) {
        setTicker({
          lastPrice: parseFloat(payload.c),
          priceChange: parseFloat(payload.p),
          priceChangePercent: parseFloat(payload.P),
          high: parseFloat(payload.h),
          low: parseFloat(payload.l),
          volume: parseFloat(payload.v),
          quoteVolume: parseFloat(payload.q),
        });
      }
    };

    ws.onerror = () => {
      setTimeout(connect, 3000);
    };

    ws.onclose = () => {};

    wsRef.current = ws;
  }, [symbol]);

  useEffect(() => {
    tradesRef.current = [];
    setTrades([]);
    setOrderBook({ bids: [], asks: [] });
    setTicker(null);
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { orderBook, trades, ticker };
};
