import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DemoToggle = () => {
  const { token } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/demo/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      setAuthorized(data.demo_authorized);
    } catch {
      setAuthorized(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) checkStatus();
  }, [token, checkStatus]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/demo/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDemoMode(data.demo_mode);
      toast.success(data.demo_mode ? 'Demo Mode ON' : 'Demo Mode OFF');
      // Reload to refresh data
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to toggle demo mode');
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) return null;

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
