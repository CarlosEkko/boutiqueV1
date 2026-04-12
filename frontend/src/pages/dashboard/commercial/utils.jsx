export const API_URL = process.env.REACT_APP_BACKEND_URL;

export const CHART_COLORS = ['#D4AF37', '#60A5FA', '#34D399', '#F97316', '#A78BFA', '#F87171', '#38BDF8', '#FBBF24'];

export const formatCurrency = (v) => {
  if (!v) return '€0';
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `€${(v / 1e3).toFixed(1)}K`;
  return `€${v.toFixed(0)}`;
};

export const formatNumber = (v) => {
  if (!v) return '0';
  return v.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
};

export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: <span className="font-mono font-medium">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};
