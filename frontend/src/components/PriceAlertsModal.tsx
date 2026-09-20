import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Bell, Trash2, Plus, AlertCircle, Check } from 'lucide-react';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultMarket?: string;
  currency: string;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'RELIANCE.NS',
  defaultMarket = 'nse',
  currency
}) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  const loadAlerts = async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(targetPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    setIsLoading(true);
    try {
      await api.createAlert({
        symbol,
        market: defaultMarket,
        target_price: priceNum,
        condition
      });
      setStatusMsg("Price alert active!");
      setTargetPrice('');
      await loadAlerts();
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      setStatusMsg(err.message || "Failed to set alert");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.deleteAlert(id);
      await loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dark-850 border border-dark-600 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 font-sans">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white border border-dark-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Price Alerts & Triggers</h3>
            <p className="text-xs text-slate-400 font-mono">Notify when price breaks threshold</p>
          </div>
        </div>

        {/* Create Alert Form */}
        <form onSubmit={handleCreateAlert} className="space-y-3.5 mb-6 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="above">Price is Above &gt;=</option>
                <option value="below">Price is Below &lt;=</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Target Price ({currency})</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 3050.00"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>

          {statusMsg && (
            <div className="p-2 rounded bg-dark-800 text-xs text-doji-light flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl font-bold text-xs uppercase text-white bg-sky-600 hover:bg-sky-500 shadow-md transition-colors"
          >
            {isLoading ? 'Setting Alert...' : 'Create Price Alert'}
          </button>
        </form>

        {/* Active Alerts List */}
        <div>
          <h4 className="text-xs font-mono uppercase text-slate-400 mb-2 font-bold">Active Alerts</h4>
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {alerts.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No active price alerts set.</p>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-dark-900 border border-dark-750 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white mr-2">{a.symbol}</span>
                    <span className="text-slate-400">
                      {a.condition === 'above' ? '≥' : '≤'} {currency}{a.target_price}
                    </span>
                    {a.triggered && (
                      <span className="ml-2 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                        Triggered
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteAlert(a.id)}
                    className="p-1 text-slate-400 hover:text-bear transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
