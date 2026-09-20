import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Quote } from '../services/api';

interface LastTick {
  symbol: string;
  price: number;
  timestamp: number;
}

interface PriceContextType {
  quotes: Record<string, Quote>;
  isConnected: boolean;
  lastTick: LastTick | null;
  subscribeToNotifications: (callback: (events: string[]) => void) => () => void;
}

const PriceContext = createContext<PriceContextType>({
  quotes: {},
  isConnected: false,
  lastTick: null,
  subscribeToNotifications: () => () => {},
});

// Helper to determine accurate WebSocket endpoint
export function getWebSocketUrl(): string {
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  // If VITE_API_URL is configured (e.g. https://tradesense-api.onrender.com/api), convert to wss://
  if (import.meta.env.VITE_API_URL) {
    try {
      const url = new URL(import.meta.env.VITE_API_URL);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws/prices`;
    } catch {
      // Fallback below
    }
  }

  return isBrowser && !isLocalhost
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/prices`
    : 'ws://localhost:8000/ws/prices';
}

export const PriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastTick, setLastTick] = useState<LastTick | null>(null);

  const notificationListenersRef = useRef<Set<(events: string[]) => void>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Subscribe to trade notifications (SL/TP/liquidation alerts)
  const subscribeToNotifications = useCallback((callback: (events: string[]) => void) => {
    notificationListenersRef.current.add(callback);
    return () => {
      notificationListenersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let reconnectDelay = 1000;

    const connect = () => {
      if (!isMountedRef.current) return;

      const wsUrl = getWebSocketUrl();
      console.log(`[TradeSense WS] Establishing price stream connection to: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        console.log('[TradeSense WS] Connection established (101 Handshake succeeded)');
        setIsConnected(true);
        reconnectDelay = 1000; // reset backoff

        // Setup ping heartbeat every 20 seconds to prevent cloud proxy timeouts
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          
          // Debug log of incoming parsed message (verifies JSON field names match state schema)
          console.log('[TradeSense WS] Raw parsed message:', msg);

          if (msg.type === 'tick' && msg.data && msg.data.symbol) {
            const quote: Quote = msg.data;

            // Trigger React state update function
            setQuotes((prev) => ({
              ...prev,
              [quote.symbol]: quote,
            }));

            setLastTick({
              symbol: quote.symbol,
              price: quote.price,
              timestamp: quote.timestamp,
            });
          } else if (msg.type === 'notification' && Array.isArray(msg.events)) {
            notificationListenersRef.current.forEach((listener) => {
              try {
                listener(msg.events);
              } catch (err) {
                console.error('[TradeSense WS] Notification listener error:', err);
              }
            });
          }
        } catch (err) {
          console.error('[TradeSense WS] Parse error on incoming frame:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[TradeSense WS] Socket encountered error:', err);
      };

      ws.onclose = (ev) => {
        if (!isMountedRef.current) return;
        console.warn(`[TradeSense WS] Socket closed (code: ${ev.code}, reason: ${ev.reason || 'none'}). Reconnecting in ${reconnectDelay}ms...`);
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Schedule reconnect with exponential backoff capped at 10 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 1.5, 10000);
          connect();
        }, reconnectDelay);
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <PriceContext.Provider value={{ quotes, isConnected, lastTick, subscribeToNotifications }}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePriceContext = () => useContext(PriceContext);
export const useQuotes = () => useContext(PriceContext).quotes;
export const useQuote = (symbol: string): Quote | undefined => {
  const { quotes } = useContext(PriceContext);
  return quotes[symbol];
};
export const useLastTick = () => useContext(PriceContext).lastTick;
export const useIsConnected = () => useContext(PriceContext).isConnected;
