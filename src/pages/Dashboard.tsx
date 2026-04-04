import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, Search, Bell, User, LayoutDashboard, 
  BarChart2, List, Settings, LogOut, Plus, X, 
  TrendingDown, Info, Mic, MicOff, AlertTriangle, Zap,
  Sparkles, Sun, Moon, RefreshCw, Trophy, ArrowLeft, Globe, Target, Activity
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { analyzeSentiment, predictPriceMovement, getMarketEmotion, ai } from "../lib/gemini";
import { StockData, NewsItem, MarketEmotion } from "../types";
import { formatCurrency, USD_INR_RATE } from "../lib/currency";
import RobustDataDisplay from "../components/RobustDataDisplay";
import { ExplanationCard, ExplainThisButton } from "../components/ExplanationComponents";
import AnalyticsView from "../components/AnalyticsView";
import WatchlistView from "../components/WatchlistView";
import SettingsView from "../components/SettingsView";
import AIChatbotView from "../components/AIChatbotView";
import TopOpportunitiesView from "../components/TopOpportunitiesView";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, deleteDoc } from "firebase/firestore";

// Mock Data Generators
const generateChartData = (base: number, range: string) => {
  const points = range === '1H' ? 10 : range === '1D' ? 20 : range === '1W' ? 30 : range === '1M' ? 40 : 50;
  return Array.from({ length: points }, (_, i) => ({
    time: `${i}:00`,
    price: base + Math.random() * 10 - 5,
    sentiment: Math.random() * 2 - 1,
  }));
};

import { POPULAR_STOCKS_GLOBAL, POPULAR_STOCKS_INDIA } from "../constants";

