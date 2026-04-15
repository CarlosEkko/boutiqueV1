import React, { useEffect, useRef, useCallback } from 'react';

const SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY;

const TurnstileWidget = ({ onVerify, onExpire, onError, className = '' }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current !== null) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme: 'dark',
      callback: (token) => onVerify?.(token),
      'expired-callback': () => {
        onExpire?.();
        onVerify?.('');
      },
      'error-callback': (err) => {
        onError?.(err);
        onVerify?.('');
      },
    });
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
};

export default TurnstileWidget;
