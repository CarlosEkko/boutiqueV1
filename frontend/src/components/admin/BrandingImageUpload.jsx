import { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Upload, Image as ImageIcon, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * BrandingImageUpload — reusable uploader for tenant logos/favicons.
 *
 * Posts the file to `/api/uploads/file` with `category=branding`, then calls
 * `onChange(url)` with the resulting absolute URL. Accepts either a URL
 * string (legacy) or a fresh upload.
 *
 * Props:
 *   value: string          — current URL (may be "" or absolute or relative)
 *   onChange: (url) => void
 *   label: string          — field label
 *   accept?: string        — MIME filter (default "image/*,.ico,.svg")
 *   maxSizeKb?: number     — default 2048 (2MB — logos/favicons should be tiny)
 *   aspect?: "logo" | "square"  — preview styling hint
 *   testId?: string
 */
export default function BrandingImageUpload({
  value,
  onChange,
  label,
  accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/vnd.microsoft.icon,image/x-icon,.ico,.svg',
  maxSizeKb = 2048,
  aspect = 'logo',
  testId,
}) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const inputRef = useRef(null);

  // Build a full URL from either a relative (/api/uploads/...) or absolute value.
  const previewUrl = value
    ? (value.startsWith('http') ? value : `${API_URL}${value}`)
    : '';

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > maxSizeKb * 1024) {
      toast.error(`Ficheiro demasiado grande (máx ${(maxSizeKb / 1024).toFixed(1)}MB)`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', 'branding');
      const res = await axios.post(
        `${API_URL}/api/uploads/file`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      if (res.data?.url) {
        onChange(res.data.url);
        toast.success('Ficheiro carregado');
      } else {
        throw new Error('no_url');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Falha ao carregar ficheiro');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => onChange('');

  return (
    <div className="space-y-2">
      <label className="text-xs text-zinc-400 block">{label}</label>

      <div
        className={`border border-dashed border-zinc-700 rounded-lg p-3 bg-zinc-900/60 transition-colors hover:border-gold-700/60 ${
          previewUrl ? '' : 'text-center'
        }`}
        data-testid={testId}
      >
        {previewUrl ? (
          <div className="flex items-center gap-3">
            <div
              className={`shrink-0 rounded bg-zinc-800 flex items-center justify-center overflow-hidden ${
                aspect === 'square' ? 'w-12 h-12' : 'w-16 h-10'
              }`}
            >
              <img
                src={previewUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-300 truncate font-mono" title={value}>
                {value}
              </div>
              <div className="text-[10px] text-zinc-500">Carregado ·
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="ml-1 text-gold-400 hover:underline"
                >
                  Substituir
                </button>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-4">
            {uploading ? (
              <Loader2 size={18} className="animate-spin text-gold-400" />
            ) : (
              <ImageIcon size={18} className="text-zinc-500" />
            )}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-gold-400 hover:text-gold-300 font-medium flex items-center gap-1.5 disabled:opacity-60"
            >
              <Upload size={14} />
              {uploading ? 'A carregar…' : 'Carregar ficheiro'}
            </button>
            <span className="text-[11px] text-zinc-600">ou</span>
            <button
              type="button"
              onClick={() => setShowUrlFallback((s) => !s)}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <LinkIcon size={12} /> colar URL
            </button>
          </div>
        )}
      </div>

      {showUrlFallback && !previewUrl && (
        <input
          type="url"
          placeholder="https://…/logo.svg"
          className="w-full text-xs font-mono bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-gold-700"
          onBlur={(e) => { if (e.target.value) onChange(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.value) {
              onChange(e.target.value);
              setShowUrlFallback(false);
            }
          }}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
