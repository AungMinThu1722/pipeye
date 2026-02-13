
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Save, BookOpen, BarChart3, PieChart, Image as ImageIcon, X, Upload, ChevronLeft, ChevronRight, Settings, RotateCcw, Import, ArrowUpRight, ArrowDownRight, Info, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { TradeLog } from '../types';
import { FOREX_PAIRS } from '../constants';
import * as XLSX from 'xlsx';

interface TradingJournalProps {
  isDarkMode: boolean;
}

const TradingJournal: React.FC<TradingJournalProps> = ({ isDarkMode }) => {
  const [trades, setTrades] = useState<TradeLog[]>(() => {
    try {
      const saved = localStorage.getItem('patternPro_journal');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewImages, setViewImages] = useState<string[] | null>(null);
  const [formData, setFormData] = useState<Partial<TradeLog>>({
    pair: FOREX_PAIRS[0].symbol,
    type: 'BUY',
    outcome: 'WIN',
    date: new Date().toISOString().split('T')[0],
    screenshots: []
  });

  // Reference for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Starting Balance set to 0 as requested
  const STARTING_BALANCE = 0;

  // Calculate Real Statistics
  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.outcome === 'WIN').length;
    const losses = trades.filter(t => t.outcome === 'LOSS').length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    
    let totalPnL = 0;
    let totalLongs = 0;
    let totalShorts = 0;
    let longWins = 0;
    let shortWins = 0;

    trades.forEach(t => {
      // Basic Pip Calculation: (Exit - Entry) * Multiplier
      const diff = t.exitPrice - t.entryPrice;
      const multiplier = t.pair.includes('JPY') ? 100 : 10000;
      // If BUY, profit = (Exit - Entry). If SELL, profit = (Entry - Exit).
      const pips = t.type === 'BUY' ? diff * multiplier : -diff * multiplier;
      
      // Convert Pips to rough USD for display (e.g., $10 per pip for 1.0 standard lot)
      totalPnL += pips * 10;

      if (t.type === 'BUY') {
        totalLongs++;
        if (t.outcome === 'WIN') longWins++;
      } else {
        totalShorts++;
        if (t.outcome === 'WIN') shortWins++;
      }
    });

    const avgReturn = total > 0 ? totalPnL / total : 0;
    const currentEquity = STARTING_BALANCE + totalPnL;

    return { 
      total, 
      wins, 
      losses, 
      winRate, 
      totalPnL, 
      avgReturn, 
      totalLongs, 
      totalShorts, 
      longWins, 
      shortWins,
      currentEquity 
    };
  }, [trades]);

  // Chart Calculations
  const chartMetrics = useMemo(() => {
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const isProfit = stats.totalPnL >= 0;
    
    // If Profit: The whole pie is Current Equity. Slices are Initial Capital + Profit.
    // If Loss: The whole pie is Initial Capital. Slices are Remaining Equity + Loss.
    const totalBase = isProfit ? stats.currentEquity : STARTING_BALANCE;
    
    // Avoid division by zero
    const safeTotal = totalBase || 1; 

    // Segment 1: The "Safe" Capital (Initial if profit, Remaining if loss)
    const segment1Value = isProfit ? STARTING_BALANCE : stats.currentEquity;
    const segment1Dash = (segment1Value / safeTotal) * circumference;

    // Segment 2: The "Delta" (Profit if profit, Loss gap if loss)
    const segment2Value = Math.abs(stats.totalPnL);
    const segment2Dash = (segment2Value / safeTotal) * circumference;

    return { radius, circumference, isProfit, segment1Dash, segment2Dash };
  }, [stats.totalPnL, stats.currentEquity]);

  useEffect(() => {
    localStorage.setItem('patternPro_journal', JSON.stringify(trades));
  }, [trades]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    (Array.from(files) as File[]).forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), event.target?.result as string]
        }));
      };
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        // Convert sheet to json
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map Excel columns to TradeLog, handling different potential header names
        const importedTrades: TradeLog[] = data.map((row: any) => {
          // Normalize keys to lowercase for easier matching
          const keys = Object.keys(row).reduce((acc, key) => {
            acc[key.toLowerCase().trim()] = row[key];
            return acc;
          }, {} as any);

          const rawDate = keys['date'] || keys['time'] || new Date().toISOString().split('T')[0];
          // Simple check if date is Excel serial number
          let finalDate = rawDate;
          if (typeof rawDate === 'number') {
             const dateObj = new Date(Math.round((rawDate - 25569)*86400*1000));
             finalDate = dateObj.toISOString().split('T')[0];
          }

          return {
            id: crypto.randomUUID(),
            date: finalDate,
            pair: keys['pair'] || keys['symbol'] || keys['asset'] || 'EUR/USD',
            type: (keys['type'] || keys['direction'] || 'BUY').toUpperCase() === 'SELL' ? 'SELL' : 'BUY',
            entryPrice: parseFloat(keys['entry'] || keys['entry price'] || keys['open'] || '0'),
            exitPrice: parseFloat(keys['exit'] || keys['exit price'] || keys['close'] || '0'),
            outcome: (keys['outcome'] || keys['result'] || 'WIN').toUpperCase() as 'WIN' | 'LOSS' | 'BE',
            notes: keys['notes'] || keys['comments'] || 'Imported from Excel',
            screenshots: []
          };
        }).filter(t => t.entryPrice > 0 && t.exitPrice > 0); // Basic validation

        if (importedTrades.length > 0) {
          setTrades(prev => [...importedTrades, ...prev]);
          alert(`Successfully imported ${importedTrades.length} trades.`);
        } else {
          alert("No valid trades found in file. Please check column headers (Date, Pair, Type, Entry, Exit, Outcome).");
        }

      } catch (error) {
        console.error("Import Error:", error);
        alert("Failed to parse Excel file. Ensure it is a valid .xlsx or .csv file.");
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entryPrice || !formData.exitPrice) return;

    const newTrade: TradeLog = {
      id: crypto.randomUUID(),
      date: formData.date || new Date().toISOString().split('T')[0],
      pair: formData.pair || 'EUR/USD',
      type: formData.type as 'BUY' | 'SELL',
      entryPrice: Number(formData.entryPrice),
      exitPrice: Number(formData.exitPrice),
      outcome: formData.outcome as 'WIN' | 'LOSS' | 'BE',
      notes: formData.notes || '',
      screenshots: formData.screenshots || []
    };

    setTrades([newTrade, ...trades]);
    setIsFormOpen(false);
    setFormData({ pair: FOREX_PAIRS[0].symbol, type: 'BUY', outcome: 'WIN', screenshots: [], date: new Date().toISOString().split('T')[0] });
  };

  const deleteTrade = (id: string) => {
    if (confirm("Delete this trade log entry?")) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  const resetData = () => {
    if (confirm("Are you sure you want to reset all journal data? This will clear your equity and trade history.")) {
      setTrades([]);
      localStorage.removeItem('patternPro_journal');
    }
  };

  const cardBg = isDarkMode ? 'bg-zinc-900 border-zinc-800 shadow-xl' : 'bg-white border-slate-100 shadow-sm';
  const textColor = isDarkMode ? 'text-zinc-100' : 'text-slate-900';
  const subTextColor = isDarkMode ? 'text-zinc-500' : 'text-slate-400';
  const accentBg = 'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className={`flex flex-col w-full h-full gap-8 animate-fade-in custom-scrollbar overflow-y-auto pb-24 px-1 md:px-4 ${isDarkMode ? '' : 'bg-slate-50/50'}`}>
      
      {/* Hidden File Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleExcelImport} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* Lightbox */}
      {viewImages && (
        <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-8" onClick={() => setViewImages(null)}>
           <button className="absolute top-6 right-6 text-white"><X className="w-8 h-8" /></button>
           <img src={viewImages[0]} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Trade Screenshot" />
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-black tracking-tight ${textColor}`}>Overview</h1>
          <p className={`text-sm font-medium ${subTextColor}`}>Detailed analysis of your trading performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={triggerImport}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 ${accentBg}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm border transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}
          >
            <Plus className="w-4 h-4" /> Log Trade
          </button>
          <button 
            onClick={resetData}
            className={`p-2.5 rounded-xl border transition-all ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-rose-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title="Reset Data"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accumulative Return */}
        <div className={`p-8 rounded-[2.5rem] border overflow-hidden relative group transition-all duration-300 ${cardBg}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`text-sm font-bold tracking-tight ${subTextColor}`}>Total Return $</h3>
            <div className={`p-2 rounded-lg ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className={`text-3xl font-black ${textColor}`}>
              ${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {stats.totalPnL !== 0 && (
              <span className={`text-sm font-bold flex items-center gap-1 ${stats.totalPnL > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.totalPnL > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {(STARTING_BALANCE > 0 ? (stats.totalPnL / STARTING_BALANCE) * 100 : 0).toFixed(2)}%
              </span>
            )}
          </div>
          <div className="h-10 w-full mt-2">
            <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path d="M0 15 Q 15 5, 30 12 T 60 5 T 100 2" fill="none" stroke={stats.totalPnL >= 0 ? "#10b981" : "#f43f5e"} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Win Ratio - Replaced Circle with Linear Bar for Uniformity */}
        <div className={`p-8 rounded-[2.5rem] border overflow-hidden relative group transition-all duration-300 ${cardBg}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`text-sm font-bold tracking-tight ${subTextColor}`}>Win Ratio %</h3>
            <div className={`p-2 rounded-lg ${stats.winRate >= 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className={`text-3xl font-black ${textColor}`}>{stats.winRate.toFixed(0)}%</span>
          </div>
          <div className="h-10 w-full mt-2 flex flex-col justify-end">
            <div className="w-full h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden relative">
               <div className={`absolute top-0 left-0 h-full ${stats.winRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-1000 ease-out`} style={{ width: `${stats.winRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* Avg Return */}
        <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 ${cardBg}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`text-sm font-bold ${subTextColor}`}>Avg Trade $</h3>
            <div className={`p-2 rounded-lg ${stats.avgReturn >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className={`text-3xl font-black ${textColor}`}>${stats.avgReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="h-10 w-full mt-2 flex items-end gap-1 px-4">
            {trades.slice(0, 10).map((t, i) => {
              const diff = t.exitPrice - t.entryPrice;
              const multiplier = t.pair.includes('JPY') ? 100 : 10000;
              const profit = t.type === 'BUY' ? diff * multiplier : -diff * multiplier;
              const height = Math.min(100, Math.max(10, Math.abs(profit) * 2));
              return (
                <div key={i} className={`flex-1 rounded-t-sm ${profit >= 0 ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`} style={{ height: `${height}%` }}></div>
              );
            })}
            {trades.length === 0 && (
               <div className="w-full text-center text-[10px] opacity-20 font-bold uppercase">No Data</div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Equity Donut Chart */}
        <div className={`lg:col-span-2 p-10 rounded-[3rem] border flex flex-col transition-all duration-300 ${cardBg}`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className={`font-black text-xl ${textColor}`}>Equity Allocation</h2>
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
               <span className="text-indigo-600 border-b-[3px] border-indigo-600 pb-2 cursor-pointer">Live Metrics</span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative py-4">
            <div className="relative w-64 h-64">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                 {/* Track (Background) */}
                 <circle cx="128" cy="128" r={chartMetrics.radius} fill="none" stroke={isDarkMode ? '#27272a' : '#f1f5f9'} strokeWidth="24" />
                 
                 {/* Segment 1: Capital Base (Grey) */}
                 <circle 
                    cx="128" cy="128" r={chartMetrics.radius} 
                    fill="none" 
                    stroke={isDarkMode ? '#52525b' : '#cbd5e1'} 
                    strokeWidth="24" 
                    strokeDasharray={`${chartMetrics.segment1Dash} ${chartMetrics.circumference}`} 
                 />

                 {/* Segment 2: PnL Delta (Colored) - Starts where Seg 1 ends */}
                 <circle 
                    cx="128" cy="128" r={chartMetrics.radius} 
                    fill="none" 
                    stroke={chartMetrics.isProfit ? '#4f46e5' : '#f43f5e'} 
                    strokeWidth="24" 
                    strokeDasharray={`${chartMetrics.segment2Dash} ${chartMetrics.circumference}`} 
                    strokeDashoffset={-chartMetrics.segment1Dash}
                    strokeLinecap="round"
                    className="drop-shadow-lg"
                 />
               </svg>
               
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className={`text-[10px] ${subTextColor} font-black uppercase tracking-widest`}>Current Equity</span>
                  <span className={`text-2xl font-black ${textColor}`}>${stats.currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
               </div>
            </div>
            
            <div className="mt-8 flex gap-8">
               <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-zinc-600' : 'bg-slate-400'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${subTextColor}`}>
                     {chartMetrics.isProfit ? 'Initial Capital' : 'Remaining Capital'}
                  </span>
               </div>
               <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${chartMetrics.isProfit ? 'bg-indigo-600' : 'bg-rose-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${subTextColor}`}>
                     {chartMetrics.isProfit ? 'Net Profit' : 'Realized Loss'}
                  </span>
               </div>
            </div>
          </div>
        </div>

        {/* Trades Information Bar Chart */}
        <div className={`lg:col-span-3 p-10 rounded-[3rem] border flex flex-col transition-all duration-300 ${cardBg}`}>
           <div className="flex justify-between items-center mb-12">
              <h2 className={`font-black text-xl ${textColor}`}>Distribution</h2>
           </div>
           <div className="flex-1 flex flex-col justify-end gap-10">
              <div className="h-64 flex items-end justify-between px-8 relative">
                 <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-[0.03]"><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div><div className="w-full h-px bg-white"></div></div>
                 {/* Corrected dynamic bar heights */}
                 {[
                   { val: stats.total, color: 'bg-indigo-600 shadow-indigo-600/30', label: 'Total' },
                   { val: stats.wins, color: 'bg-emerald-500 shadow-emerald-500/30', label: 'Wins' },
                   { val: stats.losses, color: 'bg-rose-500 shadow-rose-500/30', label: 'Losses' },
                   { val: stats.totalLongs, color: 'bg-indigo-300 shadow-indigo-300/30', label: 'Longs' }
                 ].map((bar, i) => {
                   const max = Math.max(stats.total, 1);
                   const height = (bar.val / max) * 100;
                   return (
                     <div key={i} className="flex flex-col items-center gap-4 flex-1">
                        <div className={`w-14 rounded-2xl transition-all duration-700 ${bar.color} shadow-2xl`} style={{ height: `${Math.max(10, height)}%` }}></div>
                        <span className={`text-sm font-black ${textColor}`}>{bar.val}</span>
                        <span className={`text-[9px] font-black uppercase tracking-tighter ${subTextColor}`}>{bar.label}</span>
                     </div>
                   );
                 })}
              </div>
           </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className={`p-10 rounded-[3rem] border transition-all duration-300 ${cardBg}`}>
         <div className="flex justify-between items-center mb-10">
            <h2 className={`font-black text-xl ${textColor}`}>History Log</h2>
         </div>

         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-4">
               <thead>
                  <tr className={`text-[10px] font-black uppercase tracking-widest ${subTextColor}`}>
                     <th className="px-6 py-4">Date</th>
                     <th className="px-6 py-4">Pair</th>
                     <th className="px-6 py-4">Type</th>
                     <th className="px-6 py-4">Entry / Exit</th>
                     <th className="px-6 py-4">Outcome</th>
                     <th className="px-6 py-4">PnL ($)</th>
                     <th className="px-6 py-4 text-center">Chart</th>
                     <th className="px-6 py-4 text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="text-sm font-medium">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                           <BookOpen className="w-12 h-12" />
                           <p className="font-bold">No trades logged yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    trades.map(trade => {
                      const diff = trade.exitPrice - trade.entryPrice;
                      const multiplier = trade.pair.includes('JPY') ? 100 : 10000;
                      const profit = trade.type === 'BUY' ? diff * multiplier : -diff * multiplier;
                      const profitUSD = profit * 10;
                      
                      return (
                        <tr key={trade.id} className={`group transition-all ${isDarkMode ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50'}`}>
                           <td className={`px-6 py-6 rounded-l-2xl border-y border-l ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} font-mono text-xs opacity-60`}>{trade.date}</td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} font-black`}>{trade.pair}</td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                              <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{trade.type}</span>
                           </td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} font-mono text-xs`}>
                              <div className="flex flex-col">
                                 <span className="opacity-40">{trade.entryPrice.toFixed(5)}</span>
                                 <span className={textColor}>{trade.exitPrice.toFixed(5)}</span>
                              </div>
                           </td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                              <div className={`flex items-center gap-2 font-black text-[11px] ${trade.outcome === 'WIN' ? 'text-emerald-500' : trade.outcome === 'LOSS' ? 'text-rose-500' : 'text-zinc-500'}`}>
                                 {trade.outcome === 'WIN' ? <TrendingUp className="w-3.5 h-3.5" /> : trade.outcome === 'LOSS' ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                 {trade.outcome}
                              </div>
                           </td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} font-black ${profitUSD >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {profitUSD >= 0 ? '+' : ''}{profitUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                           <td className={`px-6 py-6 border-y ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} text-center`}>
                              {trade.screenshots && trade.screenshots.length > 0 ? (
                                 <button onClick={() => setViewImages(trade.screenshots)} className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-500 transition-colors"><ImageIcon className="w-4 h-4" /></button>
                              ) : '-'}
                           </td>
                           <td className={`px-6 py-6 rounded-r-2xl border-y border-r ${isDarkMode ? 'border-zinc-800' : 'border-slate-100'} text-right`}>
                              <button onClick={() => deleteTrade(trade.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                           </td>
                        </tr>
                      );
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Entry Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className={`w-full max-w-xl rounded-[2.5rem] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${cardBg}`}>
            <div className="p-8 border-b border-zinc-800/10 flex justify-between items-center">
              <div><h2 className={`text-xl font-black ${textColor}`}>Log Trade</h2><p className={`text-sm ${subTextColor}`}>Keep your records accurate.</p></div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pair</label>
                 <select value={formData.pair} onChange={e => setFormData({...formData, pair: e.target.value})} className={`w-full p-4 rounded-2xl border font-bold outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                    {FOREX_PAIRS.map(p => <option key={p.symbol} value={p.symbol}>{p.symbol}</option>)}
                 </select></div>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Direction</label>
                 <div className="grid grid-cols-2 gap-2 bg-zinc-800/20 p-1 rounded-2xl">
                    <button type="button" onClick={() => setFormData({...formData, type: 'BUY'})} className={`py-3 rounded-xl font-black text-xs transition-all ${formData.type === 'BUY' ? 'bg-emerald-500 text-white shadow-lg' : subTextColor}`}>BUY</button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'SELL'})} className={`py-3 rounded-xl font-black text-xs transition-all ${formData.type === 'SELL' ? 'bg-rose-500 text-white shadow-lg' : subTextColor}`}>SELL</button>
                 </div></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entry Price</label>
                 <input type="number" step="any" required value={formData.entryPrice || ''} onChange={e => setFormData({...formData, entryPrice: parseFloat(e.target.value)})} className={`w-full p-4 rounded-2xl border font-mono outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`} placeholder="1.0000" /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Exit Price</label>
                 <input type="number" step="any" required value={formData.exitPrice || ''} onChange={e => setFormData({...formData, exitPrice: parseFloat(e.target.value)})} className={`w-full p-4 rounded-2xl border font-mono outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`} placeholder="1.0000" /></div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Outcome</label>
                 <select value={formData.outcome} onChange={e => setFormData({...formData, outcome: e.target.value as any})} className={`w-full p-4 rounded-2xl border font-bold outline-none ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                    <option value="BE">BREAK EVEN</option>
                 </select>
              </div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Attach Chart Analysis</label>
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-800/30 rounded-3xl cursor-pointer hover:bg-zinc-800/10 transition-colors">
                  <Upload className="w-8 h-8 mb-2 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Upload Image</span>
                  <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
              <button type="submit" className={`w-full py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-95 bg-indigo-600`}>Save Record</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingJournal;
