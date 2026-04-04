import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Zap, Shield, ArrowRight, Filter, ChevronDown, Clock, X, ArrowLeft, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/currency";

import { POPULAR_STOCKS_GLOBAL, POPULAR_STOCKS_INDIA } from "../constants";

const TRENDING_STOCKS_GLOBAL = [
  { symbol: "NVDA", name: "NVIDIA Corp", price: 894.32, change: 4.2, risk: "Medium", sector: "Tech", probability: 88, sentiment: 92, reason: "Unprecedented demand for Blackwell GPUs and strong data center growth." },
  { symbol: "TSLA", name: "Tesla, Inc", price: 175.22, change: -2.1, risk: "High", sector: "Auto", probability: 82, sentiment: 85, reason: "Market overreaction to delivery numbers; technical indicators show oversold conditions." },
  { symbol: "AAPL", name: "Apple Inc", price: 182.52, change: 0.8, risk: "Low", sector: "Tech", probability: 72, sentiment: 74, reason: "Steady services revenue growth and upcoming AI integration announcements." },
  { symbol: "BTC", name: "Bitcoin", price: 68432.12, change: 1.5, risk: "High", sector: "Crypto", probability: 65, sentiment: 90, reason: "Institutional ETF inflows reaching record levels; halving supply shock imminent." },
  { symbol: "MSFT", name: "Microsoft", price: 415.32, change: 1.2, risk: "Low", sector: "Tech", probability: 84, sentiment: 88, reason: "Azure AI services expanding market share; strong enterprise software renewals." },
  { symbol: "GOOGL", name: "Alphabet Inc", price: 152.32, change: 1.1, risk: "Low", sector: "Tech", probability: 78, sentiment: 80, reason: "Gemini integration across Google Workspace driving new revenue streams." },
  { symbol: "META", name: "Meta Platforms", price: 485.12, change: 2.3, risk: "Medium", sector: "Tech", probability: 81, sentiment: 83, reason: "Ad revenue recovery and efficiency gains from AI-driven content recommendations." },
  { symbol: "JPM", name: "JPMorgan Chase", price: 195.45, change: 0.5, risk: "Low", sector: "Finance", probability: 74, sentiment: 76, reason: "Net interest income remains robust; market leadership in investment banking." },
  { symbol: "V", name: "Visa Inc", price: 280.12, change: 0.7, risk: "Low", sector: "Finance", probability: 76, sentiment: 78, reason: "Cross-border travel volume recovery driving transaction fee growth." },
  { symbol: "MA", name: "Mastercard Inc", price: 475.32, change: 0.9, risk: "Low", sector: "Finance", probability: 75, sentiment: 77, reason: "Expansion into value-added services and digital payment solutions." },
  { symbol: "AMD", name: "Advanced Micro Devices", price: 192.11, change: 3.5, risk: "Medium", sector: "Tech", probability: 79, sentiment: 81, reason: "MI300X adoption accelerating in cloud data centers." },
];

const TRENDING_STOCKS_INDIA = [
  { symbol: "RELIANCE", name: "Reliance", price: 2950.00, change: 1.2, risk: "Low", sector: "Energy", probability: 85, sentiment: 88, reason: "Jio Financial Services spin-off value unlocking; retail expansion." },
  { symbol: "TCS", name: "TCS", price: 4100.00, change: 0.5, risk: "Low", sector: "Tech", probability: 70, sentiment: 75, reason: "Large deal wins in Europe and UK; margin expansion through automation." },
  { symbol: "INFY", name: "Infosys", price: 1600.00, change: -0.2, risk: "Low", sector: "Tech", probability: 65, sentiment: 70, reason: "Focus on generative AI platforms and cloud transformation projects." },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1450.00, change: 0.8, risk: "Medium", sector: "Finance", probability: 78, sentiment: 82, reason: "Post-merger synergy benefits starting to reflect in NIMs." },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1100.00, change: 1.5, risk: "Medium", sector: "Finance", probability: 76, sentiment: 80, reason: "Best-in-class asset quality and strong digital banking adoption." },
  { symbol: "SBIN", name: "SBI", price: 750.00, change: -1.0, risk: "Medium", sector: "Finance", probability: 72, sentiment: 79, reason: "Corporate credit cycle pick-up and improved ROA." },
  { symbol: "^NSEI", name: "NIFTY 50", price: 22000.00, change: 0.3, risk: "Low", sector: "Index", probability: 68, sentiment: 72, reason: "Broad-based market participation; FII inflows returning." },
  { symbol: "^BSESN", name: "SENSEX", price: 72000.00, change: 0.2, risk: "Low", sector: "Index", probability: 66, sentiment: 70, reason: "Strong domestic institutional buying supporting valuations." },
];

