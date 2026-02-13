import { Candle, PatternType, Detection } from '../types';

// Configuration thresholds for pattern detection
const CONFIG = {
  DOJI: {
    BODY_RATIO: 0.15, // Body relative to total range
  },
  PINBAR: {
    BODY_RATIO: 0.4,
    LONG_WICK_RATIO: 0.6,
    SHORT_WICK_RATIO: 0.2,
  },
  INVERTED_HAMMER: {
    UPPER_WICK_RATIO: 2.0, // Relative to body
    LOWER_WICK_RATIO: 0.5, // Relative to body
    BODY_RANGE_RATIO: 0.4, // Relative to range
  },
  HAMMER: {
    LONG_WICK_RATIO: 2.0, // Relative to body
    SHORT_WICK_RATIO: 0.25, // Relative to body
  }
};

/**
 * Detects candlestick patterns at a specific index in a candle array.
 */
const detectAtIndex = (
  candles: Candle[],
  index: number,
  pair: string,
  timeframe: string
): Detection | null => {
  if (index < 1 || index >= candles.length) return null;

  const current = candles[index];
  const previous = candles[index - 1];

  const bodySize = (c: Candle) => Math.abs(c.open - c.close);
  const totalSize = (c: Candle) => Math.max(0.00001, c.high - c.low); // Avoid division by zero
  const isBullish = (c: Candle) => c.close > c.open;
  const isBearish = (c: Candle) => c.close < c.open;
  
  const getWicks = (c: Candle) => ({
    upperWick: c.high - Math.max(c.open, c.close),
    lowerWick: Math.min(c.open, c.close) - c.low
  });

  // Pattern detection helpers
  const isDoji = (c: Candle) => {
    const body = bodySize(c);
    const range = totalSize(c);
    return body <= range * CONFIG.DOJI.BODY_RATIO;
  };

  const isPinbar = (c: Candle) => {
    const body = bodySize(c);
    const range = totalSize(c);
    const { upperWick, lowerWick } = getWicks(c);

    // Pinbar must have a small body relative to range
    if (body > range * CONFIG.PINBAR.BODY_RATIO) return false;

    // Bullish Pinbar (long lower wick)
    if (lowerWick > range * CONFIG.PINBAR.LONG_WICK_RATIO && upperWick < range * CONFIG.PINBAR.SHORT_WICK_RATIO) return true;
    // Bearish Pinbar (long upper wick)
    if (upperWick > range * CONFIG.PINBAR.LONG_WICK_RATIO && lowerWick < range * CONFIG.PINBAR.SHORT_WICK_RATIO) return true;
    
    return false;
  };

  const isInvertedHammer = (c: Candle) => {
    const body = bodySize(c);
    const range = totalSize(c);
    const { upperWick, lowerWick } = getWicks(c);
    return upperWick > body * CONFIG.INVERTED_HAMMER.UPPER_WICK_RATIO && 
           lowerWick < body * CONFIG.INVERTED_HAMMER.LOWER_WICK_RATIO && 
           body < range * CONFIG.INVERTED_HAMMER.BODY_RANGE_RATIO;
  };

  const isBullishHammer = (c: Candle) => {
    const body = bodySize(c);
    const { upperWick, lowerWick } = getWicks(c);
    
    // Lower shadow at least twice the size of real body
    // Upper shadow less than 25% of real body
    return lowerWick >= body * CONFIG.HAMMER.LONG_WICK_RATIO && 
           upperWick < body * CONFIG.HAMMER.SHORT_WICK_RATIO;
  };

  const isBearishHammer = (c: Candle) => {
    const body = bodySize(c);
    const { upperWick, lowerWick } = getWicks(c);

    // Upper shadow at least twice the size of real body
    // Lower shadow less than 25% of real body
    return upperWick >= body * CONFIG.HAMMER.LONG_WICK_RATIO && 
           lowerWick < body * CONFIG.HAMMER.SHORT_WICK_RATIO;
  };

  // 1. Check Bullish Engulfing
  if (
    isBearish(previous) && 
    isBullish(current) && 
    current.close >= previous.open && 
    current.open <= previous.close &&
    bodySize(current) > bodySize(previous)
  ) {
    return createDetection(PatternType.BULLISH_ENGULFING, pair, timeframe, current);
  }

  // 2. Check Bearish Engulfing
  if (
    isBullish(previous) && 
    isBearish(current) && 
    current.close <= previous.open && 
    current.open >= previous.close &&
    bodySize(current) > bodySize(previous)
  ) {
    return createDetection(PatternType.BEARISH_ENGULFING, pair, timeframe, current);
  }

  // 3. Check Bullish Hammer
  if (isBullishHammer(current)) {
    return createDetection(PatternType.BULLISH_HAMMER, pair, timeframe, current);
  }

  // 4. Check Bearish Hammer
  if (isBearishHammer(current)) {
    return createDetection(PatternType.BEARISH_HAMMER, pair, timeframe, current);
  }

  // 5. Check Pinbar
  // Note: Pinbar and Hammer logic can overlap. Order matters or we can return multiple if architecture supported it.
  // Here we prioritize explicit Hammer/Shooting Star definitions before generic Pinbar if strictly defined.
  if (isPinbar(current)) {
    return createDetection(PatternType.PINBAR, pair, timeframe, current);
  }

  // 6. Check Inverted Hammer
  if (isInvertedHammer(current)) {
    return createDetection(PatternType.INVERTED_HAMMER, pair, timeframe, current);
  }

  // 7. Check Doji
  if (isDoji(current)) {
    return createDetection(PatternType.DOJI, pair, timeframe, current);
  }

  return null;
};

/**
 * Scans the entire history of candles for patterns.
 * Useful for populating the feed with historical context.
 */
export const scanHistory = (
  candles: Candle[],
  pair: string,
  timeframe: string
): Detection[] => {
  const allDetections: Detection[] = [];
  // Scan from oldest to newest to maintain some order, but we'll reverse for the UI feed
  for (let i = 1; i < candles.length; i++) {
    const detection = detectAtIndex(candles, i, pair, timeframe);
    if (detection) {
      allDetections.push(detection);
    }
  }
  return allDetections;
};

/**
 * Detects patterns only at the most recent candle.
 */
export const detectPatterns = (
  candles: Candle[], 
  pair: string, 
  timeframe: string
): Detection | null => {
  return detectAtIndex(candles, candles.length - 1, pair, timeframe);
};

const createDetection = (
  pattern: PatternType, 
  pair: string, 
  timeframe: string, 
  candle: Candle
): Detection => ({
  id: `${pair}-${pattern}-${candle.time}`,
  pattern,
  pair,
  timeframe,
  timestamp: candle.time,
  price: candle.close,
  confidence: 0.8 + (Math.random() * 0.15) // Simulated confidence score
});