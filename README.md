# Forex Pattern Pro FX

A high-performance forex candlestick pattern detection dashboard with real-time alerts, TradingView-style charts, and Gemini AI-powered analysis.

## Features

- **Real-time Data**: WebSocket integration with TwelveData for live price ticks.
- **Pattern Detection**: Custom engine to detect Bullish/Bearish Engulfing, Doji, Pinbars, and Hammers.
- **AI Analysis**: Google Gemini integration for "Market Sentiment", "Strategic Outlook", and "Risk Assessment" on detected patterns.
- **Interactive Charts**: Lightweight Charts implementation for performance.
- **Glassmorphism UI**: Modern, dark-themed aesthetic.

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd forex-pattern-pro
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_genai_api_key
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Deployment

This project is ready to be deployed on Vercel or Render.

**Render Build Command:** `npm run build`
**Render Output Directory:** `dist`