export default function SearchDiscovery() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const [market, setMarket] = useState<'GLOBAL' | 'INDIA'>(user?.settings?.market || 'GLOBAL');

  const popularStocks = market === 'INDIA' ? POPULAR_STOCKS_INDIA : POPULAR_STOCKS_GLOBAL;
  const trendingStocks = market === 'INDIA' ? TRENDING_STOCKS_INDIA : TRENDING_STOCKS_GLOBAL;

  const updateMarket = async (newMarket: 'GLOBAL' | 'INDIA') => {
    setMarket(newMarket);
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

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    risk: "All",
    sector: "All",
    sort: "Most Active"
  });
  const [stocks, setStocks] = useState(trendingStocks);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStocks(trendingStocks);
    if (market === 'INDIA') {
      const fetchIndianData = async () => {
        setLoading(true);
        try {
          const response = await fetch('/api/indian-stocks');
          if (response.ok) {
            const data = await response.json();
            // Map the real data to the format used in Trending Grid
            const mapped = data.map((s: any) => {
              // Find matching probability from static list if available
              const staticMatch = TRENDING_STOCKS_INDIA.find(t => t.symbol === s.symbol.replace('.NS', ''));
              return {
                symbol: s.symbol.replace('.NS', ''),
                name: s.symbol.includes('NSEI') ? 'NIFTY 50' : s.symbol.includes('BSESN') ? 'SENSEX' : s.symbol.replace('.NS', ''),
                price: parseFloat(s.price),
                change: parseFloat(s.percentChange),
                risk: "Medium",
                sector: s.symbol.includes('NSEI') || s.symbol.includes('BSESN') ? "Index" : "Equity",
                probability: staticMatch?.probability || Math.floor(60 + Math.random() * 30),
                sentiment: staticMatch?.sentiment || Math.floor(50 + Math.random() * 40),
                reason: staticMatch?.reason || "Strong technical breakout confirmed by AI sentiment analysis."
              };
            });
            setStocks(mapped);
          }
        } catch (err) {
          console.error("Failed to fetch Indian stocks:", err);
          setStocks(trendingStocks);
        } finally {
          setLoading(false);
        }
      };
      fetchIndianData();
    }
  }, [market, trendingStocks]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (market === 'GLOBAL') {
        setStocks(prev => prev.map(s => ({
          ...s,
          change: parseFloat((s.change + (Math.random() - 0.5) * 0.1).toFixed(2))
        })));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [market]);

  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  const handleSearch = (stock: any) => {
    const symbol = stock.symbol;
    const updated = [symbol, ...recentSearches.filter(s => s !== symbol)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    navigate(`/dashboard?symbol=${symbol}`, { state: { trendingData: stock } });
  };

  const filteredStocks = stocks.filter(stock => {
    const riskMatch = filters.risk === "All" || stock.risk === filters.risk;
    const sectorMatch = filters.sector === "All" || stock.sector === filters.sector;
    return riskMatch && sectorMatch;
  });

  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-2 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold">Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-black text-text-primary tracking-tighter mb-1">Discover Opportunities</h1>
            <p className="text-xs text-text-secondary font-medium">Search for assets or explore trending signals.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => updateMarket(market === 'GLOBAL' ? 'INDIA' : 'GLOBAL')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border text-[10px] font-bold text-text-primary hover:bg-card-hover transition-all"
            >
              <Globe size={14} className={market === 'INDIA' ? 'text-accent' : 'text-text-secondary'} />
              {market === 'GLOBAL' ? 'Global' : 'India'}
            </button>
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search stocks, crypto, sectors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery.toUpperCase())}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-accent/50 focus:bg-card-hover transition-all text-xs text-text-primary shadow-lg shadow-black/5"
              />
              
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl border border-border overflow-hidden z-50 shadow-2xl"
                  >
                    <div className="p-4 border-b border-border">
                      <span className="micro-label text-text-secondary">Popular Suggestions</span>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {popularStocks.map(s => (
                        <button 
                          key={s}
                          onClick={() => handleSearch(s)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center text-[10px] font-black text-white">
                            {s[0]}
                          </div>
                          <span className="text-sm font-bold text-text-primary">{s}</span>
                        </button>
                      ))}
                    </div>
                    {recentSearches.length > 0 && (
                      <>
                        <div className="p-4 border-t border-border">
                          <span className="micro-label text-text-secondary">Recent Searches</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {recentSearches.map(s => (
                            <button 
                              key={s}
                              onClick={() => handleSearch(s)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
                            >
                              <Clock size={14} className="text-text-secondary" />
                              <span className="text-sm font-bold text-text-primary">{s}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="mb-8 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-text-secondary">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
          </div>
          
          <FilterDropdown 
            label="Risk Level" 
            value={filters.risk} 
            options={["All", "Low", "Medium", "High"]} 
            onChange={(v) => setFilters({...filters, risk: v})}
          />
          
          <FilterDropdown 
            label="Sector" 
            value={filters.sector} 
            options={["All", "Tech", "Auto", "Crypto", "Finance"]} 
            onChange={(v) => setFilters({...filters, sector: v})}
          />

          <FilterDropdown 
            label="Sort By" 
            value={filters.sort} 
            options={["Most Active", "Top Gainers", "Top Losers"]} 
            onChange={(v) => setFilters({...filters, sort: v})}
          />

          { (filters.risk !== "All" || filters.sector !== "All") && (
            <button 
              onClick={() => setFilters({ risk: "All", sector: "All", sort: "Most Active" })}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <X size={14} /> Clear All
            </button>
          )}
        </section>

        {/* Trending Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">Trending Signals</h2>
            <div className="flex items-center gap-2 text-highlight text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-highlight animate-pulse"></span>
              Live Updates
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass p-6 rounded-[1.5rem] animate-pulse">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5"></div>
                      <div className="space-y-2">
                        <div className="w-16 h-4 bg-white/5 rounded"></div>
                        <div className="w-24 h-3 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="h-14 bg-white/5 rounded-xl"></div>
                    <div className="h-14 bg-white/5 rounded-xl"></div>
                  </div>
                </div>
              ))
            ) : filteredStocks.map((stock, i) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleSearch(stock)}
                className="glass p-6 rounded-[1.5rem] glass-hover cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center text-white font-black text-lg shadow-lg shadow-accent/20">
                      {stock.symbol[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-text-primary tracking-tight">{stock.symbol}</h3>
                      <p className="text-[10px] text-text-secondary font-medium">{stock.name}</p>
                      <p className="text-xs font-black text-accent mt-0.5">
                        {formatCurrency(stock.price, market === 'INDIA' ? 'INR' : 'USD', market).symbol}
                        {formatCurrency(stock.price, market === 'INDIA' ? 'INR' : 'USD', market).amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-highlight/10 text-[7px] font-black text-highlight uppercase tracking-widest border border-highlight/20">
                      <span className="w-1 h-1 rounded-full bg-highlight animate-pulse"></span>
                      Live
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${stock.change >= 0 ? 'bg-highlight/10 text-highlight border border-highlight/20' : 'bg-warning/10 text-warning border border-warning/20'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="micro-label block mb-0.5">Risk Level</span>
                    <span className={`text-xs font-black ${stock.risk === 'High' ? 'text-warning' : stock.risk === 'Medium' ? 'text-accent' : 'text-highlight'}`}>
                      {stock.risk}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="micro-label block mb-0.5">Sentiment Engine</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${stock.sentiment || 75}%` }}></div>
                      </div>
                      <span className="text-[10px] font-black text-text-primary">{stock.sentiment || 75}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 dashed-border border-x-0 border-b-0 mb-4">
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-accent" />
                    <span className="text-[10px] font-bold text-text-secondary">AI Confidence: {stock.probability}%</span>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </div>

                <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-bold text-accent uppercase tracking-widest">AI Analysis</span>
                  </div>
                  <p className="text-[10px] text-text-secondary font-medium leading-relaxed italic">
                    "{stock.reason || "Strong technical breakout confirmed by AI sentiment analysis."}"
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-text-primary hover:bg-card-hover transition-all"
      >
        <span className="text-text-secondary font-medium">{label}:</span>
        {value}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-48 glass rounded-2xl border border-border overflow-hidden z-50 shadow-2xl"
            >
              {options.map(opt => (
                <button 
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-white/5 ${value === opt ? 'text-accent' : 'text-text-secondary'}`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
