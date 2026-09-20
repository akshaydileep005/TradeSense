import React, { useState, useEffect } from 'react';
import { api, User, NewsItem } from './services/api';
import { PriceProvider, usePriceContext } from './context/PriceContext';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { MarketSelectionPage } from './pages/MarketSelectionPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AuthModal } from './components/AuthModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import { OnboardingTour } from './components/OnboardingTour';
import { Bell, Check, AlertCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'landing' | 'market_select' | 'workspace'>('landing');
  const [selectedMarket, setSelectedMarket] = useState<'nse' | 'forex' | 'commodities' | 'crypto'>('nse');
  
  // Real-time market state from PriceProvider
  const { quotes, subscribeToNotifications } = usePriceContext();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [combinedNetWorth, setCombinedNetWorth] = useState<{ total_inr: number; total_usd: number } | undefined>(undefined);
  const [portfolios, setPortfolios] = useState<Record<string, any>>({});
  
  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warning' }[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 1. Check existing session on load
  useEffect(() => {
    if (api.getToken()) {
      api.getMe()
        .then((userData) => {
          setUser(userData);
          setActiveView('market_select');
          refreshPortfolioData();
        })
        .catch(() => {
          api.logout();
        });
    }

    // Fetch initial news
    api.getNews().then(setNews).catch(console.error);
  }, []);

  // 2. Subscribe to WebSocket notification events (liquidations, triggers)
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((events) => {
      events.forEach((evt) => {
        addToast(evt, evt.includes("LIQUIDATED") ? 'warning' : 'success');
      });
      refreshPortfolioData();
    });
    return unsubscribe;
  }, [subscribeToNotifications]);

  // Refresh user net worth and portfolios
  const refreshPortfolioData = async () => {
    if (!api.getToken()) return;
    try {
      const data = await api.getCombinedNetWorth();
      setCombinedNetWorth({ total_inr: data.total_inr, total_usd: data.total_usd });
      setPortfolios(data.portfolios);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth actions
  const handleAuthSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    setActiveView('market_select');
    refreshPortfolioData();
    addToast(`Welcome, ${loggedUser.username}! Your portfolios are active.`, 'success');
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setActiveView('landing');
    addToast('Signed out of TradeSense', 'info');
  };

  const handleDemoLogin = async () => {
    try {
      const res = await api.demoLogin();
      handleAuthSuccess(res.user);
    } catch (err: any) {
      addToast(err.message || 'Failed to start demo', 'warning');
    }
  };

  const handleSelectMarket = (market: 'nse' | 'forex' | 'commodities' | 'crypto') => {
    setSelectedMarket(market);
    setActiveView('workspace');
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col font-sans">
      
      {/* Top Persistent Header */}
      <Header
        user={user}
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenTour={() => setTourOpen(true)}
        combinedNetWorth={combinedNetWorth}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'landing' && (
          <LandingPage
            onStartTrading={() => {
              if (user) {
                setActiveView('market_select');
              } else {
                setAuthModalOpen(true);
              }
            }}
            onDemoLogin={handleDemoLogin}
            news={news}
            quotes={quotes}
          />
        )}

        {activeView === 'market_select' && (
          <MarketSelectionPage
            portfolios={portfolios}
            quotes={quotes}
            onSelectMarket={handleSelectMarket}
          />
        )}

        {activeView === 'workspace' && (
          <WorkspacePage
            market={selectedMarket}
            onBackToMarketSelect={() => setActiveView('market_select')}
            quotes={quotes}
            onRefreshData={refreshPortfolioData}
          />
        )}
      </main>

      {/* Toast Notifications Overlay */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-2xl border text-xs font-mono flex items-center gap-2.5 backdrop-blur-md animate-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-bull/15 text-bull border-bull/30'
                : toast.type === 'warning'
                ? 'bg-bear/15 text-bear border-bear/30'
                : 'bg-dark-850 text-white border-dark-700'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 shrink-0 text-doji-light" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <LeaderboardModal
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />

      <PriceAlertsModal
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        defaultMarket={selectedMarket}
        currency={selectedMarket === 'nse' ? '₹' : '$'}
      />

      <OnboardingTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PriceProvider>
      <AppContent />
    </PriceProvider>
  );
};

export default App;


