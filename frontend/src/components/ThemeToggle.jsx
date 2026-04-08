import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    const order = ['dark', 'light', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const icon = theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <Monitor size={18} />;
  const label = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto';

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
        text-gray-400 hover:text-gold-400 hover:bg-gold-500/10 border border-transparent hover:border-gold-800/30"
      data-testid="theme-toggle-btn"
      title={`Theme: ${label}`}
    >
      {icon}
      {!compact && <span className="hidden lg:inline">{label}</span>}
    </button>
  );
};

export default ThemeToggle;
