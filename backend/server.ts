/**
 * Note: This file represents the Node.js backend logic 
 * designed for deployment as a cron service (e.g., on Render).
 */

import axios from 'axios';
// import { createClient } from '@supabase/supabase-js';
// import { detectPatterns } from '../engine/detector';

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Main worker logic
 * Triggered immediately on start and then every 15 minutes.
 */
async function scanPatterns() {
  console.log(`[${new Date().toISOString()}] Starting sync cycle...`);

  // Updated pairs list to include Indices and major pairs
  const pairs = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 
    'NZD/USD', 'USD/CAD', 'XAU/USD'
  ];
  const timeframes = ['4h', '1day', '1week'];

  for (const pair of pairs) {
    for (const tf of timeframes) {
      try {
        console.log(`Scanning ${pair} on ${tf}...`);
        
        // Fetch OHLC from TwelveData
        const response = await axios.get(`https://api.twelvedata.com/time_series`, {
          params: {
            symbol: pair,
            interval: tf,
            apikey: TWELVE_DATA_API_KEY,
            outputsize: 100
          }
        });

        if (response.data.status === 'error') {
          console.error(`API Error for ${pair}:`, response.data.message);
        } else {
          const candles = response.data.values.map((v: any) => ({
            time: new Date(v.datetime).getTime() / 1000,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close)
          })).reverse();

          // Use the detection engine
          // const detection = detectPatterns(candles, pair, tf);
          
          /* 
          if (detection) {
             await supabase.from('detections').insert({
               pair,
               timeframe: tf,
               pattern_type: detection.pattern,
               price: detection.price,
               timestamp: detection.timestamp
             });
          }
          */
        }

        // Rate limit safety: Free tier ~8 requests/min
        // 8s delay ensures we stay well within limits
        await new Promise(r => setTimeout(r, 8000));
        
      } catch (error) {
        console.error(`Error scanning ${pair}:`, error);
      }
    }
  }
  console.log(`[${new Date().toISOString()}] Sync cycle completed.`);
}

// Start the worker loop
scanPatterns();
setInterval(scanPatterns, SYNC_INTERVAL);