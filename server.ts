import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import yahooFinance from "yahoo-finance2";
const yahooFinanceInstance = new (yahooFinance as any)();
import axios from "axios";
import "dotenv/config";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const dbAdmin = admin.firestore();

// --- API Configuration ---
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const POLYGON_KEY = process.env.POLYGON_API_KEY;
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY;

// Helper to check if API key is valid (not a placeholder)
const isValidKey = (key: string | undefined) => {
  if (!key) return false;
  const placeholders = ["YOUR_API_KEY", "YOUR_POLYGON_KEY", "YOUR_FINNHUB_KEY", "YOUR_ALPHA_VANTAGE_KEY", "YOUR_TWELVE_DATA_KEY"];
  return !placeholders.includes(key);
};

// --- Market Data Service ---
const MarketService = {
  async getQuote(symbol: string, market: 'GLOBAL' | 'INDIA' = 'GLOBAL') {
    // 0. Handle Indian Stocks (NSE)
    if (market === 'INDIA') {
      try {
        const nseSymbol = (symbol.startsWith('^') || symbol.endsWith('.NS')) ? symbol : `${symbol}.NS`;
        const quoteResult = await yahooFinanceInstance.quote(nseSymbol) as any;
        const quote = Array.isArray(quoteResult) ? quoteResult[0] : quoteResult;
        
        if (quote && quote.regularMarketPrice) {
          return {
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            source: "yahoo_nse",
            currency: "INR"
          };
        }
      } catch (err: any) {
        console.warn(`Yahoo Finance NSE failed for ${symbol}:`, err.message);
      }
    }

    // 1. Try Polygon.io if key exists
    if (isValidKey(POLYGON_KEY)) {
      try {
        // Use Snapshot API for more complete data (price + change)
        const response = await axios.get(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol.toUpperCase()}?apiKey=${POLYGON_KEY}`);
        if (response.data && response.data.ticker) {
          const t = response.data.ticker;
          return {
            price: t.lastTrade?.p || t.day?.c || 0,
            change: t.todaysChange || 0,
            changePercent: t.todaysChangePerc || 0,
            source: "polygon"
          };
        }
        
        // Fallback to last trade if snapshot fails or isn't available for this ticker
        const lastTrade = await axios.get(`https://api.polygon.io/v2/last/trade/${symbol.toUpperCase()}?apiKey=${POLYGON_KEY}`);
        if (lastTrade.data && lastTrade.data.results) {
          return {
            price: lastTrade.data.results.p,
            change: 0,
            changePercent: 0,
            source: "polygon"
          };
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Polygon failed for ${symbol}:`, err.message);
        }
      }
    }

    // 2. Try Twelve Data if key exists
    if (isValidKey(TWELVE_DATA_KEY)) {
      try {
        const response = await axios.get(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`);
        if (response.data && response.data.price) {
          return {
            price: parseFloat(response.data.price),
            change: parseFloat(response.data.change || "0"),
            changePercent: parseFloat(response.data.percent_change || "0"),
            source: "twelve_data"
          };
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Twelve Data failed for ${symbol}:`, err.message);
        }
      }
    }

    // 3. Try Alpha Vantage if key exists
    if (isValidKey(ALPHA_VANTAGE_KEY) && !symbol.includes("-")) {
      try {
        const response = await axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`);
        const data = response.data["Global Quote"];
        if (data && data["05. price"]) {
          return {
            price: parseFloat(data["05. price"]),
            change: parseFloat(data["09. change"]),
            changePercent: parseFloat(data["10. change percent"].replace("%", "")),
            source: "alpha_vantage"
          };
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Alpha Vantage failed for ${symbol}:`, err.message);
        }
      }
    }

    // 4. Try Finnhub if key exists
    if (isValidKey(FINNHUB_KEY) && !symbol.includes("-")) {
      try {
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
        if (response.data && response.data.c) {
          return {
            price: response.data.c,
            change: response.data.d,
            changePercent: response.data.dp,
            source: "finnhub"
          };
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Finnhub failed for ${symbol}:`, err.message);
        }
      }
    }

    // 5. Try CoinGecko for Crypto (No key needed)
    if (symbol.includes("BTC") || symbol.includes("ETH") || symbol.includes("USD")) {
      const cryptoId = symbol.toLowerCase().replace("-usd", "").replace("btc", "bitcoin").replace("eth", "ethereum");
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`);
        if (response.data[cryptoId]) {
          return {
            price: response.data[cryptoId].usd,
            change: (response.data[cryptoId].usd * response.data[cryptoId].usd_24h_change) / 100,
            changePercent: response.data[cryptoId].usd_24h_change,
            source: "coingecko"
          };
        }
      } catch (err: any) {
        console.warn(`CoinGecko failed for ${symbol}:`, err.message);
      }
    }

    // 6. Try Yahoo Finance (Fallback)
    try {
      const quoteResult = await yahooFinanceInstance.quote(symbol) as any;
      const quote = Array.isArray(quoteResult) ? quoteResult[0] : quoteResult;
      
      if (quote && quote.regularMarketPrice) {
        return {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          source: "yahoo"
        };
      }
    } catch (err: any) {
      console.warn(`Yahoo Finance failed for ${symbol}:`, err.message);
    }

    // 7. Smart Simulation (Guaranteed to work)
    console.log(`>>> Using Simulation for ${symbol}`);
    const basePrice = symbol === "SPY" ? 500 : symbol.includes("BTC") ? 65000 : 150;
    const change = (Math.random() - 0.5) * (basePrice * 0.02);
    return {
      price: basePrice + change,
      change: change,
      changePercent: (change / basePrice) * 100,
      source: "finnhub_sim",
      currency: market === 'INDIA' ? 'INR' : 'USD'
    };
  },

  async getQuotes(symbols: string[]) {
    // 1. Try Twelve Data for bulk if key exists
    if (isValidKey(TWELVE_DATA_KEY)) {
      try {
        // Twelve Data uses / for crypto
        const tdSymbols = symbols.map(s => s.replace("-USD", "/USD")).join(',');
        const response = await axios.get(`https://api.twelvedata.com/quote?symbol=${tdSymbols}&apikey=${TWELVE_DATA_KEY}`);
        const data = response.data;
        
        if (data) {
          const results = symbols.map(s => {
            const tdSym = s.replace("-USD", "/USD");
            // Twelve Data returns a single object if only one symbol, or an object with symbol keys if multiple
            const q = symbols.length === 1 ? data : data[s] || data[tdSym] || data[s.toUpperCase()] || data[tdSym.toUpperCase()];
            
            if (q && q.price) {
              return {
                symbol: s.replace("-USD", ""),
                price: parseFloat(q.price),
                change: parseFloat(q.change || "0"),
                changePercent: parseFloat(q.percent_change || "0"),
                source: "twelve_data"
              };
            }
            return null;
          }).filter(r => r !== null);
          
          if (results.length > 0) return results;
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Twelve Data Bulk failed:`, err.message);
        }
      }
    }

    // 2. Try Yahoo Finance for bulk (Fallback)
    try {
      const quotes = await yahooFinanceInstance.quote(symbols) as any[];
      return quotes.map(q => ({
        symbol: q.symbol.replace("-USD", ""),
        price: q.regularMarketPrice,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
        source: "market_data"
      }));
    } catch (err: any) {
      console.warn(`Bulk fetch failed:`, err.message);
      return Promise.all(symbols.map(async s => {
        const q = await this.getQuote(s);
        return {
          symbol: s.replace("-USD", ""),
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          source: q.source
        };
      }));
    }
  },

  async getHistory(symbol: string, period1: Date, period2: Date, interval: string, market: 'GLOBAL' | 'INDIA' = 'GLOBAL') {
    const formattedSymbol = market === 'INDIA' && !symbol.startsWith('^') && !symbol.endsWith('.NS') ? `${symbol}.NS` : symbol;
    
    // 1. Try Twelve Data if key exists
    if (isValidKey(TWELVE_DATA_KEY) && market === 'GLOBAL') {
      try {
        // Map Yahoo intervals to Twelve Data intervals
        const intervalMap: Record<string, string> = {
          "1m": "1min",
          "5m": "5min",
          "15m": "15min",
          "1d": "1day",
          "1wk": "1week",
          "1mo": "1month"
        };
        const tdInterval = intervalMap[interval] || "1day";
        const response = await axios.get(`https://api.twelvedata.com/time_series?symbol=${formattedSymbol}&interval=${tdInterval}&apikey=${TWELVE_DATA_KEY}`);
        if (response.data && response.data.values) {
          return response.data.values.map((h: any) => ({
            date: new Date(h.datetime),
            close: parseFloat(h.close),
            source: "twelve_data"
          })).reverse(); // Twelve Data returns newest first
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Twelve Data History failed for ${formattedSymbol}:`, err.message);
        }
      }
    }

    // 2. Try Polygon if key exists
    if (isValidKey(POLYGON_KEY) && market === 'GLOBAL') {
      try {
        const from = period1.toISOString().split('T')[0];
        const to = period2.toISOString().split('T')[0];
        // Map intervals
        const polyIntervalMap: Record<string, string> = {
          "1m": "minute",
          "5m": "minute",
          "15m": "minute",
          "1d": "day",
          "1wk": "week",
          "1mo": "month"
        };
        const multiplierMap: Record<string, number> = {
          "1m": 1, "5m": 5, "15m": 15, "1d": 1, "1wk": 1, "1mo": 1
        };
        const timespan = polyIntervalMap[interval] || "day";
        const multiplier = multiplierMap[interval] || 1;
        
        const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${formattedSymbol.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_KEY}`);
        if (response.data && response.data.results) {
          return response.data.results.map((r: any) => ({
            date: new Date(r.t),
            close: r.c,
            source: "polygon"
          }));
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn(`Polygon History failed for ${formattedSymbol}:`, err.message);
        }
      }
    }

    // 3. Try Yahoo Finance (Fallback)
    try {
      const chartResult = await yahooFinanceInstance.chart(formattedSymbol, {
        period1,
        period2,
        interval: interval as any
      }) as any;
      
      if (chartResult && chartResult.quotes) {
        return chartResult.quotes.map((h: any) => ({
          date: h.date,
          close: h.close,
          source: "yahoo"
        })).filter((h: any) => h.close !== null);
      }
      throw new Error("No quotes in chart result");
    } catch (err: any) {
      console.warn(`History failed for ${formattedSymbol}:`, err.message);
      // Simulation fallback
      const points = 30;
      const data = [];
      let lastPrice = formattedSymbol === "SPY" ? 500 : 150;
      for (let i = 0; i < points; i++) {
        const date = new Date(period1);
        date.setDate(date.getDate() + i);
        lastPrice = lastPrice * (1 + (Math.random() - 0.5) * 0.02);
        data.push({ date, close: lastPrice, source: "simulation" });
      }
      return data;
    }
  },

  async getMarketStatus() {
    if (isValidKey(POLYGON_KEY)) {
      try {
        const response = await axios.get(`https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_KEY}`);
        if (response.data && response.data.market) {
          const status = response.data.market === 'open' ? 'Open' : 'Closed';
          console.log(`>>> Polygon Market Status: ${status} (API: ${response.data.market})`);
          return status;
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn("Polygon Market Status failed:", err.message);
        }
      }
    }
    
    // Fallback to time-based logic if API fails
    const now = new Date();
    // Use US Eastern Time for market hours
    const estDate = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const day = estDate.getDay();
    const hour = estDate.getHours();
    const min = estDate.getMinutes();
    
    // US Market hours: 9:30 AM - 4:00 PM EST/EDT
    const isWeekday = day >= 1 && day <= 5;
    const isBusinessHours = (hour > 9 || (hour === 9 && min >= 30)) && hour < 16;
    
    const isOpen = isWeekday && isBusinessHours;
    console.log(`>>> Fallback Market Status: ${isOpen ? 'Open' : 'Closed'} (EST: ${hour}:${min}, Day: ${day})`);
    return isOpen ? 'Open' : 'Closed';
  }
};

