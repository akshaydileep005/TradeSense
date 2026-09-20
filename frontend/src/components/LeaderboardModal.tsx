import React, { useEffect, useState } from 'react';
import { api, LeaderboardEntry } from '../services/api';
import { X, Trophy, Medal, Award, TrendingUp, Sparkles } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.getLeaderboard()
        .then((data) => setEntries(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-600 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-white">Global Paper Trading Leaderboard</h3>
            <p className="text-xs text-slate-400 font-mono">Rankings across all active multi-market simulators</p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">
            Loading rankings...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-dark-750 text-[11px]">
                  <th className="pb-2.5 font-medium">Rank</th>
                  <th className="pb-2.5 font-medium">Trader</th>
                  <th className="pb-2.5 font-medium">Total P&L %</th>
                  <th className="pb-2.5 font-medium">Win Rate</th>
                  <th className="pb-2.5 font-medium">Total Trades</th>
                  <th className="pb-2.5 font-medium text-right">Primary Market</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {entries.map((entry) => {
                  return (
                    <tr key={entry.rank} className="hover:bg-dark-800/60 transition-colors">
                      <td className="py-3 font-bold">
                        {entry.rank === 1 ? (
                          <span className="flex items-center gap-1 text-amber-400 font-extrabold">
                            <Medal className="w-4 h-4" /> #1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="flex items-center gap-1 text-slate-300 font-bold">
                            <Award className="w-4 h-4" /> #2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="flex items-center gap-1 text-amber-600 font-bold">
                            <Award className="w-4 h-4" /> #3
                          </span>
                        ) : (
                          <span className="text-slate-400">#{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={entry.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`}
                            alt={entry.username}
                            className="w-6 h-6 rounded-md bg-dark-750"
                          />
                          <span className="font-bold text-white">{entry.username}</span>
                        </div>
                      </td>
                      <td className="py-3 text-bull font-bold">
                        +{entry.total_pnl_pct.toFixed(1)}%
                      </td>
                      <td className="py-3 text-slate-200">
                        {entry.win_rate.toFixed(1)}%
                      </td>
                      <td className="py-3 text-slate-400">
                        {entry.total_trades}
                      </td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-dark-750 text-slate-300 text-[10px]">
                          {entry.favorite_market}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};
