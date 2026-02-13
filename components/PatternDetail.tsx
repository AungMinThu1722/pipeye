
import React, { useState, useEffect, useRef } from 'react';
import { X, Brain, Target, ShieldAlert, History, TrendingUp, TrendingDown, Ruler, ExternalLink } from 'lucide-react';
import { Detection, PatternType, Candle } from '../types';
import { GoogleGenAI } from "@google/genai";
import { createChart, ColorType, IChartApi, CandlestickSeries, Time, CandlestickData, SeriesMarker, SeriesMarkerPosition, SeriesMarkerShape } from 'lightweight-charts';

interface PatternDetailProps {
  detection: Detection;
  relatedPatterns: Detection[];
  candles: Candle[];
  onClose: () => void;
  isDarkMode: boolean;
}

const PatternDetail: React.FC<PatternDetailProps> = ({ detection, relatedPatterns, candles, onClose, isDarkMode }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Determine Bullish/Bearish based on pattern and candle data
  const currentCandle = candles.find(c => c.time === detection.timestamp);
  
  const isBullishSignal = (() => {
    if (detection.pattern.includes('Bullish')) return true;
    if (detection.pattern.includes('Bearish')) return false;
    if (detection.pattern === PatternType.INVERTED_HAMMER) return true;
    if (detection.pattern === PatternType.PINBAR && currentCandle) {
        const range = currentCandle.high - currentCandle.low;
        const lowerWick = Math.min(currentCandle.open, currentCandle.close) - currentCandle.low;
        return lowerWick > range * 0.5;
    }
    return false;
  })();

  const getTradingViewUrl = () => {
    const symbol = detection.pair.replace('/', '');
    const intervalMap: Record<string, string> = { 'H4': '240', 'D1': '1D', 'W1': '1W' };
    const interval = intervalMap[detection.timeframe] || '1D';
    return `https://www.tradingview.com/chart?symbol=FX:${symbol}&interval=${interval}`;
  };

  // Render Mini Chart
  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

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
      timeScale: { visible: false, borderVisible: false },
      rightPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const index = candles.findIndex(c => c.time === detection.timestamp);
    if (index !== -1) {
      const start = Math.max(0, index - 25);
      const end = Math.min(candles.length, index + 10);
      
      const subset = candles.slice(start, end).map(c => {
        if (c.time === detection.timestamp) {
           return {
             ...c,
             color: isDarkMode ? '#fbbf24' : '#2563eb', // Amber or Blue
             wickColor: isDarkMode ? '#fbbf24' : '#2563eb',
             borderColor: isDarkMode ? '#fbbf24' : '#2563eb'
           };
        }
        return c;
      });
      
      series.setData(subset as unknown as CandlestickData<Time>[]);

      // Cast to any to safely access setMarkers which might be missing in some TS definitions of ISeriesApi
      if ((series as any).setMarkers) {
        const markers: SeriesMarker<Time>[] = [{
          time: detection.timestamp as unknown as Time,
          position: (isBullishSignal ? 'belowBar' : 'aboveBar') as SeriesMarkerPosition,
          color: isBullishSignal ? '#10b981' : '#f43f5e',
          shape: (isBullishSignal ? 'arrowUp' : 'arrowDown') as SeriesMarkerShape,
          text: 'Signal',
          size: 2,
        } as SeriesMarker<Time>];
        try { (series as any).setMarkers(markers); } catch (e) { console.warn("Failed to set markers", e); }
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
  }, [candles, detection, isBullishSignal, isDarkMode]);

  // AI Analysis Logic
  useEffect(() => {
    const fetchAIAnalysis = async () => {
      setIsAiLoading(true);
      try {
        if (!process.env.API_KEY) {
           throw new Error("API Key configuration missing");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `As a professional Forex technical analyst, analyze this setup:
        - Pair: ${detection.pair}
        - Timeframe: ${detection.timeframe}
        - Pattern: ${detection.pattern}
        - Execution Price: ${detection.price.toFixed(5)}
        
        Provide a concise analysis in 3 short sections:
        1. **Market Sentiment**: What does this pattern tell us about the current battle between bulls and bears?
        2. **Strategic Outlook**: Suggest a hypothetical Entry, Stop Loss, and Take Profit logic based on this ${detection.pattern}.
        3. **Risk Note**: One specific thing to watch out for with this pair/pattern combo.
        Keep the response professional and under 150 words.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview', 
          contents: prompt,
        });
        
        setAiAnalysis(response.text || 'Unable to generate analysis at this time.');
      } catch (error: any) {
        console.error('AI Error:', error);
        
        // Robust Error Handling for 429/Quota issues
        if (error.message?.includes('429') || error.toString().includes('429') || error.toString().includes('RESOURCE_EXHAUSTED')) {
          setAiAnalysis(`[System Notice: AI Cloud Quota Reached]
          
FALLBACK ANALYSIS for ${detection.pattern}:

1. SENTIMENT
${isBullishSignal ? 'Buyers are stepping in. Rejection of lower prices suggests potential reversal upside.' : 'Sellers are dominating. Rejection of higher prices suggests continuation or reversal downside.'}

2. STRATEGY
- Conservative: Wait for the next candle to close ${isBullishSignal ? 'green' : 'red'} for confirmation.
- Aggressive: Enter on break of ${isBullishSignal ? 'high' : 'low'}.

3. RISK MANAGEMENT
Place Stop Loss ${isBullishSignal ? 'below the low' : 'above the high'} of the pattern structure.`);
        } else {
          setAiAnalysis(`AI Insight unavailable: ${error.message || 'Connection failed'}. Please check your internet connection.`);
        }
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchAIAnalysis();
  }, [detection, isBullishSignal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`border w-full max-w-2xl max-h-[95vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300
        ${isDarkMode ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isBullishSignal ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
              {isBullishSignal ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{detection.pair} <span className="text-zinc-500 text-sm font-normal">/ {detection.timeframe}</span></h2>
              <p className={`text-xs font-mono font-bold uppercase tracking-wider ${isBullishSignal ? 'text-emerald-500' : 'text-rose-500'}`}>
                {detection.pattern} Identified
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Mini Chart Section */}
          <div className={`relative w-full h-[180px] border-b ${isDarkMode ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-slate-50/50 border-slate-100'}`}>
             <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
             <div className={`absolute top-2 left-4 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded
               ${isDarkMode ? 'bg-zinc-950/50 text-zinc-500' : 'bg-white/80 text-slate-500'}`}>Pattern Structure</div>
          </div>

          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Price', value: detection.price.toFixed(5), color: isDarkMode ? 'text-zinc-200' : 'text-slate-900' },
                { label: 'Confidence', value: `${(detection.confidence * 100).toFixed(0)}%`, color: 'text-emerald-500' },
                { label: 'Time', value: new Date(detection.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), color: isDarkMode ? 'text-zinc-200' : 'text-slate-900' },
                { label: 'Direction', value: isBullishSignal ? 'BULLISH' : 'BEARISH', badge: true }
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-zinc-800/40 border-zinc-700/30' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[10px] font-bold uppercase mb-1 ${isDarkMode ? 'text-zinc-500' : 'text-slate-400'}`}>{item.label}</p>
                  {item.badge ? (
                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${isBullishSignal ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'}`}>
                      {item.value}
                    </p>
                  ) : (
                    <p className={`text-sm font-mono ${item.color}`}>{item.value}</p>
                  )}
                </div>
              ))}
            </div>

            {/* AI Analysis Section */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Brain className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Gemini AI Intelligence</h3>
              </div>
              <div className={`border p-5 rounded-2xl leading-relaxed text-sm ${isDarkMode ? 'bg-blue-500/5 border-blue-500/10 text-zinc-300' : 'bg-blue-50 border-blue-100 text-slate-700'}`}>
                {isAiLoading ? (
                  <div className="flex items-center gap-3 py-4">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-zinc-500 font-mono italic">Consulting market intelligence...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap font-sans">
                    {aiAnalysis}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer Action */}
        <div className={`p-5 border-t flex flex-col md:flex-row gap-3 ${isDarkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white border-slate-200'}`}>
          <a
            href={getTradingViewUrl()}
            target="_blank"
            rel="noopener noreferrer" 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border
              ${isDarkMode ? 'bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700' : 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200'}`}
          >
            <ExternalLink className="w-4 h-4" />
            Open in TradingView
          </a>
          <button 
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg
               ${isDarkMode ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30'}`}
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatternDetail;
