import React, { useState } from 'react';
import { api, User } from '../services/api';
import { X, TrendingUp, Sparkles, Play, ShieldAlert, Lock, Mail, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({ email, username, password });
        onSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.demoLogin();
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-600 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
        
        {/* Top close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo and title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-doji to-purple-700 flex items-center justify-center shadow-lg shadow-doji/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">
              {isRegister ? 'Create TradeSense Account' : 'Welcome to TradeSense'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {isRegister ? 'Start paper trading in seconds' : 'Sign in to access your workspaces'}
            </p>
          </div>
        </div>

        {/* 1-Click Instant Demo Access Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-xs text-dark-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/20 transition-all hover:scale-102 mb-5"
        >
          <Play className="w-4 h-4 fill-dark-950" />
          <span>Instant Demo Trader Access (1-Click)</span>
        </button>

        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-dark-750"></div>
          <span className="flex-shrink mx-4 text-[10px] uppercase font-mono text-slate-500 tracking-wider">or with credentials</span>
          <div className="flex-grow border-t border-dark-750"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          {isRegister && (
            <div>
              <label className="block text-slate-400 mb-1">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="AlphaTrader"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-doji"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="trader@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-doji"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:border-doji"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-bear/15 border border-bear/30 text-bear text-xs font-sans">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-doji via-indigo-600 to-purple-600 hover:from-doji-dark hover:to-indigo-700 shadow-lg shadow-doji/30 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : isRegister ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-5 text-center text-xs text-slate-400 font-sans">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-doji-light hover:underline font-semibold ml-1"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className="text-doji-light hover:underline font-semibold ml-1"
              >
                Create One
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
