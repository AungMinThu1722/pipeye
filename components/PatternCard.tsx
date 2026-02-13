
import React, { useState, useEffect, useRef } from 'react';
import { Detection, PatternType, Candle } from '../types';
import { ChevronDown, ChevronUp, Brain, Sparkles, Loader2, Activity } from 'lucide-react';
import { createChart, ColorType, IChartApi, CandlestickSeries, Time, CandlestickData, SeriesMarker, SeriesMarkerPosition, SeriesMarkerShape } from 'lightweight-charts';
import { GoogleGenAI } from "@google/genai";

interface PatternCardProps {
  detection: Detection;
  isLatest?: boolean;
  onClick?: () => void;
  isDarkMode: boolean;
  candles?: Candle[]; // Optional candles for the mini chart
}

const PatternCard: React.FC<PatternCardProps> = ({ detection, isLatest, onClick, isDarkMode, candles = [] }) => {
  const [isExpanded, setIsExpanded] = useState(isLatest || false);
  const [isNotified, setIsNotified] = useState(true);
  
  // AI State
  const [aiThinking, setAiThinking] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Chart Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const formattedDate = new Date(detection.timestamp * 1000).toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Handle Chart Rendering when Expanded
  useEffect(() => {
    if (!isExpanded || !chartContainerRef.current || candles.length === 0) return;

    // 1. Cleanup old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    // 2. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDarkMode ? '#71717a' : '#64748b',
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 180,
      grid: {
        vertLines: { color: isDarkMode ? 'rgba(39, 39, 42, 0.4)' : 'rgba(226, 232, 240, 0.8)' },
        horzLines: { color: isDarkMode ? 'rgba(39, 39, 42, 0.4)' : 'rgba(226, 232, 240, 0.8)' },
      },
      timeScale: { 
        visible: true, 
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: { 
        visible: true, 
        borderVisible: false, 
        scaleMargins: { top: 0.2, bottom: 0.2 } 
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // 3. Add Series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    // 4. Slice Data (Show context: 20 candles before, 5 after)
    const detectionIndex = candles.findIndex(c => c.time === detection.timestamp);
    if (detectionIndex !== -1) {
      const start = Math.max(0, detectionIndex - 20);
      const end = Math.min(candles.length, detectionIndex + 5);
      
      const subset = candles.slice(start, end).map(c => ({
         ...c,
         // Highlight the detection candle
         color: c.time === detection.timestamp ? (isDarkMode ? '#fbbf24' : '#2563eb') : undefined,
         wickColor: c.time === detection.timestamp ? (isDarkMode ? '#fbbf24' : '#2563eb') : undefined,
      }));
      
      series.setData(subset as unknown as CandlestickData<Time>[]);

      // 5. Add Marker
      const isBullish = detection.pattern.includes('Bullish') || detection.pattern === PatternType.BULLISH_HAMMER || detection.pattern === PatternType.INVERTED_HAMMER;
      
      const markers: SeriesMarker<Time>[] = [{
        time: detection.timestamp as unknown as Time,
        position: isBullish ? 'belowBar' : 'aboveBar',
        color: isBullish ? '#10b981' : '#f43f5e',
        shape: isBullish ? 'arrowUp' : 'arrowDown',
        text: detection.pattern,
        size: 2,
      }];
      
      // Cast to any because setMarkers is sometimes missing in TS definitions for ISeriesApi
      if ((series as any).setMarkers) {
         (series as any).setMarkers(markers);
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    }
  }, [isExpanded, isDarkMode, candles, detection]);

  // Gemini Thinking Logic
  const generateGeminiThought = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiThinking) return; // Already generated

    setIsThinking(true);
    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Use standard flash for quick "thinking" simulation on the card
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this ${detection.pattern} pattern on ${detection.pair} (${detection.timeframe}) at price ${detection.price}.
        
        Provide a "Chain of Thought" reasoning in bullet points:
        1. Identify the immediate trend before this candle.
        2. Explain the psychology of the specific candle shape (wicks/body).
        3. Conclude with validity (Weak/Strong).
        
        Keep it under 80 words. Direct and technical.`,
      });

      setAiThinking(response.text);
    } catch (err) {
      console.error(err);
      setAiThinking("Unable to connect to Gemini neural engine.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div 
      className={`
        w-full p-4 mb-4 border-b transition-all duration-300 relative overflow-hidden
        ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-slate-100'}
        ${isExpanded ? 'shadow-lg' : ''}
      `}
    >
      {/* Pattern Title & Header */}
      <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => onClick && onClick()}>
         <div>
            <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>
              {detection.pattern}
              {detection.pattern.includes('Bullish') && <Activity className="w-3 h-3 text-emerald-500" />}
              {detection.pattern.includes('Bearish') && <Activity className="w-3 h-3 text-rose-500" />}
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">{formattedDate}</p>
         </div>
         <div className={`px-2 py-1 rounded text-[10px] font-bold border ${isDarkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            {detection.timeframe}
         </div>
      </div>

      {/* Stats Table (Collapsed View) */}
      {!isExpanded && (
        <div className="flex justify-between items-center text-xs mt-3 opacity-70">
          <span className="font-bold">{detection.pair}</span>
          <span className="font-mono">{detection.price.toFixed(5)}</span>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <div className="mt-3 flex items-center justify-between">
         <button 
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {isExpanded ? 'Hide Chart' : 'Show Chart'}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        
        {/* Quick Action Notify Toggle */}
        <div 
            onClick={(e) => { e.stopPropagation(); setIsNotified(!isNotified); }}
            className={`flex w-16 h-4 rounded overflow-hidden cursor-pointer border ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className={`flex-1 flex items-center justify-center text-[7px] font-black transition-all ${isNotified ? 'bg-emerald-500 text-emerald-950' : 'text-zinc-500'}`}>ON</div>
            <div className={`flex-1 flex items-center justify-center text-[7px] font-black transition-all ${!isNotified ? 'bg-zinc-700 text-zinc-300' : 'text-zinc-500'}`}>OFF</div>
          </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
           
           {/* Real-time Chart Container */}
           <div className={`w-full h-[180px] rounded-lg overflow-hidden border relative ${isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
              <div ref={chartContainerRef} className="absolute inset-0" />
              {candles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading Candle Data...
                </div>
              )}
           </div>

           {/* Gemini Thinking Section */}
           <div className={`rounded-xl p-3 border transition-all ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              {!aiThinking ? (
                <button 
                  onClick={generateGeminiThought}
                  disabled={isThinking}
                  className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-lg transition-all
                    ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}
                    ${isThinking ? 'opacity-50 cursor-wait' : ''}
                  `}
                >
                  {isThinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  {isThinking ? 'Gemini is Thinking...' : 'Generate AI Thought'}
                </button>
              ) : (
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Gemini Reasoning</span>
                   </div>
                   <div className={`text-[11px] leading-relaxed whitespace-pre-line ${isDarkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                      {aiThinking}
                   </div>
                </div>
              )}
           </div>

        </div>
      )}
    </div>
  );
};

export default PatternCard;
