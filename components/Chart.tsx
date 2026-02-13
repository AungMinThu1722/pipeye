import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickSeries, Time, SeriesMarker, SeriesMarkerPosition, SeriesMarkerShape } from 'lightweight-charts';
import { Timer } from 'lucide-react';
import { Candle, Timeframe, Detection, PatternType } from '../types';

interface ChartProps {
  pair: string;
  timeframe: Timeframe;
  data: Candle[];
  detections: Detection[];
  isDarkMode: boolean;
}

const Chart: React.FC<ChartProps> = ({ pair, timeframe, data, detections, isDarkMode }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  // State for visual effects and timer
  const [pulse, setPulse] = useState<{ x: number, y: number, show: boolean, color: string }>({ x: 0, y: 0, show: false, color: '#10b981' });
  const [timeLeft, setTimeLeft] = useState('--:--:--');
  const prevDetectionIdRef = useRef<string | null>(null);
  const latestDataRef = useRef<Candle[]>(data);

  // Define colors based on theme
  const colors = {
    background: isDarkMode ? 'transparent' : '#ffffff',
    textColor: isDarkMode ? '#a1a1aa' : '#334155', // zinc-400 vs slate-700
    gridColor: isDarkMode ? 'rgba(39, 39, 42, 0.3)' : 'rgba(226, 232, 240, 0.6)', // zinc-800 vs slate-200
    scaleBorder: isDarkMode ? 'rgba(63, 63, 70, 0.4)' : 'rgba(203, 213, 225, 0.8)',
    crosshair: isDarkMode ? '#fbbf24' : '#2563eb', // Amber vs Blue
    upColor: '#10b981',
    downColor: '#f43f5e',
  };

  // Helper to get seconds for timeframe
  const getTimeframeSeconds = (tf: Timeframe) => {
    switch(tf) {
      case 'H4': return 14400; // 4 * 60 * 60
      case 'D1': return 86400; // 24 * 60 * 60
      case 'W1': return 604800; // 7 * 24 * 60 * 60
      default: return 86400;
    }
  };

  // Update ref when data changes for the timer interval to read from
  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  // Candle Countdown Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (!latestDataRef.current.length) {
        setTimeLeft('--:--:--');
        return;
      }
      
      const lastCandle = latestDataRef.current[latestDataRef.current.length - 1];
      const tfSeconds = getTimeframeSeconds(timeframe);
      // The 'time' in Candle is the Open Time. Close time is Open + Duration.
      const closeTime = lastCandle.time + tfSeconds;
      const now = Math.floor(Date.now() / 1000);
      const diff = closeTime - now;
      
      if (diff > 0) {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00:00');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeframe]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      timeScale: {
        borderColor: colors.scaleBorder,
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: colors.scaleBorder,
      },
      crosshair: {
        mode: 1, 
        vertLine: {
          color: colors.crosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: colors.crosshair,
        },
        horzLine: {
          color: colors.crosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: colors.crosshair,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor,
      downColor: colors.downColor,
      borderVisible: false,
      wickUpColor: colors.upColor,
      wickDownColor: colors.downColor,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isDarkMode]); // Re-create chart on theme change

  // Update data and markers when they change
  useEffect(() => {
    if (seriesRef.current) {
      
      // Filter detections relevant to this chart to avoid cross-pair contamination
      const relevantDetections = detections.filter(d => 
        d.pair === pair && d.timeframe === timeframe
      );

      const chartData = data.map(candle => {
        const isPattern = relevantDetections.some(d => d.timestamp === candle.time);
        if (isPattern) {
           return {
             ...candle,
             borderColor: isDarkMode ? '#fbbf24' : '#2563eb', // Amber vs Blue
             wickColor: isDarkMode ? '#fbbf24' : '#2563eb',
             borderVisible: true
           };
        }
        return candle;
      });

      // Efficiently update data
      seriesRef.current.setData(chartData as any);
      
      const markers: SeriesMarker<Time>[] = relevantDetections
        .filter(d => data.some(c => c.time === d.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(d => {
          const candle = data.find(c => c.time === d.timestamp);
          
          let position: SeriesMarkerPosition = 'aboveBar';
          let shape: SeriesMarkerShape = 'arrowDown';
          let color = '#f43f5e';
          let text = '';

          // Determine direction
          let isBullish = d.pattern.includes('Bullish') || d.pattern === PatternType.INVERTED_HAMMER;
          
          if (d.pattern === PatternType.PINBAR && candle) {
             const range = Math.max(0.00001, candle.high - candle.low);
             const lowerWick = Math.min(candle.open, candle.close) - candle.low;
             isBullish = lowerWick > range * 0.5;
          }

          if (isBullish) {
             position = 'belowBar';
             shape = 'arrowUp';
             color = '#10b981';
          } else if (d.pattern.includes('Bearish') || (d.pattern === PatternType.PINBAR && !isBullish)) {
             position = 'aboveBar';
             shape = 'arrowDown';
             color = '#f43f5e';
          } else {
             position = 'aboveBar';
             shape = 'circle';
             color = isDarkMode ? '#fbbf24' : '#2563eb';
          }

          if (d.pattern === PatternType.BULLISH_ENGULFING) text = 'Bull Eng';
          else if (d.pattern === PatternType.BEARISH_ENGULFING) text = 'Bear Eng';
          else if (d.pattern === PatternType.INVERTED_HAMMER) text = 'Inv Hammer';
          else if (d.pattern === PatternType.BULLISH_HAMMER) text = 'Hammer';
          else if (d.pattern === PatternType.BEARISH_HAMMER) text = 'S. Star';
          else text = d.pattern;

          return {
            time: d.timestamp as unknown as Time,
            position,
            shape,
            color,
            text,
            size: 1,
          };
        });

      // Safely call setMarkers if it exists on the series object
      const seriesApi = seriesRef.current as any;
      if (typeof seriesApi.setMarkers === 'function') {
         seriesApi.setMarkers(markers);
      }

      // Visual Effects Logic (Pulse)
      if (relevantDetections.length > 0) {
        const latestDetection = relevantDetections[0];
        
        if (latestDetection.id !== prevDetectionIdRef.current) {
          const isFirstLoad = prevDetectionIdRef.current === null;
          prevDetectionIdRef.current = latestDetection.id;

          if (!isFirstLoad && chartRef.current) {
            // chartRef.current.timeScale().scrollToRealTime(); // Disabled to prevent annoying jumps during history checks

            setTimeout(() => {
              if (!chartRef.current || !seriesRef.current) return;

              const time = latestDetection.timestamp as unknown as Time;
              const x = chartRef.current.timeScale().timeToCoordinate(time);
              const y = seriesRef.current.priceToCoordinate(latestDetection.price);

              if (x !== null && y !== null) {
                // Determine color
                let isBullish = latestDetection.pattern.includes('Bullish') || latestDetection.pattern === PatternType.INVERTED_HAMMER;
                // ... (logic from before for pinbar direction) ...
                if (latestDetection.pattern === PatternType.PINBAR) {
                     const candle = data.find(c => c.time === latestDetection.timestamp);
                     if (candle) {
                         const range = Math.max(0.00001, candle.high - candle.low);
                         const lowerWick = Math.min(candle.open, candle.close) - candle.low;
                         isBullish = lowerWick > range * 0.5;
                     }
                }
                const color = isBullish ? '#10b981' : '#f43f5e';

                setPulse({ x, y, show: true, color });
                setTimeout(() => setPulse(p => ({ ...p, show: false })), 3000);
              }
            }, 100);
          }
        }
      }
    }
  }, [data, detections, isDarkMode, pair, timeframe]);

  return (
    <div className={`
      relative w-full h-full rounded-2xl border overflow-hidden backdrop-blur-sm transition-all duration-700
      ${isDarkMode 
        ? 'bg-zinc-900/40 shadow-xl border-zinc-800' 
        : 'bg-white shadow-md border-slate-200'}
      ${pulse.show 
        ? (pulse.color === '#10b981' 
            ? 'border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.2)]' 
            : 'border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.2)]') 
        : ''}
    `}>
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Pulse Effect Overlay */}
      {pulse.show && (
        <div 
          className="absolute z-20 pointer-events-none transition-opacity duration-300"
          style={{ 
            left: pulse.x, 
            top: pulse.y, 
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className="relative flex h-16 w-16">
            <span 
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
              style={{ backgroundColor: pulse.color }}
            ></span>
            <span 
              className="relative inline-flex rounded-full h-16 w-16 opacity-10 blur-md"
              style={{ backgroundColor: pulse.color }}
            ></span>
          </span>

          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4">
             <div className="flex flex-col items-center animate-bounce">
                <div 
                  className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px]"
                  style={{ borderBottomColor: pulse.color }}
                ></div>
                <span 
                  className="text-[10px] font-black uppercase tracking-wider text-white px-2 py-1 rounded shadow-lg whitespace-nowrap"
                  style={{ backgroundColor: pulse.color }}
                >
                  New Signal
                </span>
             </div>
          </div>
        </div>
      )}

      {/* Overlay Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-3">
        <div className={`backdrop-blur-md border px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg transition-colors duration-300
          ${isDarkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-slate-200'}`}>
           <span className={`text-sm font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>{pair}</span>
        </div>
        
        <div className={`backdrop-blur-md border px-3 py-1.5 rounded-lg flex items-center gap-3 shadow-lg transition-colors duration-300
          ${isDarkMode ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-slate-200'}`}>
           <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-mono font-bold border 
             ${isDarkMode 
               ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
               : 'bg-blue-600/10 text-blue-600 border-blue-600/20'}`}>
             {timeframe}
           </span>
           <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-zinc-400' : 'text-slate-500'}`}>
             <Timer className="w-3 h-3" />
             {timeLeft}
           </span>
        </div>
      </div>
    </div>
  );
};

export default Chart;