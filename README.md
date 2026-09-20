# TradeSense — AI-Assisted Paper Trading Simulator

> **"Master the Markets. Guided by Intelligence."**  
> A production-grade, full-stack fintech paper trading web application simulating real-time market execution across **NSE, Forex, Commodities, and Crypto** with isolated multi-market portfolios and an integrated AI quantitative co-pilot named **"Doji"** that overlays technical analysis, entry/exit signals, dynamic support/resistance zones, and plain-English rationales directly onto the charts.

---

## Key Features

1. **Multi-Market Trading Terminals (Isolated Portfolios & Balances)**
   - **NSE (Indian Equities)**: Dedicated starting virtual balance of **₹10,00,000** (INR). Tickers restricted to Indian equities and indices (`RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `INFY.NS`, `^NSEI` Nifty 50, etc.). Up to 5x intraday leverage.
   - **Forex (Global Currencies)**: Dedicated starting virtual balance of **$200,000** (USD). Major and cross currency pairs (`EURUSD=X`, `GBPUSD=X`, `USDJPY=X`, `AUDUSD=X`, etc.). Up to 20x leverage.
   - **Commodities (Metals & Energy)**: Dedicated starting virtual balance of **$200,000** (USD). Precious metals and energies (`GC=F` Gold, `SI=F` Silver, `CL=F` Crude Oil, `NG=F` Natural Gas, `HG=F` Copper). Up to 10x leverage.
   - **Crypto (Digital Assets)**: Dedicated starting virtual balance of **$200,000** (USD). Decentralized blue-chips and Layer 1 ecosystems (`BTC-USD`, `ETH-USD`, `SOL-USD`, `BNB-USD`, etc.). Up to 20x leverage.

2. **Doji AI Quantitative Co-Pilot**
   - **On-Demand Chart Overlays**: Click the floating action button to scan the currently active instrument and timeframe.
   - **Direct Chart Annotations**: Renders suggested Entry point flags, Stop Loss (dashed red), and Take Profit (dashed green) directly on the same TradingView Lightweight Chart.
   - **Support & Resistance Mapping**: Algorithmic peak/trough clustering computes and highlights active institutional price zones.
   - **Confidence Scoring & Confluence Factor Readings**: 0–100% confidence badge based on multi-indicator alignment (RSI 14, MACD 12/26/9, EMA 20/50/200, Bollinger Bands, ATR 14).
   - **Plain-English Trade Rationale**: Not a black box. Doji generates human-readable explanations detailing *why* the setup was recommended.
   - **1-Click "Adopt Setup"**: Automatically transfers Doji's suggested Entry, Stop Loss, and Take Profit levels into the order execution panel.
   - **Doji vs You**: Performance comparison metric tracking execution quality against the AI's recommendations.

3. **TradingView Lightweight Charts & Visual Terminal**
   - Candlestick series with volume histogram.
   - Interactive timeframe selector (`1m`, `5m`, `15m`, `1h`, `1D`).
   - Technical indicator overlays toggleable on chart: EMA (20 & 50), Bollinger Bands (20, 2 std).
   - **Fullscreen Chart Mode**: One-click fullscreen expand button with floating controls for professional technical charting.
   - Custom markers for executed orders and Doji signals.

4. **Order Execution & Financial Precision**
   - **Order Types**: Market Execution (instant fill) and Limit Orders (placed in pending book and auto-filled when market price crosses).
   - **Position Management**: Live mark price, real-time unrealized P&L in currency and percentage, leverage multiplier, margin used, liquidation price, SL/TP levels, and Market Close button.
   - **Trade History / Journal**: Records closed trades with entry/exit prices, holding duration, return %, and a **1-click CSV Export** button.
   - **Recharge Balance**: Restores virtual dummy funds with cooldown protection.

5. **Gamification & Social Features**
   - **Global Leaderboard**: Top paper traders ranked by overall P&L % and win rate.
   - **Price Alerts**: Set target price alerts that trigger real-time notifications when hit.
   - **First-Time Trader Tour**: Interactive 3-step walkthrough explaining simulator mechanics, leverage, and Doji co-pilot.
   - **Persistent Paper Trading Badge**: Unambiguous visual indicators ensuring users always know this is an educational simulator with zero real financial risk.

---

## Mathematical & Financial Formulations

TradeSense uses strict mathematical formulas across all calculations:

- **Long Position P&L**:
  $$\text{Unrealized P\&L} = (\text{Current Price} - \text{Entry Price}) \times \text{Quantity}$$
  $$\text{Return \%} = \frac{\text{Current Price} - \text{Entry Price}}{\text{Entry Price}} \times 100 \times \text{Leverage}$$

- **Short Position P&L**:
  $$\text{Unrealized P\&L} = (\text{Entry Price} - \text{Current Price}) \times \text{Quantity}$$
  $$\text{Return \%} = \frac{\text{Entry Price} - \text{Current Price}}{\text{Entry Price}} \times 100 \times \text{Leverage}$$

- **Margin Required**:
  $$\text{Margin Required} = \frac{\text{Quantity} \times \text{Execution Price}}{\text{Leverage}}$$

- **Free Margin**:
  $$\text{Free Margin} = \text{Equity} - \text{Margin Used}$$

- **Liquidation Price**:
  - Long Position:
    $$\text{Liq Price} = \text{Entry Price} \times \left(1 - \frac{1}{\text{Leverage}} + \text{Maintenance Margin \%}\right)$$
  - Short Position:
    $$\text{Liq Price} = \text{Entry Price} \times \left(1 + \frac{1}{\text{Leverage}} - \text{Maintenance Margin \%}\right)$$

---

## Market Data Pipeline

TradeSense employs a robust market data ingestion architecture:
1. **Real Historical & Quote Feed**: Uses `yfinance` to retrieve authentic historical OHLCV data across Indian Equities (`.NS`), Forex (`=X`), Commodities (`=F`), and Crypto (`-USD`).
2. **In-Memory Cache & Fallback**: Bar arrays and quotes are cached with high-performance TTL invalidation, with built-in realistic price generators if Yahoo rate limits or network issues arise.
3. **WebSocket Live Broadcaster**: Connects via `/ws/prices` to stream real-time price ticks to open charts, compute live P&L on active positions, and evaluate Limit Order / Stop Loss / Take Profit triggers automatically.
4. **Live Market News**: Real-time financial news headlines aggregated for macro trading context.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Charts** | TradingView Lightweight Charts (v5) |
| **Backend** | Python FastAPI (Async), WebSockets, Pydantic v2 |
| **Database** | SQLite (`aiosqlite`) by default; PostgreSQL (`asyncpg`) ready |
| **AI Engine** | Quantitative Technical Analysis Engine (RSI, MACD, EMA, Bollinger, ATR, S/R Clustering) |
| **Deployment** | Docker Compose, Dockerfiles for FastAPI & Nginx, Railway/Render compatible |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 20+

### Option A: 1-Click Launch (Windows)
Double-click `start_dev.bat` in the project root directory. It will start both the FastAPI backend and Vite frontend automatically!

### Option B: Manual Setup

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be available at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be live at `http://localhost:5173`.

#### 3. Instant Demo Access
Click the **"Instant Demo Trader Access (1-Click)"** button on the landing page or login modal to immediately enter the terminal with all 4 seeded portfolios.

---

## Docker Deployment (Production / Docker Compose)

To launch the full stack with PostgreSQL, Redis, FastAPI, and Nginx in Docker:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

### Deploying to Railway / Render
1. Connect this repository to Railway or Render.
2. Deploy the backend using `Dockerfile.backend` with environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SECRET_KEY`: Long random JWT secret
3. Deploy the frontend using `Dockerfile.frontend` pointing its API endpoint to the deployed backend URL.

---

## Project Structure

```
TradeSense/
├── backend/
│   ├── app/
│   │   ├── api/             # API routes: auth, portfolio, market, orders, doji, alerts, leaderboard, ws
│   │   ├── core/            # Config, database session, JWT security
│   │   ├── models/          # SQLAlchemy async models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Trading engine, Doji AI, market data, news, portfolio
│   │   └── main.py          # FastAPI application entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # TradingViewChart, OrderPanel, WatchlistPanel, BottomTerminalTabs, DojiPanel, Modals
│   │   ├── pages/           # LandingPage, MarketSelectionPage, WorkspacePage
│   │   ├── services/        # API client & WebSocket streaming service
│   │   ├── App.tsx          # Root app orchestration & real-time state
│   │   └── index.css        # Fintech dark styling & glassmorphism
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
├── start_dev.bat
└── README.md
```

---

## Educational Disclaimer
*TradeSense is a paper trading simulator designed exclusively for educational, informational, and research purposes. No real money is deposited, utilized, or at risk. Virtual performance is not indicative of real-market financial results.*
