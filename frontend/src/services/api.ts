// API client service for TradeSense
const API_BASE = "http://localhost:8000/api";
const WS_BASE = "ws://localhost:8000/ws/prices";

export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  created_at: string;
}

export interface PortfolioStats {
  id: string;
  market: string;
  balance: number;
  initial_balance: number;
  currency: string;
  last_recharge_at?: string;
  equity: number;
  margin_used: number;
  free_margin: number;
  unrealized_pnl: number;
  realized_pnl: number;
  win_rate: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  largest_win: number;
  largest_loss: number;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
  base: string;
  type: string;
  sector: string;
  market: string;
  currency: string;
}

export interface Quote {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  volume: number;
  currency: string;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  id: string;
  portfolio_id: string;
  symbol: string;
  market: string;
  side: "buy" | "sell";
  quantity: number;
  entry_price: number;
  current_price: number;
  leverage: number;
  margin_used: number;
  liquidation_price?: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  requested_price?: number;
  slippage?: number;
  status: string;
  opened_at: string;
}

export interface Order {
  id: string;
  portfolio_id: string;
  symbol: string;
  market: string;
  side: "buy" | "sell";
  order_type: "market" | "limit";
  price: number;
  requested_price?: number;
  executed_price?: number;
  slippage?: number;
  slippage_pct?: number;
  quantity: number;
  leverage: number;
  stop_loss?: number;
  take_profit?: number;
  status: string;
  created_at: string;
  filled_at?: string;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  market: string;
  side: "buy" | "sell";
  quantity: number;
  entry_price: number;
  exit_price: number;
  leverage: number;
  realized_pnl: number;
  return_pct: number;
  holding_seconds: number;
  close_reason: string;
  opened_at: string;
  closed_at: string;
}

export interface DojiAnalysis {
  symbol: string;
  market: string;
  timeframe: string;
  signal_type: "bullish" | "bearish" | "neutral";
  confidence: number;
  current_price: number;
  suggested_entry: number;
  suggested_stop_loss: number;
  suggested_take_profit: number;
  risk_reward_ratio: number;
  support_zone: [number, number];
  resistance_zone: [number, number];
  rationale: string;
  indicators: {
    rsi: number;
    rsi_status: string;
    macd_histogram: number;
    macd_signal: string;
    ema_trend: string;
    bollinger_position: string;
    atr: number;
  };
  created_at: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  url: string;
  summary: string;
  thumbnail?: string;
  related_symbols: string[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url?: string;
  total_pnl_pct: number;
  win_rate: number;
  total_trades: number;
  favorite_market: string;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("tradesense_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("tradesense_token", token);
    } else {
      localStorage.removeItem("tradesense_token");
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Network request failed" }));
      throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  async register(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async login(data: any): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async demoLogin(): Promise<{ access_token: string; user: User }> {
    const res = await this.request<{ access_token: string; user: User }>("/auth/demo-login", {
      method: "POST",
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  logout() {
    this.setToken(null);
  }

  // Portfolio
  async getPortfolioStats(market: string): Promise<PortfolioStats> {
    return this.request<PortfolioStats>(`/portfolio/stats/${market}`);
  }

  async getCombinedNetWorth(): Promise<{ total_inr: number; total_usd: number; portfolios: Record<string, PortfolioStats> }> {
    return this.request<{ total_inr: number; total_usd: number; portfolios: Record<string, PortfolioStats> }>("/portfolio/net-worth");
  }

  async recharge(market: string): Promise<{ success: boolean; message: string; balance: number }> {
    return this.request<{ success: boolean; message: string; balance: number }>(`/portfolio/recharge/${market}`, {
      method: "POST",
    });
  }

  // Market
  async getSymbols(market: string): Promise<SymbolInfo[]> {
    return this.request<SymbolInfo[]>(`/market/symbols?market=${market}`);
  }

  async getQuote(symbol: string): Promise<Quote> {
    return this.request<Quote>(`/market/quote/${encodeURIComponent(symbol)}`);
  }

  async getCandles(symbol: string, timeframe: string = "15m"): Promise<Candle[]> {
    return this.request<Candle[]>(`/market/candles/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
  }

  async getNews(): Promise<NewsItem[]> {
    return this.request<NewsItem[]>("/market/news");
  }

  // Orders
  async placeOrder(data: {
    market: string;
    symbol: string;
    side: "buy" | "sell";
    order_type: "market" | "limit";
    quantity: number;
    price?: number;
    requested_price?: number;
    leverage: number;
    stop_loss?: number;
    take_profit?: number;
  }): Promise<{
    success: boolean;
    message: string;
    executed_price?: number;
    requested_price?: number;
    slippage?: number;
    position?: Position;
    order?: Order;
  }> {
    return this.request<{
      success: boolean;
      message: string;
      executed_price?: number;
      requested_price?: number;
      slippage?: number;
      position?: Position;
      order?: Order;
    }>("/orders/place", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPositions(market: string): Promise<Position[]> {
    return this.request<Position[]>(`/orders/positions?market=${market}`);
  }

  async closePosition(positionId: string): Promise<{ success: boolean; message: string; trade?: TradeHistory }> {
    return this.request<{ success: boolean; message: string; trade?: TradeHistory }>(`/orders/close/${positionId}`, {
      method: "POST",
    });
  }

  async getPendingOrders(market: string): Promise<Order[]> {
    return this.request<Order[]>(`/orders/pending?market=${market}`);
  }

  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/orders/cancel/${orderId}`, {
      method: "POST",
    });
  }

  async getTradeHistory(market: string, symbol?: string): Promise<TradeHistory[]> {
    const symQuery = symbol ? `&symbol=${encodeURIComponent(symbol)}` : "";
    return this.request<TradeHistory[]>(`/orders/history?market=${market}${symQuery}`);
  }

  getExportCsvUrl(market: string): string {
    return `${API_BASE}/orders/export-csv?market=${market}`;
  }

  // Doji AI
  async analyzeWithDoji(symbol: string, market: string, timeframe: string = "15m"): Promise<DojiAnalysis> {
    return this.request<DojiAnalysis>(`/doji/analyze?symbol=${encodeURIComponent(symbol)}&market=${market}&timeframe=${timeframe}`);
  }

  // Leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.request<LeaderboardEntry[]>("/leaderboard");
  }

  // Price Alerts
  async getAlerts(): Promise<any[]> {
    return this.request<any[]>("/alerts");
  }

  async createAlert(data: { symbol: string; market: string; target_price: number; condition: string }): Promise<any> {
    return this.request<any>("/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteAlert(alertId: string): Promise<any> {
    return this.request<any>(`/alerts/${alertId}`, {
      method: "DELETE",
    });
  }

  // WebSocket connection
  createWebSocket(onTick: (quote: Quote) => void, onNotification: (events: string[]) => void): WebSocket {
    const ws = new WebSocket(WS_BASE);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "tick") {
          onTick(msg.data);
        } else if (msg.type === "notification") {
          onNotification(msg.events);
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };
    return ws;
  }
}

export const api = new ApiService();
