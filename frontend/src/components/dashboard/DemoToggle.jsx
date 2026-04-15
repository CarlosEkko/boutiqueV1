import React from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import { useDemo } from '../../context/DemoContext';
import { toast } from 'sonner';

const DemoToggle = () => {
  const { demoMode, demoAuthorized, loading, toggleDemo } = useDemo();

  const handleToggle = async () => {
    try {
      await toggleDemo();
      toast.success(demoMode ? 'Demo Mode OFF' : 'Demo Mode ON');
    } catch (err) {
      toast.error('Failed to toggle demo mode');
    }
  };

  if (!demoAuthorized) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      data-testid="demo-toggle"
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-300 border
        ${demoMode
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
          : 'bg-zinc-800/50 text-gray-400 border-zinc-700 hover:bg-zinc-700/50 hover:text-white'
        }
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
      `}
    >
      {demoMode ? <Monitor size={14} /> : <MonitorOff size={14} />}
      <span>{demoMode ? 'DEMO ON' : 'DEMO'}</span>
      <span className={`w-2 h-2 rounded-full ${demoMode ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`} />
    </button>
  );
};

export default DemoToggle;
