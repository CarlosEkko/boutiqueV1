import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Shield, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import * as pdfjsLib from 'pdfjs-dist';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Worker setup — try local first, fallback to matching CDN if local fails
// (production nginx may serve .mjs with wrong Content-Type or block CDN via CSP)
const PDFJS_VERSION = pdfjsLib.version || '5.6.205';
const LOCAL_WORKER = '/pdf.worker.min.mjs';
const CDN_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

// Probe local worker; switch to CDN if it returns wrong type or 404
(async () => {
  try {
    const res = await fetch(LOCAL_WORKER, { method: 'HEAD' });
    const ct = res.headers.get('content-type') || '';
    const okType = ct.includes('javascript') || ct.includes('module');
    if (!res.ok || !okType) {
      // Try CDN; if it's blocked by CSP, the loadPdf retry-without-worker will catch it
      pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
      console.warn('[PDFViewer] Local worker invalid, using CDN:', CDN_WORKER);
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER;
    }
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER;
  }
})();
// Set immediate default while probe runs
pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER;

/**
 * Protected Document Viewer - KBEX
 * Renders PDF as canvas (no download). 
 * Aggressive anti-screenshot: blur on ANY focus loss, Cmd+Shift combos, window blur.
 */
export default function ProtectedDocViewer({ url, title, userName, onClose }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1.5);
  const [pages, setPages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [shielded, setShielded] = useState(false);
  const [error, setError] = useState(null);
  const canvasRefs = useRef([]);

  const fullUrl = url.startsWith('http') ? url : API_URL + url;

  // Load PDF
  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First attempt with worker (whatever was configured globally)
      let pdf;
      try {
        pdf = await pdfjsLib.getDocument({ url: fullUrl }).promise;
      } catch (workerErr) {
        // Worker failed (CSP block, missing file, etc.) — retry without worker
        console.warn('[PDFViewer] Worker path failed, retrying without worker:', workerErr?.message);
        pdf = await pdfjsLib.getDocument({ url: fullUrl, disableWorker: true }).promise;
      }
      setTotalPages(pdf.numPages);
      const rendered = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        rendered.push(await pdf.getPage(i));
      }
      setPages(rendered);
    } catch (err) {
      console.error('PDF load error:', err);
      const msg = err?.message || 'erro desconhecido';
      setError(`Falha ao carregar o documento. ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [fullUrl]);

  useEffect(() => { loadPdf(); }, [loadPdf]);

  // Render pages to canvases
  useEffect(() => {
    if (pages.length === 0) return;
    pages.forEach(async (page, idx) => {
      const canvas = canvasRefs.current[idx];
      if (!canvas) return;
      const viewport = page.getViewport({ scale: zoom });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
    });
  }, [pages, zoom]);

  const activateShield = useCallback(() => {
    setShielded(true);
    // Shield stays on until user manually dismisses it
  }, []);

  const dismissShield = useCallback(() => {
    setShielded(false);
  }, []);

  // All protections
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Block Ctrl/Cmd + C, P, S, A, U
      if (
        (e.ctrlKey || e.metaKey) && ['c', 'p', 's', 'a', 'u'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key.toLowerCase() === 'p') activateShield();
        return false;
      }
      // Block Ctrl/Cmd + Shift + I, J, S (dev tools, screenshot)
      if (
        (e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 's', '3', '4', '5'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
        activateShield();
        return false;
      }
      // Block Cmd+Shift+3/4/5 (macOS screenshots) - these come as key codes
      if (e.metaKey && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        activateShield();
        return false;
      }
      // Block PrintScreen, F12
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        activateShield();
        navigator.clipboard.writeText('').catch(() => {});
        return false;
      }
    };

    const handleContextMenu = (e) => { e.preventDefault(); return false; };
    const handleDrag = (e) => { e.preventDefault(); return false; };

    // Window blur = user switched away or screenshot tool activated
    const handleWindowBlur = () => { activateShield(); };

    // Visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) activateShield();
    };

    // Block printing entirely
    const handleBeforePrint = (e) => { e.preventDefault(); activateShield(); };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDrag, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeprint', handleBeforePrint);

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Inject print-blocking CSS
    const style = document.createElement('style');
    style.id = 'kbex-print-block';
    style.textContent = `
      @media print {
        body * { display: none !important; visibility: hidden !important; }
        body { background: black !important; }
        body::after {
          display: block !important;
          visibility: visible !important;
          content: "KBEX - Impressao nao permitida";
          font-size: 32px;
          color: white;
          text-align: center;
          padding-top: 300px;
          background: black;
          position: fixed;
          inset: 0;
          z-index: 999999;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDrag, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      const s = document.getElementById('kbex-print-block');
      if (s) s.remove();
      if (shielded) return; // Don't remove listeners while shielded
    };
  }, [activateShield]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      data-testid="protected-doc-viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 relative z-20">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-gold-500" />
          <span className="text-white font-medium text-sm">{title || 'Documento Protegido'}</span>
          <span className="text-red-500/80 text-xs px-2 py-0.5 rounded bg-red-900/30 border border-red-800/30">Protegido</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0"><ZoomOut size={16} /></Button>
          <span className="text-zinc-400 text-xs w-14 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0"><ZoomIn size={16} /></Button>
          {totalPages > 0 && <span className="text-zinc-500 text-xs ml-2">{totalPages} pag.</span>}
          <div className="w-px h-6 bg-zinc-700 mx-2" />
          <Button variant="ghost" size="sm" onClick={onClose}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0" data-testid="close-doc-viewer"><X size={18} /></Button>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 relative overflow-auto">
        {/* SHIELD: Solid black overlay that hides everything on screenshot attempts */}
        <div
          className="absolute inset-0 z-40 transition-opacity duration-150 flex items-center justify-center"
          style={{
            opacity: shielded ? 1 : 0,
            pointerEvents: shielded ? 'all' : 'none',
            background: 'black',
          }}
        >
          <div className="text-center">
            <Shield className="text-gold-400 mx-auto mb-4" size={56} />
            <p className="text-white text-xl font-medium">Documento Protegido</p>
            <p className="text-gray-500 text-sm mt-2">Capturas de ecra e impressao nao sao permitidas.</p>
            <button
              onClick={dismissShield}
              className="mt-6 px-6 py-2.5 bg-gold-600 hover:bg-gold-500 text-black text-sm font-medium rounded-lg transition-colors"
              data-testid="dismiss-shield-btn"
            >
              Continuar a visualizar
            </button>
            <p className="text-gold-600/50 text-xs mt-4">KBEX.io</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">A carregar documento...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full px-8">
            <div className="text-center max-w-xl">
              <p className="text-red-400 mb-2 font-medium">{error}</p>
              <p className="text-zinc-500 text-xs mb-4 break-all">{fullUrl}</p>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 text-sm text-gold-400 border border-gold-500/30 rounded-lg hover:bg-gold-500/10"
              >
                Abrir num novo separador
              </a>
              <p className="text-zinc-600 text-xs mt-3">
                Se receber 404, o PDF não está no disco deste servidor. Volte a carregar via Admin → Transparency.
              </p>
            </div>
          </div>
        )}

        {/* Rendered PDF pages */}
        {!loading && !error && (
          <div className="flex flex-col items-center gap-4 p-6">
            {pages.map((_, idx) => (
              <div key={idx} className="relative shadow-2xl">
                <canvas
                  ref={el => canvasRefs.current[idx] = el}
                  className="rounded bg-white"
                  style={{ maxWidth: '100%' }}
                  onContextMenu={(e) => e.preventDefault()}
                  draggable={false}
                />
                {/* Per-page watermark */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='250'%3E%3Ctext x='50%25' y='50%25' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='rgba(180,160,100,0.10)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 175 125)'%3EKBEX%3C/text%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between relative z-20">
        <span className="text-zinc-600 text-xs">
          Documento confidencial. Download, impressao e captura de ecra desativados.
        </span>
        <span className="text-zinc-600 text-xs">
          {userName || 'KBEX User'} | KBEX.io
        </span>
      </div>
    </div>
  );
}
