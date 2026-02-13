import React from 'react';
import { X, BookOpen, GraduationCap } from 'lucide-react';

interface PatternGlossaryProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const PatternGlossary: React.FC<PatternGlossaryProps> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;

  const cards = [
    {
      title: "Engulfing Pattern",
      description: "A engulfing candlestick pattern in forex occurs when a larger candle completely engulfs the previous candle, indicating a possible reversal of market direction. Engulfing patterns can be used to identify potential trend reversals and make informed decisions about entering and exiting positions.",
      visual: (isDark: boolean) => (
        <div className="flex items-end justify-center gap-1 h-20 w-full bg-gradient-to-t from-transparent to-transparent">
          <div className="flex flex-col items-center justify-end h-full pb-4">
             <div className={`w-0.5 h-2 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
             <div className={`w-3 h-6 ${isDark ? 'bg-rose-500' : 'bg-rose-500'} rounded-[1px]`}></div>
             <div className={`w-0.5 h-2 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
          </div>
          <div className="flex flex-col items-center justify-end h-full pb-2">
             <div className={`w-0.5 h-3 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
             <div className={`w-5 h-12 ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'} rounded-[1px] shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse`}></div>
             <div className={`w-0.5 h-3 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
          </div>
        </div>
      )
    },
    {
      title: "Hammer / Pinbar",
      description: "A hammer candlestick is a single candlestick pattern characterized by a small body with a long lower shadow, resembling a hammer. It typically signals a potential reversal in the market, suggesting that buyers are gaining control after a period of selling pressure.",
      visual: (isDark: boolean) => (
        <div className="flex items-center justify-center h-20 w-full">
           <div className="flex flex-col items-center h-full justify-end pb-2">
              <div className={`w-0.5 h-1 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
              <div className={`w-5 h-5 ${isDark ? 'bg-emerald-500' : 'bg-emerald-500'} rounded-[1px] z-10 shadow-[0_0_15px_rgba(16,185,129,0.2)]`}></div>
              <div className={`w-0.5 h-10 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
           </div>
        </div>
      )
    },
    {
      title: "Doji",
      description: "A doji candlestick in forex is a candlestick pattern characterized by a small body, where the opening and closing prices are nearly equal, often signaling market indecision. Doji patterns can be used to identify potential trend reversals or continuations as they indicate a lack of clear direction and the possibility of a change in market sentiment.",
      visual: (isDark: boolean) => (
        <div className="flex items-center justify-center h-20 w-full">
           <div className="flex flex-col items-center h-full justify-center">
              <div className={`w-0.5 h-6 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
              <div className={`w-6 h-0.5 ${isDark ? 'bg-zinc-200' : 'bg-slate-600'}`}></div>
              <div className={`w-0.5 h-6 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'}`}></div>
           </div>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200
        ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className={`p-5 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-zinc-100' : 'text-slate-900'}`}>Pattern Definitions</h2>
              <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Educational reference for identified signals</p>
            </div>
          </div>
          <button onClick={onClose} className={`transition-colors p-2 rounded-full ${isDarkMode ? 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, idx) => (
              <div key={idx} className={`flex flex-col rounded-xl overflow-hidden border transition-all duration-300 hover:shadow-lg
                ${isDarkMode ? 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700' : 'bg-slate-50 border-slate-200 hover:border-indigo-200 hover:shadow-indigo-500/10'}`}>
                
                {/* Visual Area */}
                <div className={`p-6 border-b flex items-center justify-center ${isDarkMode ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-slate-100'}`}>
                  {card.visual(isDarkMode)}
                </div>

                {/* Text Area */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-zinc-200' : 'text-slate-800'}`}>
                    {card.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-slate-100 bg-slate-50'}`}>
           <button 
             onClick={onClose}
             className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors
               ${isDarkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
           >
             Close Glossary
           </button>
        </div>

      </div>
    </div>
  );
};

export default PatternGlossary;