export default function Dashboard() {
  const { user, logout, login, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const urlSymbol = queryParams.get("symbol");

  const [activeTab, setActiveTab] = useState<string>("Dashboard");
  const [timeRange, setTimeRange] = useState('1D');
  const [selectedStock, setSelectedStock] = useState<string | null>(urlSymbol);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [emotion, setEmotion] = useState<MarketEmotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [beginnerMode, setBeginnerMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scenarioSentiment, setScenarioSentiment] = useState(0.10);
  const [scenarioResult, setScenarioResult] = useState<{ priceChange: number, reasoning: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [isFallbackActive, setIsFallbackActive] = useState(false);
  const [searchResult, setSearchResult] = useState<{ text: string; isLive: boolean } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Market preference
  const market = user?.settings?.market || 'GLOBAL';
  
  // Dynamic currency formatting
  const formattedPrice = stockData ? formatCurrency(stockData.price, (stockData.currency as any) || 'USD', market) : { amount: 0, symbol: market === 'INDIA' ? '₹' : '$' };
  const currencySymbol = formattedPrice.symbol;

  const updateMarket = async (newMarket: 'GLOBAL' | 'INDIA') => {
    try {
      await updateUser({ 
        settings: { 
          ...(user?.settings || {}), 
          market: newMarket 
        } 
      });
    } catch (err) {
      console.error("Failed to update market:", err);
    }
  };

  // Speech Recognition
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      alert("Speech recognition not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.onstart = () => {
      setIsListening(true);
      console.log("Speech recognition started");
    };
    recognition.onend = () => {
      setIsListening(false);
      console.log("Speech recognition ended");
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        console.warn("Speech recognition: No speech detected.");
      } else if (event.error === 'aborted') {
        console.warn("Speech recognition: Aborted.");
      } else {
        console.error("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log("Transcript:", transcript);
      setSearchQuery(transcript);
      processSearchQuery(transcript);
    };
    recognition.start();
  };

  const processSearchQuery = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchResult(null);

    // Check if it's a simple stock symbol
    const upperQuery = query.toUpperCase().trim();
    const normalizedQuery = market === 'INDIA' ? upperQuery.replace('.NS', '') : upperQuery;
    const allStocks = [...POPULAR_STOCKS_GLOBAL, ...POPULAR_STOCKS_INDIA];
    
    if (allStocks.includes(normalizedQuery)) {
      // If it's an Indian stock, we keep the .NS if it was provided, or the backend will handle it
      setSelectedStock(upperQuery);
      setIsSearching(false);
      setSearchQuery("");
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `The user searched for: "${query}". Provide a concise analysis, news summary, or trading signals related to this query in the context of the stock market. Use professional financial tone.`,
        config: {
          systemInstruction: "You are a financial analyst. Provide concise, data-driven insights.",
        }
      });
      
      setSearchResult({ text: response.text || "No analysis available.", isLive: true });
      setSearchQuery("");
    } catch (err) {
      console.error("Search AI Error:", err);
      setSearchResult({ text: "Sorry, I couldn't process that search right now. Please try again later.", isLive: false });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      processSearchQuery(searchQuery);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const symbol = params.get("symbol");
    if (symbol) {
      setSelectedStock(symbol);
    }
  }, [location.search]);

  const [tickerData, setTickerData] = useState(POPULAR_STOCKS_GLOBAL.map(s => ({ symbol: s, change: Math.random() * 2 })));
  
  useEffect(() => {
    const stocks = market === 'INDIA' ? POPULAR_STOCKS_INDIA : POPULAR_STOCKS_GLOBAL;
    setTickerData(stocks.map(s => ({ symbol: s, change: Math.random() * 2 })));
  }, [market]);
  const [marketStatus, setMarketStatus] = useState<'Open' | 'Closed'>('Open');

  useEffect(() => {
    const checkMarket = async () => {
      try {
        const res = await fetch("/api/market/status");
        const data = await res.json();
        if (data && data.status) {
          setMarketStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to fetch market status", err);
        // Fallback to time-based logic if API fails
        const now = new Date();
        const day = now.getUTCDay();
        const hour = now.getUTCHours();
        const min = now.getUTCMinutes();
        const totalMin = hour * 60 + min;
        const isOpen = day >= 1 && day <= 5 && totalMin >= 810 && totalMin < 1200;
        setMarketStatus(isOpen ? 'Open' : 'Closed');
      }
    };
    checkMarket();
    const interval = setInterval(checkMarket, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to watchlist in real-time
    const watchlistUnsubscribe = onSnapshot(collection(db, `users/${user.id}/watchlist`), (snapshot) => {
      const symbols = snapshot.docs.map(doc => doc.id);
      setWatchlist(symbols);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.id}/watchlist`);
    });

    return () => watchlistUnsubscribe();
  }, [user]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const emotionData = await getMarketEmotion();
        setEmotion(emotionData);
        if (emotionData.isFallback) setIsFallbackActive(true);
        setLastUpdated(new Date());
      } catch (err) {
        console.error(err);
        setIsFallbackActive(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
    // Poll every 60 seconds for market-wide data
    const interval = setInterval(fetchInitialData, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const res = await fetch("/api/market/tickers");
        const data = await res.json();
        if (data && data.length > 0) {
          setTickerData(data);
        }
      } catch (err) {
        console.error("Failed to fetch tickers", err);
      }
    };
    fetchTickers();
    const interval = setInterval(fetchTickers, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  // Real-time jitter for ticker data to simulate live movement
  useEffect(() => {
    const jitterInterval = setInterval(() => {
      setTickerData(prev => prev.map(item => {
        const jitter = (Math.random() - 0.5) * 0.01; // Very small jitter for visual effect
        const currentChange = item.change || 0;
        return {
          ...item,
          change: currentChange + jitter
        };
      }));
    }, 1500); // Update every 1.5s for a "live" feel
    return () => clearInterval(jitterInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      setSecondsSinceUpdate(seconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Jitter Market Emotion
  useEffect(() => {
    const interval = setInterval(() => {
      setEmotion(prev => {
        if (!prev) return prev;
        const fluctuation = Math.floor(Math.random() * 5) - 2; // -2 to 2
        let newValue = prev.value + fluctuation;
        // Keep it bounded
        if (newValue > 100) newValue = 100;
        if (newValue < 0) newValue = 0;
        
        let newLabel = prev.label;
        if (newValue >= 75) newLabel = "Extreme Greed";
        else if (newValue >= 55) newLabel = "Greed";
        else if (newValue >= 45) newLabel = "Neutral";
        else if (newValue >= 25) newLabel = "Fear";
        else newLabel = "Extreme Fear";

        return { ...prev, value: newValue, label: newLabel };
      });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedStock) return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      setLoading(true);
      setStockData(null); // Reset data to avoid stale UI
      try {
        // 1. Fetch historical data first to initialize the chart
        const historyRes = await fetch(`/api/stock/history/${selectedStock}?range=${timeRange}&market=${market}`);
        const historyData = await historyRes.json();
        setChartData(historyData);

        // 2. Trigger backend fetch to ensure data is in Firestore
        await fetch(`/api/stock/realtime/${selectedStock}?range=${timeRange}&market=${market}`);

        // 3. Subscribe to Firestore for real-time updates
        const normalizedSymbol = market === 'INDIA' ? selectedStock.replace('.NS', '') : selectedStock;
        unsubscribe = onSnapshot(doc(db, `stocks/${market}/symbols/${normalizedSymbol}`), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as any;
            setStockData({
              symbol: selectedStock,
              price: data.price || 0,
              change: data.change || 0,
              changePercent: data.changePercent || 0,
              sentiment: data.sentiment || 0,
              confidence: data.confidence || 0,
              impact: data.impact || "Medium",
              probability: data.probability || 0,
              news: data.news || [],
              currency: data.currency || "USD",
              recommendation: data.recommendation,
              riskLevel: data.riskLevel,
              reasoning: data.reasoning || data.reason
            });
            setLastUpdated(new Date());
            setIsFallbackActive(data.source === "simulation");

            // Update chartData with real-time point
            setChartData(prev => {
              const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              
              if (prev.length === 0) {
                return [{
                  time: now,
                  price: data.price,
                  sentiment: data.sentiment || 0
                }];
              }
              
              const last = prev[prev.length - 1];
              
              // Only add if the price is different or it's a new second
              if (last.time === now) {
                const updated = [...prev];
                updated[updated.length - 1] = { ...last, price: data.price };
                return updated;
              }
              
              const nextPoint = {
                time: now,
                price: data.price,
                sentiment: data.sentiment || last.sentiment
              };
              
              // Keep the chart size manageable
              return [...prev.slice(-100), nextPoint];
            });
          }
        });
      } catch (err) {
        console.error("Update Stock Details Error:", err);
        setIsFallbackActive(true);
      } finally {
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedStock, timeRange, market]);

  // AI Sentiment & Prediction Logic
  useEffect(() => {
    if (!selectedStock || !user) return;
    
    const syncTrendingData = async () => {
      const trendingData = location.state?.trendingData;
      if (trendingData && trendingData.symbol === selectedStock) {
        try {
          const normalizedSymbol = market === 'INDIA' ? selectedStock.replace('.NS', '') : selectedStock;
          const docRef = doc(db, `stocks/${market}/symbols/${normalizedSymbol}`);
          const docSnap = await getDoc(docRef);
          
          // Only sync if data is missing or it's a fresh load from discovery
          if (!docSnap.exists() || !docSnap.data().reasoning) {
            await setDoc(docRef, {
              probability: trendingData.probability,
              sentiment: trendingData.sentiment / 100, // Normalize to -1 to 1 if needed, but here it's 0-100 in trending
              reasoning: trendingData.reason,
              riskLevel: trendingData.risk === 'High' ? 'High Risk' : trendingData.risk === 'Medium' ? 'Medium Risk' : 'Low Risk',
              recommendation: trendingData.change > 0 ? 'Buy' : 'Hold',
              lastAIUpdate: new Date().toISOString()
            }, { merge: true });
          }
        } catch (err) {
          console.error("Sync Trending Data Error:", err);
        }
      }
    };
    
    syncTrendingData();
  }, [selectedStock, location.state, market, user]);

  useEffect(() => {
    if (!stockData || !selectedStock || loading) return;
    
    // Trigger AI if news is present and AI fields are missing or it's a fresh load
    // We use a local ref or a timestamp check to avoid infinite loops
    const needsAI = stockData.news.length > 0 && 
                   (!stockData.recommendation || !stockData.riskLevel);
    
    if (needsAI) {
      const runAIAnalysis = async () => {
        try {
          console.log(`>>> Running AI Analysis for ${selectedStock}`);
          const newsTitles = stockData.news.map(n => typeof n === 'string' ? n : n.title);
          const sentimentResult = await analyzeSentiment(newsTitles);
          const predictionResult = await predictPriceMovement(
            selectedStock, 
            sentimentResult.score, 
            stockData.price
          );
          
          // Update Firestore with AI results - this will trigger the onSnapshot listener
          const normalizedSymbol = market === 'INDIA' ? selectedStock.replace('.NS', '') : selectedStock;
          await setDoc(doc(db, `stocks/${market}/symbols/${normalizedSymbol}`), {
            sentiment: sentimentResult.score,
            confidence: sentimentResult.confidence,
            impact: sentimentResult.impact,
            probability: predictionResult.probability,
            recommendation: predictionResult.recommendation,
            riskLevel: predictionResult.riskLevel,
            reasoning: predictionResult.reasoning,
            lastAIUpdate: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("AI Analysis Error:", err);
        }
      };
      runAIAnalysis();
    }
  }, [stockData?.news, selectedStock, market]);

  // Removed Live Simulation Effect to use real data instead

  const addToWatchlist = async (symbol: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.id}/watchlist`, symbol);
      await setDoc(docRef, {
        symbol,
        addedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.id}/watchlist/${symbol}`);
    }
  };

  const removeFromWatchlist = async (symbol: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.id}/watchlist`, symbol);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.id}/watchlist/${symbol}`);
    }
  };

  const runScenario = async () => {
    const prompt = `If the sentiment for ${selectedStock} changes by ${scenarioSentiment}%, what is the predicted price movement? Current price is ${stockData?.price}. 
    Return JSON: { "priceChange": percentage_number, "reasoning": "string" }`;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          systemInstruction: "You are a predictive financial model. Output only valid JSON."
        }
      });
      setScenarioResult(JSON.parse(response.text || "{}"));
    } catch (err: any) {
      console.error("Scenario Error:", err);
      const errorString = JSON.stringify(err);
      if (errorString.includes("429") || errorString.includes("RESOURCE_EXHAUSTED")) {
        setScenarioResult({ 
          priceChange: 0, 
          reasoning: "The AI service is currently at capacity (Quota Exceeded). Please try again in a few minutes." 
        });
      } else {
        setScenarioResult({ 
          priceChange: 0, 
          reasoning: "An error occurred while running the simulation. Please try again." 
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-background text-text-secondary overflow-hidden font-sans">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:flex flex-col glass border-r-0 m-4 rounded-3xl p-4 transition-all duration-500 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-24' : 'lg:w-72'}
      `}>
        <div className={`flex items-center gap-3 mb-6 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
          <div className="p-2 rounded-xl accent-gradient shadow-lg shadow-accent/20 shrink-0">
            <TrendingUp size={24} className="text-text-primary" />
          </div>
          {!isSidebarCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-2xl font-bold tracking-tighter text-text-primary whitespace-nowrap"
            >
              StockSense
            </motion.span>
          )}
          
          {/* Collapse Toggle (Desktop) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-12 w-6 h-6 rounded-full bg-accent text-white items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
          >
            <ArrowLeft size={14} className={`transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Close Button (Mobile) */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute right-4 top-6 p-2 text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === "Dashboard"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("Dashboard"); setIsMobileMenuOpen(false); }}
          />
          <NavItem 
            icon={<BarChart2 size={20} />} 
            label="Analytics" 
            active={activeTab === "Analytics"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("Analytics"); setIsMobileMenuOpen(false); }}
          />
          <NavItem 
            icon={<Trophy size={20} />} 
            label="Top Picks" 
            active={activeTab === "Top Picks"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("Top Picks"); setIsMobileMenuOpen(false); }}
          />
          <NavItem 
            icon={<List size={20} />} 
            label="Watchlist" 
            active={activeTab === "Watchlist"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("Watchlist"); setIsMobileMenuOpen(false); }}
          />
          <NavItem 
            icon={<Sparkles size={20} />} 
            label="AI Assistant" 
            active={activeTab === "AI Assistant"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("AI Assistant"); setIsMobileMenuOpen(false); }}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === "Settings"} 
            collapsed={isSidebarCollapsed}
            onClick={() => { setActiveTab("Settings"); setIsMobileMenuOpen(false); }}
          />
        </nav>

        <div className={`pt-4 mt-4 border-t border-border ${isSidebarCollapsed ? 'lg:items-center' : ''}`}>
          {!isSidebarCollapsed && (
            <div className="p-2 rounded-xl bg-accent/5 border border-accent/10 mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Pro Plan</span>
                <Zap size={10} className="text-accent fill-accent" />
              </div>
              <p className="text-[10px] text-text-secondary leading-tight">Unlock advanced AI signals.</p>
            </div>
          )}

          <div className={`flex items-center gap-3 mb-2 p-1.5 rounded-xl bg-card border border-border ${isSidebarCollapsed ? 'lg:p-2 lg:justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-lg accent-gradient flex items-center justify-center font-bold text-white text-sm shadow-inner shrink-0">
              {user?.name[0]}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-text-primary truncate">{user?.name}</p>
                <p className="text-[10px] text-text-secondary truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button 
            onClick={logout}
            className={`w-full flex items-center gap-2 text-text-secondary hover:text-warning transition-all p-1.5 rounded-lg hover:bg-warning/5 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <LogOut size={16} /> 
            {!isSidebarCollapsed && <span className="text-xs font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Fallback Alert */}
        <AnimatePresence>
          {isFallbackActive && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-warning/10 border-b border-warning/20 px-8 py-2 flex items-center justify-between overflow-hidden shrink-0"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={14} className="text-warning" />
                <span className="text-[11px] font-bold text-warning uppercase tracking-widest">
                  ⚠️ Live data temporarily limited — showing latest insights
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={12} className="text-warning animate-spin-slow" />
                <span className="text-[10px] text-warning/70 font-medium">
                  Auto-reconnect in progress...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-card text-text-secondary hover:bg-card-hover hover:text-text-primary transition-all border border-border"
            >
              <TrendingUp size={18} />
            </button>
            <button 
              onClick={() => navigate('/search')}
              className="p-2.5 rounded-xl bg-card text-text-secondary hover:bg-card-hover hover:text-text-primary transition-all border border-border"
              title="Back to Search"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search stocks, news, or signals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-xs text-text-primary"
              />
            </div>
            <button 
              onClick={startListening}
              className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-warning text-white animate-pulse shadow-lg shadow-warning/20' : 'bg-card text-text-secondary hover:bg-card-hover hover:text-text-primary'}`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-card rounded-xl p-1 border border-border">
              <button 
                onClick={() => updateMarket('GLOBAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${market === 'GLOBAL' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Globe size={12} /> Global
              </button>
              <button 
                onClick={() => updateMarket('INDIA')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${market === 'INDIA' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <span className="text-xs">🇮🇳</span> India
              </button>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-bold text-text-secondary uppercase tracking-widest bg-card px-2 py-1 rounded-lg border border-border">
              <RefreshCw size={8} className={`animate-spin-slow ${loading ? 'opacity-100' : 'opacity-50'}`} />
              {secondsSinceUpdate}s
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-card text-text-secondary hover:bg-card-hover hover:text-text-primary transition-all border border-border"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-1 custom-scrollbar">
          <AnimatePresence mode="wait">
            {isSearching && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-8 p-6 glass rounded-[2rem] border-accent/20 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <RefreshCw size={20} className="text-accent animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">AI is analyzing your request...</p>
                  <p className="text-xs text-text-secondary">Scanning market signals and news for "{searchQuery}"</p>
                </div>
              </motion.div>
            )}

            {searchResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-8 glass rounded-[2.5rem] border-accent/30 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setSearchResult(null)} className="p-2 rounded-full hover:bg-white/5 text-text-secondary">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <Sparkles size={20} className="text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-text-primary">AI Search Insight</h3>
                </div>
                <div className="prose prose-invert max-w-none text-text-secondary text-sm leading-relaxed">
                  <div className="whitespace-pre-wrap">{searchResult.text}</div>
                </div>
                {!searchResult.isLive && (
                  <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-warning uppercase tracking-widest">
                    <AlertTriangle size={12} />
                    Offline Mode - Showing Simulated Insight
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "Dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {!selectedStock ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-8">
                      <Search size={48} className="text-accent" />
                    </div>
                    <h2 className="text-3xl font-black text-text-primary mb-4 tracking-tighter">No Stock Selected</h2>
                    <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
                      Search for a stock or select one from the discovery page to view detailed AI-powered analysis and market insights.
                    </p>
                    <button 
                      onClick={() => navigate('/search')}
                      className="px-8 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent-hover transition-all flex items-center gap-3 shadow-lg shadow-accent/20"
                    >
                      <TrendingUp size={20} />
                      Go to Discovery
                    </button>
                  </div>
                ) : loading && !stockData ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-8">
                      <RefreshCw size={48} className="text-accent animate-spin" />
                    </div>
                    <h2 className="text-3xl font-black text-text-primary mb-4 tracking-tighter">Loading Insights...</h2>
                    <p className="text-text-secondary max-w-md mx-auto mb-8 leading-relaxed">
                      Our AI is scanning market signals and news for {selectedStock}. This will only take a moment.
                    </p>
                  </div>
                ) : (
                  <>
                    {beginnerMode && (
                  <div className="mb-8">
                    <h1 className="text-3xl font-black text-text-primary mb-2">Hi! Let’s understand the market today 😊</h1>
                    <div className="glass p-6 rounded-[2rem] border-accent/20 flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-text-primary">Market is doing well today 📈</p>
                        <p className="text-sm text-text-secondary mt-1">🧠 Meaning: More people are buying</p>
                        <p className="text-sm text-text-secondary">🎯 Suggestion: Invest carefully, prices may be high</p>
                      </div>
                      <div className="px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20">🟢 Safe</div>
                    </div>
                  </div>
                )}

                {/* Market Ticker */}
                <div className="flex items-center gap-8 mb-8 overflow-hidden whitespace-nowrap py-2 border-y border-border relative group live-ticker-glow">
                  <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-widest shrink-0 relative z-10">
                    <span className={`w-2 h-2 rounded-full ${marketStatus === 'Open' ? 'bg-highlight animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-warning'}`}></span>
                    {market === 'INDIA' ? 'Indian' : 'Global'} Market {marketStatus}
                  </div>
                  <div className="flex gap-12 animate-marquee relative z-10">
                    {tickerData.map((item, idx) => (
                      <div key={`${item.symbol}-${idx}`} className="flex items-center gap-3 text-sm">
                        <span className="font-bold text-text-primary tracking-tighter">{item.symbol}</span>
                        <motion.span 
                          key={`${item.symbol}-${(item.change || 0).toFixed(2)}`}
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 1 }}
                          className={`font-mono font-medium ${(item.change || 0) >= 0 ? 'text-highlight' : 'text-warning'}`}
                        >
                          {(item.change || 0) >= 0 ? '+' : ''}{(item.change || 0).toFixed(2)}%
                        </motion.span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bento-grid">
                  {/* Guided Suggestion Panel */}
                  {beginnerMode && (
                    <div className="glass p-8 rounded-[2rem] col-span-1 md:col-span-3 border-accent/20">
                      <h3 className="text-xl font-bold text-text-primary mb-6">🧭 What should you do today?</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-sm font-bold text-text-primary mb-2">Market is stable</p>
                          <p className="text-xs text-text-secondary">Safe to observe and research new opportunities.</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-sm font-bold text-text-primary mb-2">Stock rising</p>
                          <p className="text-xs text-text-secondary">Consider a small investment if the trend continues.</p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                          <p className="text-sm font-bold text-text-primary mb-2">High Volatility</p>
                          <p className="text-xs text-text-secondary">Caution advised. Avoid large trades.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Market Emotion */}
                  <div className="glass p-8 rounded-[2rem] flex items-center justify-between col-span-1 md:col-span-2 glass-hover group">
                    <div className="max-w-md">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                        <span className="micro-label">Global Sentiment</span>
                        <ExplainThisButton topic="Market Emotion Index" data={`Value: ${emotion?.value}, Label: ${emotion?.label}, Summary: ${emotion?.summary}`} />
                      </div>
                      <h3 className="text-2xl font-black text-text-primary mb-2 tracking-tighter">Market Emotion Index</h3>
                      <p className="text-sm text-text-secondary leading-relaxed font-medium">{emotion?.summary}</p>
                      <div className="mt-8 flex items-center gap-6">
                        <div className="flex flex-col">
                          <span className="micro-label mb-1">Status</span>
                          <span className="text-xs font-bold text-text-secondary">Live Tracking</span>
                        </div>
                        <div className="w-px h-8 bg-border"></div>
                        <div className="flex flex-col">
                          <span className="micro-label mb-1">Confidence</span>
                          <span className="text-xs font-bold text-highlight">High (92%)</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center relative pr-4">
                      <div className="relative w-56 h-28 overflow-hidden">
                        <div className="absolute inset-0 border-[20px] border-card rounded-t-full"></div>
                        <div className="absolute inset-0 border-[20px] border-accent/10 rounded-t-full blur-sm"></div>
                        <motion.div 
                          initial={{ rotate: -90 }}
                          animate={{ rotate: (emotion?.value || 50) * 1.8 - 90 }}
                          transition={{ type: "spring", damping: 12, stiffness: 60 }}
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-24 bg-accent origin-bottom rounded-full shadow-[0_0_20px_rgba(99,102,241,0.8)] z-10"
                        >
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg"></div>
                        </motion.div>
                      </div>
                      <div className={`text-5xl font-black mt-6 tracking-tighter data-value ${emotion?.value && emotion.value > 60 ? 'text-highlight' : emotion?.value && emotion.value < 40 ? 'text-warning' : 'text-accent'}`}>
                        {emotion?.value || 0}
                      </div>
                      <div className="micro-label mt-1">{emotion?.label}</div>
                      {beginnerMode && (
                        <ExplanationCard 
                          what="Market is rising"
                          meaning="People are buying more stocks"
                          action="Invest carefully, prices may be high"
                        />
                      )}
                    </div>
                  </div>

                  <RobustDataDisplay beginnerMode={beginnerMode} />
                  
                  <div className="col-span-1 md:col-span-1">
                  </div>

                  {/* Main Chart */}
                  <div className="glass p-10 rounded-[2.5rem] col-span-1 md:col-span-3 xl:col-span-3 glass-hover relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/20 to-transparent"></div>
                    <div className="flex items-center justify-between mb-12">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center text-text-primary font-black text-2xl shadow-2xl shadow-accent/30 relative group">
                          <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          {selectedStock[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-4xl font-black text-text-primary tracking-tighter">
                              {market === 'INDIA' ? selectedStock.replace('.NS', '') : selectedStock}
                            </h2>
                            <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 micro-label">
                              {market === 'INDIA' ? 'NSE' : 'Nasdaq'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-highlight"></span>
                            <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">AI Sentiment Engine Active</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-highlight animate-pulse"></span>
                          <span className="text-[10px] font-black text-highlight uppercase tracking-widest">Live Feed</span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${stockData && (stockData.change || 0) >= 0 ? 'bg-highlight/10 text-highlight border border-highlight/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                            {stockData && (stockData.change || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {stockData ? `${(stockData.changePercent || 0).toFixed(2)}%` : '---%'}
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-accent/10 text-accent border border-accent/20">
                            <Target size={14} />
                            {stockData ? `${stockData.probability || 0}% Prob` : '---% Prob'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-[420px] w-full relative">
                      <div className="absolute top-0 right-0 flex gap-2 z-10">
                        {['1H', '1D', '1W', '1M', '1Y'].map(t => (
                          <button 
                            key={t} 
                            onClick={() => setTimeRange(t)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${t === timeRange ? 'bg-text-primary/10 text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="time" stroke="#ffffff15" fontSize={10} tickLine={false} axisLine={false} dy={15} fontStyle="italic" />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="glass p-4 rounded-2xl border-white/10 shadow-2xl">
                                    <p className="micro-label mb-2">{payload[0].payload.time}</p>
                                    <p className="text-xl font-black text-text-primary data-value">
                                      {currencySymbol}
                                      {typeof payload[0].value === 'number' 
                                        ? (stockData?.currency === 'INR' && market === 'GLOBAL' 
                                            ? (payload[0].value / USD_INR_RATE).toFixed(2)
                                            : stockData?.currency === 'USD' && market === 'INDIA'
                                              ? (payload[0].value * USD_INR_RATE).toFixed(2)
                                              : payload[0].value.toFixed(2))
                                        : payload[0].value}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${payload[0].payload.sentiment > 0 ? 'bg-highlight' : 'bg-warning'}`}></div>
                                      <span className="text-[10px] font-bold text-text-secondary">Sentiment: {payload[0].payload.sentiment.toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                            cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }}
                          />
                          <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPrice)" animationDuration={2000} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sentiment Chart */}
                  <div className="glass p-10 rounded-[2.5rem] col-span-1 md:col-span-3 xl:col-span-3 glass-hover relative mt-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2.5 rounded-xl bg-highlight/10">
                        <Activity size={20} className="text-highlight" />
                      </div>
                      <h3 className="text-xl font-bold text-text-primary tracking-tight">AI Sentiment Trend</h3>
                    </div>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorSentiment" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                          <XAxis dataKey="time" stroke="#ffffff15" fontSize={10} tickLine={false} axisLine={false} dy={15} fontStyle="italic" />
                          <YAxis hide domain={[-1, 1]} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                          />
                          <Area type="monotone" dataKey="sentiment" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSentiment)" animationDuration={2000} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AI Insights Bento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 col-span-1 md:col-span-3 mt-8">
                    {/* Sentiment Engine */}
                    <div className="glass p-8 rounded-[2rem] glass-hover relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-highlight/20"></div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                          <span className="micro-label mb-1">NLP Analysis</span>
                          <h3 className="font-bold text-text-primary">Sentiment Engine</h3>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                          (stockData?.sentiment || 0) > 0.1 ? 'bg-highlight/10 text-highlight border-highlight/20' : 
                          (stockData?.sentiment || 0) < -0.1 ? 'bg-warning/10 text-warning border-warning/20' : 
                          'bg-accent/10 text-accent border-accent/20'
                        }`}>
                          {(stockData?.sentiment || 0) > 0.1 ? 'Bullish' : (stockData?.sentiment || 0) < -0.1 ? 'Bearish' : 'Neutral'}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-3 mb-8">
                        <span className="text-6xl font-black text-text-primary tracking-tighter data-value">{(stockData?.sentiment || 0).toFixed(2)}</span>
                        <div className="flex flex-col">
                          <span className="micro-label">Score</span>
                          <span className="text-[10px] font-black text-highlight">{(Math.abs(stockData?.sentiment || 0) * 100).toFixed(0)}% Intensity</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden p-1 border border-white/5 relative">
                        <div className="absolute left-1/2 top-0 w-px h-full bg-white/20 z-10"></div>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${((stockData?.sentiment || 0) + 1) * 50}%` }}
                          transition={{ type: "spring", stiffness: 40, damping: 12 }}
                          className={`h-full rounded-full relative z-0 ${stockData?.sentiment && stockData.sentiment > 0 ? 'bg-highlight shadow-[0_0_20px_rgba(16,185,129,0.5)]' : 'bg-warning shadow-[0_0_20px_rgba(244,63,94,0.5)]'}`}
                        ></motion.div>
                      </div>
                      <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="micro-label block mb-1">Confidence</span>
                          <span className="text-sm font-black text-text-primary data-value">{stockData?.confidence}%</span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                          <span className="micro-label block mb-1">Impact</span>
                          <span className="text-sm font-black text-text-primary data-value">{stockData?.impact}</span>
                        </div>
                      </div>
                    </div>

                    {/* Risk & Recommendation */}
                    <div className="glass p-8 rounded-[2rem] flex flex-col justify-between glass-hover relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                          <span className="micro-label mb-1">AI Recommendation</span>
                          <h3 className="font-bold text-text-primary">Action Plan</h3>
                        </div>
                        <div className={`p-2.5 rounded-xl ${
                          stockData?.recommendation === 'Buy' ? 'bg-highlight/10 text-highlight' : 
                          stockData?.recommendation === 'Avoid' ? 'bg-warning/10 text-warning' : 
                          'bg-accent/10 text-accent'
                        }`}>
                          <TrendingUp size={18} />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="text-sm font-bold text-text-secondary">Risk Level</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            stockData?.riskLevel === 'High Risk' ? 'bg-warning/20 text-warning border border-warning/20' : 
                            stockData?.riskLevel === 'Medium Risk' ? 'bg-accent/20 text-accent border border-accent/20' : 
                            'bg-highlight/20 text-highlight border border-highlight/20'
                          }`}>
                            {stockData?.riskLevel || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                          <span className="text-sm font-bold text-text-secondary">Recommendation</span>
                          <span className={`text-lg font-black tracking-tighter ${
                            stockData?.recommendation === 'Buy' ? 'text-highlight' : 
                            stockData?.recommendation === 'Avoid' ? 'text-warning' : 
                            'text-accent'
                          }`}>
                            {stockData?.recommendation || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Predictive AI */}
                    <div className="glass p-8 rounded-[2rem] glass-hover relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-accent/20"></div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                          <span className="micro-label mb-1">Predictive AI</span>
                          <h3 className="font-bold text-text-primary">Profit Probability</h3>
                        </div>
                        <div className="p-2.5 rounded-xl bg-accent/10">
                          <Zap size={18} className="text-accent fill-accent/20" />
                        </div>
                      </div>
                      <div className="flex items-center gap-10">
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-900" strokeWidth="3.5" />
                            <motion.circle 
                              cx="18" cy="18" r="16" fill="none" 
                              className="stroke-accent" 
                              strokeWidth="3.5" 
                              strokeLinecap="round"
                              initial={{ strokeDasharray: "0, 100" }}
                              animate={{ strokeDasharray: `${stockData?.probability}, 100` }}
                              transition={{ duration: 2, ease: "circOut" }}
                              style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.6))' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-text-primary tracking-tighter data-value">
                              {stockData ? `${stockData.probability}%` : '---%'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-text-secondary leading-relaxed italic">
                            "Neural network identifies a <span className="text-text-primary font-black">{stockData ? `${stockData.probability}%` : '---%'}</span> probability of positive price action based on current sentiment clusters."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  </div>

                    {/* Why this signal? */}
                    <div className="glass p-8 rounded-[2rem] col-span-1 md:col-span-3 glass-hover relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-accent/30"></div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-2.5 rounded-xl bg-accent/10">
                          <Info size={20} className="text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <span className="micro-label mb-0.5">Deep Reasoning</span>
                          <h3 className="text-xl font-bold text-text-primary tracking-tight">Explainable AI: Why this signal?</h3>
                        </div>
                      </div>
                      <p className="text-text-secondary leading-relaxed text-sm font-medium italic">
                        {stockData?.reasoning || (stockData?.news && stockData.news.length > 0 && stockData.news[0].title.includes("record") 
                          ? "Our neural network detected a high-confidence correlation between the recent earnings beat and historical price rallies. Social media sentiment on Reddit's r/wallstreetbets has also shifted significantly bullish, with a 40% increase in positive mentions over the last 6 hours. This convergence of fundamental strength and retail momentum often precedes a sustained breakout." 
                          : "The signal is currently suppressed by regulatory uncertainty. While fundamental data remains strong, our NLP engine has flagged several high-impact news articles discussing potential antitrust investigations, which historically lead to short-term volatility and bearish pressure. We recommend monitoring the legal developments closely before increasing exposure.") || "Analyzing market conditions and sentiment clusters to provide deep reasoning..."}
                      </p>
                    </div>

                  {/* Scenario Simulator */}
                  <div className="glass p-8 rounded-[2rem] glass-hover">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-text-primary">Scenario Simulator</h3>
                      <div className="p-2 rounded-lg bg-white/5"><TrendingUp size={18} className="text-text-secondary" /></div>
                    </div>
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Sentiment Shift</span>
                          <span className={`text-2xl font-black tracking-tighter ${scenarioSentiment > 0 ? 'text-highlight' : scenarioSentiment < 0 ? 'text-warning' : 'text-text-primary'}`}>
                            {scenarioSentiment > 0 ? '+' : ''}{scenarioSentiment.toFixed(2)}%
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0.10" 
                          max="0.50" 
                          step="0.01"
                          value={scenarioSentiment}
                          onChange={(e) => setScenarioSentiment(parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-900 rounded-full appearance-none cursor-pointer accent-accent border border-white/5"
                        />
                      </div>
                      <button 
                        onClick={runScenario}
                        className="w-full py-4 rounded-2xl accent-gradient text-white font-bold text-sm glow-button shadow-xl shadow-accent/10"
                      >
                        Run AI Simulation
                      </button>
                      <AnimatePresence>
                        {scenarioResult && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-5 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-accent"></div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2">Predicted Price Impact</p>
                            <p className={`text-3xl font-black tracking-tighter ${scenarioResult.priceChange >= 0 ? 'text-highlight' : 'text-warning'}`}>
                              {scenarioResult.priceChange >= 0 ? '+' : ''}{scenarioResult.priceChange}%
                            </p>
                            <p className="text-xs text-text-secondary mt-3 leading-relaxed font-medium">{scenarioResult.reasoning}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* News Mapping */}
                  <div className="glass p-8 rounded-[2rem] flex flex-col glass-hover">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-text-primary">News-to-Impact Mapping</h3>
                      <button className="text-xs font-bold text-accent hover:underline">View All</button>
                    </div>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                      {stockData?.news.map(item => (
                        <div key={item.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group cursor-pointer">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] text-text-secondary uppercase font-black tracking-widest">{item.source} • {item.time}</span>
                            {item.isFake && (
                              <span className="flex items-center gap-1.5 text-[9px] text-warning font-black bg-warning/10 px-2 py-0.5 rounded-full border border-warning/20 uppercase tracking-widest">
                                <AlertTriangle size={10} /> Misleading
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-text-secondary mb-4 group-hover:text-text-primary transition-colors leading-snug">{item.title}</h4>
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${item.impact === 'High' ? 'bg-accent/20 text-accent' : 'bg-slate-800 text-text-secondary'}`}>
                              {item.impact} Impact
                            </span>
                            <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${item.sentiment > 0 ? 'bg-highlight/20 text-highlight' : 'bg-warning/20 text-warning'}`}>
                              {item.sentiment > 0 ? 'Positive' : 'Negative'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Watchlist Summary */}
                  <div className="glass p-8 rounded-[2rem] glass-hover">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-text-primary">My Watchlist</h3>
                      <button 
                        onClick={() => setActiveTab("Watchlist")}
                        className="p-2.5 rounded-xl accent-gradient text-white hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {watchlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-700 mb-4">
                            <List size={32} />
                          </div>
                          <p className="text-sm text-text-secondary font-medium">Your watchlist is empty.<br />Add stocks to track sentiment.</p>
                        </div>
                      ) : (
                        watchlist.map(s => (
                          <div 
                            key={s} 
                            onClick={() => setSelectedStock(s)}
                            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${selectedStock === s ? 'bg-accent/10 border-accent/30' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-black text-text-primary text-xs shadow-inner">
                                {s[0]}
                              </div>
                              <div>
                                <span className="font-black text-text-primary tracking-tighter">{s}</span>
                                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Tech</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-black text-text-primary tracking-tighter">
                                  {formatCurrency(154.20, 'USD', market).symbol}
                                  {formatCurrency(154.20, 'USD', market).amount.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-highlight font-black tracking-widest">+1.2%</p>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(s); }}
                                className="p-2 text-slate-700 hover:text-warning transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
              </>
            )}
          </motion.div>
        )}

            {activeTab === "Analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AnalyticsView />
              </motion.div>
            )}

            {activeTab === "Top Picks" && (
              <motion.div
                key="top-picks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TopOpportunitiesView 
                  market={market} 
                  onSelectStock={(symbol) => {
                    setSelectedStock(symbol);
                    setActiveTab("Dashboard");
                  }}
                />
              </motion.div>
            )}

            {activeTab === "Watchlist" && (
              <motion.div
                key="watchlist"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <WatchlistView 
                  watchlist={watchlist}
                  selectedStock={selectedStock}
                  setSelectedStock={setSelectedStock}
                  removeFromWatchlist={removeFromWatchlist}
                  addToWatchlist={addToWatchlist}
                />
              </motion.div>
            )}

            {activeTab === "Settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SettingsView />
              </motion.div>
            )}

            {activeTab === "AI Assistant" && (
              <motion.div
                key="ai-assistant"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AIChatbotView />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, collapsed = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, collapsed?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${active ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-secondary hover:bg-card-hover hover:text-text-primary'} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
      title={collapsed ? label : ""}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && (
        <motion.span 
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-medium whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </button>
  );
}
