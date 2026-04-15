import React from 'react';
import Header from '../../components/Header';
import TradingTerminal from '../dashboard/TradingTerminal';

const PublicTradingPage = () => {
  return (
    <div className="min-h-screen bg-[#0b0e11] flex flex-col">
      <Header />
      <div className="flex-1">
        <TradingTerminal />
      </div>
    </div>
  );
};

export default PublicTradingPage;
