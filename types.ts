
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export enum PatternType {
  BULLISH_ENGULFING = 'Bullish Engulfing',
  BEARISH_ENGULFING = 'Bearish Engulfing',
  DOJI = 'Doji',
  PINBAR = 'Pinbar',
  INVERTED_HAMMER = 'Inverted Hammer',
  BULLISH_HAMMER = 'Bullish Hammer',
  BEARISH_HAMMER = 'Bearish Hammer',
  NONE = 'None'
}

export interface Detection {
  id: string;
  pattern: PatternType;
  pair: string;
  timeframe: string;
  timestamp: number;
  price: number;
  confidence: number;
}

export type Timeframe = 'H4' | 'D1' | 'W1';

export interface PairConfig {
  symbol: string;
  name: string;
}

export interface NotificationConfig {
  masterEnabled: boolean;
  pairs: string[];
  patterns: PatternType[];
}

export interface TradeLog {
  id: string;
  date: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  outcome: 'WIN' | 'LOSS' | 'BE';
  notes: string;
  screenshots: string[]; // Changed to array
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface PlanningPost {
  id: string;
  timestamp: number;
  content: string;
  images: string[]; // Changed to array
  likes: number;
  comments: Comment[]; // Added comments
}