
import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Bell, 
  Search, 
  Menu, 
  X, 
  Moon, 
  Sun,
  Settings,
  Zap,
  GraduationCap,
  Wifi,
  WifiOff,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Candle, Detection, Timeframe, PatternType, NotificationConfig } from './types';
import { FOREX_PAIRS, TIMEFRAMES, API_CONFIG } from './constants';
import { scanHistory } from './engine/detector';
import { useRealtimeDetections } from './hooks/useRealtimeDetections';

import Chart from './components/Chart';
import PatternCard from './components/PatternCard';
import PatternDetail from './components/PatternDetail';
import TradingJournal from './components/TradingJournal';
import WeeklyPlanning from './components/WeeklyPlanning';
import NotificationSettings from './components/NotificationSettings';
import PatternGlossary from './components/PatternGlossary';

// Main Application Component
const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'signals' | 'journal' | 'planning'>('signals');
  const [selectedPair, setSelectedPair] = useState(FOREX_PAIRS[0].symbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('H4');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isMobileSignalsOpen, setIsMobileSignalsOpen] = useState(false);
  
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    masterEnabled: true,
    pairs: FOREX_PAIRS.map(p => p.symbol),
    patterns: Object.values(PatternType).filter(p => p !== PatternType.NONE)
  });

  const { syncedDetections } = useRealtimeDetections();
  
  // API Key Rotation
  const keyIndexRef = useRef(0);
  const getNextApiKey = () => {
    const keys = API_CONFIG.KEYS.filter(k => k && k !== 'REPLACE_WITH_KEY_1' && k !== 'REPLACE_WITH_KEY_2');
    if (keys.length === 0) return null;
    const key = keys[keyIndexRef.current % keys.length];
    keyIndexRef.current++;
    return key;
  };

  // Real-time Data Fetching Engine
  const fetchMarketData = async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);
    
    // Safety break for recursion
    if (retryCount > 2) {
      console.warn("Max retries reached. Switching to demo mode.");
      setError("API Limits Reached - Demo Mode Active");
      generateMockData();
      setIsLive(false);
      setIsLoading(false);
      return;
    }

    const apiKey = getNextApiKey();
    
    // If no valid keys are configured, fallback to mock data but warn user
    if (!apiKey) {
      console.warn("No valid Twelve Data API keys found. Using simulation.");
      setError("Demo Mode: Configure API Keys in constants.ts");
      generateMockData();
      setIsLive(false);
      setIsLoading(false);
      return;
    }

    try {
      const interval = API_CONFIG.INTERVAL_MAP[selectedTimeframe];
      const symbol = selectedPair; 

      const response = await axios.get(`${API_CONFIG.BASE_URL}/time_series`, {
        params: {
          symbol: symbol,
          interval: interval,
          apikey: apiKey,
          outputsize: 200, 
          format: 'json'
        }
      });

      if (response.data.status === 'error') {
        // Handle Rate Limiting Specifically
        if (response.data.code === 429) {
          console.log("Rate limit hit, rotating key and retrying...");
          // Retry immediately with next key
          return fetchMarketData(retryCount + 1);
        }
        throw new Error(response.data.message);
      }

      if (response.data.values && Array.isArray(response.data.values)) {
        // Twelve Data returns newest first, so we reverse for the chart (oldest to newest)
        const formattedCandles: Candle[] = response.data.values.map((v: any) => ({
          time: new Date(v.datetime).getTime() / 1000, // Unix Timestamp
          open: parseFloat(v.open),
          high: parseFloat(v.high),
          low: parseFloat(v.low),
          close: parseFloat(v.close)
        })).reverse();

        setCandles(formattedCandles);
        setIsLive(true);
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (err: any) {
      console.error("Market Data Fetch Error:", err);
      // If it's a network error or simple error, we might want to retry once
      if (retryCount === 0) {
         return fetchMarketData(retryCount + 1);
      }
      
      setError(`Connection Failed: ${err.message || 'Unknown error'}`);
      setIsLive(false);
      // Fallback to mock on error so UI doesn't break
      if (candles.length === 0) generateMockData(); 
    } finally {
      setIsLoading(false);
    }
  };

  // Mock Data Fallback (renamed from generateData)
  const generateMockData = () => {
    const pairConfig = FOREX_PAIRS.find(p => p.symbol === selectedPair);
    let price = pairConfig?.basePrice || 1.0;
    const data: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const tfSeconds = selectedTimeframe === 'H4' ? 14400 : selectedTimeframe === 'D1' ? 86400 : 604800;
    
    for (let i = 200; i >= 0; i--) {
      const time = now - (i * tfSeconds);
      const volatility = price * 0.002;
      const open = price + (Math.random() - 0.5) * volatility;
      const close = price + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      data.push({ time, open, high, low, close });
      price = close;
    }
    setCandles(data);
  };

  // Initial Fetch & Polling
  useEffect(() => {
    fetchMarketData();
    
    // Poll every 60 seconds to respect Free Tier limits
    const interval = setInterval(() => fetchMarketData(), 60000);
    return () => clearInterval(interval);
  }, [selectedPair, selectedTimeframe]);

  // Derive patterns from current candle data
  const currentDetections = useMemo(() => {
    if (candles.length === 0) return [];
    const detected = scanHistory(candles, selectedPair, selectedTimeframe);
    return [...detected].reverse(); // Sort latest first for the feed
  }, [candles, selectedPair, selectedTimeframe]);

  // Filter detections based on search input
  const filteredDetections = useMemo(() => {
    return currentDetections.filter(d => 
      d.pair.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.pattern.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentDetections, searchQuery]);

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#09090b] text-zinc-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Primary Sidebar Navigation (Desktop) */}
      <nav className={`hidden md:flex flex-col w-20 items-center py-8 gap-10 border-r ${isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="text-white fill-current w-6 h-6" />
        </div>
        
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('signals')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'signals' ? 'bg-indigo-600/10 text-indigo-500' : 'text-zinc-500 hover:text-indigo-400'}`}
          >
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'journal' ? 'bg-indigo-600/10 text-indigo-500' : 'text-zinc-500 hover:text-indigo-400'}`}
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveTab('planning')}
            className={`p-3 rounded-xl transition-all ${activeTab === 'planning' ? 'bg-indigo-600/10 text-indigo-500' : 'text-zinc-500 hover:text-indigo-400'}`}
          >
            <CalendarDays className="w-6 h-6" />
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onClick={() => setIsGlossaryOpen(true)}
            className="p-3 text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <GraduationCap className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 text-zinc-500 hover:text-amber-400 transition-colors"
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <button 
             onClick={() => setIsNotificationSettingsOpen(true)}
             className="p-3 text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          {/* Market Signals Dashboard */}
          {activeTab === 'signals' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Charting Workspace */}
              <div className="flex-1 flex flex-col p-4 md:p-8 gap-8 overflow-y-auto custom-scrollbar">
                
                <header className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3">
                       <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">Pipeye Market Intel</h1>
                       <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${isLive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                         {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : (isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />)}
                         {isLive ? 'Live Feed' : 'Offline'}
                       </div>
                       <button 
                         onClick={() => fetchMarketData()}
                         className={`p-1 rounded-lg transition-colors hover:bg-zinc-800 text-zinc-500`}
                         title="Force Sync"
                       >
                         <RotateCcw className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium flex items-center gap-2">
                       Scanning live patterns across major pairs. 
                       {error && <span className="text-rose-500 font-bold text-xs bg-rose-500/10 px-2 rounded cursor-help" title={error}>{error}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className={`hidden md:flex items-center gap-2 p-1 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
                      {TIMEFRAMES.map(tf => (
                        <button
                          key={tf}
                          onClick={() => setSelectedTimeframe(tf as Timeframe)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTimeframe === tf ? (isDarkMode ? 'bg-zinc-800 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                    <button className="md:hidden p-2 text-zinc-400" onClick={() => setIsMobileSignalsOpen(!isMobileSignalsOpen)}>
                      <Menu className="w-6 h-6" />
                    </button>
                  </div>
                </header>

                <section className="h-[400px] md:h-[500px] relative">
                  {isLoading && (
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Fetching {selectedPair}...
                    </div>
                  )}
                  <Chart 
                    pair={selectedPair} 
                    timeframe={selectedTimeframe} 
                    data={candles} 
                    detections={currentDetections}
                    isDarkMode={isDarkMode}
                  />
                </section>

                {/* Quick Asset Navigation */}
                <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                  {FOREX_PAIRS.map(pair => (
                    <button
                      key={pair.symbol}
                      onClick={() => setSelectedPair(pair.symbol)}
                      className={`p-4 rounded-2xl border transition-all text-left group
                        ${selectedPair === pair.symbol 
                          ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                          : (isDarkMode ? 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-slate-300')}`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${selectedPair === pair.symbol ? 'text-indigo-400' : 'text-zinc-500'}`}>{pair.symbol.split('/')[1]}</p>
                      <p className={`text-sm font-black ${selectedPair === pair.symbol ? 'text-indigo-100' : (isDarkMode ? 'text-zinc-300' : 'text-slate-900')}`}>{pair.symbol.split('/')[0]}</p>
                    </button>
                  ))}
                </section>
              </div>

              {/* Right Feed Panel */}
              <aside className={`
                fixed md:relative inset-y-0 right-0 z-40 w-full md:w-96 flex flex-col border-l transition-transform duration-300 transform
                ${isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}
                ${isMobileSignalsOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
              `}>
                <div className="p-6 border-b border-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-bold uppercase tracking-tight">Signal Stream</h2>
                  </div>
                  <button className="md:hidden" onClick={() => setIsMobileSignalsOpen(false)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-4 border-b border-zinc-900/50">
                   <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800 focus-within:border-indigo-500' : 'bg-slate-50 border-slate-200'}`}>
                      <Search className="w-4 h-4 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Search pair or pattern..." 
                        className="bg-transparent text-sm outline-none w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                  {filteredDetections.map((detection, index) => (
                    <PatternCard 
                      key={detection.id} 
                      detection={detection} 
                      isLatest={!searchQuery && index === 0} 
                      candles={candles}
                      onClick={() => { 
                        setSelectedDetection(detection); 
                        if (detection.pair !== selectedPair) { 
                          setSelectedPair(detection.pair); 
                          setSelectedTimeframe(detection.timeframe as Timeframe); 
                        } 
                        setIsMobileSignalsOpen(false); 
                      }} 
                      isDarkMode={isDarkMode} 
                    />
                  ))}
                  {filteredDetections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                      <Search className="w-12 h-12 mb-4" />
                      <p className="text-sm font-bold">No signals matching criteria</p>
                      {!isLive && <p className="text-xs text-rose-500">Live feed disconnected</p>}
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* Analytical Trading Journal */}
          {activeTab === 'journal' && (
            <div className="flex-1 p-4 md:p-8 overflow-hidden">
              <TradingJournal isDarkMode={isDarkMode} />
            </div>
          )}

          {/* Strategic Weekly Planning */}
          {activeTab === 'planning' && (
            <div className="flex-1 p-4 md:p-8 overflow-hidden">
              <WeeklyPlanning isDarkMode={isDarkMode} />
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className={`md:hidden flex items-center justify-around p-2 border-t shrink-0 z-40 ${isDarkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-white border-slate-200'}`}>
          <button 
            onClick={() => setActiveTab('signals')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'signals' ? 'text-indigo-500' : 'text-zinc-500'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-bold">Signals</span>
          </button>
          <button 
            onClick={() => setActiveTab('journal')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'journal' ? 'text-indigo-500' : 'text-zinc-500'}`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] font-bold">Journal</span>
          </button>
          <button 
            onClick={() => setActiveTab('planning')}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${activeTab === 'planning' ? 'text-indigo-500' : 'text-zinc-500'}`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-bold">Plan</span>
          </button>
          <button 
            onClick={() => setIsNotificationSettingsOpen(true)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-zinc-500`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold">Config</span>
          </button>
        </nav>
      </div>

      {/* Global Overlays and Modals */}
      {selectedDetection && (
        <PatternDetail 
          detection={selectedDetection} 
          relatedPatterns={[]} 
          candles={candles} 
          onClose={() => setSelectedDetection(null)} 
          isDarkMode={isDarkMode} 
        />
      )}

      {isNotificationSettingsOpen && (
        <NotificationSettings 
          isOpen={isNotificationSettingsOpen} 
          onClose={() => setIsNotificationSettingsOpen(false)} 
          config={notificationConfig} 
          onSave={setNotificationConfig} 
          isDarkMode={isDarkMode} 
        />
      )}

      {isGlossaryOpen && (
        <PatternGlossary 
          isOpen={isGlossaryOpen} 
          onClose={() => setIsGlossaryOpen(false)} 
          isDarkMode={isDarkMode} 
        />
      )}
    </div>
  );
};

export default App;