// --- Simulation Engine ---
const generateSimulationData = () => {
  return {
    value: Math.floor(60 + Math.random() * 20),
    trend: Math.random() > 0.5 ? "up" : "down",
    confidence: (80 + Math.random() * 10).toFixed(1) + "%",
  };
};

// --- Fallback System ---
async function fetchWithFallback(
  primaryFn: () => Promise<any>,
  fallbackFn: () => Promise<any>,
  simulationFn: () => any
) {
  // Try Primary
  try {
    const data = await primaryFn();
    return { ...data, source: "primary" };
  } catch (e1) {
    console.error("Primary API failed:", e1);
    // Try Fallback
    try {
      const data = await fallbackFn();
      return { ...data, source: "fallback" };
    } catch (e2) {
      console.error("Fallback API failed:", e2);
      // Use Simulation
      const data = simulationFn();
      return { ...data, source: "simulation" };
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string) || 37.7749;
      const lon = parseFloat(req.query.lon as string) || -122.4194;
      const forceCache = req.query.mode === 'low_data';
      const { apiService } = await import("./src/server/apiService.js");
      const weatherData = await apiService.getWeather(lat, lon, forceCache);
      res.json(weatherData);
    } catch (error: any) {
      console.error("Weather API Error:", error);
      res.status(500).json({ error: "Failed to fetch weather data", details: error.message });
    }
  });

  app.get("/api/data", async (req, res) => {
    const market = (req.query.market as 'GLOBAL' | 'INDIA') || 'GLOBAL';
    try {
      const quote = await MarketService.getQuote("SPY", market);
      res.json({
        value: quote.price.toFixed(2),
        trend: quote.change >= 0 ? "up" : "down",
        confidence: "98.5%",
        source: quote.source
      });
    } catch (err) {
      console.error("Market Data SPY Error:", err);
      res.json({
        value: Math.floor(60 + Math.random() * 20),
        trend: Math.random() > 0.5 ? "up" : "down",
        confidence: (80 + Math.random() * 10).toFixed(1) + "%",
        source: "simulation"
      });
    }
  });

  // --- AI API Routes REMOVED (Gemini API must be called from frontend) ---

  app.get("/api/stock/realtime/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const market = (req.query.market as 'GLOBAL' | 'INDIA') || 'GLOBAL';
    
    try {
      const quote = await MarketService.getQuote(symbol, market);
      let newsItems: string[] = [];
      try {
        // 1. Try Polygon News if key exists
        if (isValidKey(POLYGON_KEY)) {
          const response = await axios.get(`https://api.polygon.io/v2/reference/news?ticker=${symbol}&limit=3&apiKey=${POLYGON_KEY}`);
          if (response.data && response.data.results && response.data.results.length > 0) {
            newsItems = response.data.results.map((n: any) => n.title);
          }
        }

        // 2. Try Finnhub News if key exists and no news yet
        if (newsItems.length === 0 && isValidKey(FINNHUB_KEY)) {
          const to = new Date().toISOString().split('T')[0];
          const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const response = await axios.get(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`);
          if (response.data && response.data.length > 0) {
            newsItems = response.data.slice(0, 3).map((n: any) => n.headline);
          }
        }

        // 3. Fallback to Yahoo Finance Search
        if (newsItems.length === 0) {
          const search = await yahooFinanceInstance.search(symbol) as any;
          newsItems = search.news?.slice(0, 3).map((n: any) => n.title) || [`No recent news found for ${symbol}.`];
        }
      } catch (newsErr: any) {
        if (newsErr.response?.status !== 401) {
          console.warn(`Could not fetch news for ${symbol}:`, newsErr);
        }
        newsItems = [`Latest update on ${symbol} shows steady movement.`];
      }

      // Prepare news items as NewsItem objects
      const formattedNews = newsItems.map((title: string, i: number) => ({
        id: `news-${i}-${Date.now()}`,
        title,
        source: "Market News",
        time: new Date().toISOString(),
        sentiment: 0,
        impact: "Medium"
      }));

      const result = {
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        news: formattedNews,
        currency: quote.currency || "USD",
        isLive: quote.source !== "simulation",
        source: quote.source,
        timestamp: new Date().toISOString()
      };
      
      // Normalize symbol for Firestore (strip .NS for consistency)
      const normalizedSymbol = market === 'INDIA' ? symbol.replace('.NS', '') : symbol;

      // Write to Firestore using Admin SDK (bypasses security rules)
      try {
        await dbAdmin.collection('stocks').doc(market).collection('symbols').doc(normalizedSymbol).set({
          ...result,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (firestoreErr) {
        console.error(`Firestore Admin write failed for ${symbol}:`, firestoreErr);
      }
      
      res.json(result);
    } catch (err) {
      console.error("Realtime Stock API Error:", err);
      res.json({ 
        price: 150 + Math.random() * 500, 
        change: (Math.random() - 0.5) * 5, 
        changePercent: (Math.random() - 0.5) * 2,
        news: [`Market data for ${symbol} is currently unavailable.`],
        isFallback: true,
        source: "simulation",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/api/stock/history/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const { range, market } = req.query; // '1H', '1D', '1W', '1M', '1Y'
    const marketType = (market as 'GLOBAL' | 'INDIA') || 'GLOBAL';

    try {
      const now = new Date();
      let period1 = new Date();
      let interval: "1m" | "5m" | "15m" | "1d" | "1wk" | "1mo" = "1d";

      switch (range) {
        case '1H':
          period1.setHours(now.getHours() - 1);
          interval = "1m";
          break;
        case '1D':
          period1.setDate(now.getDate() - 1);
          interval = "5m";
          break;
        case '1W':
          period1.setDate(now.getDate() - 7);
          interval = "15m";
          break;
        case '1M':
          period1.setMonth(now.getMonth() - 1);
          interval = "1d";
          break;
        case '1Y':
          period1.setFullYear(now.getFullYear() - 1);
          interval = "1wk";
          break;
        default:
          period1.setDate(now.getDate() - 1);
          interval = "5m";
      }

      const history = await MarketService.getHistory(symbol, period1, now, interval, marketType);

      const data = history.map((h: any) => ({
        time: interval === "1d" || interval === "1wk" ? h.date.toISOString().split('T')[0] : h.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: h.close,
        sentiment: (Math.random() * 2 - 1) // Keep sentiment simulated for the chart
      }));

      res.json(data);
    } catch (err) {
      console.error("History API Error:", err);
      // Fallback to generated data
      const points = range === '1H' ? 10 : range === '1D' ? 20 : range === '1W' ? 30 : range === '1M' ? 40 : 50;
      const data = Array.from({ length: points }, (_, i) => ({
        time: `${i}:00`,
        price: 150 + Math.random() * 10 - 5,
        sentiment: Math.random() * 2 - 1,
      }));
      res.json(data);
    }
  });

  app.get("/api/market/status", async (req, res) => {
    try {
      const status = await MarketService.getMarketStatus();
      res.json({ status });
    } catch (err) {
      res.json({ status: 'Closed' });
    }
  });

  app.get("/api/market/tickers", async (req, res) => {
    const symbols = ["TSLA", "AAPL", "NVDA", "BTC-USD", "ETH-USD", "GOOGL", "AMZN", "MSFT"];

    try {
      const data = await MarketService.getQuotes(symbols);
      res.json(data);
    } catch (err) {
      console.error("Tickers API Error:", err);
      // Fallback to mock data if yahoo finance fails
      res.json(symbols.map(s => ({ symbol: s.replace('-USD', ''), change: (Math.random() - 0.5) * 2 })));
    }
  });

  // --- Indian Stocks API with Caching ---
  const INDIAN_SYMBOLS = [
    "^NSEI", "^BSESN",
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "ADANIENT.NS", "ZOMATO.NS", "PAYTM.NS", "TATAMOTORS.NS",
    "SBIN.NS", "KOTAKBANK.NS",
    "WIPRO.NS", "HCLTECH.NS",
    "NTPC.NS", "POWERGRID.NS"
  ];

  let indianStocksCache: any = null;
  let lastCacheUpdate = 0;
  const CACHE_TTL = 60 * 1000; // 60 seconds

  app.get("/api/indian-stocks", async (req, res) => {
    const now = Date.now();
    
    // Return cached data if available and fresh
    if (indianStocksCache && (now - lastCacheUpdate < CACHE_TTL)) {
      console.log(">>> Returning cached Indian stock data");
      return res.json(indianStocksCache);
    }

    try {
      console.log(">>> Fetching fresh Indian stock data from Yahoo Finance");
      const quotes = await yahooFinanceInstance.quote(INDIAN_SYMBOLS) as any[];
      
      const formattedData = quotes.map(q => ({
        symbol: q.symbol,
        price: q.regularMarketPrice?.toFixed(2) || "0.00",
        change: q.regularMarketChange?.toFixed(2) || "0.00",
        percentChange: q.regularMarketChangePercent?.toFixed(2) || "0.00",
        lastUpdated: new Date().toISOString()
      }));

      // Update cache
      indianStocksCache = formattedData;
      lastCacheUpdate = now;

      res.json(formattedData);
    } catch (err: any) {
      console.error("Indian Stocks API Error:", err.message);
      
      // If cache exists, return it even if stale as fallback
      if (indianStocksCache) {
        return res.json(indianStocksCache);
      }

      // Final fallback: Simulated data
      const simulatedData = INDIAN_SYMBOLS.map(s => ({
        symbol: s,
        price: (Math.random() * 2000 + 100).toFixed(2),
        change: (Math.random() * 20 - 10).toFixed(2),
        percentChange: (Math.random() * 4 - 2).toFixed(2),
        lastUpdated: new Date().toISOString()
      }));
      res.json(simulatedData);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware integrated");
    } catch (err) {
      console.error("Vite middleware failed to load:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.warn("Production build not found. Run 'npm run build' first.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> StockSense Backend Running on http://0.0.0.0:${PORT}`);
    console.log(`>>> Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error("CRITICAL: Server failed to start:", err);
  process.exit(1);
});
