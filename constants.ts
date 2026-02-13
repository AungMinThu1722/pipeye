
import { PairConfig } from './types';

export interface ExtendedPairConfig extends PairConfig {
  basePrice: number;
  apiSymbol?: string; // Optional override for API calls (e.g. US30 -> DJI)
}

// Helper to safely access environment variables
// This prevents "Cannot read properties of undefined" errors if import.meta.env is missing
const getEnv = (key: string) => {
  try {
    const meta = import.meta as any;
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    // Ignore runtime errors accessing meta
  }
  return undefined;
};

export const API_CONFIG = {
  // Configured with provided Twelve Data API Keys
  KEYS: [
    getEnv('VITE_TD_API_KEY_1') || '556aa6d666ac4326b820ca5c57dcf145',
    getEnv('VITE_TD_API_KEY_2') || '4d89666d445d4968b0b852806d425547'
  ],
  BASE_URL: 'https://api.twelvedata.com',
  INTERVAL_MAP: {
    'H4': '4h',
    'D1': '1day',
    'W1': '1week'
  } as Record<string, string>
};

export const FOREX_PAIRS: ExtendedPairConfig[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.0854 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', basePrice: 1.2642 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', basePrice: 150.12 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', basePrice: 0.6534 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', basePrice: 0.8812 },
  { symbol: 'NZD/USD', name: 'NZ Dollar / US Dollar', basePrice: 0.6100 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', basePrice: 1.3500 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', basePrice: 2035.00 },
];

export const TIMEFRAMES = ['H4', 'D1', 'W1'];
