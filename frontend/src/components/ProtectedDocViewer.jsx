import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Shield, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import * as pdfjsLib from 'pdfjs-dist';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Use local worker file copied to public dir
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Protected Document Viewer - KBEX
 * Renders PDF as canvas images (no download possible).
 * Blocks: right-click, Ctrl+P/S/C, PrintScreen, print CSS, visibility blur.
 */
export default function ProtectedDocViewer({ url, title, userName, onClose }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1.5);
  const [pages, setPages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blurred, setBlurred] = useState(false);
  const [error, setError] = useState(null);
  const canvasRefs = useRef([]);

  const fullUrl = url.startsWith('http') ? url : API_URL + url;

  // Load PDF and render all pages to canvas
  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pdf = await pdfjsLib.getDocument(fullUrl).promise;
      setTotalPages(pdf.numPages);
      const rendered = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        rendered.push(page);
      }
      setPages(rendered);
    } catch (err) {
      console.error('PDF load error:', err);
      setError('Falha ao carregar o documento.');
    } finally {
      setLoading(false);
    }
  }, [fullUrl]);

  useEffect(() => { loadPdf(); }, [loadPdf]);

  // Render pages to canvases when pages or zoom change
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

  // Anti-screenshot, anti-print, anti-copy protections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && ['c', 'p', 's', 'a', 'u'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 's'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['c', 'p', 's', 'a'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen' || e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('').catch(() => {});
        setBlurred(true);
        setTimeout(() => setBlurred(false), 2000);
      }
    };

    const handleContextMenu = (e) => { e.preventDefault(); return false; };
    const handleDrag = (e) => { e.preventDefault(); return false; };

    // Blur on tab switch (screenshot tools, alt+tab)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setBlurred(true);
      } else {
        setTimeout(() => setBlurred(false), 800);
      }
    };

    // Block beforeprint
    const handleBeforePrint = (e) => {
      e.preventDefault();
      setBlurred(true);
    };
    const handleAfterPrint = () => {
      setBlurred(false);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDrag, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // Inject print-blocking CSS
    const style = document.createElement('style');
    style.id = 'kbex-print-block';
    style.textContent = `
      @media print {
        * { display: none !important; }
        body::before {
          display: block !important;
          content: "Impressao nao permitida - KBEX.io";
          font-size: 24px;
          text-align: center;
          padding-top: 200px;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDrag, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      const s = document.getElementById('kbex-print-block');
      if (s) s.remove();
    };
  }, []);

  const watermarkText = 'KBEX';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      data-testid="protected-doc-viewer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-gold-500" />
          <span className="text-white font-medium text-sm">{title || 'Documento Protegido'}</span>
          <span className="text-zinc-500 text-xs px-2 py-0.5 rounded bg-zinc-800">Protegido</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0">
            <ZoomOut size={16} />
          </Button>
          <span className="text-zinc-400 text-xs w-14 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0">
            <ZoomIn size={16} />
          </Button>
          {totalPages > 0 && (
            <span className="text-zinc-500 text-xs ml-2">{totalPages} pag.</span>
          )}
          <div className="w-px h-6 bg-zinc-700 mx-2" />
          <Button variant="ghost" size="sm" onClick={onClose}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0" data-testid="close-doc-viewer">
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Document area */}
      <div className="flex-1 relative overflow-auto">
        {/* Blur shield on screenshot attempt */}
        {blurred && (
          <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
            <div className="text-center">
              <Shield className="text-gold-400 mx-auto mb-3" size={48} />
              <p className="text-white text-lg font-medium">Documento Protegido</p>
              <p className="text-gray-400 text-sm mt-1">Capturas de ecra nao sao permitidas</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">A carregar documento...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Rendered PDF pages as canvas */}
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
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='350' height='250'%3E%3Ctext x='50%25' y='50%25' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='rgba(180,160,100,0.10)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 175 125)'%3E${encodeURIComponent(watermarkText)}%3C/text%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
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
