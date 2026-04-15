import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

const TradingChart = ({ symbol = 'BTCUSDT' }) => {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: '60',
      timezone: 'Europe/Lisbon',
      theme: 'dark',
      style: '1',
      locale: 'pt_BR',
      backgroundColor: 'rgba(11, 14, 17, 1)',
      gridColor: 'rgba(40, 40, 40, 0.5)',
      hide_top_toolbar: false,
      hide_legend: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      show_popup_button: false,
      support_host: 'https://www.tradingview.com',
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';

    const innerDiv = document.createElement('div');
    innerDiv.className = 'tradingview-widget-container__widget';
    innerDiv.style.height = '100%';
    innerDiv.style.width = '100%';

    wrapper.appendChild(innerDiv);
    wrapper.appendChild(script);
    container.appendChild(wrapper);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol]);

  const toggleFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;

    if (!isFullscreen) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="h-full w-full relative bg-[#0b0e11]" data-testid="trading-chart">
      <div ref={containerRef} className="h-full w-full" />
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-gray-400 hover:text-white transition-colors"
        title={isFullscreen ? 'Sair fullscreen' : 'Fullscreen'}
        data-testid="fullscreen-chart-btn"
      >
        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );
};

export default TradingChart;
