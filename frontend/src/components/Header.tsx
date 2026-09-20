import React, { useState } from 'react';
import { User } from '../services/api';
import { 
  TrendingUp, 
  ShieldAlert, 
  Trophy, 
  Bell, 
  Layers, 
  Sparkles, 
  LogOut, 
  User as UserIcon, 
  HelpCircle,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  activeView: 'landing' | 'market_select' | 'workspace';
  onNavigate: (view: 'landing' | 'market_select' | 'workspace') => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenLeaderboard: () => void;
  onOpenAlerts: () => void;
  onOpenTour: () => void;
  combinedNetWorth?: { total_inr: number; total_usd: number };
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeView,
  onNavigate,
  onOpenAuth,
  onLogout,
  onOpenLeaderboard,
  onOpenAlerts,
  onOpenTour,
  combinedNetWorth
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-dark-950/80 backdrop-blur-md border-b border-dark-700/60 px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate(user ? 'market_select' : 'landing')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-doji to-purple-700 flex items-center justify-center shadow-lg shadow-doji/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-white group-hover:text-doji-light transition-colors">
                  TradeSense
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-doji/20 text-doji-light border border-doji/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono -mt-0.5 hidden sm:block">
                Paper Trading Simulator
              </p>
            </div>
          </button>

          {/* Persistent PAPER TRADING BADGE */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>SIMULATION ONLY &bull; NO REAL MONEY</span>
          </div>

          {/* Nav links if logged in */}
          {user && (
            <nav className="hidden lg:flex items-center gap-2 text-sm text-slate-300">
              <button
                onClick={() => onNavigate('market_select')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeView === 'market_select'
                    ? 'bg-dark-800 text-white border border-dark-600'
                    : 'hover:text-white hover:bg-dark-850'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                Markets
              </button>

              <button
                onClick={onOpenLeaderboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-white hover:bg-dark-850 transition-colors"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                Leaderboard
              </button>

              <button
                onClick={onOpenAlerts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:text-white hover:bg-dark-850 transition-colors"
              >
                <Bell className="w-4 h-4 text-sky-400" />
                Price Alerts
              </button>
            </nav>
          )}
        </div>

        {/* Right: Net Worth, Doji Active Badge & User Profile */}
        <div className="flex items-center gap-3">
          
          {/* Combined Net Worth preview if logged in */}
          {user && combinedNetWorth && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-dark-850 border border-dark-700/80">
              <div className="text-right font-mono">
                <div className="text-[10px] uppercase text-slate-400 font-sans tracking-wider">Total Net Worth</div>
                <div className="text-xs font-bold text-bull">
                  ₹{combinedNetWorth.total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  <span className="text-slate-400 text-[10px] font-normal ml-1">
                    (${combinedNetWorth.total_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Doji AI Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-doji/10 border border-doji/30 text-doji-light text-xs font-mono animate-pulse-slow">
            <span className="w-2 h-2 rounded-full bg-doji animate-ping" />
            <Sparkles className="w-3 h-3 text-doji" />
            <span className="hidden sm:inline">Doji Active</span>
          </div>

          {/* Tour Help Button */}
          <button
            onClick={onOpenTour}
            title="Simulator Walkthrough Guide"
            className="p-1.5 rounded-lg bg-dark-850 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Auth buttons / User Avatar */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-dark-850 hover:bg-dark-750 border border-dark-700 transition-colors focus:outline-none"
              >
                <img
                  src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt={user.username}
                  className="w-7 h-7 rounded-lg bg-dark-700 p-0.5"
                />
                <span className="text-xs font-medium text-white max-w-[90px] truncate hidden md:block">
                  {user.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-dark-800 border border-dark-600 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-dark-700/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user.username}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenLeaderboard();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Global Leaderboard
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenAlerts();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5 text-sky-400" />
                    Price Alerts
                  </button>

                  <div className="border-t border-dark-700/80 my-1" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-bear hover:bg-bear/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-dark-800 hover:bg-dark-750 border border-dark-600 rounded-lg transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-doji to-indigo-600 hover:from-doji-dark hover:to-indigo-700 rounded-lg shadow-md shadow-doji/20 transition-all hover:scale-102"
              >
                Get Started
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
