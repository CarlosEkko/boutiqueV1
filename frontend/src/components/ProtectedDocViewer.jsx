import { useState, useEffect, useRef } from 'react';
import { X, Shield, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Protected Document Viewer
 * - Disables right-click context menu
 * - Disables copy/paste/print keyboard shortcuts (Ctrl+C, Ctrl+P, Ctrl+S, PrintScreen)
 * - Applies CSS user-select: none to prevent text selection
 * - Adds dynamic watermark overlay with user's name/email
 * - Prevents drag & drop
 * - Renders PDF in an iframe with sandbox restrictions
 */
export default function ProtectedDocViewer({ url, title, userName, onClose }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    // Prevent keyboard shortcuts
    const handleKeyDown = (e) => {
      // Block Ctrl+C, Ctrl+P, Ctrl+S, Ctrl+A, Ctrl+Shift+I, PrintScreen
      if (
        (e.ctrlKey && ['c', 'p', 's', 'a', 'u'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen' ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Prevent context menu (right-click)
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent drag
    const handleDrag = (e) => {
      e.preventDefault();
      return false;
    };

    // Blur on PrintScreen
    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        // Replace clipboard content
        navigator.clipboard.writeText('Screenshots are not allowed for protected documents.').catch(() => {});
      }
    };

    // Detect visibility change (alt+tab for screenshot tools)
    const handleVisibilityChange = () => {
      // Could add blur overlay here if needed
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('dragstart', handleDrag, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Disable text selection on body while viewer is open
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('dragstart', handleDrag, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  const watermarkText = userName || 'KBEX Confidential';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
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
          <span className="text-zinc-500 text-xs px-2 py-0.5 rounded bg-zinc-800">Visualização Protegida</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.max(50, z - 25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="text-zinc-400 text-xs w-12 text-center">{zoom}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(z => Math.min(200, z + 25))}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0"
          >
            <ZoomIn size={16} />
          </Button>
          <div className="w-px h-6 bg-zinc-700 mx-2" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-white h-8 w-8 p-0"
            data-testid="close-doc-viewer"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Document area with watermark overlay */}
      <div className="flex-1 relative overflow-auto">
        {/* PDF iframe */}
        <div className="flex justify-center p-4" style={{ minHeight: '100%' }}>
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
            title={title}
            className="bg-white rounded shadow-2xl"
            style={{
              width: `${zoom}%`,
              maxWidth: '1200px',
              height: 'calc(100vh - 120px)',
              border: 'none',
              pointerEvents: 'auto',
            }}
            sandbox="allow-same-origin"
          />
        </div>

        {/* Watermark overlay - covers the entire document area */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ zIndex: 10 }}
        >
          {/* Repeating diagonal watermark pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='rgba(128,128,128,0.08)' text-anchor='middle' dominant-baseline='middle' transform='rotate(-35 200 150)'%3E${encodeURIComponent(watermarkText)}%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
        </div>

        {/* Semi-transparent protection overlay - prevents screenshot clarity */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
          style={{
            zIndex: 11,
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.03) 100%)',
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-zinc-600 text-xs">
          Este documento é confidencial. Cópia, impressão e captura de ecrã estão desativadas.
        </span>
        <span className="text-zinc-600 text-xs">
          Visualizado por: {watermarkText}
        </span>
      </div>
    </div>
  );
}
