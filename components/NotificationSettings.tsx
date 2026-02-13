import React, { useState, useEffect } from 'react';
import { X, Save, BellRing, CheckSquare, Square, Check, RotateCcw, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { PatternType, NotificationConfig } from '../types';
import { FOREX_PAIRS } from '../constants';

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotificationConfig;
  onSave: (newConfig: NotificationConfig) => void;
  isDarkMode: boolean;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ isOpen, onClose, config, onSave, isDarkMode }) => {
  const [localConfig, setLocalConfig] = useState<NotificationConfig>(config);
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    setLocalConfig(config);
    setPermission(Notification.permission);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const togglePair = (symbol: string) => {
    setLocalConfig(prev => ({
      ...prev,
      pairs: prev.pairs.includes(symbol)
        ? prev.pairs.filter(p => p !== symbol)
        : [...prev.pairs, symbol]
    }));
  };

  const toggleAllPairs = () => {
    const allSymbols = FOREX_PAIRS.map(p => p.symbol);
    const areAllSelected = localConfig.pairs.length === allSymbols.length;
    setLocalConfig(prev => ({ ...prev, pairs: areAllSelected ? [] : allSymbols }));
  };

  const togglePattern = (pattern: PatternType) => {
    setLocalConfig(prev => ({
      ...prev,
      patterns: prev.patterns.includes(pattern)
        ? prev.patterns.filter(p => p !== pattern)
        : [...prev.patterns, pattern]
    }));
  };

  const toggleMaster = async () => {
      const newState = !localConfig.masterEnabled;
      if (newState && Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
      }
      setLocalConfig(prev => ({ ...prev, masterEnabled: newState }));
  };

  const sendTestAlert = () => {
    if (Notification.permission === 'granted') {
      new Notification("PIPEYE Test Alert", {
        body: "Real-time alerts are properly configured!",
        icon: '/icon.png'
      });
    } else {
      alert("Please grant notification permissions first.");
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const activeColor = isDarkMode ? 'text-amber-400' : 'text-blue-600';
  const activeBg = isDarkMode ? 'bg-amber-500' : 'bg-blue-600';
  const activeBorder = isDarkMode ? 'border-amber-500/30' : 'border-blue-600/30';
  const activeBgSoft = isDarkMode ? 'bg-amber-500/10' : 'bg-blue-600/10';
  const allPairsSelected = localConfig.pairs.length === FOREX_PAIRS.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`border w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200
        ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
        
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <BellRing className={`w-5 h-5 ${isDarkMode ? 'text-amber-500' : 'text-blue-600'}`} />
            <h2 className={`font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Alert Configuration</h2>
          </div>
          <button onClick={onClose} className={`transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Permission Status */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isDarkMode ? 'bg-zinc-950/30 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
             <div className="flex items-center gap-3">
                {permission === 'granted' ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-amber-500" />}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Browser Status</p>
                  <p className={`text-xs font-black uppercase ${permission === 'granted' ? 'text-emerald-500' : 'text-amber-500'}`}>{permission}</p>
                </div>
             </div>
             {permission === 'granted' && (
                <button onClick={sendTestAlert} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isDarkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                  <Zap className="w-3 h-3 text-amber-500" />
                  Test
                </button>
             )}
          </div>

          {/* Master Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-xl border
            ${isDarkMode ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-slate-50 border-slate-200'}`}>
            <div>
              <span className={`block text-sm font-bold ${isDarkMode ? 'text-zinc-200' : 'text-slate-900'}`}>Master Alerts</span>
              <span className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Desktop popups and sounds</span>
            </div>
            <button
              onClick={toggleMaster}
              className={`w-12 h-6 rounded-full transition-colors relative ${localConfig.masterEnabled ? activeBg : (isDarkMode ? 'bg-zinc-700' : 'bg-slate-300')}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${localConfig.masterEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Pairs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Pairs to Watch</h3>
              <button onClick={toggleAllPairs} className={`text-[10px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 ${allPairsSelected ? (isDarkMode ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-100 text-blue-600') : (isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500')}`}>
                {allPairsSelected ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                {allPairsSelected ? 'Reset' : 'All'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FOREX_PAIRS.map(pair => (
                <button key={pair.symbol} onClick={() => togglePair(pair.symbol)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${localConfig.pairs.includes(pair.symbol) ? `${activeBgSoft} ${activeBorder} ${activeColor}` : `${isDarkMode ? 'bg-zinc-800/40 border-zinc-700/30 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}`}>
                  {localConfig.pairs.includes(pair.symbol) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {pair.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Patterns */}
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>Pattern Signals</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(PatternType).filter(p => p !== PatternType.NONE).map(pattern => (
                <button key={pattern} onClick={() => togglePattern(pattern)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${localConfig.patterns.includes(pattern) ? `${activeBgSoft} ${activeBorder} ${activeColor}` : `${isDarkMode ? 'bg-zinc-800/40 border-zinc-700/30 text-zinc-400 hover:bg-zinc-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}`}>
                  <span className="flex items-center gap-2">
                     {localConfig.patterns.includes(pattern) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                     {pattern}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`p-4 border-t ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <button onClick={handleSave} className={`w-full flex items-center justify-center gap-2 text-zinc-950 font-bold py-3 rounded-xl transition-all shadow-lg ${isDarkMode ? 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}>
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;